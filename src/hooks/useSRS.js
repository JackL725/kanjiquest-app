import { useState, useEffect } from 'react'
import { readSettings } from './useSettings'

const STORAGE_KEY = 'kq-srs-progress'
const STREAK_KEY  = 'kq-study-dates'

function recordStudyDate() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const iso   = today.toISOString().split('T')[0]
    const raw   = localStorage.getItem(STREAK_KEY)
    const dates = raw ? JSON.parse(raw) : []
    if (!dates.includes(iso)) {
      localStorage.setItem(STREAK_KEY, JSON.stringify([...dates, iso].slice(-90)))
    }
  } catch {}
}

// sm2 — KanjiQuest variant
// Ease values in settings are stored as integer % (250 = 2.50×)
function sm2(prev, q) {
  const s   = readSettings()
  const ef0 = s.startingEase  / 100   // e.g. 2.50
  const efMin = s.minimumEase / 100   // e.g. 1.30
  const bonus = s.easyBonus   / 100   // e.g. 1.30
  const mod   = s.intervalModifier / 100 // e.g. 1.00
  const maxD  = s.maximumIntervalDays

  let { interval = 0, reps = 0, ef = ef0 } = prev || {}
  const next = new Date()

  switch (q) {
    case 0:
      // Again — full reset, show again in 10 min
      reps     = 0
      interval = 0
      next.setMinutes(next.getMinutes() + 10)
      break

    case 2:
      // Hard — +N minutes, no rep credit
      interval = 0
      next.setMinutes(next.getMinutes() + s.hardIntervalMins)
      // Don't touch reps or ef
      break

    case 4:
      // Good — +goodIntervalDays (new) or interval×ef (review)
      reps++
      interval = reps === 1
        ? s.goodIntervalDays
        : Math.max(Math.round(interval * ef * mod), s.goodIntervalDays)
      interval = Math.min(interval, maxD)
      ef = Math.max(efMin, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      next.setDate(next.getDate() + interval)
      break

    case 5:
      // Easy — +easyIntervalDays (new) or interval×ef×bonus (review)
      reps++
      interval = reps === 1
        ? s.easyIntervalDays
        : Math.max(Math.round(interval * ef * mod * bonus), s.easyIntervalDays)
      interval = Math.min(interval, maxD)
      ef = Math.max(efMin, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      next.setDate(next.getDate() + interval)
      break

    default:
      break
  }

  return { interval, reps, ef, next: next.toISOString(), last: new Date().toISOString() }
}

function isDue(p) {
  // No progress = new card, not a due review
  if (!p) return false
  // Again/Hard cards have reps=0 but a scheduled next time — they are due if that time has passed
  if (p.reps === 0 && p.last) return new Date(p.next) <= new Date()
  // Normal review cards
  return new Date(p.next) <= new Date()
}

function isNew(p) {
  return !p
}

export function useSRS(deckId) {
  const [progress, setProgress] = useState({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setProgress(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) } catch {}
  }, [progress])

  function rate(cardId, q) {
    recordStudyDate()
    setProgress(prev => ({
      ...prev,
      [deckId]: {
        ...(prev[deckId] || {}),
        [cardId]: sm2((prev[deckId] || {})[cardId], q),
      },
    }))
  }

  function getCardProgress(cardId) {
    return (progress[deckId] || {})[cardId] ?? null
  }

  function getDueCards(cards) {
    return cards.filter(c => isDue(getCardProgress(c.id)))
  }

  function getNewCards(cards) {
    return cards.filter(c => isNew(getCardProgress(c.id)))
  }

  function getLearnedCount(cards) {
    return cards.filter(c => (getCardProgress(c.id)?.reps ?? 0) > 0).length
  }

  // Cards to study today = reviews due + new cards up to daily limit
  function getDueCount(cards) {
    const s        = readSettings()
    const reviews  = getDueCards(cards).length
    const newAvail = Math.min(getNewCards(cards).length, s.newCardsPerDay)
    return reviews + newAvail
  }

  // New cards never seen before
  function getNewCount(cards) {
    return getNewCards(cards).length
  }

  return { rate, getCardProgress, getDueCards, getNewCards, getLearnedCount, getDueCount, getNewCount }
}
