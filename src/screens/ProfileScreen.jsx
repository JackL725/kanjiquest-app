import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings'
import { readProfile } from '@/hooks/useOnboarding'
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
        if (card.reps > 0) { totalLearned++; deckLearned++ }
        if (card.last) totalReviewed++
      }
      deckStats[deckId] = { learned: deckLearned }
    }

    const today = new Date(); today.setHours(0, 0, 0, 0)
    let streak = 0
    const cursor = new Date(today)
    while (true) {
      if (dates.includes(cursor.toISOString().split('T')[0])) { streak++; cursor.setDate(cursor.getDate() - 1) }
      else break
    }

    return { totalLearned, totalReviewed, streak, totalDays: dates.length,
             activeDecks: Object.keys(prog).filter(id => Object.values(prog[id]).some(c => c.reps > 0)).length,
             deckStats }
  } catch {
    return { totalLearned: 0, totalReviewed: 0, streak: 0, totalDays: 0, activeDecks: 0, deckStats: {} }
  }
}

// ─── Achievement definitions (computed from real data) ───────────────────
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
      earned: (stats.deckStats['p5r']?.learned ?? 0) >= (ALL_DECKS.find(d => d.id === 'p5r')?.cards.length ?? 999) },
    { id:'radicals',  icon:'部',label:'Root Master',        desc:'Learn all Radicals & Primitives',
      earned: (stats.deckStats['radicals']?.learned ?? 0) >= (ALL_DECKS.find(d => d.id === 'radicals')?.cards.length ?? 999),
      progress: Math.min(stats.deckStats['radicals']?.learned ?? 0, ALL_DECKS.find(d => d.id === 'radicals')?.cards.length ?? 229),
      target: ALL_DECKS.find(d => d.id === 'radicals')?.cards.length ?? 229 },
    { id:'primer500', icon:'基',label:'Strong Foundation',   desc:'Learn 500 in Single Character Kanji 101',
      earned: (stats.deckStats['primer']?.learned ?? 0) >= 500,
      progress: Math.min(stats.deckStats['primer']?.learned ?? 0, 500), target: 500 },

    { id:'days7',     icon:'週',label:'First Week',         desc:'Study on 7 different days',
      earned: stats.totalDays >= 7, progress: Math.min(stats.totalDays, 7), target: 7 },
    { id:'days30',    icon:'暦',label:'A Month of Kanji',   desc:'Study on 30 different days',
      earned: stats.totalDays >= 30, progress: Math.min(stats.totalDays, 30), target: 30 },
  ]
}

// ─── Shared SettingRow ───────────────────────────────────────────────────
function SettingRow({ label, description, value, min, max, step = 1, unit = '', onChange, last = false }) {
  const display = unit === '%' ? `${value}${unit}` : unit ? `${value} ${unit}` : `${value}`
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3.5
                     ${!last ? 'border-b border-gold-400/8' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-parchment-200 leading-tight">{label}</p>
        {description && <p className="font-mono text-[10px] text-parchment-500/50 mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(10)))}
          className="w-8 h-8 rounded-lg bg-ink-700 border border-gold-400/12 text-parchment-400 font-mono text-lg leading-none
                     hover:border-gold-400/30 hover:text-gold-400 transition-colors duration-150 flex items-center justify-center touch-manipulation">−</button>
        <span className="font-mono text-[12px] text-parchment-100 w-[60px] text-center tabular-nums">{display}</span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(10)))}
          className="w-8 h-8 rounded-lg bg-ink-700 border border-gold-400/12 text-parchment-400 font-mono text-lg leading-none
                     hover:border-gold-400/30 hover:text-gold-400 transition-colors duration-150 flex items-center justify-center touch-manipulation">+</button>
      </div>
    </div>
  )
}

function SettingsBlock({ settings, updateSetting, resetToDefaults }) {
  const changed = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)
  const s = settings
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase px-1 mb-1.5">Daily limits</p>
        <div className="bg-ink-800 border border-gold-400/8 rounded-xl overflow-hidden">
          <SettingRow label="New cards / day" value={s.newCardsPerDay} min={1} max={9999} step={5} onChange={v => updateSetting('newCardsPerDay', v)} />
          <SettingRow label="Max reviews / day" value={s.maxReviewsPerDay} min={10} max={9999} step={10} onChange={v => updateSetting('maxReviewsPerDay', v)} last />
        </div>
      </div>
      <div>
        <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase px-1 mb-1.5">Intervals</p>
        <div className="bg-ink-800 border border-gold-400/8 rounded-xl overflow-hidden">
          <SettingRow label="Hard interval" value={s.hardIntervalMins} min={1} max={1440} step={5} unit="min" onChange={v => updateSetting('hardIntervalMins', v)} />
          <SettingRow label="Good interval" value={s.goodIntervalDays} min={1} max={30} step={1} unit="days" onChange={v => updateSetting('goodIntervalDays', v)} />
          <SettingRow label="Easy interval" value={s.easyIntervalDays} min={1} max={90} step={1} unit="days" onChange={v => updateSetting('easyIntervalDays', v)} />
          <SettingRow label="Max interval" value={s.maximumIntervalDays} min={30} max={36500} step={30} unit="days" onChange={v => updateSetting('maximumIntervalDays', v)} last />
        </div>
      </div>
      <div>
        <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase px-1 mb-1.5">Ease factor</p>
        <div className="bg-ink-800 border border-gold-400/8 rounded-xl overflow-hidden">
          <SettingRow label="Starting ease" value={s.startingEase} min={130} max={500} step={10} unit="%" onChange={v => updateSetting('startingEase', v)} />
          <SettingRow label="Easy bonus" value={s.easyBonus} min={100} max={300} step={10} unit="%" onChange={v => updateSetting('easyBonus', v)} />
          <SettingRow label="Interval modifier" value={s.intervalModifier} min={50} max={500} step={5} unit="%" onChange={v => updateSetting('intervalModifier', v)} />
          <SettingRow label="Minimum ease" value={s.minimumEase} min={100} max={250} step={5} unit="%" onChange={v => updateSetting('minimumEase', v)} last />
        </div>
      </div>
      {changed && (
        <button onClick={() => { if (window.confirm('Reset all settings to defaults?')) resetToDefaults() }}
          className="w-full border border-ember/20 text-ember/60 font-mono text-[10px] tracking-widest uppercase py-3 rounded-xl hover:border-ember/40 hover:text-ember transition-colors duration-200">
          Reset to defaults
        </button>
      )}
    </div>
  )
}

