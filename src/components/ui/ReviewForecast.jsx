import { useMemo } from 'react'
import { getOwnedDecks } from '@/data/decks'

// ─── ReviewForecast ─────────────────────────────────────────────────────
// Shows how many reviews are coming over the next 7 days.
// Reads FSRS due dates from localStorage progress data.

const SRS_KEY = 'kq-srs-progress'

function readForecast() {
  try {
    const prog  = JSON.parse(localStorage.getItem(SRS_KEY) || '{}')
    const decks = getOwnedDecks()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build 7-day forecast
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const start = new Date(d); start.setHours(0, 0, 0, 0)
      const end   = new Date(d); end.setHours(23, 59, 59, 999)
      return { date: d, start, end, count: 0, label: '', iso: d.toISOString().split('T')[0] }
    })

    // Day labels
    const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    days.forEach((day, i) => {
      if (i === 0)      day.label = 'Today'
      else if (i === 1) day.label = 'Tomorrow'
      else              day.label = DAY_LABELS[day.date.getDay()]
    })

    // Count reviews due each day
    for (const deck of decks) {
      const dp = prog[deck.id] || {}
      for (const card of deck.cards) {
        const p = dp[card.id]
        if (!p || p.state < 2) continue  // only graduated cards have scheduled reviews
        const due = new Date(p.due)
        for (const day of days) {
          if (due >= day.start && due <= day.end) {
            day.count++
            break
          }
          // If due before today, add to today's count
          if (due < day.start && day === days[0]) {
            day.count++
            break
          }
        }
      }
    }

    const maxCount = Math.max(...days.map(d => d.count), 1)
    return { days, maxCount }
  } catch {
    return { days: [], maxCount: 0 }
  }
}

export default function ReviewForecast() {
  const { days, maxCount } = useMemo(() => readForecast(), [])

  if (days.length === 0) return null

  const totalWeek = days.reduce((s, d) => s + d.count, 0)

  return (
    <div className="bg-ink-800 border border-gold-400/10 rounded-xl p-5
                    animate-fade-up delay-200 relative overflow-hidden">
      {/* Ghost kanji */}
      <span className="absolute -top-2 right-3 font-kanji text-6xl leading-none
                       text-gold-400/[0.05] select-none pointer-events-none">
        予
      </span>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase">
            7-Day Forecast
          </p>
        </div>
        <div className="text-right">
          <span className="font-display italic text-lg text-gold-400">{totalWeek}</span>
          <span className="font-mono text-[9px] text-parchment-500/50 ml-1.5">this week</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5" style={{ height: '72px' }}>
        {days.map((day, i) => {
          const pct  = maxCount > 0 ? (day.count / maxCount) * 100 : 0
          const minH = day.count > 0 ? 12 : 4 // min height so bars are visible
          const isToday = i === 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              {/* Count label */}
              {day.count > 0 && (
                <span className={`font-mono text-[9px] tabular-nums leading-none
                  ${isToday ? 'text-gold-400' : 'text-parchment-500/50'}`}>
                  {day.count}
                </span>
              )}

              {/* Bar */}
              <div
                className={`w-full rounded-sm transition-all duration-700 ease-out
                  ${isToday
                    ? 'bg-gold-400/50 border border-gold-400/40'
                    : day.count > 0
                    ? 'bg-gold-400/15 border border-gold-400/12'
                    : 'bg-ink-700 border border-ink-600/40'
                  }`}
                style={{ height: `${Math.max(pct, minH)}%` }}
              />

              {/* Day label */}
              <span className={`font-mono text-[8px] tracking-wider shrink-0
                ${isToday ? 'text-gold-400/70' : 'text-parchment-500/30'}`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
