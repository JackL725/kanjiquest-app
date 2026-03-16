import { useState, useEffect, useCallback } from 'react'

const ONBOARDING_KEY = 'kq-onboarding'
const PROFILE_KEY    = 'kq-user-profile'

// ─── Study pace presets ──────────────────────────────────────────────────
// Each preset maps to SRS settings that make sense for that pace.
export const PACE_PRESETS = {
  casual: {
    label:            'Casual',
    subtitle:         '5 new cards / day',
    description:      'A relaxed pace. Great for busy schedules.',
    emoji:            '🍵',
    newCardsPerDay:   5,
    maxReviewsPerDay: 50,
  },
  steady: {
    label:            'Steady',
    subtitle:         '10 new cards / day',
    description:      'A balanced pace. You\'ll make consistent progress.',
    emoji:            '⚔️',
    newCardsPerDay:   10,
    maxReviewsPerDay: 100,
  },
  committed: {
    label:            'Committed',
    subtitle:         '20 new cards / day',
    description:      'For dedicated learners ready to invest time daily.',
    emoji:            '🔥',
    newCardsPerDay:   20,
    maxReviewsPerDay: 200,
  },
  intense: {
    label:            'Intense',
    subtitle:         '30 new cards / day',
    description:      'Maximum speed. Reviews will stack up fast.',
    emoji:            '⚡',
    newCardsPerDay:   30,
    maxReviewsPerDay: 300,
  },
}

// ─── Japanese experience levels ──────────────────────────────────────────
export const EXPERIENCE_LEVELS = {
  none: {
    label:       'Complete beginner',
    description: 'I don\'t know any Japanese yet.',
    kanji:       '初',
  },
  kana: {
    label:       'Know hiragana & katakana',
    description: 'I can read the basic scripts.',
    kanji:       '仮',
  },
  some: {
    label:       'Know some kanji',
    description: 'I\'ve studied before or know 50–200 kanji.',
    kanji:       '学',
  },
  intermediate: {
    label:       'Intermediate+',
    description: 'I can read simple Japanese text.',
    kanji:       '読',
  },
}

// ─── Avatar kanji choices ────────────────────────────────────────────────
export const AVATAR_OPTIONS = [
  { kanji: '侍', label: 'samurai'  },
  { kanji: '竜', label: 'dragon'   },
  { kanji: '刀', label: 'blade'    },
  { kanji: '月', label: 'moon'     },
  { kanji: '星', label: 'star'     },
  { kanji: '風', label: 'wind'     },
  { kanji: '火', label: 'fire'     },
  { kanji: '心', label: 'heart'    },
  { kanji: '夢', label: 'dream'    },
  { kanji: '光', label: 'light'    },
  { kanji: '影', label: 'shadow'   },
  { kanji: '魂', label: 'soul'     },
]

// ─── Default user profile ────────────────────────────────────────────────
export const DEFAULT_PROFILE = {
  displayName:     '',
  avatarKanji:     '侍',
  experienceLevel: 'none',
  studyPace:       'steady',
}

// ─── Read / write helpers ────────────────────────────────────────────────
export function isOnboardingComplete() {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    return raw ? JSON.parse(raw).complete === true : false
  } catch { return false }
}

export function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE }
  } catch { return { ...DEFAULT_PROFILE } }
}

export function writeProfile(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) } catch {}
}

// ─── Hook ────────────────────────────────────────────────────────────────
export function useOnboarding() {
  const [complete, setComplete] = useState(() => isOnboardingComplete())
  const [profile, setProfile]   = useState(() => readProfile())

  // Persist profile whenever it changes
  useEffect(() => { writeProfile(profile) }, [profile])

  const updateProfile = useCallback((key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }))
  }, [])

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
        complete: true,
        completedAt: new Date().toISOString(),
      }))
    } catch {}
    setComplete(true)
  }, [])

  const resetOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY)
      localStorage.removeItem(PROFILE_KEY)
    } catch {}
    setComplete(false)
    setProfile({ ...DEFAULT_PROFILE })
  }, [])

  return {
    complete,
    profile,
    updateProfile,
    completeOnboarding,
    resetOnboarding,
  }
}
