import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/hooks/useSettings'
import { readProfile, writeProfile, AVATAR_OPTIONS } from '@/hooks/useOnboarding'
import { useAuth } from '@/contexts/AuthContext'
import { isGuestMode, setGuestMode } from '@/screens/AuthScreen'
import { syncProgress, syncStudyDates } from '@/lib/sync'
import { ALL_DECKS } from '@/data/decks'

// ─── Read real stats from localStorage ───────────────────────────────────
const SRS_KEY    = 'kq-srs-progress'
const STREAK_KEY = 'kq-study-dates'

function readStats() {
  try {
    const raw  = localStorage.getItem(SRS_KEY)
    const prog = raw ? JSON.parse(raw) : {}
    const dates = (() => {
      try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '[]') } catch { return [] }
    })()

    let totalLearned = 0, totalReviewed = 0
    const deckStats = {}
    for (const [deckId, cards] of Object.entries(prog)) {
      let deckLearned = 0
      for (const card of Object.values(cards)) {
        if (card.state >= 2) { totalLearned++; deckLearned++ }
        if (card.last_review) totalReviewed++
      }
      deckStats[deckId] = { learned: deckLearned }
    }

    // Current streak
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let streak = 0
    const cursor = new Date(today)
    while (true) {
      if (dates.includes(cursor.toISOString().split('T')[0])) { streak++; cursor.setDate(cursor.getDate() - 1) }
      else break
    }

    return { totalLearned, totalReviewed, streak, totalDays: dates.length, deckStats }
  } catch {
    return { totalLearned: 0, totalReviewed: 0, streak: 0, totalDays: 0, deckStats: {} }
  }
}

// ─── Achievement definitions ─────────────────────────────────────────────
function computeAchievements(stats) {
  return [
    { id:'first',     icon:'刀',label:'First Blood',        desc:'Study your first card',
      earned: stats.totalReviewed >= 1 },
    { id:'ten',       icon:'十',label:'Into the Fray',      desc:'Learn 10 kanji',
      earned: stats.totalLearned >= 10, progress: Math.min(stats.totalLearned, 10), target: 10 },
    { id:'fifty',     icon:'影',label:'Shadow Reader',       desc:'Learn 50 kanji',
      earned: stats.totalLearned >= 50, progress: Math.min(stats.totalLearned, 50), target: 50 },
    { id:'hundred',   icon:'百',label:'Century Mark',        desc:'Learn 100 kanji',
      earned: stats.totalLearned >= 100, progress: Math.min(stats.totalLearned, 100), target: 100 },
    { id:'fivehundred',icon:'剣',label:'Blade Dancer',      desc:'Learn 500 kanji',
      earned: stats.totalLearned >= 500, progress: Math.min(stats.totalLearned, 500), target: 500 },
    { id:'thousand',  icon:'千',label:'The Thousand',        desc:'Learn 1,000 kanji',
      earned: stats.totalLearned >= 1000, progress: Math.min(stats.totalLearned, 1000), target: 1000 },

    { id:'streak3',   icon:'炎',label:'Spark',              desc:'Study 3 days in a row',
      earned: stats.streak >= 3, progress: Math.min(stats.streak, 3), target: 3 },
    { id:'streak7',   icon:'火',label:'On Fire',            desc:'Study 7 days in a row',
      earned: stats.streak >= 7, progress: Math.min(stats.streak, 7), target: 7 },
    { id:'streak30',  icon:'月',label:'Unbreakable',        desc:'Study 30 days in a row',
      earned: stats.streak >= 30, progress: Math.min(stats.streak, 30), target: 30 },
    { id:'streak100', icon:'龍',label:"Dragon's Discipline",desc:'Study 100 days in a row',
      earned: stats.streak >= 100, progress: Math.min(stats.streak, 100), target: 100 },

    { id:'phantom',   icon:'仮',label:'Phantom Thief',      desc:'Complete the Persona 5 Royal deck',
      earned: (stats.deckStats['p5r']?.learned ?? 0) >= (ALL_DECKS.find(d => d.id === 'p5r')?.cards.length ?? 999),
      progress: stats.deckStats['p5r']?.learned ?? 0,
      target: ALL_DECKS.find(d => d.id === 'p5r')?.cards.length ?? 279 },
    { id:'radicals',  icon:'部',label:'Root Master',        desc:'Learn all Radicals & Primitives',
      earned: (stats.deckStats['radicals']?.learned ?? 0) >= (ALL_DECKS.find(d => d.id === 'radicals')?.cards.length ?? 999),
      progress: stats.deckStats['radicals']?.learned ?? 0,
      target: ALL_DECKS.find(d => d.id === 'radicals')?.cards.length ?? 229 },
    { id:'primer500', icon:'基',label:'Strong Foundation',   desc:'Learn 500 in Kanji 101',
      earned: (stats.deckStats['primer']?.learned ?? 0) >= 500,
      progress: Math.min(stats.deckStats['primer']?.learned ?? 0, 500), target: 500 },

    { id:'days7',     icon:'週',label:'First Week',         desc:'Study on 7 different days',
      earned: stats.totalDays >= 7, progress: Math.min(stats.totalDays, 7), target: 7 },
    { id:'days30',    icon:'暦',label:'A Month of Kanji',   desc:'Study on 30 different days',
      earned: stats.totalDays >= 30, progress: Math.min(stats.totalDays, 30), target: 30 },
  ]
}

