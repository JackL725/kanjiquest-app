import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'

const MODES = ['kanji → meaning', 'kanji → reading', 'meaning → kanji']

// ─── Rating button config ─────────────────────────────────────────────────
const RATINGS = [
  {
    q:       0,
    label:   'Again',
    color:   'text-ember',
    border:  'border-ember/30',
    bg:      'bg-ember/5 hover:bg-ember/12',
    topBar:  'bg-ember/60',
  },
  {
    q:       2,
    label:   'Hard',
    color:   'text-amber-500',
    border:  'border-amber-500/30',
    bg:      'bg-amber-500/5 hover:bg-amber-500/12',
    topBar:  'bg-amber-500/60',
  },
  {
    q:       4,
    label:   'Good',
    color:   'text-blue-400',
    border:  'border-blue-400/30',
    bg:      'bg-blue-400/5 hover:bg-blue-400/12',
    topBar:  'bg-blue-400/60',
  },
  {
    q:       5,
    label:   'Easy',
    color:   'text-emerald-400',
    border:  'border-emerald-400/30',
    bg:      'bg-emerald-400/5 hover:bg-emerald-400/12',
    topBar:  'bg-emerald-400/60',
  },
]

// ─── Session Done screen ──────────────────────────────────────────────────
function DoneScreen({ stats, deckId, onRestart }) {
  const navigate = useNavigate()
  const total    = stats.ok + stats.miss
  const pct      = total ? Math.round((stats.ok / total) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-7xl text-gold-400/15 mb-6 animate-fade-up">完</span>

      <h2 className="font-display italic text-3xl text-parchment-100 mb-1 animate-fade-up delay-100">
        Session complete
      </h2>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase
                    mb-10 animate-fade-up delay-100">
        Consistency is the secret
      </p>

      {/* Stats */}
      <div className="flex gap-10 mb-12 animate-fade-up delay-200">
        {[
          { n: stats.ok,    l: 'correct' },
          { n: stats.miss,  l: 'again'   },
          { n: pct + '%',   l: 'accuracy'},
        ].map(({ n, l }) => (
          <div key={l}>
            <p className="font-display italic text-4xl text-gold-400 leading-none">{n}</p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-2">{l}</p>
          </div>
        ))}
      </div>

      {/* Gold divider */}
      <div className="gold-divider w-full mb-8 animate-fade-up delay-300">
        <span />
      </div>

      <div className="w-full space-y-3 animate-fade-up delay-300">
        <button
          onClick={() => navigate(`/deck/${deckId}`)}
          className="w-full border border-gold-400/35 text-gold-400 font-display italic
                     text-lg py-4 rounded-xl hover:bg-gold-400/10 transition-colors"
        >
          Back to deck
        </button>
        <button
          onClick={onRestart}
          className="w-full border border-parchment-500/15 text-parchment-500 font-display italic
                     text-base py-3 rounded-xl hover:bg-parchment-500/5 transition-colors"
        >
          Study again
        </button>
        <button
          onClick={() => navigate('/library')}
          className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase
                     w-full pt-1"
        >
          Home
        </button>
      </div>
    </div>
  )
}

