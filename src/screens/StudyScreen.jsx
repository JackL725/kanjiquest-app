import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'
import { useSettings } from '@/hooks/useSettings'

// ─── User stories localStorage helpers ───────────────────────────────────
const STORIES_KEY = 'kq-user-stories'

function readUserStories() {
  try {
    const raw = localStorage.getItem(STORIES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function writeUserStory(cardId, text) {
  try {
    const stories = readUserStories()
    localStorage.setItem(STORIES_KEY, JSON.stringify({ ...stories, [cardId]: text }))
  } catch {}
}

// ─── Rating config ────────────────────────────────────────────────────────
const RATING_META = [
  { q: 0, label: 'Again', color: 'text-ember',       border: 'border-ember/30',      bg: 'bg-ember/5 hover:bg-ember/12',       bar: 'bg-ember/70'        },
  { q: 2, label: 'Hard',  color: 'text-amber-500',   border: 'border-amber-500/30',  bg: 'bg-amber-500/5 hover:bg-amber-500/12', bar: 'bg-amber-500/70'  },
  { q: 4, label: 'Good',  color: 'text-blue-400',    border: 'border-blue-400/30',   bg: 'bg-blue-400/5 hover:bg-blue-400/12',   bar: 'bg-blue-400/70'   },
  { q: 5, label: 'Easy',  color: 'text-emerald-400', border: 'border-emerald-400/30',bg: 'bg-emerald-400/5 hover:bg-emerald-400/12', bar: 'bg-emerald-400/70' },
]

// ─── Study modes (2 only now) ─────────────────────────────────────────────
const MODES = [
  { key: 'meaning', label: 'Kanji → Meaning' },
  { key: 'reading', label: 'Kanji → Reading' },
]

// ─── Session Done ─────────────────────────────────────────────────────────
function DoneScreen({ stats, deckId, onRestart }) {
  const navigate = useNavigate()
  const total = stats.ok + stats.miss
  const pct   = total ? Math.round((stats.ok / total) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-7xl text-gold-400/15 mb-6 animate-fade-up">完</span>
      <h2 className="font-display italic text-3xl text-parchment-100 mb-1 animate-fade-up delay-100">
        Session complete
      </h2>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-10 animate-fade-up delay-100">
        Consistency is the secret
      </p>

      <div className="flex gap-10 mb-10 animate-fade-up delay-200">
        {[{ n: stats.ok, l: 'Correct' }, { n: stats.miss, l: 'Again' }, { n: pct + '%', l: 'Accuracy' }].map(({ n, l }) => (
          <div key={l}>
            <p className="font-display italic text-4xl text-gold-400 leading-none">{n}</p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-2">{l}</p>
          </div>
        ))}
      </div>

      <div className="gold-divider w-full mb-8 animate-fade-up delay-300"><span /></div>

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
          className="font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase w-full pt-1"
        >
          Home
        </button>
      </div>
    </div>
  )
}

// ─── Card Front ───────────────────────────────────────────────────────────
function CardFront({ card, mode }) {
  return (
    <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15
                    rounded-2xl flex flex-col items-center justify-center p-7
                    cursor-pointer select-none">
      <p className="font-mono text-[9px] text-parchment-500/60 tracking-[3px] uppercase mb-8">
        {mode === 'meaning' ? 'What does this mean?' : 'How do you read this?'}
      </p>

      <p className="font-kanji text-[96px] text-parchment-100 leading-none mb-6">
        {card.kanji}
      </p>

      <p className="blur-reveal font-mono text-[11px] text-parchment-500/70
                    text-center leading-relaxed px-4">
        {card.parts.join(' · ')}
      </p>
      <p className="font-mono text-[9px] text-parchment-500/25 mt-2.5 tracking-widest">
        hover to peek
      </p>
    </div>
  )
}

// ─── User Story section (editable) ───────────────────────────────────────
function UserStorySection({ cardId }) {
  const [text, setText]     = useState(() => readUserStories()[cardId] ?? '')
  const [editing, setEditing] = useState(false)
  const textareaRef           = useRef(null)

  // Sync when card changes
  useEffect(() => {
    setText(readUserStories()[cardId] ?? '')
    setEditing(false)
  }, [cardId])

  function handleChange(e) {
    setText(e.target.value)
    writeUserStory(cardId, e.target.value)
  }

  function handleFocus() {
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const isEmpty = !text.trim()

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase">
          My story
        </p>
        {!isEmpty && !editing && (
          <button
            onClick={handleFocus}
            className="font-mono text-[8px] text-parchment-500/40 tracking-widest uppercase
                       hover:text-gold-400/60 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing || isEmpty ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onBlur={() => setEditing(false)}
          autoFocus={editing}
          placeholder="Write your own mnemonic story for this kanji…"
          rows={3}
          className="w-full bg-ink-700/60 border border-gold-400/12 rounded-lg
                     px-3 py-2.5 font-mono text-[11px] text-parchment-300
                     placeholder:text-parchment-500/30 leading-relaxed
                     outline-none focus:border-gold-400/30 resize-none
                     transition-colors duration-150"
        />
      ) : (
        <button
          onClick={handleFocus}
          className="w-full text-left relative pl-6 bg-ink-700/70 rounded-lg p-3
                     border border-transparent hover:border-gold-400/12
                     transition-colors duration-150"
        >
          <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">✎</span>
          <p className="font-mono text-[11px] text-parchment-400 leading-relaxed">{text}</p>
        </button>
      )}
    </div>
  )
}

// ─── Card Back ────────────────────────────────────────────────────────────
function CardBack({ card, mode }) {
  return (
    <div className="card-face card-face-back absolute inset-0 bg-ink-800
                    border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
      {/* Ghost kanji */}
      <span className="absolute top-3 right-4 font-kanji text-[80px] leading-none
                       text-gold-400/[0.07] select-none pointer-events-none">
        {card.kanji}
      </span>

      <div className="h-full overflow-y-auto p-5 space-y-0">

        {/* 1 — Meaning */}
        <BackSection label="Meaning">
          <p className="font-display italic text-2xl text-parchment-100 leading-tight">
            {card.meaning}
          </p>
        </BackSection>

        {/* 2 — Reading */}
        <BackSection label="Reading">
          <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
          <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
        </BackSection>

        <Divider />

        {/* 3 — RTK Stories */}
        <BackSection label="RTK stories">
          <div className="space-y-2">
            <Story num={1}>{card.rtk1}</Story>
            <Story num={2}>{card.rtk2}</Story>
          </div>
        </BackSection>

        {/* 4 — My Story (user-editable) */}
        <UserStorySection cardId={card.id} />

        <Divider />

        {/* 5 — Components */}
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

        {/* 6 — In-game context */}
        <BackSection label="In-game context">
          <p className="font-kanji text-sm text-parchment-300 leading-relaxed">{card.context}</p>
          <p className="font-mono text-[10px] text-parchment-500/70 mt-1.5 italic">{card.contextEn}</p>
        </BackSection>

      </div>
    </div>
  )
}

// ─── Mode toggle pill ─────────────────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center bg-ink-700 border border-gold-400/10 rounded-lg p-0.5 gap-0.5">
      {MODES.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`flex-1 font-mono text-[9px] tracking-wide py-1.5 px-2 rounded-md
                      transition-colors duration-150 touch-manipulation whitespace-nowrap
                      ${mode === m.key
                        ? 'bg-ink-800 text-gold-400 border border-gold-400/20'
                        : 'text-parchment-500/60 hover:text-parchment-400'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ─── Rating buttons ───────────────────────────────────────────────────────
function RatingButtons({ onRate, settings }) {
  const subs = [
    'reset',
    `${settings.hardIntervalMins} min`,
    `${settings.goodIntervalDays}d`,
    `${settings.easyIntervalDays}d`,
  ]

  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-up">
      {RATING_META.map((r, i) => (
        <button
          key={r.label}
          onClick={() => onRate(r.q)}
          className={`relative rounded-xl border overflow-hidden
                      flex flex-col items-center justify-center gap-1.5
                      py-4 transition-colors duration-150 touch-manipulation
                      ${r.border} ${r.bg}`}
        >
          <div className={`absolute top-0 inset-x-0 h-[2px] ${r.bar}`} />
          <span className={`font-display italic text-[15px] leading-none ${r.color}`}>
            {r.label}
          </span>
          <span className="font-mono text-[9px] text-parchment-500/50 leading-none">
            {subs[i]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── StudyScreen ──────────────────────────────────────────────────────────
export default function StudyScreen() {
  const { id }            = useParams()
  const [params]          = useSearchParams()
  const navigate          = useNavigate()
  const deck              = getDeckById(id)
  const { rate, getDueCards, getNewCards } = useSRS(id)
  const { settings }      = useSettings()

  const [mode, setMode]       = useState('meaning')
  const [queue, setQueue]     = useState([])
  const [qi, setQi]           = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats]     = useState({ ok: 0, miss: 0 })
  const [done, setDone]       = useState(false)

  const buildQueue = useCallback(() => {
    if (!deck) return
    const isAll = params.get('mode') === 'all'

    let cards
    if (isAll) {
      cards = [...deck.cards]
    } else {
      const due  = getDueCards(deck.cards)
      const newC = getNewCards(deck.cards)

      // Respect daily limits
      const newSlot    = Math.min(newC.length, settings.newCardsPerDay)
      const reviewSlot = Math.min(due.filter(c => !newC.includes(c)).length, settings.maxReviewsPerDay)

      const newBatch    = newC.slice(0, newSlot)
      const reviewBatch = due.filter(c => !newC.find(n => n.id === c.id)).slice(0, reviewSlot)

      cards = [...newBatch, ...reviewBatch]
      if (!cards.length) cards = [...deck.cards] // fallback: study everything
    }

    setQueue(cards.sort(() => Math.random() - 0.5))
    setQi(0)
    setFlipped(false)
    setDone(false)
    setStats({ ok: 0, miss: 0 })
  }, [deck?.id, settings.newCardsPerDay, settings.maxReviewsPerDay])

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

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setFlipped(false)
  }, [])

  if (!deck)         return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>
  if (!queue.length) return <div className="px-5 py-6 text-parchment-500">Loading…</div>

  if (done) {
    return <div className="h-full"><DoneScreen stats={stats} deckId={id} onRestart={buildQueue} /></div>
  }

  const pct = Math.round((qi / queue.length) * 100)

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase
                     hover:text-ember transition-colors touch-manipulation"
        >
          ✕ Quit
        </button>
        <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest tabular-nums">
          {qi + 1} <span className="text-parchment-500/25">/</span> {queue.length}
        </span>
        <button
          onClick={() => navigate('/settings')}
          className="text-parchment-500/40 hover:text-gold-400 transition-colors
                     touch-manipulation"
          title="Study settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M11.53 4.47l-1.42 1.42M4.97 11.03l-1.42 1.42"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="shrink-0 px-5 pb-3">
        <div className="h-[2px] bg-ink-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-400/60 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Mode toggle ── */}
      <div className="shrink-0 px-5 pb-3">
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </div>

      {/* ── Card (fills remaining space) ── */}
      <div className="flex-1 min-h-0 px-5 pb-3">
        <div
          key={qi}
          className="card-scene h-full animate-card-enter"
          onClick={() => setFlipped(f => !f)}
        >
          <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
            <CardFront card={current} mode={mode} />
            <CardBack  card={current} mode={mode} />
          </div>
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className="shrink-0 px-5 pb-6">
        {flipped ? (
          <RatingButtons onRate={handleRate} settings={settings} />
        ) : (
          <div className="flex items-center justify-center py-4">
            <p className="font-mono text-[10px] text-parchment-500/35 tracking-widest uppercase">
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
      <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">{label}</p>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gold-400/10 my-4" />
}

function Story({ num, children }) {
  return (
    <div className="relative pl-6 bg-ink-700/70 rounded-lg p-3">
      <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">{num}</span>
      <p className="font-mono text-[11px] text-parchment-500 leading-relaxed">{children}</p>
    </div>
  )
}