// ─── Achievement Tile ────────────────────────────────────────────────────
function AchievementTile({ a, delay }) {
  const hasProgress = !a.earned && a.target && a.progress !== undefined
  const pct = hasProgress ? Math.round((a.progress / a.target) * 100) : 0
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors animate-fade-up relative overflow-hidden
                  ${a.earned ? 'bg-ink-800 border-gold-400/20' : 'bg-ink-900 border-gold-400/6'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-kanji text-xl shrink-0
                       ${a.earned ? 'bg-gold-400/12 text-gold-400 border border-gold-400/25' : 'bg-ink-700 text-parchment-500/25 border border-gold-400/6'}`}>
        {a.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-display italic text-base leading-tight ${a.earned ? 'text-parchment-100' : 'text-parchment-500/60'}`}>{a.label}</p>
        <p className={`font-mono text-[10px] tracking-wide mt-0.5 ${a.earned ? 'text-parchment-500' : 'text-parchment-500/40'}`}>{a.desc}</p>
        {hasProgress && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-[3px] bg-ink-600 rounded-full overflow-hidden">
              <div className="h-full bg-gold-400/40 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-[9px] text-parchment-500/40 tabular-nums shrink-0">{a.progress}/{a.target}</span>
          </div>
        )}
      </div>
      {a.earned && <span className="ml-auto font-mono text-[10px] text-gold-400 shrink-0">✓</span>}
    </div>
  )
}