// ─── Card front face ──────────────────────────────────────────────────────
function CardFront({ card, mode }) {
  const isMeaningFirst = mode === 'meaning → kanji'

  return (
    <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15
                    rounded-2xl flex flex-col items-center justify-center p-7 cursor-pointer
                    select-none">
      {/* Prompt label */}
      <p className="font-mono text-[9px] text-parchment-500/70 tracking-[3px] uppercase mb-8">
        {mode === 'kanji → meaning' ? 'What does this mean?' :
         mode === 'kanji → reading' ? 'How do you read this?' :
         'What is the kanji?'}
      </p>

      {isMeaningFirst ? (
        /* Meaning → Kanji: show meaning + romaji */
        <div className="text-center">
          <p className="font-display italic text-3xl text-parchment-100 mb-3">
            {card.meaning}
          </p>
          <p className="font-mono text-sm text-parchment-500">{card.romaji}</p>
        </div>
      ) : (
        /* Kanji → X: show kanji + blurred hint */
        <div className="flex flex-col items-center">
          <p className="font-kanji text-[96px] text-parchment-100 leading-none mb-6">
            {card.kanji}
          </p>
          <p className="blur-reveal font-mono text-[11px] text-parchment-500/80
                        text-center leading-relaxed px-4">
            {card.parts.join(' · ')}
          </p>
          <p className="font-mono text-[9px] text-parchment-500/30 mt-3 tracking-widest">
            hover to peek
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Card back face ───────────────────────────────────────────────────────
function CardBack({ card, mode }) {
  const isMeaningFirst = mode === 'meaning → kanji'

  return (
    <div className="card-face card-face-back absolute inset-0 bg-ink-800
                    border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">

      {/* Ghost kanji watermark */}
      <span className="absolute top-3 right-4 font-kanji text-[80px] leading-none
                       text-gold-400/[0.07] select-none pointer-events-none">
        {card.kanji}
      </span>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto p-5">
        {isMeaningFirst ? (
          <>
            <BackSection label="Kanji">
              <p className="font-kanji text-6xl text-parchment-100 leading-none">{card.kanji}</p>
            </BackSection>
            <BackSection label="Reading">
              <p className="font-display italic text-2xl text-parchment-100">{card.reading}</p>
              <p className="font-mono text-[11px] text-parchment-500 mt-0.5">{card.romaji}</p>
            </BackSection>
          </>
        ) : (
          <>
            <BackSection label="Reading">
              <p className="font-display italic text-2xl text-parchment-100">{card.reading}</p>
              <p className="font-mono text-[11px] text-parchment-500 mt-0.5">{card.romaji}</p>
            </BackSection>
            <BackSection label="Meaning">
              <p className="font-display italic text-xl text-parchment-200">{card.meaning}</p>
            </BackSection>
          </>
        )}

        <div className="h-px bg-gold-400/10 my-3.5" />

        <BackSection label="RTK stories">
          <div className="space-y-2">
            <Story num={1}>{card.rtk1}</Story>
            <Story num={2}>{card.rtk2}</Story>
          </div>
        </BackSection>

        <BackSection label="Components">
          <div className="flex flex-wrap gap-1.5">
            {card.parts.map(p => (
              <span key={p}
                className="font-mono text-[10px] text-parchment-500
                           border border-gold-400/15 rounded px-2 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </BackSection>

        <BackSection label="In-game context">
          <p className="font-kanji text-sm text-parchment-300 leading-relaxed">{card.context}</p>
          <p className="font-mono text-[10px] text-parchment-500/70 mt-1.5 italic">{card.contextEn}</p>
        </BackSection>
      </div>
    </div>
  )
}

// ─── Rating buttons ───────────────────────────────────────────────────────
function RatingButtons({ onRate, goodDays, easyDays }) {
  const subs = ['< 1d', '+1d', `+${goodDays}d`, `+${easyDays}d`]

  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-up">
      {RATINGS.map((r, i) => (
        <button
          key={r.label}
          onClick={() => onRate(r.q)}
          className={`relative rounded-xl border overflow-hidden
                      flex flex-col items-center justify-center gap-1
                      py-4 transition-colors duration-150 touch-manipulation
                      ${r.border} ${r.bg}`}
        >
          {/* Colored top accent bar */}
          <div className={`absolute top-0 inset-x-0 h-[2px] ${r.topBar}`} />

          <span className={`font-display italic text-[15px] leading-none ${r.color}`}>
            {r.label}
          </span>
          <span className="font-mono text-[9px] text-parchment-500/60 leading-none">
            {subs[i]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── StudyScreen ──────────────────────────────────────────────────────────
export default function StudyScreen() {
  const { id }              = useParams()
  const [params]            = useSearchParams()
  const navigate            = useNavigate()
  const deck                = getDeckById(id)
  const { rate, getDueCards, getCardProgress } = useSRS(id)

  const [mode, setMode]     = useState(0)
  const [queue, setQueue]   = useState([])
  const [qi, setQi]         = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats]   = useState({ ok: 0, miss: 0 })
  const [done, setDone]     = useState(false)

  const buildQueue = useCallback(() => {
    if (!deck) return
    const all   = params.get('mode') === 'all'
    const cards = all ? [...deck.cards] : getDueCards(deck.cards)
    const final = cards.length ? cards : [...deck.cards]
    setQueue(final.sort(() => Math.random() - 0.5))
    setQi(0)
    setFlipped(false)
    setDone(false)
    setStats({ ok: 0, miss: 0 })
  }, [deck?.id])

  useEffect(() => { buildQueue() }, [deck?.id])

  const current = queue[qi]

  const handleRate = useCallback((q) => {
    if (!current) return
    rate(current.id, q)
    setStats(s => ({ ok: s.ok + (q >= 3 ? 1 : 0), miss: s.miss + (q < 3 ? 1 : 0) }))
    if (qi + 1 >= queue.length) { setDone(true); return }
    setQi(i => i + 1)
    setFlipped(false)
  }, [current, qi, queue.length, rate])

  // Error states
  if (!deck)         return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>
  if (!queue.length) return <div className="px-5 py-6 text-parchment-500">Loading…</div>

  // Done screen
  if (done) {
    return (
      <div className="h-full">
        <DoneScreen stats={stats} deckId={id} onRestart={buildQueue} />
      </div>
    )
  }

  const p      = getCardProgress(current.id)
  const goodD  = Math.round((p?.interval ?? 1) * 2.5)
  const easyD  = Math.round((p?.interval ?? 1) * 3.5)
  const pct    = Math.round((qi / queue.length) * 100)
  const ms     = MODES[mode]

  return (
    // ── Root: fills main exactly — no scroll ──────────────────────────────
    <div className="flex flex-col h-full">

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-0">
        <button
          onClick={() => navigate(-1)}
          className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase
                     hover:text-ember transition-colors touch-manipulation"
        >
          ✕ Quit
        </button>

        <span className="font-mono text-[10px] text-parchment-500/60 tracking-widest">
          {qi + 1} <span className="text-parchment-500/30">/</span> {queue.length}
        </span>

        <select
          value={mode}
          onChange={e => { setMode(+e.target.value); setFlipped(false) }}
          className="bg-ink-700 border border-gold-400/15 text-parchment-500 font-mono
                     text-[9px] rounded-md px-2 py-1.5 outline-none tracking-wider
                     cursor-pointer hover:border-gold-400/30 transition-colors"
        >
          {MODES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      {/* ── Progress bar ───────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-4 pb-0">
        <div className="h-[2px] bg-ink-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-400/70 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Card area: fills all remaining space ───────────────── */}
      {/* min-h-0 is CRITICAL — prevents flex-1 from overflowing   */}
      <div className="flex-1 min-h-0 px-5 py-4">
        {/*
          key={qi} causes React to fully remount on card change,
          resetting animate-card-enter from the start each time.
        */}
        <div
          key={qi}
          className="card-scene h-full animate-card-enter"
          onClick={() => setFlipped(f => !f)}
        >
          <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
            <CardFront card={current} mode={ms} />
            <CardBack  card={current} mode={ms} />
          </div>
        </div>
      </div>

      {/* ── Bottom controls ─────────────────────────────────────── */}
      <div className="shrink-0 px-5 pb-6 pt-0">
        {flipped ? (
          <RatingButtons
            onRate={handleRate}
            goodDays={goodD}
            easyDays={easyD}
          />
        ) : (
          <div className="flex items-center justify-center py-4">
            <p className="font-mono text-[10px] text-parchment-500/40
                          tracking-widest uppercase">
              Tap card to reveal
            </p>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function BackSection({ label, children }) {
  return (
    <div className="mb-4">
      <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

function Story({ num, children }) {
  return (
    <div className="relative pl-6 bg-ink-700/70 rounded-lg p-3">
      <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/50">
        {num}
      </span>
      <p className="font-mono text-[11px] text-parchment-500 leading-relaxed">{children}</p>
    </div>
  )
}
