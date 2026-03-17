import { useState, useEffect } from 'react'

export const SETTINGS_KEY = 'kq-settings'

// FSRS simplifies everything down to a few meaningful controls:
// - desiredRetention: the probability of recall you want to maintain (0.70–0.97)
// - newCardsPerDay: how many new cards to introduce per day
// - maxReviewsPerDay: cap on reviews per session
// - maximumIntervalDays: longest possible gap between reviews
//
// All the SM-2 knobs (ease factor, interval modifier, easy bonus, etc.)
// are replaced by FSRS's machine-learning-derived parameters.
export const DEFAULT_SETTINGS = {
  // Daily limits
  newCardsPerDay:       20,
  maxReviewsPerDay:     200,
  // FSRS core
  desiredRetention:     0.90,   // 90% target recall probability
  maximumIntervalDays:  365,    // max days between reviews
  // Legacy fields (kept for backward compat, no longer used by algorithm)
  hardIntervalMins:     10,
  goodIntervalDays:     1,
  easyIntervalDays:     3,
  startingEase:         250,
  minimumEase:          130,
  easyBonus:            130,
  intervalModifier:     100,
}

export function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const saved = raw ? JSON.parse(raw) : {}
    // Ensure desiredRetention exists (migration from old settings)
    if (!saved.desiredRetention && saved.intervalModifier) {
      // Approximate: old intervalModifier maps loosely to retention
      // 100% modifier ≈ 0.90 retention, higher modifier ≈ higher retention
      saved.desiredRetention = 0.90
    }
    return { ...DEFAULT_SETTINGS, ...saved }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(readSettings)

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch {}
  }, [settings])

  function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function resetToDefaults() {
    setSettings({ ...DEFAULT_SETTINGS })
  }

  return { settings, updateSetting, resetToDefaults }
}
