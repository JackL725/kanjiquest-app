import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'
import { useSettings } from '@/hooks/useSettings'

// ─── User stories ─────────────────────────────────────────────────────────
const STORIES_KEY = 'kq-user-stories'
function readUserStories() {
  try { return JSON.parse(localStorage.getItem(STORIES_KEY) || '{}') } catch { return {} }
}
function writeUserStory(cardId, text) {
  try {
    const s = readUserStories()
    localStorage.setItem(STORIES_KEY, JSON.stringify({ ...s, [cardId]: text }))
  } catch {}
}

// ─── Burned cards (Already know this) ────────────────────────────────────
const BURNED_KEY = 'kq-burned'

function readBurned(deckId) {
  try {
    const raw = localStorage.getItem(BURNED_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return new Set(all[deckId] ?? [])
  } catch { return new Set() }
}

function writeBurned(deckId, burnedSet) {
  try {
    const raw = localStorage.getItem(BURNED_KEY)
    const all = raw ? JSON.parse(raw) : {}
    localStorage.setItem(BURNED_KEY, JSON.stringify({
      ...all,
      [deckId]: [...burnedSet],
    }))
  } catch {}
}
const RATING_META = [
  { q: 0, label: 'Again', color: 'text-ember',       border: 'border-ember/30',       bg: 'bg-ember/5 hover:bg-ember/12',        bar: 'bg-ember/70'         },
  { q: 2, label: 'Hard',  color: 'text-amber-500',   border: 'border-amber-500/30',   bg: 'bg-amber-500/5 hover:bg-amber-500/12',bar: 'bg-amber-500/70'     },
  { q: 4, label: 'Good',  color: 'text-blue-400',    border: 'border-blue-400/30',    bg: 'bg-blue-400/5 hover:bg-blue-400/12',  bar: 'bg-blue-400/70'      },
  { q: 5, label: 'Easy',  color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/5 hover:bg-emerald-400/12', bar: 'bg-emerald-400/70' },
]

// ─── Study modes ──────────────────────────────────────────────────────────
const MODES = [
  { key: 'meaning', label: 'Kanji → Meaning' },
  { key: 'kanji',   label: 'Meaning → Kanji' },
]

// ─── Shake detection hook ─────────────────────────────────────────────────
function useShake(onShake, threshold = 18) {
  useEffect(() => {
    let last = { x: 0, y: 0, z: 0, t: 0 }
    function handleMotion(e) {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const now = Date.now()
      if (now - last.t < 100) return   // debounce 100ms
      const dx = Math.abs((a.x ?? 0) - last.x)
      const dy = Math.abs((a.y ?? 0) - last.y)
      const dz = Math.abs((a.z ?? 0) - last.z)
      if (dx + dy + dz > threshold) onShake()
      last = { x: a.x ?? 0, y: a.y ?? 0, z: a.z ?? 0, t: now }
    }

    // iOS 13+ requires permission
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(r => { if (r === 'granted') window.addEventListener('devicemotion', handleMotion) })
        .catch(() => {})
    } else {
      window.addEventListener('devicemotion', handleMotion)
    }
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [onShake, threshold])
}

// ─── Done screen ──────────────────────────────────────────────────────────
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
        <button onClick={() => navigate(`/deck/${deckId}`)}
          className="w-full border border-gold-400/35 text-gold-400 font-display italic
                     text-lg py-4 rounded-xl hover:bg-gold-400/10 transition-colors">
          Back to deck
        </button>
        <button onClick={onRestart}
          className="w-full border border-parchment-500/15 text-parchment-500 font-display italic
                     text-base py-3 rounded-xl hover:bg-parchment-500/5 transition-colors">
          Study again
        </button>
        <button onClick={() => navigate('/library')}
          className="font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase w-full pt-1">
          Home
        </button>
      </div>
    </div>
  )
}

// ─── Waiting screen (requeue pending, queue exhausted) ────────────────────
function WaitingScreen({ requeuePool, onCheckNow }) {
  const soonest = requeuePool.reduce((min, e) => Math.min(min, e.dueAt), Infinity)
  const secsLeft = Math.max(0, Math.ceil((soonest - Date.now()) / 1000))
  const [secs, setSecs] = useState(secsLeft)

  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((soonest - Date.now()) / 1000))
      setSecs(left)
      if (left === 0) onCheckNow()
    }, 1000)
    return () => clearInterval(t)
  }, [soonest])

  const mins = Math.floor(secs / 60)
  const s    = secs % 60
  const label = mins > 0 ? `${mins}m ${s}s` : `${s}s`

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-6xl text-gold-400/15 mb-6">待</span>
      <p className="font-display italic text-2xl text-parchment-200 mb-2">Cards pending</p>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8">
        Next card due in
      </p>
      <p className="font-display italic text-5xl text-gold-400 mb-10 tabular-nums">{label}</p>
      <p className="font-mono text-[9px] text-parchment-500/40 tracking-widest uppercase">
        {requeuePool.length} card{requeuePool.length !== 1 ? 's' : ''} waiting · checking automatically
      </p>
    </div>
  )
}

