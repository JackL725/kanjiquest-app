import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FSRS,
  createEmptyCard,
  generatorParameters,
  Rating,
  State,
} from 'ts-fsrs'
import { readSettings } from './useSettings'
import { supabase } from '@/lib/supabase'
import { isGuestMode } from '@/screens/AuthScreen'

// Re-export for consumers
export { Rating, State }

const STORAGE_KEY    = 'kq-srs-progress'
const STREAK_KEY     = 'kq-study-dates'
const MIGRATION_KEY  = 'kq-srs-version'
const CURRENT_VERSION = 2  // v2 = FSRS

// ─── Helpers ─────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function readProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function writeProgress(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) } catch {}
}

function recordStudyDate(userId) {
  try {
    const iso   = todayISO()
    const raw   = localStorage.getItem(STREAK_KEY)
    const dates = raw ? JSON.parse(raw) : []
    if (!dates.includes(iso)) {
      localStorage.setItem(STREAK_KEY, JSON.stringify([...dates, iso].slice(-365)))
    }
    // Also save to Supabase for logged-in users
    if (userId) {
      supabase.from('study_dates')
        .upsert({ user_id: userId, date: iso }, { onConflict: 'user_id,date' })
        .then(() => {})
        .catch(() => {})
    }
  } catch {}
}

// ─── Supabase: upsert a single card's progress ──────────────────────────
function upsertCardToCloud(userId, deckId, cardId, cardData) {
  supabase.from('srs_progress')
    .upsert({
      user_id:        userId,
      deck_id:        deckId,
      card_id:        cardId,
      due:            cardData.due,
      stability:      cardData.stability,
      difficulty:     cardData.difficulty,
      elapsed_days:   cardData.elapsed_days || 0,
      scheduled_days: cardData.scheduled_days || 0,
      reps:           cardData.reps || 0,
      lapses:         cardData.lapses || 0,
      learning_steps: cardData.learning_steps || 0,
      state:          cardData.state || 0,
      last_review:    cardData.last_review || null,
      first_studied:  cardData.firstStudied || null,
    }, { onConflict: 'user_id,deck_id,card_id' })
    .then(() => {})
    .catch(err => console.warn('Cloud save failed:', err.message))
}

// ─── Supabase: fetch all progress for a user ─────────────────────────────
async function fetchCloudProgress(userId) {
  try {
    const { data, error } = await supabase
      .from('srs_progress')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    if (!data || data.length === 0) return null

    // Convert rows into our nested { deckId: { cardId: {...} } } format
    const progress = {}
    for (const row of data) {
      if (!progress[row.deck_id]) progress[row.deck_id] = {}
      progress[row.deck_id][row.card_id] = {
        due:            row.due,
        stability:      row.stability,
        difficulty:     row.difficulty,
        elapsed_days:   row.elapsed_days,
        scheduled_days: row.scheduled_days,
        reps:           row.reps,
        lapses:         row.lapses,
        learning_steps: row.learning_steps,
        state:          row.state,
        last_review:    row.last_review,
        firstStudied:   row.first_studied,
      }
    }
    return progress
  } catch (err) {
    console.warn('Cloud fetch failed:', err.message)
    return null
  }
}

// ─── Merge cloud + local progress (cloud wins on conflict) ───────────────
function mergeProgress(local, cloud) {
  if (!cloud) return local
  const merged = { ...local }

  for (const deckId of Object.keys(cloud)) {
    if (!merged[deckId]) {
      merged[deckId] = cloud[deckId]
      continue
    }
    for (const cardId of Object.keys(cloud[deckId])) {
      const cloudCard = cloud[deckId][cardId]
      const localCard = merged[deckId]?.[cardId]

      if (!localCard) {
        merged[deckId][cardId] = cloudCard
      } else {
        // Most recent last_review wins
        const cloudTime = cloudCard.last_review ? new Date(cloudCard.last_review).getTime() : 0
        const localTime = localCard.last_review ? new Date(localCard.last_review).getTime() : 0
        if (cloudTime > localTime) {
          merged[deckId][cardId] = cloudCard
        }
      }
    }
  }
  return merged
}

