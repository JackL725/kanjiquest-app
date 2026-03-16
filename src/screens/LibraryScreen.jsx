import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOwnedDecks } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'

// ─── Sync utility: read due count without hooks ───────────────────────────
// Avoids calling useSRS inside a loop (Rules of Hooks violation).
function readTotalDue(decks) {
  try {
    const raw  = localStorage.getItem('kq-srs-progress')
    const prog = raw ? JSON.parse(raw) : {}
    return decks.reduce((sum, deck) => {
      const dp = prog[deck.id] || {}
      return sum + deck.cards.filter(c => {
        const p = dp[c.id]
        return !p || p.reps === 0 || new Date(p.next) <= new Date()
      }).length
    }, 0)
  } catch { return 0 }
}

// ─── Time-aware greeting ──────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h <  5) return 'Still at it,'
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  if (h < 21) return 'Good evening,'
  return 'Studying late,'
}

// ─── Streak data from localStorage ───────────────────────────────────────
const STREAK_KEY = 'kq-study-dates'
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function readStreakData() {
  try {
    const raw   = localStorage.getItem(STREAK_KEY)
    const dates = raw ? JSON.parse(raw) : []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      const iso = d.toISOString().split('T')[0]
      const dow = d.getDay()
      return { iso, dow, studied: dates.includes(iso) }
    })

    let streak = 0
    const cursor = new Date(today)
    while (true) {
      const iso = cursor.toISOString().split('T')[0]
      if (dates.includes(iso)) { streak++; cursor.setDate(cursor.getDate() - 1) }
      else break
    }

    return { streak, last7 }
  } catch {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      return { iso: d.toISOString().split('T')[0], dow: d.getDay(), studied: false }
    })
    return { streak: 0, last7 }
  }
}