// ─── Card Front ───────────────────────────────────────────────────────────
function CardFront({ card, mode, peekActive, onBurn, isNew }) {
  const isMeaningFirst = mode === 'kanji'   // Meaning → Kanji

  return (
    <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15
                    rounded-2xl flex flex-col items-center justify-center p-7
                    cursor-pointer select-none">

      {/* ── New card badge (top-left) + I know this button (top-right) ── */}
      {isNew && (
        <div className="absolute top-4 inset-x-4 flex items-center justify-between
                        pointer-events-none">

          {/* NEW pill — pops in with spring bounce + glow pulse */}
          <div className="animate-new-card-pop pointer-events-none
                          flex items-center gap-1.5
                          bg-gold-400/15 border border-gold-400/40
                          rounded-full px-3 py-1.5 animate-new-card-glow">
            <span className="text-gold-400 text-[11px] leading-none select-none">✦</span>
            <span className="font-mono text-[10px] tracking-[2px] uppercase
                             font-medium text-gold-400 leading-none">
              First look
            </span>
          </div>

          {/* I already know this — top-right pill button */}
          <button
            onClick={e => { e.stopPropagation(); onBurn() }}
            className="pointer-events-auto flex items-center gap-1.5
                       border border-parchment-500/25 rounded-full px-3 py-1.5
                       hover:border-gold-400/50 hover:bg-gold-400/8
                       transition-all duration-200 touch-manipulation
                       animate-new-card-pop"
            style={{ animationDelay: '0.08s' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0 text-parchment-400">
              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M3.5 5.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.1"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-mono text-[10px] tracking-wide uppercase
                             text-parchment-400 hover:text-parchment-200 leading-none
                             whitespace-nowrap">
              I know this
            </span>
          </button>

        </div>
      )}

      <p className="font-mono text-[9px] text-parchment-500/60 tracking-[3px] uppercase mb-8">
        {isMeaningFirst ? 'What is the kanji?' : 'What does this mean?'}
      </p>

      {isMeaningFirst ? (
        /* Meaning → Kanji: show meaning + romaji prominently */
        <div className="text-center">
          <p className="font-display italic text-3xl text-parchment-100 mb-3 leading-tight">
            {card.meaning}
          </p>
          <p className="font-mono text-sm text-parchment-500">{card.romaji}</p>
        </div>
      ) : (
        /* Kanji → Meaning: show kanji with blurred hint */
        <div className="flex flex-col items-center">
          <p className="font-kanji text-[96px] text-parchment-100 leading-none mb-6">
            {card.kanji}
          </p>
          <p className={`font-mono text-[11px] text-parchment-500/70 text-center
                         leading-relaxed px-4 transition-all duration-300
                         ${peekActive ? '' : 'blur-reveal'}`}>
            {card.parts.join(' · ')}
          </p>
          <p className="font-mono text-[9px] text-parchment-500/25 mt-2.5 tracking-widest">
            hover or shake to peek
          </p>
        </div>
      )}


    </div>
  )
}

// ─── User Story (editable, auto-focuses on flip) ──────────────────────────
function UserStorySection({ cardId, shouldFocus }) {
  const [text, setText]       = useState(() => readUserStories()[cardId] ?? '')
  const [editing, setEditing] = useState(false)
  const textareaRef           = useRef(null)

  // Sync when card changes
  useEffect(() => {
    setText(readUserStories()[cardId] ?? '')
    setEditing(false)
  }, [cardId])

  // Auto-focus intentionally removed — user taps My Story to edit

  function handleChange(e) {
    setText(e.target.value)
    writeUserStory(cardId, e.target.value)
  }

  const isEmpty = !text.trim()

  return (
    // stopPropagation prevents any click inside this section from bubbling
    // up to the card-scene onClick, which would flip the card.
    <div className="mb-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase">My story</p>
        {!isEmpty && !editing && (
          <button
            onClick={() => { setEditing(true); setTimeout(() => textareaRef.current?.focus(), 0) }}
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
          onClick={() => { setEditing(true); setTimeout(() => textareaRef.current?.focus(), 0) }}
          className="w-full text-left relative pl-6 bg-ink-700/70 rounded-lg p-3
                     border border-transparent hover:border-gold-400/12 transition-colors"
        >
          <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">✎</span>
          <p className="font-mono text-[11px] text-parchment-400 leading-relaxed">{text}</p>
        </button>
      )}
    </div>
  )
}

// ─── Card Back ────────────────────────────────────────────────────────────
function CardBack({ card, mode, shouldFocusStory }) {
  const isMeaningFirst = mode === 'kanji'

  return (
    <div className="card-face card-face-back absolute inset-0 bg-ink-800
                    border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
      <span className="absolute top-3 right-4 font-kanji text-[80px] leading-none
                       text-parchment-100 select-none pointer-events-none">
        {card.kanji}
      </span>

      <div className="h-full overflow-y-auto p-5">

        {/* 1 — Primary answer */}
        {isMeaningFirst ? (
          <BackSection label="Kanji">
            <p className="font-kanji text-6xl text-parchment-100 leading-none mb-1">{card.kanji}</p>
            <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
            <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
          </BackSection>
        ) : (
          <>
            <BackSection label="Meaning">
              <p className="font-display italic text-2xl text-parchment-100 leading-tight">{card.meaning}</p>
            </BackSection>
            <BackSection label="Reading">
              <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
              <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
            </BackSection>
          </>
        )}

        <Divider />

        {/* 2 — RTK Stories */}
        <BackSection label="RTK stories">
          <div className="space-y-2">
            <Story num={1}>{card.rtk1}</Story>
            <Story num={2}>{card.rtk2}</Story>
          </div>
        </BackSection>

        {/* 3 — My Story */}
        <UserStorySection cardId={card.id} shouldFocus={shouldFocusStory} />

        <Divider />

        {/* 4 — Components */}
        <BackSection label="Components">
          <div className="flex flex-wrap gap-1.5">
            {card.parts.map(p => (
              <span key={p} className="font-mono text-[10px] text-parchment-500
                                       border border-gold-400/15 rounded px-2 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </BackSection>

        {/* 5 — In-game context */}
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
    <div className="flex bg-ink-700 border border-gold-400/10 rounded-lg p-0.5 gap-0.5">
      {MODES.map(m => (
        <button key={m.key} onClick={() => onChange(m.key)}
          className={`flex-1 font-mono text-[9px] tracking-wide py-1.5 px-2 rounded-md
                      transition-colors duration-150 touch-manipulation whitespace-nowrap
                      ${mode === m.key
                        ? 'bg-ink-800 text-gold-400 border border-gold-400/20'
                        : 'text-parchment-500/60 hover:text-parchment-400'}`}>
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ─── Rating buttons ───────────────────────────────────────────────────────
function RatingButtons({ onRate, settings }) {
  const subs = ['reset', `${settings.hardIntervalMins}m`, `${settings.goodIntervalDays}d`, `${settings.easyIntervalDays}d`]
  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-up">
      {RATING_META.map((r, i) => (
        <button key={r.label} onClick={() => onRate(r.q)}
          className={`relative rounded-xl border overflow-hidden flex flex-col items-center
                      justify-center gap-1.5 py-4 transition-colors duration-150
                      touch-manipulation ${r.border} ${r.bg}`}>
          <div className={`absolute top-0 inset-x-0 h-[2px] ${r.bar}`} />
          <span className={`font-display italic text-[15px] leading-none ${r.color}`}>{r.label}</span>
          <span className="font-mono text-[9px] text-parchment-500/50 leading-none">{subs[i]}</span>
        </button>
      ))}
    </div>
  )
}

// ─── StudyScreen ──────────────────────────────────────────────────────────
export default function StudyScreen() {
  const { id }          = useParams()
  const [params]        = useSearchParams()
  const navigate        = useNavigate()
  const deck            = getDeckById(id)
  const { rate, getDueCards, getNewCards, getCardProgress } = useSRS(id)
  const { settings }    = useSettings()

  const [mode, setMode]         = useState('meaning')
  const [queue, setQueue]       = useState([])   // live growing array
  const [qi, setQi]             = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [stats, setStats]       = useState({ ok: 0, miss: 0 })
  const [done, setDone]         = useState(false)
  const [peekActive, setPeek]   = useState(false)
  const [waiting, setWaiting]   = useState(false)
  const [storyFocusTick, setStoryFocusTick] = useState(0)

  // requeuePool lives in a ref so it's always current inside callbacks/intervals
  const requeuePool = useRef([])   // [{ card, dueAt: ms timestamp }]
  const queueRef    = useRef([])   // mirror of queue state for use in intervals
  const qiRef       = useRef(0)
  const burnedRef   = useRef(readBurned(id))  // Set of burned cardIds for this deck

  // ── Build initial queue ──────────────────────────────────────────────
  const buildQueue = useCallback(() => {
    if (!deck) return
    requeuePool.current = []
    const isAll = params.get('mode') === 'all'

    const burned = burnedRef.current

    let cards
    if (isAll) {
      cards = deck.cards.filter(c => !burned.has(c.id))
    } else {
      const due  = getDueCards(deck.cards).filter(c => !burned.has(c.id))
      const newC = getNewCards(deck.cards).filter(c => !burned.has(c.id))
      const newBatch    = newC.slice(0, settings.newCardsPerDay)
      const reviewOnly  = due.filter(c => !newC.find(n => n.id === c.id))
      const reviewBatch = reviewOnly.slice(0, settings.maxReviewsPerDay)
      cards = [...newBatch, ...reviewBatch]
      if (!cards.length) cards = deck.cards.filter(c => !burned.has(c.id))
    }

    const shuffled = cards.sort(() => Math.random() - 0.5)
    queueRef.current = shuffled
    setQueue(shuffled)
    qiRef.current = 0
    setQi(0)
    setFlipped(false)
    setDone(false)
    setWaiting(false)
    setStats({ ok: 0, miss: 0 })
  }, [deck?.id, settings.newCardsPerDay, settings.maxReviewsPerDay])

  useEffect(() => { buildQueue() }, [deck?.id])

  // ── Poll requeue pool every 30s ──────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now   = Date.now()
      const due   = requeuePool.current.filter(e => e.dueAt <= now)
      if (!due.length) return
      requeuePool.current = requeuePool.current.filter(e => e.dueAt > now)

      setQueue(prev => {
        const insertAt = qiRef.current + 1
        const next = [...prev]
        due.forEach((e, i) => next.splice(insertAt + i, 0, e.card))
        queueRef.current = next
        return next
      })
      setWaiting(false)
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // ── Shake to peek ────────────────────────────────────────────────────
  const handleShake = useCallback(() => {
    if (flipped) return
    setPeek(true)
    setTimeout(() => setPeek(false), 2000)
  }, [flipped])
  useShake(handleShake)

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped(f => !f)
      }
      if (flipped) {
        if (e.key === '1') handleRate(0)
        if (e.key === '2') handleRate(2)
        if (e.key === '3') handleRate(4)
        if (e.key === '4') handleRate(5)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped]) // handleRate dep added below via ref pattern

  // ── Rate + requeue logic ─────────────────────────────────────────────
  const handleRate = useCallback((q) => {
    const currentQ = queueRef.current
    const currentI = qiRef.current
    const card     = currentQ[currentI]
    if (!card) return

    rate(card.id, q)

    const isGood = q >= 3
    setStats(s => ({
      ok:   s.ok   + (isGood ? 1 : 0),
      miss: s.miss + (isGood ? 0 : 1),
    }))

    if (!isGood) {
      // Schedule re-queue
      const delayMs = q === 0
        ? 10 * 60 * 1000
        : settings.hardIntervalMins * 60 * 1000
      requeuePool.current.push({ card, dueAt: Date.now() + delayMs })
    }

    // Check pool for anything already due right now (fast typers, min=0 edge cases)
    const now    = Date.now()
    const dueNow = requeuePool.current.filter(e => e.dueAt <= now)
    requeuePool.current = requeuePool.current.filter(e => e.dueAt > now)

    const nextI = currentI + 1

    setQueue(prev => {
      const next = [...prev]
      dueNow.forEach((e, i) => next.splice(nextI + i, 0, e.card))
      queueRef.current = next
      return next
    })

    // After splice, check if we've exhausted the queue
    const newQueueLen = currentQ.length + dueNow.length
    if (nextI >= newQueueLen) {
      // Queue exhausted — are there still pending requeues?
      if (requeuePool.current.length > 0) {
        setWaiting(true)
      } else {
        setDone(true)
      }
      return
    }

    qiRef.current = nextI
    setQi(nextI)
    setFlipped(false)
  }, [rate, settings.hardIntervalMins])

  // ── Burn card (Already know this) ───────────────────────────────────
  const handleBurn = useCallback(() => {
    const currentQ = queueRef.current
    const currentI = qiRef.current
    const card     = currentQ[currentI]
    if (!card) return

    // Persist to localStorage
    burnedRef.current.add(card.id)
    writeBurned(id, burnedRef.current)

    // Find first replacement: a card not already in the queue and not burned
    const queued  = new Set(currentQ.map(c => c.id))
    const replacement = deck?.cards.find(
      c => !queued.has(c.id) && !burnedRef.current.has(c.id)
    )

    // Remove current card from queue; splice replacement in at same position
    setQueue(prev => {
      const next = prev.filter((_, i) => i !== currentI)
      if (replacement) next.splice(currentI, 0, replacement)
      queueRef.current = next
      return next
    })

    // If queue is now empty (nothing to replace with either), end session
    const newLen = currentQ.length - 1 + (replacement ? 1 : 0)
    if (newLen === 0) { setDone(true); return }

    // Stay at same qi (the replacement card slides into the same slot)
    setFlipped(false)
  }, [deck, id])

  // Trigger My Story auto-focus on flip
  const handleFlip = useCallback(() => {
    setFlipped(f => {
      const next = !f
      if (next) setStoryFocusTick(t => t + 1) // increment = new focus signal
      return next
    })
  }, [])

  // ── Check pool now (called by WaitingScreen timer) ────────────────────
  const checkPoolNow = useCallback(() => {
    const now  = Date.now()
    const due  = requeuePool.current.filter(e => e.dueAt <= now)
    if (!due.length) return
    requeuePool.current = requeuePool.current.filter(e => e.dueAt > now)

    const nextI = qiRef.current + 1
    setQueue(prev => {
      const next = [...prev]
      due.forEach((e, i) => next.splice(nextI + i, 0, e.card))
      queueRef.current = next
      return next
    })
    setWaiting(false)
    qiRef.current = nextI
    setQi(nextI)
    setFlipped(false)
  }, [])

  // ── Guards ────────────────────────────────────────────────────────────
  if (!deck)         return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>
  if (!queue.length) return <div className="px-5 py-6 text-parchment-500">Loading…</div>
  if (done)          return <div className="h-full"><DoneScreen stats={stats} deckId={id} onRestart={buildQueue} /></div>
  if (waiting)       return <div className="h-full"><WaitingScreen requeuePool={requeuePool.current} onCheckNow={checkPoolNow} /></div>

  const current = queue[qi]
  // How many unique cards left (excludes re-queued copies)
  const uniqueRemaining = queue.slice(qi).filter((c, i, arr) =>
    arr.findIndex(x => x.id === c.id) === i
  ).length
  const pct = Math.max(0, Math.round(((qi) / queue.length) * 100))

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)}
          className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase
                     hover:text-ember transition-colors touch-manipulation">
          ✕ Quit
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest tabular-nums">
            {uniqueRemaining} left
          </span>
          {requeuePool.current.length > 0 && (
            <span className="font-mono text-[9px] text-amber-500/60 tracking-widest">
              +{requeuePool.current.length} pending
            </span>
          )}
        </div>

        <button onClick={() => navigate('/settings')}
          className="text-parchment-500/40 hover:text-gold-400 transition-colors touch-manipulation"
          title="Study settings">
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
          <div className="h-full bg-gold-400/60 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ── Mode toggle ── */}
      <div className="shrink-0 px-5 pb-3">
        <ModeToggle mode={mode} onChange={m => { setMode(m); setFlipped(false) }} />
      </div>

      {/* ── Card ── */}
      <div className="flex-1 min-h-0 px-5 pb-3">
        <div key={`${qi}-${current?.id}`}
          className="card-scene h-full animate-card-enter"
          onClick={handleFlip}>
          <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
            <CardFront card={current} mode={mode} peekActive={peekActive}
                             onBurn={handleBurn}
                             isNew={!getCardProgress(current.id)} />
            <CardBack  card={current} mode={mode} shouldFocusStory={flipped ? storyFocusTick : 0} />
          </div>
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className="shrink-0 px-5 pb-6">
        {flipped ? (
          <div>
            <RatingButtons onRate={handleRate} settings={settings} />
            <p className="font-mono text-[8px] text-parchment-500/25 tracking-widest uppercase
                           text-center mt-2">
              1 · 2 · 3 · 4 on keyboard
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <p className="font-mono text-[10px] text-parchment-500/35 tracking-widest uppercase">
              Tap or Space to reveal
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
function Divider() { return <div className="h-px bg-gold-400/10 my-4" /> }
function Story({ num, children }) {
  return (
    <div className="relative pl-6 bg-ink-700/70 rounded-lg p-3">
      <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">{num}</span>
      <p className="font-mono text-[11px] text-parchment-500 leading-relaxed">{children}</p>
    </div>
  )
}