// ─── Create FSRS scheduler from settings ─────────────────────────────────
function createScheduler() {
  const s = readSettings()
  return new FSRS(generatorParameters({
    request_retention: s.desiredRetention,
    maximum_interval:  s.maximumIntervalDays,
    enable_fuzz:       true,
  }))
}

// ─── SM-2 → FSRS migration ──────────────────────────────────────────────
function migrateIfNeeded() {
  try {
    const ver = parseInt(localStorage.getItem(MIGRATION_KEY) || '0', 10)
    if (ver >= CURRENT_VERSION) return

    const progress = readProgress()
    const migrated = {}

    for (const deckId of Object.keys(progress)) {
      const deckProg = progress[deckId]
      if (!deckProg || typeof deckProg !== 'object') continue

      migrated[deckId] = {}
      for (const cardId of Object.keys(deckProg)) {
        const old = deckProg[cardId]
        if (!old) continue

        if ('stability' in old) {
          migrated[deckId][cardId] = old
          continue
        }

        const wasGraduated = old.graduated === true
        const oldInterval  = old.interval || 0
        const oldEf        = old.ef || 2.5
        const oldReps      = old.reps || 0

        const difficulty = Math.max(1, Math.min(10,
          10 - ((oldEf - 1.3) / (2.5 - 1.3)) * 7
        ))
        const stability = wasGraduated ? Math.max(1, oldInterval) : 0.5

        let state = State.New
        if (wasGraduated && oldInterval > 0) state = State.Review
        else if (oldReps > 0) state = State.Learning

        migrated[deckId][cardId] = {
          due:            old.next || new Date().toISOString(),
          stability,
          difficulty,
          elapsed_days:   oldInterval,
          scheduled_days: oldInterval,
          reps:           oldReps,
          lapses:         0,
          learning_steps: wasGraduated ? 0 : (oldReps > 0 ? 1 : 0),
          state,
          last_review:    old.last || null,
          firstStudied:   old.firstStudied || null,
        }
      }
    }

    writeProgress(migrated)
    localStorage.setItem(MIGRATION_KEY, String(CURRENT_VERSION))
  } catch (e) {
    console.warn('SRS migration failed:', e)
  }
}

// Run migration on module load
migrateIfNeeded()

// ─── State classification ────────────────────────────────────────────────
function isNew(p)        { return !p }
function isLearning(p)   { return p && (p.state === State.Learning || p.state === State.Relearning) }
function isGraduated(p)  { return p && p.state === State.Review }

function isDueNow(p) {
  if (!p) return false
  return new Date(p.due) <= new Date()
}

// ─── Format interval for display ─────────────────────────────────────────
export function formatInterval(card) {
  if (!card) return ''
  const days = card.scheduled_days
  if (days === 0) {
    const now = new Date()
    const due = new Date(card.due)
    const mins = Math.max(1, Math.round((due - now) / 60000))
    if (mins < 60) return `${mins}m`
    return `${Math.round(mins / 60)}h`
  }
  if (days < 30) return `${days}d`
  if (days < 365) return `${(days / 30).toFixed(1).replace(/\.0$/, '')}mo`
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')}y`
}

// ─── Bonus cards for today (per-deck, auto-resets daily) ─────────────────
const BONUS_KEY = 'kq-bonus-cards'

function readBonus(deckId) {
  try {
    const raw = localStorage.getItem(BONUS_KEY)
    if (!raw) return 0
    const all = JSON.parse(raw)
    const entry = all[deckId]
    if (!entry || entry.date !== todayISO()) return 0
    return entry.count || 0
  } catch { return 0 }
}