// ─── DeckCard ─────────────────────────────────────────────────────────────
function DeckCard({ deck, delay = 0 }) {
  const navigate = useNavigate()
  const { getLearnedCount, getDueCount } = useSRS(deck.id)

  const learned = getLearnedCount(deck.cards)
  const due     = getDueCount(deck.cards)
  const total   = deck.cards.length
  const pct     = total > 0 ? Math.round((learned / total) * 100) : 0

  return (
    <div
      onClick={() => navigate(`/deck/${deck.id}`)}
      className="relative bg-ink-800 border border-gold-400/10 rounded-xl p-5 cursor-pointer
                 hover:border-gold-400/30 hover:bg-ink-700/40
                 transition-all duration-200 animate-fade-up overflow-hidden group"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Ghost kanji watermark */}
      <span className="absolute -top-1 right-3 font-kanji text-7xl leading-none
                       text-gold-400/[0.07] select-none pointer-events-none
                       group-hover:text-gold-400/[0.13] transition-colors duration-300">
        {deck.coverKanji}
      </span>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="font-display italic text-parchment-100 text-lg leading-tight truncate">
            {deck.title}
          </p>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">
            {deck.genre} · {deck.developer}
          </p>
        </div>

        {due > 0 ? (
          <span className="shrink-0 font-mono text-[9px] tracking-widest uppercase
                           bg-gold-400/10 text-gold-400 border border-gold-400/25
                           rounded-md px-2 py-1 leading-none mt-0.5">
            {due} due
          </span>
        ) : learned > 0 ? (
          <span className="shrink-0 font-mono text-[9px] tracking-widest uppercase
                           text-parchment-500/40 border border-parchment-500/10
                           rounded-md px-2 py-1 leading-none mt-0.5">
            ✓ current
          </span>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="mb-2.5">
        <div className="h-[3px] bg-ink-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-parchment-500">
          {learned} / {total} learned
        </span>
        <span className="font-mono text-[10px] text-parchment-500/40">
          {pct}%
        </span>
      </div>
    </div>
  )
}

// ─── Due Today Banner ─────────────────────────────────────────────────────
function DueBanner({ totalDue, deckId }) {
  const navigate = useNavigate()
  return (
    <div className="bg-ink-800 border border-gold-400/20 rounded-xl overflow-hidden
                    animate-fade-up delay-100">
      <div className="flex items-center gap-5 px-5 pt-5 pb-4">
        <div className="shrink-0">
          <p className="font-display italic text-5xl text-gold-400 leading-none">
            {totalDue}
          </p>
          <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-1.5">
            cards due
          </p>
        </div>
        <div className="w-px self-stretch bg-gold-400/10" />
        <div>
          <p className="font-display italic text-parchment-200 text-base leading-snug">
            Your reviews are waiting
          </p>
          <p className="font-mono text-[10px] text-parchment-500 tracking-wide mt-0.5">
            Consistency is the secret weapon
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate(`/study/${deckId}`)}
        className="w-full border-t border-gold-400/15 py-3 font-display italic
                   text-gold-400 text-base hover:bg-gold-400/8
                   transition-colors duration-200 tracking-wide"
      >
        Begin study →
      </button>
    </div>
  )
}

// ─── All Caught Up Banner ─────────────────────────────────────────────────
function CaughtUpBanner() {
  return (
    <div className="bg-ink-800 border border-gold-400/10 rounded-xl p-5
                    flex items-center gap-4 animate-fade-up delay-100">
      <div className="w-10 h-10 rounded-full border border-gold-400/20 bg-gold-400/5
                      flex items-center justify-center shrink-0">
        <span className="font-kanji text-lg text-gold-400/50">完</span>
      </div>
      <div>
        <p className="font-display italic text-parchment-200 text-base">All caught up</p>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">
          Come back tomorrow · Keep the streak alive
        </p>
      </div>
    </div>
  )
}

// ─── Streak Widget ────────────────────────────────────────────────────────
function StreakWidget({ streak, last7 }) {
  return (
    <div className="bg-ink-800 border border-ember/15 rounded-xl p-5
                    animate-fade-up delay-400 relative overflow-hidden">
      {/* Ghost kanji */}
      <span className="absolute -top-3 right-3 font-kanji text-7xl leading-none
                       text-ember/[0.07] select-none pointer-events-none">
        炎
      </span>

      {/* Header row */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 rounded-full bg-ember/10 border border-ember/25
                        flex items-center justify-center shrink-0 text-ember">
          ◆
        </div>
        <div>
          {streak > 0 ? (
            <>
              <p className="font-display italic text-parchment-100 text-2xl leading-none">
                {streak}
                <span className="text-parchment-500 text-base font-display font-normal ml-2">
                  {streak === 1 ? 'day' : 'days'}
                </span>
              </p>
              <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
                Study streak · Keep it alive
              </p>
            </>
          ) : (
            <>
              <p className="font-display italic text-parchment-400 text-xl leading-none">
                No streak yet
              </p>
              <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
                Study today to start one
              </p>
            </>
          )}
        </div>
      </div>

      {/* 7-day dot tracker */}
      <div className="flex items-end gap-1.5">
        {last7.map(({ dow, studied }, i) => {
          const isToday = i === 6
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-sm transition-colors duration-300 ${
                  studied
                    ? 'bg-ember border border-ember/60'
                    : isToday
                    ? 'bg-ink-700 border border-ember/30'
                    : 'bg-ink-700 border border-ink-600'
                }`}
                style={{ aspectRatio: '1' }}
              />
              <span className={`font-mono text-[8px] tracking-widest ${
                isToday ? 'text-ember/70' : 'text-parchment-500/35'
              }`}>
                {DAY_LABELS[dow]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center text-center py-14 px-4 animate-fade-up delay-100">

      {/* Ghost kanji */}
      <div className="relative mb-8 select-none pointer-events-none">
        <span className="font-kanji text-[100px] leading-none text-gold-400/[0.09]">漢</span>
        <span className="absolute inset-0 font-kanji text-[100px] leading-none
                         text-gold-400/[0.05] blur-md">漢</span>
      </div>

      <h2 className="font-display italic text-2xl text-parchment-200 mb-3">
        Your library is empty
      </h2>

      {/* Divider */}
      <div className="flex items-center gap-3 w-28 mb-4">
        <div className="flex-1 h-px bg-gold-400/15" />
        <span className="font-kanji text-gold-400/30 text-xs">·</span>
        <div className="flex-1 h-px bg-gold-400/15" />
      </div>

      <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[260px] mb-8">
        Study the kanji before you play. Every card is built from real
        in-game text — so every character you learn, you'll actually see.
      </p>

      <button
        onClick={() => navigate('/browse')}
        className="w-full max-w-[240px] bg-gold-400/8 border border-gold-400/30
                   text-gold-400 font-display italic text-lg py-3.5 rounded-xl
                   hover:bg-gold-400/16 hover:border-gold-400/50
                   transition-all duration-200"
      >
        Browse decks
      </button>

      <p className="font-mono text-[9px] text-parchment-500/35 tracking-widest
                    uppercase mt-5">
        Kanji Primer is free · No account required
      </p>
    </div>
  )
}

// ─── LibraryScreen ────────────────────────────────────────────────────────
export default function LibraryScreen() {
  const navigate           = useNavigate()
  const decks              = getOwnedDecks()
  const hasDecks           = decks.length > 0
  const totalDue           = useMemo(() => readTotalDue(decks), [])
  const { streak, last7 }  = useMemo(() => readStreakData(), [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="px-5 py-6 space-y-5 pb-10">

      {/* ── Greeting ────────────────────────────────────── */}
      <div className="animate-fade-up">
        <h1 className="font-display italic text-2xl text-parchment-100">
          {getGreeting()}{' '}
          <em className="text-gold-400 not-italic">Learner</em>
        </h1>
        <p className="font-mono text-[11px] text-parchment-500 tracking-widest uppercase mt-1">
          {today}
        </p>
      </div>

      {/* ── Status Banner ───────────────────────────────── */}
      {hasDecks && totalDue > 0 && (
        <DueBanner totalDue={totalDue} deckId={decks[0]?.id} />
      )}
      {hasDecks && totalDue === 0 && <CaughtUpBanner />}

      {/* ── Library ─────────────────────────────────────── */}
      {hasDecks ? (
        <>
          <div className="gold-divider animate-fade-up delay-200">
            <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
              My library
            </span>
          </div>

          <div className="space-y-3">
            {decks.map((deck, i) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                delay={(i + 3) * 0.08}
              />
            ))}
            <button
              onClick={() => navigate('/browse')}
              className="w-full border border-dashed border-gold-400/15 rounded-xl py-4
                         text-parchment-500 hover:border-gold-400/30 hover:text-parchment-300
                         transition-colors duration-200 font-mono text-[10px]
                         tracking-widest uppercase animate-fade-up"
              style={{ animationDelay: `${(decks.length + 4) * 0.08}s` }}
            >
              + Browse more decks
            </button>
          </div>

          {/* ── Streak Widget ── */}
          <StreakWidget streak={streak} last7={last7} />
        </>
      ) : (
        <EmptyState />
      )}

    </div>
  )
}
