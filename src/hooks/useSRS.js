import { useState, useEffect, useCallback } from 'react'
import {
  FSRS,
  createEmptyCard,
  generatorParameters,
  Rating,
  State,
} from 'ts-fsrs'
import { readSettings } from './useSettings'

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

function recordStudyDate() {
  try {
    const iso   = todayISO()
    const raw   = localStorage.getItem(STREAK_KEY)
    const dates = raw ? JSON.parse(raw) : []
    if (!dates.includes(iso)) {
      localStorage.setItem(STREAK_KEY, JSON.stringify([...dates, iso].slice(-365)))
    }
  } catch {}
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
// Runs once on first load after upgrade. Converts old progress records to
// FSRS card format with reasonable approximations.
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

        // Already FSRS format? (has 'stability' field)
        if ('stability' in old) {
          migrated[deckId][cardId] = old
          continue
        }

        // Old SM-2 format → FSRS card
        const wasGraduated = old.graduated === true
        const oldInterval  = old.interval || 0
        const oldEf        = old.ef || 2.5
        const oldReps      = old.reps || 0

        // Map ease factor to FSRS difficulty (1-10 scale)
        // ef=2.5 (easy) → D≈3, ef=1.3 (hard) → D≈8
        const difficulty = Math.max(1, Math.min(10,
          10 - ((oldEf - 1.3) / (2.5 - 1.3)) * 7
        ))

        // Map interval to stability (they're roughly equivalent)
        const stability = wasGraduated ? Math.max(1, oldInterval) : 0.5

        // Map state
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
          // KQ metadata
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
    // Intra-day: compute minutes from due
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

// ─── Hook ────────────────────────────────────────────────────────────────
export function useSRS(deckId) {
  const [progress, setProgress] = useState(readProgress)
  const [bonus, setBonus]       = useState(() => readBonus(deckId))

  // Persist on change
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    if (ready) writeProgress(progress)
  }, [progress, ready])
  useEffect(() => {
    if (ready) writeBonus(deckId, bonus)
  }, [bonus, ready])

  // ── Rate a card (FSRS) ─────────────────────────────────────────────
  // rating: Rating.Again(1), Rating.Hard(2), Rating.Good(3), Rating.Easy(4)
  const rate = useCallback((cardId, rating) => {
    recordStudyDate()
    setProgress(prev => {
      const deckProg = prev[deckId] || {}
      const existing = deckProg[cardId]
      const scheduler = createScheduler()
      const now = new Date()

      // Build FSRS card object from stored progress (or create new)
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

      // Schedule
      const result = scheduler.repeat(card, now)
      const outcome = result[rating]
      const newCard = outcome.card

      return {
        ...prev,
        [deckId]: {
          ...deckProg,
          [cardId]: {
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
            // KQ metadata
            firstStudied:   existing?.firstStudied || now.toISOString(),
          },
        },
      }
    })
  }, [deckId])

  // ── Get scheduling preview (for button labels) ─────────────────────
  // Returns { [Rating.Again]: { card, interval }, ... } for all 4 ratings
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

  // Reviews due: graduated cards (state=Review) whose due time has passed
  function getDueReviews(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return isGraduated(p) && isDueNow(p)
    })
  }

  // Learning: cards in learning/relearning phase that are due now
  function getDueLearning(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return isLearning(p) && isDueNow(p)
    })
  }

  // Cards never seen before
  function getNewCards(cards) {
    return cards.filter(c => isNew(getCardProgress(c.id)))
  }

  // Cards that have graduated at least once (state=Review, even if lapsed)
  function getLearnedCount(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return p && (p.state === State.Review || (p.reps > 0 && p.state !== undefined))
    }).length
  }

  // How many new cards were first introduced TODAY in this deck
  function getNewIntroducedToday(cards) {
    const today = todayISO()
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return p && p.firstStudied && p.firstStudied.startsWith(today)
    }).length
  }

  // Total cards to study today
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

  // Build study queue: learning first (time-sensitive), then reviews, then new
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

  // Restore a card's SRS state (used by undo)
  function restoreCardProgress(cardId, snapshot) {
    setProgress(prev => {
      const deckProg = { ...(prev[deckId] || {}) }
      if (snapshot === null || snapshot === undefined) {
        delete deckProg[cardId]
      } else {
        deckProg[cardId] = snapshot
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
