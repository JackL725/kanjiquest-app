import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOwnedDecks } from '@/data/decks'

// ─── Daily Quest Board ──────────────────────────────────────────────────
// Generates 3–4 rotating daily objectives themed like JRPG side quests.
// Tracks completion in localStorage. Resets at midnight.

const QUEST_KEY  = 'kq-daily-quests'
const SRS_KEY    = 'kq-srs-progress'
const LOG_KEY    = 'kq-session-logs'
const STREAK_KEY = 'kq-study-dates'

function todayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// Seeded random from date string → deterministic daily selection
function seededRand(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  return () => { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 2147483647 }
}

function shuffle(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Quest Templates ────────────────────────────────────────────────────
// Each template has: id, title (JRPG-styled), desc, icon (kanji), xp reward,
// target number, and a `check` function that reads localStorage to get progress.

function buildQuestPool() {
  return [
    // Review quests
    {
      id: 'review-10',
      title: 'Morning Patrol',
      desc: 'Review 10 cards',
      icon: '巡',
      xp: 15,
      target: 10,
      check: () => getTodayReviews(),
    },
    {
      id: 'review-25',
      title: 'Blade Drill',
      desc: 'Review 25 cards',
      icon: '刃',
      xp: 30,
      target: 25,
      check: () => getTodayReviews(),
    },
    {
      id: 'review-50',
      title: 'Endurance Run',
      desc: 'Review 50 cards',
      icon: '走',
      xp: 50,
      target: 50,
      check: () => getTodayReviews(),
    },

    // New card quests
    {
      id: 'new-3',
      title: 'Scout Ahead',
      desc: 'Learn 3 new kanji',
      icon: '探',
      xp: 20,
      target: 3,
      check: () => getTodayNewCards(),
    },
    {
      id: 'new-5',
      title: 'New Horizons',
      desc: 'Learn 5 new kanji',
      icon: '新',
      xp: 35,
      target: 5,
      check: () => getTodayNewCards(),
    },

    // Session quests
    {
      id: 'session-1',
      title: 'First Steps',
      desc: 'Complete a study session',
      icon: '歩',
      xp: 10,
      target: 1,
      check: () => getTodaySessions(),
    },
    {
      id: 'session-2',
      title: 'Double Strike',
      desc: 'Complete 2 study sessions',
      icon: '双',
      xp: 25,
      target: 2,
      check: () => getTodaySessions(),
    },

    // Accuracy quests
    {
      id: 'accuracy-80',
      title: 'Steady Hand',
      desc: 'Finish a session with 80%+ accuracy',
      icon: '精',
      xp: 20,
      target: 1,
      check: () => getTodayAccuracySessions(80),
    },
    {
      id: 'perfect',
      title: 'Flawless Victory',
      desc: 'Complete a perfect session (100%)',
      icon: '完',
      xp: 40,
      target: 1,
      check: () => getTodayAccuracySessions(100),
    },

    // Streak quests
    {
      id: 'streak-alive',
      title: 'Keep the Flame',
      desc: 'Study today to maintain your streak',
      icon: '炎',
      xp: 15,
      target: 1,
      check: () => {
        try {
          const dates = JSON.parse(localStorage.getItem(STREAK_KEY) || '[]')
          return dates.includes(todayISO()) ? 1 : 0
        } catch { return 0 }
      },
    },

    // Time quests
    {
      id: 'time-5',
      title: 'Quick Draw',
      desc: 'Study for 5 minutes today',
      icon: '速',
      xp: 15,
      target: 300,
      check: () => getTodayStudyTime(),
      formatProgress: (cur, tgt) => `${Math.floor(cur / 60)}m / ${Math.floor(tgt / 60)}m`,
    },
    {
      id: 'time-15',
      title: 'Deep Focus',
      desc: 'Study for 15 minutes today',
      icon: '集',
      xp: 35,
      target: 900,
      check: () => getTodayStudyTime(),
      formatProgress: (cur, tgt) => `${Math.floor(cur / 60)}m / ${Math.floor(tgt / 60)}m`,
    },

    // Multi-deck quest
    {
      id: 'multi-deck',
      title: 'World Traveler',
      desc: 'Study from 2 different decks',
      icon: '旅',
      xp: 25,
      target: 2,
      check: () => getTodayDeckCount(),
    },
  ]
}

// ─── Progress readers ───────────────────────────────────────────────────

function getTodayLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
    const today = todayISO()
    return logs.filter(l => l.date === today)
  } catch { return [] }
}

