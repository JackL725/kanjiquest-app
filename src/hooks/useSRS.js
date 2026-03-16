import { useState, useEffect } from 'react'

const STORAGE_KEY  = 'kq-srs-progress'
const STREAK_KEY   = 'kq-study-dates'

function recordStudyDate() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const iso   = today.toISOString().split('T')[0]
    const raw   = localStorage.getItem(STREAK_KEY)
    const dates = raw ? JSON.parse(raw) : []
    if (!dates.includes(iso)) {
      // Keep last 90 days to avoid unbounded growth
      const updated = [...dates, iso].slice(-90)
      localStorage.setItem(STREAK_KEY, JSON.stringify(updated))
    }
  } catch {}
}

function sm2(prev, q) {
  let { interval = 0, reps = 0, ef = 2.5 } = prev || {}
  if (q >= 3) {
    if (reps === 0) interval = 1
    else if (reps === 1) interval = 6
    else interval = Math.round(interval * ef)
    reps++
  } else {
    interval = 1
    reps = 0
  }
  ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const next = new Date()
  next.setDate(next.getDate() + interval)
  return {
    interval,
    reps,
    ef,
    next: next.toISOString(),
    last: new Date().toISOString(),
  }
}

function isDue(p) {
  return !p || p.reps === 0 || new Date(p.next) <= new Date()
}

export function useSRS(deckId) {
  const [progress, setProgress] = useState({})

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setProgress(JSON.parse(raw))
    } catch {}
  }, [])

  // Save whenever progress changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {}
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

  function getLearnedCount(cards) {
    return cards.filter(c => (getCardProgress(c.id)?.reps ?? 0) > 0).length
  }

  function getDueCount(cards) {
    return getDueCards(cards).length
  }

  return { rate, getCardProgress, getDueCards, getLearnedCount, getDueCount }
}