// ─── Achievement tile ────────────────────────────────────────────────────
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

// ─── ProfileScreen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigate = useNavigate()
  const { settings, updateSetting, resetToDefaults } = useSettings()
  const profile      = useMemo(() => readProfile(), [])
  const stats        = useMemo(() => readStats(), [])
  const achievements = useMemo(() => computeAchievements(stats), [stats])
  const earned  = achievements.filter(a => a.earned)
  const locked  = achievements.filter(a => !a.earned)

  const memberSince = (() => {
    try {
      const raw = localStorage.getItem('kq-onboarding')
      if (raw) { const d = new Date(JSON.parse(raw).completedAt); return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
    } catch {}
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })()

  return (
    <div className="px-5 py-6 pb-10 space-y-6">

      {/* ── Avatar + name ── */}
      <div className="flex items-center gap-4 animate-fade-up">
        <div className="w-16 h-16 rounded-full border-2 border-gold-400/40 bg-ink-800
                        flex items-center justify-center font-kanji text-3xl text-gold-400">
          {profile.avatarKanji}
        </div>
        <div>
          <h1 className="font-display italic text-2xl text-parchment-100">{profile.displayName || 'Learner'}</h1>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">Member since {memberSince}</p>
        </div>
      </div>

      {/* ── Live Stats ── */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up delay-100">
        {[
          { n: stats.totalLearned, l: 'Learned' },
          { n: stats.streak,       l: 'Day streak' },
          { n: stats.totalDays,    l: 'Days studied' },
        ].map(({ n, l }) => (
          <div key={l} className="bg-ink-800 rounded-xl p-3 text-center border border-gold-400/10">
            <p className="font-display italic text-3xl text-gold-400 leading-none">{n}</p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* ── Achievements ── */}
      <div className="animate-fade-up delay-200">
        <div className="gold-divider mb-1">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Achievements</span>
        </div>
        <p className="font-mono text-[10px] text-parchment-500/40 text-center mb-4">{earned.length} / {achievements.length} unlocked</p>
        <div className="space-y-2">
          {earned.map((a, i)  => <AchievementTile key={a.id} a={a} delay={(i + 3) * 0.05} />)}
          {earned.length > 0 && locked.length > 0 && (
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gold-400/8" />
              <span className="font-mono text-[8px] text-parchment-500/25 tracking-widest uppercase">Locked</span>
              <div className="flex-1 h-px bg-gold-400/8" />
            </div>
          )}
          {locked.map((a, i) => <AchievementTile key={a.id} a={a} delay={(earned.length + i + 4) * 0.05} />)}
        </div>
      </div>

      {/* ── SRS Settings ── */}
      <div className="animate-fade-up">
        <div className="gold-divider mb-4">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Study settings</span>
        </div>
        <SettingsBlock settings={settings} updateSetting={updateSetting} resetToDefaults={resetToDefaults} />
        <p className="font-mono text-[9px] text-parchment-500/30 tracking-widest uppercase text-center mt-4">
          Settings apply immediately · Progress is never deleted
        </p>
      </div>

      {/* ── Account ── */}
      <div className="animate-fade-up">
        <div className="gold-divider mb-4">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Account</span>
        </div>
        <div className="space-y-1">
          {['Edit profile', 'Manage subscription', 'Sync progress', 'Sign out'].map(label => (
            <button key={label} className="w-full text-left px-1 py-3 font-display italic text-parchment-400
                       border-b border-gold-400/8 hover:text-gold-400 transition-colors text-base last:border-0">{label}</button>
          ))}
          <button onClick={() => { if (window.confirm('Replay the intro guide? (Your study progress is kept.)')) { try { localStorage.removeItem('kq-onboarding') } catch {} window.location.href = '/onboarding' } }}
            className="w-full text-left px-1 py-3 font-display italic text-parchment-500/50 hover:text-parchment-400 transition-colors text-base">
            Replay intro guide
          </button>
        </div>
      </div>
    </div>
  )
}
