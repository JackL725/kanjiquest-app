import { useState, useEffect } from 'react'

export const SETTINGS_KEY = 'kq-settings'

// All values stored as display-friendly units:
// ease/bonus/modifier stored as integer % (250 = 2.50×)
// intervals stored in their natural unit (days or minutes)
export const DEFAULT_SETTINGS = {
  // Daily limits
  newCardsPerDay:       20,
  maxReviewsPerDay:     200,
  // Intervals
  hardIntervalMins:     10,    // minutes
  goodIntervalDays:     1,     // days
  easyIntervalDays:     3,     // days
  maximumIntervalDays:  365,   // days
  // Ease (stored as integer %)
  startingEase:         250,   // 2.50× → 250%
  minimumEase:          130,   // 1.30× → 130%
  easyBonus:            130,   // 1.30× → 130%
  intervalModifier:     100,   // 1.00× → 100%
}

export function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
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