function getTodayReviews() {
  return getTodayLogs().reduce((s, l) => s + (l.reviewed || 0), 0)
}

function getTodayNewCards() {
  try {
    const prog = JSON.parse(localStorage.getItem(SRS_KEY) || '{}')
    const today = todayISO()
    let count = 0
    for (const deckCards of Object.values(prog)) {
      for (const card of Object.values(deckCards)) {
        if (card.firstStudied && card.firstStudied.startsWith(today)) count++
      }
    }
    return count
  } catch { return 0 }
}

function getTodaySessions() {
  return getTodayLogs().length
}

function getTodayAccuracySessions(minPct) {
  const logs = getTodayLogs()
  return logs.filter(l => {
    const total = l.reviewed || 0
    const correct = l.correct || 0
    if (total === 0) return false
    return Math.round((correct / total) * 100) >= minPct
  }).length
}

function getTodayStudyTime() {
  return getTodayLogs().reduce((s, l) => s + (l.duration || 0), 0)
}

function getTodayDeckCount() {
  const logs = getTodayLogs()
  return new Set(logs.map(l => l.deckId).filter(Boolean)).size
}

// ─── Quest selection & persistence ──────────────────────────────────────

function getDailyQuests() {
  const today = todayISO()

  // Check cached quests for today
  try {
    const cached = JSON.parse(localStorage.getItem(QUEST_KEY) || '{}')
    if (cached.date === today && cached.questIds?.length) {
      const pool = buildQuestPool()
      const quests = cached.questIds
        .map(id => pool.find(q => q.id === id))
        .filter(Boolean)
      if (quests.length >= 3) return quests
    }
  } catch {}

  // Generate new quests for today
  const pool = buildQuestPool()
  const rand = seededRand(today + '-kq-v2')

  // Separate into categories to ensure variety
  const categories = {
    review:  pool.filter(q => q.id.startsWith('review-')),
    newCard: pool.filter(q => q.id.startsWith('new-')),
    session: pool.filter(q => q.id.startsWith('session-') || q.id === 'streak-alive'),
    bonus:   pool.filter(q => ['accuracy-80','perfect','time-5','time-15','multi-deck'].includes(q.id)),
  }

  // Pick 1 from review, 1 from new/session, 1 from bonus, maybe 1 more
  const picks = []
  const pickFrom = (arr) => { const s = shuffle(arr, rand); return s[0] }

  picks.push(pickFrom(categories.review))
  picks.push(pickFrom([...categories.newCard, ...categories.session]))
  picks.push(pickFrom(categories.bonus))

  // 50% chance of a 4th quest
  if (rand() > 0.5) {
    const remaining = pool.filter(q => !picks.find(p => p.id === q.id))
    if (remaining.length) picks.push(pickFrom(remaining))
  }

  // Cache
  try {
    localStorage.setItem(QUEST_KEY, JSON.stringify({
      date: today,
      questIds: picks.map(q => q.id),
    }))
  } catch {}

  return picks
}

// ─── Quest Card ─────────────────────────────────────────────────────────