// ─── Avatar Picker ───────────────────────────────────────────────────────
function AvatarPicker({ current, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-950/90 backdrop-blur-sm flex items-center justify-center p-6"
         onClick={onClose}>
      <div className="bg-ink-800 border border-gold-400/20 rounded-2xl p-5 w-full max-w-sm animate-fade-up"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display italic text-lg text-parchment-100">Choose your avatar</h3>
          <button onClick={onClose} className="font-mono text-[10px] text-parchment-500/50 hover:text-parchment-300 transition-colors">✕</button>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {AVATAR_OPTIONS.map(({ kanji, label }) => (
            <button
              key={kanji}
              onClick={() => onSelect(kanji)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-150
                ${current === kanji
                  ? 'bg-gold-400/12 border-gold-400/40 text-gold-400'
                  : 'bg-ink-700 border-gold-400/8 text-parchment-500/60 hover:border-gold-400/25 hover:text-parchment-300'}`}
            >
              <span className="font-kanji text-2xl">{kanji}</span>
              <span className="font-mono text-[8px] tracking-wider uppercase">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Deck Progress Card ──────────────────────────────────────────────────
function DeckProgressCard({ deck, stats, onPress }) {
  const total = deck.cards.length
  const learned = stats?.learned ?? 0
  const pct = total > 0 ? Math.round((learned / total) * 100) : 0

  return (
    <button onClick={onPress}
      className="w-full text-left bg-ink-800 border border-gold-400/10 rounded-xl px-4 py-3
                 flex items-center gap-3 hover:border-gold-400/25 transition-colors group">
      <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border border-white/5"
           style={{ background: `radial-gradient(circle, ${deck.accentColor || '#C9A84C'}30 0%, #221F1A 80%)` }}>
        <span className="font-kanji text-lg" style={{ color: `${deck.accentColor || '#C9A84C'}CC` }}>{deck.coverKanji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display italic text-sm text-parchment-200 leading-tight truncate">{deck.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-[3px] bg-ink-600 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${pct}%`, backgroundColor: deck.accentColor || '#C9A84C' }} />
          </div>
          <span className="font-mono text-[9px] text-parchment-500/50 tabular-nums shrink-0">{learned}/{total}</span>
        </div>
      </div>
      <span className="font-mono text-[10px] text-gold-400/50 group-hover:text-gold-400 transition-colors shrink-0">→</span>
    </button>
  )
}

// ─── ProfileScreen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { user, isAuthenticated, signOut: authSignOut } = useAuth()
  const guest = isGuestMode() && !isAuthenticated

  const [localProfile, setLocalProfile] = useState(() => readProfile())
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  const stats        = useMemo(() => readStats(), [])
  const achievements = useMemo(() => computeAchievements(stats), [stats])
  const earned  = achievements.filter(a => a.earned)
  const locked  = achievements.filter(a => !a.earned)

  const displayName = isAuthenticated
    ? (user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Learner')
    : (localProfile.displayName || 'Learner')

  const memberSince = (() => {
    try {
      const raw = localStorage.getItem('kq-onboarding')
      if (raw) { const d = new Date(JSON.parse(raw).completedAt); return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
    } catch {}
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })()

  const handleAvatarSelect = useCallback((kanji) => {
    const updated = { ...localProfile, avatarKanji: kanji }
    setLocalProfile(updated)
    writeProfile(updated)
    setShowAvatarPicker(false)
  }, [localProfile])

  async function handleSync() {
    if (!user) return
    setSyncing(true)
    setSyncMsg(null)
    try {
      const result = await syncProgress(user.id)
      await syncStudyDates(user.id)
      setSyncMsg(`Synced! ${result.pulled || 0} pulled, ${result.pushed || 0} pushed`)
    } catch {
      setSyncMsg('Sync failed — check your connection')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  async function handleSignOut() {
    if (!window.confirm('Sign out? Your local progress will be kept.')) return
    try {
      await authSignOut()
      setGuestMode(true)
      navigate('/library', { replace: true })
    } catch {}
  }

  // Decks the user has studied
  const activeDecks = ALL_DECKS.filter(d => stats.deckStats[d.id])

  return (
    <div className="px-5 py-6 pb-10 space-y-6">

      {/* ── Avatar + name ── */}
      <div className="flex items-center gap-4 animate-fade-up">
        <button
          onClick={() => setShowAvatarPicker(true)}
          className="w-16 h-16 rounded-full border-2 border-gold-400/40 bg-ink-800
                      flex items-center justify-center font-kanji text-3xl text-gold-400
                      hover:border-gold-400/60 hover:bg-ink-700 transition-colors relative group"
        >
          {localProfile.avatarKanji}
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-ink-700 border border-gold-400/30
                           rounded-full flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gold-400">
              <path d="M7.5 1.5l1 1-5.5 5.5H2V7L7.5 1.5z" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
          </span>
        </button>
        <div>
          <h1 className="font-display italic text-2xl text-parchment-100">{displayName}</h1>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">
            {isAuthenticated ? user?.email : 'Guest'} · {memberSince}
          </p>
        </div>
      </div>

      {/* ── Live Stats ── */}
      <div className="grid grid-cols-4 gap-2.5 animate-fade-up delay-100">
        {[
          { n: stats.totalLearned,  l: 'Learned' },
          { n: stats.streak,        l: 'Streak' },
          { n: stats.totalDays,     l: 'Days' },
          { n: stats.totalReviewed, l: 'Reviews' },
        ].map(({ n, l }) => (
          <div key={l} className="bg-ink-800 rounded-xl p-2.5 text-center border border-gold-400/10">
            <p className="font-display italic text-2xl text-gold-400 leading-none">{n}</p>
            <p className="font-mono text-[8px] text-parchment-500 tracking-widest uppercase mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* ── Deck Progress ── */}
      {activeDecks.length > 0 && (
        <div className="animate-fade-up delay-200">
          <div className="gold-divider mb-4">
            <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Deck Progress</span>
          </div>
          <div className="space-y-2">
            {activeDecks.map(deck => (
              <DeckProgressCard
                key={deck.id}
                deck={deck}
                stats={stats.deckStats[deck.id]}
                onPress={() => navigate(`/deck/${deck.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Achievements ── */}
      <div className="animate-fade-up">
        <div className="gold-divider mb-1">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Achievements</span>
        </div>
        <p className="font-mono text-[10px] text-parchment-500/40 text-center mb-4">{earned.length} / {achievements.length} unlocked</p>
        <div className="space-y-2">
          {earned.map((a, i)  => <AchievementTile key={a.id} a={a} delay={(i + 3) * 0.04} />)}
          {earned.length > 0 && locked.length > 0 && (
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gold-400/8" />
              <span className="font-mono text-[8px] text-parchment-500/25 tracking-widest uppercase">Locked</span>
              <div className="flex-1 h-px bg-gold-400/8" />
            </div>
          )}
          {locked.map((a, i) => <AchievementTile key={a.id} a={a} delay={(earned.length + i + 4) * 0.04} />)}
        </div>
      </div>

      {/* ── SRS Settings ── */}
      <div className="animate-fade-up">
        <div className="gold-divider mb-4">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Study settings</span>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="w-full bg-ink-800 border border-gold-400/10 rounded-xl px-4 py-4 flex items-center justify-between
                     hover:border-gold-400/25 transition-colors group"
        >
          <div>
            <p className="font-body text-sm text-parchment-200 text-left">FSRS Algorithm Settings</p>
            <p className="font-mono text-[10px] text-parchment-500/50 mt-0.5">
              Retention: {Math.round(settings.desiredRetention * 100)}% · {settings.newCardsPerDay} new/day · {settings.maxReviewsPerDay} max reviews
            </p>
          </div>
          <span className="font-mono text-[10px] text-gold-400/50 group-hover:text-gold-400 transition-colors">→</span>
        </button>
      </div>

      {/* ── Account ── */}
      <div className="animate-fade-up">
        <div className="gold-divider mb-4">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Account</span>
        </div>

        {isAuthenticated ? (
          <div className="space-y-1">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full text-left px-1 py-3 font-display italic text-parchment-400
                         border-b border-gold-400/8 hover:text-gold-400 transition-colors text-base
                         flex items-center justify-between"
            >
              <span>{syncing ? 'Syncing...' : 'Sync progress'}</span>
              {syncing && <span className="w-4 h-4 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />}
            </button>

            {syncMsg && (
              <p className={`font-mono text-[10px] px-1 py-1.5 ${syncMsg.includes('failed') ? 'text-ember' : 'text-emerald-400'}`}>
                {syncMsg}
              </p>
            )}

            <button
              onClick={handleSignOut}
              className="w-full text-left px-1 py-3 font-display italic text-parchment-400
                         border-b border-gold-400/8 hover:text-ember transition-colors text-base"
            >
              Sign out
            </button>

            <button
              onClick={() => { if (window.confirm('Replay the intro guide? (Your study progress is kept.)')) { try { localStorage.removeItem('kq-onboarding') } catch {} window.location.href = '/onboarding' } }}
              className="w-full text-left px-1 py-3 font-display italic text-parchment-500/50
                         hover:text-parchment-400 transition-colors text-base"
            >
              Replay intro guide
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-ink-800 border border-gold-400/12 rounded-xl p-4">
              <p className="font-display italic text-base text-parchment-200 mb-1">Studying as guest</p>
              <p className="font-mono text-[10px] text-parchment-500/50 leading-relaxed mb-3">
                Progress saved on this device only. Sign in to sync across devices and back up your data.
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="w-full py-2.5 rounded-lg bg-gold-400/15 border border-gold-400/40
                           font-display italic text-gold-400 text-base
                           hover:bg-gold-400/25 transition-colors"
              >
                Sign in or create account
              </button>
            </div>

            <button
              onClick={() => { if (window.confirm('Replay the intro guide? (Your study progress is kept.)')) { try { localStorage.removeItem('kq-onboarding') } catch {} window.location.href = '/onboarding' } }}
              className="w-full text-left px-1 py-3 font-display italic text-parchment-500/50
                         hover:text-parchment-400 transition-colors text-base"
            >
              Replay intro guide
            </button>
          </div>
        )}
      </div>

      {/* Avatar Picker Overlay */}
      {showAvatarPicker && (
        <AvatarPicker
          current={localProfile.avatarKanji}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  )
}