function writeBonus(deckId, count) {
  try {
    const raw = localStorage.getItem(BONUS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[deckId] = { date: todayISO(), count }
    localStorage.setItem(BONUS_KEY, JSON.stringify(all))
  } catch {}
}

// ─── Get current Supabase user ID (null if guest) ────────────────────────
function useUserId() {
  const [userId, setUserId] = useState(null)
  useEffect(() => {
    if (isGuestMode()) { setUserId(null); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  return userId
}

// ─── Hook ────────────────────────────────────────────────────────────────
export function useSRS(deckId) {
  const [progress, setProgress] = useState(readProgress)
  const [bonus, setBonus]       = useState(() => readBonus(deckId))
  const userId = useUserId()
  const cloudLoaded = useRef(false)

  // ── On mount / auth change: fetch from Supabase and merge ────────
  useEffect(() => {
    if (!userId || cloudLoaded.current) return
    cloudLoaded.current = true

    fetchCloudProgress(userId).then(cloudProgress => {
      if (!cloudProgress) return
      setProgress(prev => {
        const merged = mergeProgress(prev, cloudProgress)
        writeProgress(merged)  // update localStorage cache
        return merged
      })
    })
  }, [userId])

  // Persist to localStorage on change
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    if (ready) writeProgress(progress)
  }, [progress, ready])
  useEffect(() => {
    if (ready) writeBonus(deckId, bonus)
  }, [bonus, ready])

  // ── Rate a card (FSRS) ─────────────────────────────────────────────
  const rate = useCallback((cardId, rating) => {
    recordStudyDate(userId)
    setProgress(prev => {
      const deckProg = prev[deckId] || {}
      const existing = deckProg[cardId]
      const scheduler = createScheduler()
      const now = new Date()

      let card
      if (existing && 'stability' in existing) {
        card = {
          due:            new Date(existing.due),
          stability:      existing.stability,
          difficulty:     existing.difficulty,
          elapsed_days:   existing.elapsed_days,
          scheduled_days: existing.scheduled_days,
          reps:           existing.reps,
          lapses:         existing.lapses,
          learning_steps: existing.learning_steps ?? 0,
          state:          existing.state,
          last_review:    existing.last_review ? new Date(existing.last_review) : undefined,
        }
      } else {
        card = createEmptyCard(now)
      }

      const result = scheduler.repeat(card, now)
      const outcome = result[rating]
      const newCard = outcome.card

      const cardData = {
        due:            newCard.due.toISOString ? newCard.due.toISOString() : new Date(newCard.due).toISOString(),
        stability:      newCard.stability,
        difficulty:     newCard.difficulty,
        elapsed_days:   newCard.elapsed_days,
        scheduled_days: newCard.scheduled_days,
        reps:           newCard.reps,
        lapses:         newCard.lapses,
        learning_steps: newCard.learning_steps ?? 0,
        state:          newCard.state,
        last_review:    newCard.last_review
          ? (newCard.last_review.toISOString ? newCard.last_review.toISOString() : new Date(newCard.last_review).toISOString())
          : now.toISOString(),
        firstStudied:   existing?.firstStudied || now.toISOString(),
      }

      // Fire-and-forget upsert to Supabase for logged-in users
      if (userId) {
        upsertCardToCloud(userId, deckId, cardId, cardData)
      }

      return {
        ...prev,
        [deckId]: {
          ...deckProg,
          [cardId]: cardData,
        },
      }
    })
  }, [deckId, userId])

  // ── Get scheduling preview (for button labels) ─────────────────────
  function getSchedulingPreview(cardId) {
    const existing = (progress[deckId] || {})[cardId]
    const scheduler = createScheduler()
    const now = new Date()

    let card
    if (existing && 'stability' in existing) {
      card = {
        due:            new Date(existing.due),
        stability:      existing.stability,
        difficulty:     existing.difficulty,
        elapsed_days:   existing.elapsed_days,
        scheduled_days: existing.scheduled_days,
        reps:           existing.reps,
        lapses:         existing.lapses,
        learning_steps: existing.learning_steps ?? 0,
        state:          existing.state,
        last_review:    existing.last_review ? new Date(existing.last_review) : undefined,
      }
    } else {
      card = createEmptyCard(now)
    }

    const result = scheduler.repeat(card, now)
    const preview = {}
    for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const c = result[r].card
      preview[r] = {
        card: c,
        interval: formatInterval(c),
      }
    }
    return preview
  }

  // ── Simulate a rating (for stage-up detection without mutating state) ──
  function simulateRate(cardId, rating) {
    const existing = (progress[deckId] || {})[cardId]
    const scheduler = createScheduler()
    const now = new Date()

    let card
    if (existing && 'stability' in existing) {
      card = {
        due:            new Date(existing.due),
        stability:      existing.stability,
        difficulty:     existing.difficulty,
        elapsed_days:   existing.elapsed_days,
        scheduled_days: existing.scheduled_days,
        reps:           existing.reps,
        lapses:         existing.lapses,
        learning_steps: existing.learning_steps ?? 0,
        state:          existing.state,
        last_review:    existing.last_review ? new Date(existing.last_review) : undefined,
      }
    } else {
      card = createEmptyCard(now)
    }

    const result = scheduler.repeat(card, now)
    const outcome = result[rating].card
    return {
      due:            outcome.due.toISOString ? outcome.due.toISOString() : new Date(outcome.due).toISOString(),
      stability:      outcome.stability,
      difficulty:     outcome.difficulty,
      elapsed_days:   outcome.elapsed_days,
      scheduled_days: outcome.scheduled_days,
      reps:           outcome.reps,
      lapses:         outcome.lapses,
      learning_steps: outcome.learning_steps ?? 0,
      state:          outcome.state,
      last_review:    now.toISOString(),
      firstStudied:   existing?.firstStudied || now.toISOString(),
    }
  }

  // ── Card queries ───────────────────────────────────────────────────
  function getCardProgress(cardId) {
    return (progress[deckId] || {})[cardId] ?? null
  }

  function getDueReviews(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return isGraduated(p) && isDueNow(p)
    })
  }

  function getDueLearning(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return isLearning(p) && isDueNow(p)
    })
  }

  function getNewCards(cards) {
    return cards.filter(c => isNew(getCardProgress(c.id)))
  }

  function getLearnedCount(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return p && (p.state === State.Review || (p.reps > 0 && p.state !== undefined))
    }).length
  }

  function getNewIntroducedToday(cards) {
    const today = todayISO()
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return p && p.firstStudied && p.firstStudied.startsWith(today)
    }).length
  }

  function getDueCount(cards) {
    const s = readSettings()
    const reviews  = getDueReviews(cards).length
    const learning = getDueLearning(cards).length
    const alreadyIntroduced = getNewIntroducedToday(cards)
    const todayLimit        = s.newCardsPerDay + bonus
    const remaining         = Math.max(0, todayLimit - alreadyIntroduced)
    const newAvail          = Math.min(getNewCards(cards).length, remaining)
    return reviews + learning + newAvail
  }

  function getNewCount(cards) {
    return getNewCards(cards).length
  }

  function getStudyQueue(cards) {
    const s = readSettings()

    const learning = getDueLearning(cards)
    const reviews  = getDueReviews(cards)

    const alreadyIntroduced = getNewIntroducedToday(cards)
    const todayLimit        = s.newCardsPerDay + bonus
    const remaining         = Math.max(0, todayLimit - alreadyIntroduced)
    const newBatch          = getNewCards(cards).slice(0, remaining)

    const reviewBatch = reviews.slice(0, s.maxReviewsPerDay)

    return { newBatch, reviewBatch, learning }
  }

  function addBonusCards(count) {
    setBonus(prev => prev + count)
  }

  function restoreCardProgress(cardId, snapshot) {
    setProgress(prev => {
      const deckProg = { ...(prev[deckId] || {}) }
      if (snapshot === null || snapshot === undefined) {
        delete deckProg[cardId]
      } else {
        deckProg[cardId] = snapshot
      }

      // Sync restore to cloud too
      if (userId) {
        if (snapshot) {
          upsertCardToCloud(userId, deckId, cardId, snapshot)
        } else {
          // Delete from cloud
          supabase.from('srs_progress')
            .delete()
            .match({ user_id: userId, deck_id: deckId, card_id: cardId })
            .then(() => {})
            .catch(() => {})
        }
      }

      return { ...prev, [deckId]: deckProg }
    })
  }

  return {
    rate,
    getCardProgress,
    restoreCardProgress,
    getSchedulingPreview,
    simulateRate,
    getDueReviews,
    getDueLearning,
    getNewCards,
    getLearnedCount,
    getNewIntroducedToday,
    getDueCount,
    getNewCount,
    getStudyQueue,
    addBonusCards,
  }
}
