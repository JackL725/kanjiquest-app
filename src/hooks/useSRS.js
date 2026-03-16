import { useState, useEffect, useCallback } from 'react'
import { readSettings } from './useSettings'

const STORAGE_KEY = 'kq-srs-progress'
const STREAK_KEY  = 'kq-study-dates'

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

// ─── SM-2 (KanjiQuest variant) ───────────────────────────────────────────
//
// Card progress record:
// {
//   interval:     number  — current interval in days (0 = intra-day / learning)
//   reps:         number  — consecutive correct answers since last lapse
//   ef:           number  — ease factor (multiplier, e.g. 2.5)
//   next:         string  — ISO datetime when card is next due
//   last:         string  — ISO datetime of last review
//   firstStudied: string  — ISO datetime of very first review (never changes)
//   graduated:    boolean — true once the card has been rated Good/Easy at least once
// }
//
// Card states:
//   NEW       — no progress record exists
//   LEARNING  — progress exists, graduated === false (initial learning phase)
//   REVIEW    — progress exists, graduated === true, next <= now (due review)
//   MASTERED  — progress exists, graduated === true, next > now (not yet due)
//
function sm2(prev, q) {
  const s     = readSettings()
  const ef0   = s.startingEase / 100
  const efMin = s.minimumEase  / 100
  const bonus = s.easyBonus    / 100
  const mod   = s.intervalModifier / 100
  const maxD  = s.maximumIntervalDays

  let { interval = 0, reps = 0, ef = ef0, graduated = false } = prev || {}
  const now  = new Date()
  const next = new Date()

  switch (q) {
    case 0: // Again — full reset to learning state
      reps     = 0
      interval = 0
      // graduated stays — you don't un-learn a card, you re-learn it
      next.setMinutes(next.getMinutes() + 10)
      break

    case 2: // Hard — stay in current phase, short delay
      // Don't reset reps (the effort still counts), but don't increment either
      // Preserve interval for the next Good calculation
      next.setMinutes(next.getMinutes() + s.hardIntervalMins)
      break

    case 4: { // Good — graduate or advance
      reps++
      graduated = true

      if (reps === 1) {
        // First graduation: use the fixed "good" interval
        interval = s.goodIntervalDays
      } else {
        // Subsequent: grow from current interval
        const base = Math.max(interval, s.goodIntervalDays)
        interval = Math.round(base * ef * mod)
        interval = Math.max(interval, s.goodIntervalDays)
      }
      interval = Math.min(interval, maxD)

      // Update ease factor (SM-2 formula)
      ef = Math.max(efMin, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      next.setDate(next.getDate() + interval)
      break
    }

    case 5: { // Easy — graduate with bonus
      reps++
      graduated = true

      if (reps === 1) {
        interval = s.easyIntervalDays
      } else {
        const base = Math.max(interval, s.easyIntervalDays)
        interval = Math.round(base * ef * mod * bonus)
        interval = Math.max(interval, s.easyIntervalDays)
      }
      interval = Math.min(interval, maxD)

      ef = Math.max(efMin, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      next.setDate(next.getDate() + interval)
      break
    }

    default:
      break
  }

  return {
    interval,
    reps,
    ef,
    next:         next.toISOString(),
    last:         now.toISOString(),
    firstStudied: prev?.firstStudied || now.toISOString(),
    graduated,
  }
}

// ─── State classification ────────────────────────────────────────────────
function isNew(p)       { return !p }
function isLearning(p)  { return p && !p.graduated }
function isGraduated(p) { return p && p.graduated === true }

function isDueNow(p) {
  if (!p) return false
  return new Date(p.next) <= new Date()
}

// ─── Hook ────────────────────────────────────────────────────────────────
export function useSRS(deckId) {
  // Lazy init from localStorage — no race condition
  const [progress, setProgress] = useState(readProgress)

  // Persist on change — but skip the initial read
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    if (ready) writeProgress(progress)
  }, [progress, ready])

  // ── Rate a card ────────────────────────────────────────────────────
  const rate = useCallback((cardId, q) => {
    recordStudyDate()
    setProgress(prev => {
      const deckProg = prev[deckId] || {}
      return {
        ...prev,
        [deckId]: {
          ...deckProg,
          [cardId]: sm2(deckProg[cardId], q),
        },
      }
    })
  }, [deckId])

  // ── Card queries ───────────────────────────────────────────────────
  function getCardProgress(cardId) {
    return (progress[deckId] || {})[cardId] ?? null
  }

  // Reviews due: graduated cards whose next time has passed
  function getDueReviews(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return isGraduated(p) && isDueNow(p)
    })
  }

  // Learning: cards in learning phase that are due now
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

  // Cards that have graduated at least once (even if currently lapsed)
  function getLearnedCount(cards) {
    return cards.filter(c => {
      const p = getCardProgress(c.id)
      return p && p.graduated === true
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

  // Total cards to study today: reviews + learning + new card allotment
  function getDueCount(cards) {
    const s = readSettings()

    const reviews  = getDueReviews(cards).length
    const learning = getDueLearning(cards).length

    // New card budget: daily limit minus cards already introduced today
    const alreadyIntroduced = getNewIntroducedToday(cards)
    const remaining         = Math.max(0, s.newCardsPerDay - alreadyIntroduced)
    const newAvail          = Math.min(getNewCards(cards).length, remaining)

    return reviews + learning + newAvail
  }

  // Total unseen cards
  function getNewCount(cards) {
    return getNewCards(cards).length
  }

  // For StudyScreen: build the cards that should be studied right now
  function getStudyQueue(cards) {
    const s = readSettings()

    const reviews  = getDueReviews(cards)
    const learning = getDueLearning(cards)

    const alreadyIntroduced = getNewIntroducedToday(cards)
    const remaining         = Math.max(0, s.newCardsPerDay - alreadyIntroduced)
    const newBatch          = getNewCards(cards).slice(0, remaining)

    const reviewBatch = reviews.slice(0, s.maxReviewsPerDay)

    return { newBatch, reviewBatch, learning }
  }

  return {
    rate,
    getCardProgress,
    getDueReviews,
    getDueLearning,
    getNewCards,
    getLearnedCount,
    getNewIntroducedToday,
    getDueCount,
    getNewCount,
    getStudyQueue,
  }
}

