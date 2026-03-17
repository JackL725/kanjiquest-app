import { useMemo } from 'react'

// ─── ReviewHeatmap ──────────────────────────────────────────────────────
// GitHub-style contribution grid showing study activity over the last N weeks.
// Each cell = one day. Color intensity maps to number of reviews that day.
// Reads from kq-study-dates (array of ISO date strings) and kq-session-logs.

const STREAK_KEY = 'kq-study-dates'
const LOG_KEY    = 'kq-session-logs'
const WEEKS      = 16            // ~4 months of data
const TOTAL_DAYS = WEEKS * 7

// Intensity tiers — maps review count to color class
const TIERS = [
  { min: 0,  bg: 'bg-ink-700/50', border: 'border-ink-600/40'  },   // no study
  { min: 1,  bg: 'bg-gold-400/10', border: 'border-gold-400/15' },  // light
  { min: 10, bg: 'bg-gold-400/25', border: 'border-gold-400/25' },  // moderate
  { min: 30, bg: 'bg-gold-400/45', border: 'border-gold-400/35' },  // solid
  { min: 60, bg: 'bg-gold-400/70', border: 'border-gold-400/50' },  // heavy
]

function getTier(count) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (count >= TIERS[i].min) return TIERS[i]
  }
  return TIERS[0]
}

function readHeatmapData() {
  try {
    const dates = JSON.parse(localStorage.getItem(STREAK_KEY) || '[]')
    const logs  = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')

    // Build a map of date → review count from session logs
    const countByDate = {}
    for (const log of logs) {
      if (!log.date) continue
      countByDate[log.date] = (countByDate[log.date] || 0) + (log.reviewed || 0)
    }

    // For dates that appear in study-dates but not in logs, assume 1 review
    for (const d of dates) {
      if (!countByDate[d]) countByDate[d] = 1
    }

    // Build grid: start from today, go back TOTAL_DAYS
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // We want weeks as columns, days as rows (Mon=0 on top, Sun=6 on bottom)
    // Start from the most recent Sunday to align the grid
    const endDay = new Date(today)

    const cells = []
    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      const count = countByDate[iso] || 0
      cells.push({ iso, count, dow: d.getDay() })
    }

    // Streak
    let streak = 0, bestStreak = 0
    const cursor = new Date(today)
    while (true) {
      const iso = cursor.toISOString().split('T')[0]
      if (dates.includes(iso)) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else break
    }

    // Best streak
    const sortedDates = [...new Set(dates)].sort()
    let run = 0
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) { run = 1 }
      else {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diff = (curr - prev) / (1000 * 60 * 60 * 24)
        run = diff === 1 ? run + 1 : 1
      }
      if (run > bestStreak) bestStreak = run
    }

    const totalDays = new Set(dates).size
    const totalReviews = Object.values(countByDate).reduce((s, v) => s + v, 0)

    return { cells, streak, bestStreak, totalDays, totalReviews }
  } catch {
    return { cells: [], streak: 0, bestStreak: 0, totalDays: 0, totalReviews: 0 }
  }
}

// ─── Month labels ──────────────────────────────────────────────────────
function getMonthLabels(cells) {
  const labels = []
  let lastMonth = -1
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  for (let i = 0; i < cells.length; i++) {
    const d = new Date(cells[i].iso)
    const m = d.getMonth()
    if (m !== lastMonth) {
      // Calculate week column index
      const weekIdx = Math.floor(i / 7)
      labels.push({ label: MONTHS[m], weekIdx })
      lastMonth = m
    }
  }
  return labels
}

export default function ReviewHeatmap() {
  const data = useMemo(() => readHeatmapData(), [])

  const { cells, streak, bestStreak, totalDays } = data

  // Build week columns (7 rows each)
  const weeks = useMemo(() => {
    const w = []
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7))
    }
    return w
  }, [cells])

  const monthLabels = useMemo(() => getMonthLabels(cells), [cells])

  if (cells.length === 0) return null

  return (
    <div className="animate-fade-up">
      <div className="gold-divider mb-4">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
          Study Activity
        </span>
      </div>

      <div className="bg-ink-800 border border-gold-400/10 rounded-xl p-4 overflow-hidden">
        {/* Stats row */}
        <div className="flex items-center gap-5 mb-4">
          <div>
            <p className="font-display italic text-2xl text-gold-400 leading-none">{streak}</p>
            <p className="font-mono text-[8px] text-parchment-500 tracking-widest uppercase mt-1">
              Current
            </p>
          </div>
          <div className="w-px h-8 bg-gold-400/10" />
          <div>
            <p className="font-display italic text-2xl text-parchment-300 leading-none">{bestStreak}</p>
            <p className="font-mono text-[8px] text-parchment-500 tracking-widest uppercase mt-1">
              Best
            </p>
          </div>
          <div className="w-px h-8 bg-gold-400/10" />
          <div>
            <p className="font-display italic text-2xl text-parchment-300 leading-none">{totalDays}</p>
            <p className="font-mono text-[8px] text-parchment-500 tracking-widest uppercase mt-1">
              Total days
            </p>
          </div>
        </div>

        {/* Month labels */}
        <div className="relative ml-5 mb-1 h-3 overflow-hidden">
          {monthLabels.map((ml, idx) => (
            <span
              key={idx}
              className="absolute font-mono text-[8px] text-parchment-500/50 tracking-wider"
              style={{ left: `${(ml.weekIdx / weeks.length) * 100}%` }}
            >
              {ml.label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[2px] overflow-x-auto scrollbar-thin pb-1">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[2px] shrink-0 mr-[2px]">
            {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
              <div key={i} className="w-3 h-[10px] flex items-center justify-center">
                <span className="font-mono text-[7px] text-parchment-500/30">{d}</span>
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((cell, di) => {
                const tier = getTier(cell.count)
                const isToday = cell.iso === new Date().toISOString().split('T')[0]
                return (
                  <div
                    key={di}
                    className={`w-[10px] h-[10px] rounded-[2px] border transition-colors duration-200
                      ${tier.bg} ${tier.border}
                      ${isToday ? 'ring-1 ring-gold-400/40' : ''}`}
                    title={`${cell.iso}: ${cell.count} reviews`}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="font-mono text-[7px] text-parchment-500/30 mr-1">Less</span>
          {TIERS.map((t, i) => (
            <div key={i} className={`w-[10px] h-[10px] rounded-[2px] border ${t.bg} ${t.border}`} />
          ))}
          <span className="font-mono text-[7px] text-parchment-500/30 ml-1">More</span>
        </div>
      </div>
    </div>
  )
}