function QuestCard({ quest, delay = 0 }) {
  const progress = quest.check()
  const completed = progress >= quest.target
  const pct = Math.min(100, Math.round((progress / quest.target) * 100))

  const progressLabel = quest.formatProgress
    ? quest.formatProgress(progress, quest.target)
    : `${Math.min(progress, quest.target)} / ${quest.target}`

  return (
    <div
      className={`relative flex items-center gap-3.5 rounded-xl px-4 py-3.5 border
                  transition-all duration-300 animate-fade-up overflow-hidden
                  ${completed
                    ? 'bg-gold-400/8 border-gold-400/25'
                    : 'bg-ink-800 border-gold-400/8 hover:border-gold-400/15'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Quest icon */}
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors
                       ${completed
                         ? 'bg-gold-400/15 border border-gold-400/30'
                         : 'bg-ink-700 border border-gold-400/8'}`}>
        <span className={`font-kanji text-xl ${completed ? 'text-gold-400' : 'text-parchment-500/40'}`}>
          {quest.icon}
        </span>
      </div>

      {/* Quest info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-display italic text-sm leading-tight truncate
                        ${completed ? 'text-gold-400' : 'text-parchment-200'}`}>
            {quest.title}
          </p>
          {completed && (
            <span className="font-mono text-[9px] text-gold-400 tracking-wider shrink-0">✓</span>
          )}
        </div>
        <p className={`font-mono text-[10px] mt-0.5
                      ${completed ? 'text-gold-400/60' : 'text-parchment-500/50'}`}>
          {quest.desc}
        </p>

        {/* Progress bar */}
        {!completed && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-[3px] bg-ink-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-400/50 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-parchment-500/40 tabular-nums shrink-0">
              {progressLabel}
            </span>
          </div>
        )}
      </div>

      {/* XP badge */}
      <div className={`shrink-0 text-right ${completed ? 'opacity-60' : ''}`}>
        <span className={`font-mono text-[10px] tracking-wide
                         ${completed ? 'text-gold-400/50' : 'text-gold-400/70'}`}>
          +{quest.xp}
        </span>
        <p className="font-mono text-[7px] text-parchment-500/30 tracking-widest uppercase">XP</p>
      </div>
    </div>
  )
}

// ─── DailyQuestBoard ────────────────────────────────────────────────────

export default function DailyQuestBoard() {
  const navigate = useNavigate()
  const [quests, setQuests] = useState(() => getDailyQuests())
  const [, setTick] = useState(0)

  // Re-check quest progress every 2 seconds when tab is visible
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(iv)
  }, [])

  const completedCount = quests.filter(q => q.check() >= q.target).length
  const totalXP = quests.reduce((s, q) => s + q.xp, 0)
  const earnedXP = quests.filter(q => q.check() >= q.target).reduce((s, q) => s + q.xp, 0)
  const allDone = completedCount === quests.length
  const pct = quests.length > 0 ? Math.round((completedCount / quests.length) * 100) : 0

  return (
    <div className="animate-fade-up delay-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="gold-divider flex-1">
            <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
              Daily Quests
            </span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden transition-colors duration-500
                       ${allDone ? 'border-gold-400/25 bg-ink-800/50' : 'border-gold-400/8'}`}>
        {/* Progress header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors
                              ${allDone
                                ? 'bg-gold-400/20 border-gold-400/40'
                                : 'bg-ink-700 border-gold-400/10'}`}>
                <span className={`font-kanji text-base ${allDone ? 'text-gold-400' : 'text-parchment-500/40'}`}>
                  {allDone ? '★' : '☆'}
                </span>
              </div>
              <div>
                <p className={`font-display italic text-sm leading-tight
                              ${allDone ? 'text-gold-400' : 'text-parchment-200'}`}>
                  {allDone ? 'All quests complete!' : `${completedCount} of ${quests.length} complete`}
                </p>
                <p className="font-mono text-[9px] text-parchment-500/40 mt-0.5">
                  {earnedXP} / {totalXP} XP earned today
                </p>
              </div>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="h-[3px] bg-ink-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out
                         ${allDone ? 'bg-gold-400' : 'bg-gold-400/50'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Quest list */}
        <div className="px-3 pb-3 space-y-1.5">
          {quests.map((quest, i) => (
            <QuestCard key={quest.id} quest={quest} delay={(i + 1) * 0.06} />
          ))}
        </div>

        {/* All-done bonus banner */}
        {allDone && (
          <div className="mx-3 mb-3 bg-gold-400/8 border border-gold-400/20 rounded-lg px-4 py-3
                          flex items-center justify-between animate-fade-up">
            <div>
              <p className="font-display italic text-sm text-gold-400">Daily bonus earned</p>
              <p className="font-mono text-[9px] text-gold-400/50 mt-0.5">Come back tomorrow for new quests</p>
            </div>
            <span className="font-display italic text-xl text-gold-400">+{totalXP}</span>
          </div>
        )}
      </div>
    </div>
  )
}
