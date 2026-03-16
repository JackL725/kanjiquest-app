import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getDeckById, getOwnedDecks } from '@/data/decks'
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

// ─── Burned cards ─────────────────────────────────────────────────────────
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
    localStorage.setItem(BURNED_KEY, JSON.stringify({ ...all, [deckId]: [...burnedSet] }))
  } catch {}
}

// ─── Shortcut usage tracking ──────────────────────────────────────────────
const SHORTCUT_KEY = 'kq-shortcut-uses'
function getShortcutUses() {
  try { return parseInt(localStorage.getItem(SHORTCUT_KEY) || '0', 10) } catch { return 0 }
}
function bumpShortcutUses() {
  try { const n = getShortcutUses() + 1; localStorage.setItem(SHORTCUT_KEY, String(n)); return n } catch { return 999 }
}

// ─── Tomorrow forecast ────────────────────────────────────────────────────
function getTomorrowForecast() {
  try {
    const prog = JSON.parse(localStorage.getItem('kq-srs-progress') || '{}')
    const decks = getOwnedDecks()
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23, 59, 59, 999)
    let count = 0
    for (const deck of decks) {
      const dp = prog[deck.id] || {}
      for (const card of deck.cards) {
        const p = dp[card.id]
        if (p && p.graduated && new Date(p.next) <= tomorrow) count++
      }
    }
    return count
  } catch { return 0 }
}

const RATING_META = [
  { q: 0, label: 'Again', color: 'text-ember',       border: 'border-ember/30',       bg: 'bg-ember/5 hover:bg-ember/12',        bar: 'bg-ember/70'         },
  { q: 2, label: 'Hard',  color: 'text-amber-500',   border: 'border-amber-500/30',   bg: 'bg-amber-500/5 hover:bg-amber-500/12',bar: 'bg-amber-500/70'     },
  { q: 4, label: 'Good',  color: 'text-blue-400',    border: 'border-blue-400/30',    bg: 'bg-blue-400/5 hover:bg-blue-400/12',  bar: 'bg-blue-400/70'      },
  { q: 5, label: 'Easy',  color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/5 hover:bg-emerald-400/12', bar: 'bg-emerald-400/70' },
]

const MODES = [
  { key: 'meaning', label: 'Kanji → Meaning' },
  { key: 'kanji',   label: 'Meaning → Kanji' },
]

// ─── Shake detection ──────────────────────────────────────────────────────
function useShake(onShake, threshold = 18) {
  useEffect(() => {
    let last = { x: 0, y: 0, z: 0, t: 0 }
    function handleMotion(e) {
      const a = e.accelerationIncludingGravity; if (!a) return
      const now = Date.now(); if (now - last.t < 100) return
      const dx = Math.abs((a.x ?? 0) - last.x), dy = Math.abs((a.y ?? 0) - last.y), dz = Math.abs((a.z ?? 0) - last.z)
      if (dx + dy + dz > threshold) onShake()
      last = { x: a.x ?? 0, y: a.y ?? 0, z: a.z ?? 0, t: now }
    }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(r => { if (r === 'granted') window.addEventListener('devicemotion', handleMotion) }).catch(() => {})
    } else { window.addEventListener('devicemotion', handleMotion) }
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [onShake, threshold])
}

// ─── Swipe detection ──────────────────────────────────────────────────────
function useSwipe({ onSwipeUp, onSwipeLeft, onSwipeRight }) {
  const touchRef = useRef(null)
  useEffect(() => {
    function onStart(e) { if (e.touches.length === 1) touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } }
    function onEnd(e) {
      if (!touchRef.current) return
      const t = e.changedTouches[0], dx = t.clientX - touchRef.current.x, dy = t.clientY - touchRef.current.y
      const dt = Date.now() - touchRef.current.t; touchRef.current = null
      if (dt > 500) return
      const ax = Math.abs(dx), ay = Math.abs(dy), MIN = 50
      if (ay > ax && ay > MIN && dy < 0) { onSwipeUp?.(); return }
      if (ax > ay && ax > MIN) { dx < 0 ? onSwipeLeft?.() : onSwipeRight?.() }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd) }
  }, [onSwipeUp, onSwipeLeft, onSwipeRight])
}

// ─── Undo toast ───────────────────────────────────────────────────────────
function UndoToast({ label, onUndo, onExpire }) {
  const [pct, setPct] = useState(100)
  useEffect(() => {
    const dur = 4000, start = Date.now()
    let id
    const tick = () => {
      const el = Date.now() - start, p = Math.max(0, 100 - (el / dur) * 100)
      setPct(p)
      if (el < dur) id = requestAnimationFrame(tick); else onExpire()
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
      <button onClick={onUndo}
        className="relative bg-ink-700 border border-gold-400/30 rounded-xl px-5 py-3
                   flex items-center gap-3 shadow-lg shadow-black/40 overflow-hidden
                   hover:border-gold-400/50 transition-colors touch-manipulation">
        <div className="absolute bottom-0 left-0 h-[2px] bg-gold-400/50 transition-none" style={{ width: `${pct}%` }} />
        <span className="font-mono text-[10px] text-parchment-400 tracking-wide">
          Rated <em className="not-italic text-parchment-200">{label}</em>
        </span>
        <span className="font-mono text-[10px] text-gold-400 tracking-widest uppercase font-medium">Undo</span>
      </button>
    </div>
  )
}

// ─── Done screen (enhanced) ───────────────────────────────────────────────
function DoneScreen({ stats, deckId, onRestart, troubleCards, graduatedCards, onReviewMistakes }) {
  const navigate = useNavigate()
  const total = stats.ok + stats.miss, pct = total ? Math.round((stats.ok / total) * 100) : 0
  const forecast = getTomorrowForecast()
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col items-center text-center px-8 py-10">
        <span className="font-kanji text-7xl text-gold-400/15 mb-6 animate-fade-up">完</span>
        <h2 className="font-display italic text-3xl text-parchment-100 mb-1 animate-fade-up delay-100">Session complete</h2>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-10 animate-fade-up delay-100">Consistency is the secret</p>

        <div className="flex gap-10 mb-8 animate-fade-up delay-200">
          {[{ n: stats.ok, l: 'Correct' }, { n: stats.miss, l: 'Again' }, { n: pct + '%', l: 'Accuracy' }].map(({ n, l }) => (
            <div key={l}>
              <p className="font-display italic text-4xl text-gold-400 leading-none">{n}</p>
              <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-2">{l}</p>
            </div>
          ))}
        </div>

        {/* Tomorrow forecast */}
        <div className="bg-ink-800 border border-gold-400/10 rounded-xl px-5 py-3 mb-8 w-full animate-fade-up delay-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase">Tomorrow</span>
            <span className="font-display italic text-lg text-gold-400">{forecast} review{forecast !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Graduated cards */}
        {graduatedCards.length > 0 && (
          <div className="w-full mb-6 animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-emerald-400/15" />
              <span className="font-mono text-[9px] text-emerald-400/70 tracking-widest uppercase">Graduated today</span>
              <div className="flex-1 h-px bg-emerald-400/15" />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {graduatedCards.map(c => (
                <div key={c.id} className="bg-ink-800 border border-emerald-400/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="font-kanji text-lg text-emerald-400">{c.kanji}</span>
                  <span className="font-mono text-[10px] text-parchment-400">{c.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trouble cards */}
        {troubleCards.length > 0 && (
          <div className="w-full mb-6 animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-ember/15" />
              <span className="font-mono text-[9px] text-ember/70 tracking-widest uppercase">Needs work</span>
              <div className="flex-1 h-px bg-ember/15" />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {troubleCards.map(c => (
                <div key={c.id} className="bg-ink-800 border border-ember/15 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="font-kanji text-lg text-ember/80">{c.kanji}</span>
                  <span className="font-mono text-[10px] text-parchment-500">{c.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="gold-divider w-full mb-8 animate-fade-up delay-300"><span /></div>

        <div className="w-full space-y-3 animate-fade-up delay-300">
          {troubleCards.length > 0 && (
            <button onClick={onReviewMistakes}
              className="w-full border border-ember/30 text-ember font-display italic text-lg py-4 rounded-xl hover:bg-ember/8 transition-colors">
              Review {troubleCards.length} mistake{troubleCards.length !== 1 ? 's' : ''} →
            </button>
          )}
          <button onClick={() => navigate(`/deck/${deckId}`)}
            className="w-full border border-gold-400/35 text-gold-400 font-display italic text-lg py-4 rounded-xl hover:bg-gold-400/10 transition-colors">
            Back to deck
          </button>
          <button onClick={onRestart}
            className="w-full border border-parchment-500/15 text-parchment-500 font-display italic text-base py-3 rounded-xl hover:bg-parchment-500/5 transition-colors">
            Study again
          </button>
          <button onClick={() => navigate('/library')}
            className="font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase w-full pt-1">Home</button>
        </div>
      </div>
    </div>
  )
}

// ─── Waiting screen ───────────────────────────────────────────────────────
function WaitingScreen({ requeuePool, onCheckNow }) {
  const soonest = requeuePool.reduce((min, e) => Math.min(min, e.dueAt), Infinity)
  const [secs, setSecs] = useState(Math.max(0, Math.ceil((soonest - Date.now()) / 1000)))
  useEffect(() => {
    const t = setInterval(() => { const left = Math.max(0, Math.ceil((soonest - Date.now()) / 1000)); setSecs(left); if (left === 0) onCheckNow() }, 1000)
    return () => clearInterval(t)
  }, [soonest])
  const mins = Math.floor(secs / 60), s = secs % 60
  const label = mins > 0 ? `${mins}m ${s}s` : `${s}s`
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-6xl text-gold-400/15 mb-6">待</span>
      <p className="font-display italic text-2xl text-parchment-200 mb-2">Cards pending</p>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8">Next card due in</p>
      <p className="font-display italic text-5xl text-gold-400 mb-10 tabular-nums">{label}</p>
      <p className="font-mono text-[9px] text-parchment-500/40 tracking-widest uppercase">
        {requeuePool.length} card{requeuePool.length !== 1 ? 's' : ''} waiting · checking automatically
      </p>
    </div>
  )
}

// ─── Card Front ───────────────────────────────────────────────────────────
function CardFront({ card, mode, peekActive, onBurn, isNew, deckId }) {
  const isMeaningFirst = mode === 'kanji', hideHint = deckId === 'radicals'
  return (
    <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15 rounded-2xl flex flex-col items-center justify-center p-7 cursor-pointer select-none">
      {isNew && (
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
          <div className="animate-new-card-pop pointer-events-none flex items-center gap-1.5 bg-gold-400/15 border border-gold-400/40 rounded-full px-3 py-1.5 animate-new-card-glow">
            <span className="text-gold-400 text-[11px] leading-none select-none">✦</span>
            <span className="font-mono text-[10px] tracking-[2px] uppercase font-medium text-gold-400 leading-none">First look</span>
          </div>
          <button onClick={e => { e.stopPropagation(); onBurn() }}
            className="pointer-events-auto flex items-center gap-1.5 border border-parchment-500/25 rounded-full px-3 py-1.5 hover:border-gold-400/50 hover:bg-gold-400/8 transition-all duration-200 touch-manipulation animate-new-card-pop"
            style={{ animationDelay: '0.08s' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0 text-parchment-400">
              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M3.5 5.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-mono text-[10px] tracking-wide uppercase text-parchment-400 hover:text-parchment-200 leading-none whitespace-nowrap">I know this</span>
          </button>
        </div>
      )}
      <p className="font-mono text-[9px] text-parchment-500/60 tracking-[3px] uppercase mb-8">
        {isMeaningFirst ? 'What is the kanji?' : 'What does this mean?'}
      </p>
      {isMeaningFirst ? (
        <div className="text-center">
          <p className="font-display italic text-3xl text-parchment-100 mb-3 leading-tight">{card.meaning}</p>
          <p className="font-mono text-sm text-parchment-500">{card.romaji}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="font-kanji text-[96px] text-parchment-100 leading-none mb-6">{card.kanji}</p>
          {card.disambig && (
            <span className="font-mono text-[9px] text-gold-400/70 tracking-[1.5px] uppercase border border-gold-400/20 rounded-full px-3 py-1 mb-4 bg-gold-400/5 select-none">{card.disambig}</span>
          )}
          {!hideHint && (
            <>
              <p className={`font-mono text-[11px] text-parchment-500/70 text-center leading-relaxed px-4 transition-all duration-300 ${peekActive ? '' : 'blur-reveal'}`}>{card.parts.join(' · ')}</p>
              <p className="font-mono text-[9px] text-parchment-500/25 mt-2.5 tracking-widest">hover or shake to peek</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── User Story ───────────────────────────────────────────────────────────
function UserStorySection({ cardId, shouldFocus }) {
  const [text, setText] = useState(() => readUserStories()[cardId] ?? '')
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)
  useEffect(() => { setText(readUserStories()[cardId] ?? ''); setEditing(false) }, [cardId])
  function handleChange(e) { setText(e.target.value); writeUserStory(cardId, e.target.value) }
  const isEmpty = !text.trim()
  return (
    <div className="mb-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase">My story</p>
        {!isEmpty && !editing && (
          <button onClick={() => { setEditing(true); setTimeout(() => ref.current?.focus(), 0) }}
            className="font-mono text-[8px] text-parchment-500/40 tracking-widest uppercase hover:text-gold-400/60 transition-colors">Edit</button>
        )}
      </div>
      {editing || isEmpty ? (
        <textarea ref={ref} value={text} onChange={handleChange} onBlur={() => setEditing(false)}
          placeholder="Write your own mnemonic story for this kanji…" rows={3}
          className="w-full bg-ink-700/60 border border-gold-400/12 rounded-lg px-3 py-2.5 font-mono text-[11px] text-parchment-300 placeholder:text-parchment-500/30 leading-relaxed outline-none focus:border-gold-400/30 resize-none transition-colors duration-150" />
      ) : (
        <button onClick={() => { setEditing(true); setTimeout(() => ref.current?.focus(), 0) }}
          className="w-full text-left relative pl-6 bg-ink-700/70 rounded-lg p-3 border border-transparent hover:border-gold-400/12 transition-colors">
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
    <div className="card-face card-face-back absolute inset-0 bg-ink-800 border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
      <span className="absolute top-3 right-4 font-kanji text-[80px] leading-none text-parchment-100 select-none pointer-events-none">{card.kanji}</span>
      <div className="h-full overflow-y-auto p-5">
        {isMeaningFirst ? (
          <BackSection label="Kanji">
            <p className="font-kanji text-6xl text-parchment-100 leading-none mb-1">{card.kanji}</p>
            <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
            <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
          </BackSection>
        ) : (<>
          <BackSection label="Meaning"><p className="font-display italic text-2xl text-parchment-100 leading-tight">{card.meaning}</p></BackSection>
          <BackSection label="Reading">
            <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
            <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
          </BackSection>
        </>)}
        <Divider />
        <BackSection label="RTK stories"><div className="space-y-2"><Story num={1}>{card.rtk1}</Story><Story num={2}>{card.rtk2}</Story></div></BackSection>
        <UserStorySection cardId={card.id} shouldFocus={shouldFocusStory} />
        <Divider />
        <BackSection label="Components">
          <div className="flex flex-wrap gap-1.5">
            {card.parts.map(p => (<span key={p} className="font-mono text-[10px] text-parchment-500 border border-gold-400/15 rounded px-2 py-0.5">{p}</span>))}
          </div>
        </BackSection>
        {(card.onyomi || card.kunyomi) && (<>
          <Divider />
          {card.onyomi && <BackSection label="On'yomi"><p className="font-kanji text-sm text-parchment-300 leading-relaxed">{card.onyomi}</p></BackSection>}
          {card.kunyomi && <BackSection label="Kun'yomi"><p className="font-kanji text-sm text-parchment-300 leading-relaxed">{card.kunyomi}</p></BackSection>}
          {card.nanori && <BackSection label="Nanori"><p className="font-kanji text-[12px] text-parchment-500 leading-relaxed">{card.nanori}</p></BackSection>}
        </>)}
        {card.context && (<>
          <Divider />
          <BackSection label="In-game context">
            <p className="font-kanji text-sm text-parchment-300 leading-relaxed">{card.context}</p>
            <p className="font-mono text-[10px] text-parchment-500/70 mt-1.5 italic">{card.contextEn}</p>
          </BackSection>
        </>)}
        {card.jlpt && (
          <div className="mt-4 pt-3 border-t border-gold-400/8 flex items-center justify-between">
            <span className="font-mono text-[9px] text-parchment-500/40 tracking-[2px] uppercase">JLPT Level</span>
            <span className="font-mono text-[11px] text-gold-400/70 tracking-widest font-medium">N{card.jlpt}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex bg-ink-700 border border-gold-400/10 rounded-lg p-0.5 gap-0.5">
      {MODES.map(m => (
        <button key={m.key} onClick={() => onChange(m.key)}
          className={`flex-1 font-mono text-[9px] tracking-wide py-1.5 px-2 rounded-md transition-colors duration-150 touch-manipulation whitespace-nowrap ${mode === m.key ? 'bg-ink-800 text-gold-400 border border-gold-400/20' : 'text-parchment-500/60 hover:text-parchment-400'}`}>
          {m.label}
        </button>
      ))}
    </div>
  )
}

function RatingButtons({ onRate, settings }) {
  const subs = ['reset', `${settings.hardIntervalMins}m`, `${settings.goodIntervalDays}d`, `${settings.easyIntervalDays}d`]
  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-up">
      {RATING_META.map((r, i) => (
        <button key={r.label} onClick={() => onRate(r.q)}
          className={`relative rounded-xl border overflow-hidden flex flex-col items-center justify-center gap-1.5 py-4 transition-colors duration-150 touch-manipulation ${r.border} ${r.bg}`}>
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
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const deck = getDeckById(id)
  const { rate, getStudyQueue, getNewCards, getCardProgress, restoreCardProgress } = useSRS(id)
  const { settings } = useSettings()

  const [mode, setMode] = useState('meaning')
  const [queue, setQueue] = useState([])
  const [qi, setQi] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ ok: 0, miss: 0 })
  const [done, setDone] = useState(false)
  const [peekActive, setPeek] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [storyFocusTick, setStoryFocusTick] = useState(0)
  const [shortcutUses, setShortcutUses] = useState(getShortcutUses)
  const [undoToast, setUndoToast] = useState(null)

  const troubleRef = useRef([])
  const graduatedRef = useRef([])
  const requeuePool = useRef([])
  const queueRef = useRef([])
  const qiRef = useRef(0)
  const burnedRef = useRef(readBurned(id))

  // ── Build queue ──────────────────────────────────────────────────────
  const buildQueue = useCallback(() => {
    if (!deck) return
    requeuePool.current = []; troubleRef.current = []; graduatedRef.current = []
    const isAll = params.get('mode') === 'all', group = params.get('group'), burned = burnedRef.current
    const sourceCards = group ? deck.cards.filter(c => String(c.strokes) === group) : deck.cards
    let cards
    if (isAll || group) { cards = sourceCards.filter(c => !burned.has(c.id)) }
    else {
      const { newBatch, reviewBatch, learning } = getStudyQueue(sourceCards)
      cards = [...newBatch, ...learning, ...reviewBatch].filter(c => !burned.has(c.id))
      if (!cards.length) cards = sourceCards.filter(c => !burned.has(c.id))
    }
    const shuffled = cards.sort(() => Math.random() - 0.5)
    queueRef.current = shuffled; setQueue(shuffled)
    qiRef.current = 0; setQi(0); setFlipped(false); setDone(false); setWaiting(false); setStats({ ok: 0, miss: 0 }); setUndoToast(null)
  }, [deck?.id, settings.newCardsPerDay, settings.maxReviewsPerDay])

  useEffect(() => { buildQueue() }, [deck?.id])

  // ── Mistakes review queue ────────────────────────────────────────────
  const startMistakesReview = useCallback(() => {
    const cards = troubleRef.current.map(t => t.card)
    if (!cards.length) return
    troubleRef.current = []; graduatedRef.current = []; requeuePool.current = []
    const shuffled = cards.sort(() => Math.random() - 0.5)
    queueRef.current = shuffled; setQueue(shuffled)
    qiRef.current = 0; setQi(0); setFlipped(false); setDone(false); setWaiting(false); setStats({ ok: 0, miss: 0 }); setUndoToast(null)
  }, [])

  // ── Poll requeue ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now(), due = requeuePool.current.filter(e => e.dueAt <= now)
      if (!due.length) return
      requeuePool.current = requeuePool.current.filter(e => e.dueAt > now)
      setQueue(prev => { const next = [...prev]; due.forEach((e, i) => next.splice(qiRef.current + 1 + i, 0, e.card)); queueRef.current = next; return next })
      setWaiting(false)
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // ── Shake to peek ────────────────────────────────────────────────────
  const handleShake = useCallback(() => { if (!flipped) { setPeek(true); setTimeout(() => setPeek(false), 2000) } }, [flipped])
  useShake(handleShake)

  // ── Swipe gestures ───────────────────────────────────────────────────
  const handleSwipeUp = useCallback(() => {
    if (!flipped) { setFlipped(true); setStoryFocusTick(t => t + 1); setShortcutUses(bumpShortcutUses()) }
  }, [flipped])
  const handleSwipeLeft = useCallback(() => { if (flipped) { handleRate(0); setShortcutUses(bumpShortcutUses()) } }, [flipped])
  const handleSwipeRight = useCallback(() => { if (flipped) { handleRate(4); setShortcutUses(bumpShortcutUses()) } }, [flipped])
  useSwipe({ onSwipeUp: handleSwipeUp, onSwipeLeft: handleSwipeLeft, onSwipeRight: handleSwipeRight })

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => { if (!f) setStoryFocusTick(t => t + 1); return !f }); setShortcutUses(bumpShortcutUses()) }
      if (flipped) {
        if (e.key === '1') { handleRate(0); setShortcutUses(bumpShortcutUses()) }
        if (e.key === '2') { handleRate(2); setShortcutUses(bumpShortcutUses()) }
        if (e.key === '3') { handleRate(4); setShortcutUses(bumpShortcutUses()) }
        if (e.key === '4') { handleRate(5); setShortcutUses(bumpShortcutUses()) }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && undoToast) { e.preventDefault(); performUndo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, undoToast])

  // ── Undo ─────────────────────────────────────────────────────────────
  const performUndo = useCallback(() => {
    if (!undoToast) return
    const { snapshot, cardId, qi: prevQi, statsDelta, requeueEntry } = undoToast
    restoreCardProgress(cardId, snapshot)
    setStats(s => ({ ok: s.ok - (statsDelta.ok || 0), miss: s.miss - (statsDelta.miss || 0) }))
    troubleRef.current = troubleRef.current.filter(t => t.card.id !== cardId)
    graduatedRef.current = graduatedRef.current.filter(c => c.id !== cardId)
    if (requeueEntry) requeuePool.current = requeuePool.current.filter(e => e !== requeueEntry)
    qiRef.current = prevQi; setQi(prevQi); setFlipped(false); setDone(false); setWaiting(false); setUndoToast(null)
  }, [undoToast, restoreCardProgress])

  // ── Rate ─────────────────────────────────────────────────────────────
  const handleRate = useCallback((q) => {
    const currentQ = queueRef.current, currentI = qiRef.current, card = currentQ[currentI]
    if (!card) return

    const prevProgress = getCardProgress(card.id)
    const snapshot = prevProgress ? { ...prevProgress } : null
    rate(card.id, q)

    const isGood = q >= 3
    const statsDelta = { ok: isGood ? 1 : 0, miss: isGood ? 0 : 1 }

    if (!isGood && !troubleRef.current.find(t => t.card.id === card.id)) troubleRef.current.push({ card, q })
    if (isGood && (!prevProgress || !prevProgress.graduated) && !graduatedRef.current.find(c => c.id === card.id)) graduatedRef.current.push(card)

    setStats(s => ({ ok: s.ok + statsDelta.ok, miss: s.miss + statsDelta.miss }))

    let requeueEntry = null
    if (!isGood) {
      const delayMs = q === 0 ? 10 * 60 * 1000 : settings.hardIntervalMins * 60 * 1000
      requeueEntry = { card, dueAt: Date.now() + delayMs }
      requeuePool.current.push(requeueEntry)
    }

    const now = Date.now()
    const dueNow = requeuePool.current.filter(e => e.dueAt <= now)
    requeuePool.current = requeuePool.current.filter(e => e.dueAt > now)
    const nextI = currentI + 1

    setQueue(prev => { const next = [...prev]; dueNow.forEach((e, i) => next.splice(nextI + i, 0, e.card)); queueRef.current = next; return next })

    const ratingLabel = RATING_META.find(r => r.q === q)?.label || '?'
    const newUndoToast = { label: ratingLabel, snapshot, cardId: card.id, qi: currentI, statsDelta, requeueEntry }

    if (nextI >= currentQ.length + dueNow.length) {
      if (requeuePool.current.length > 0) setWaiting(true); else setDone(true)
      setUndoToast(newUndoToast); return
    }

    qiRef.current = nextI; setQi(nextI); setFlipped(false); setUndoToast(newUndoToast)
  }, [rate, settings.hardIntervalMins, getCardProgress])

  // ── Burn ─────────────────────────────────────────────────────────────
  const handleBurn = useCallback(() => {
    const currentQ = queueRef.current, currentI = qiRef.current, card = currentQ[currentI]
    if (!card) return
    burnedRef.current.add(card.id); writeBurned(id, burnedRef.current)
    const queued = new Set(currentQ.map(c => c.id))
    const replacement = deck?.cards.find(c => !queued.has(c.id) && !burnedRef.current.has(c.id))
    setQueue(prev => { const next = prev.filter((_, i) => i !== currentI); if (replacement) next.splice(currentI, 0, replacement); queueRef.current = next; return next })
    if (currentQ.length - 1 + (replacement ? 1 : 0) === 0) { setDone(true); return }
    setFlipped(false)
  }, [deck, id])

  const handleFlip = useCallback(() => { setFlipped(f => { if (!f) setStoryFocusTick(t => t + 1); return !f }) }, [])

  const checkPoolNow = useCallback(() => {
    const now = Date.now(), due = requeuePool.current.filter(e => e.dueAt <= now)
    if (!due.length) return
    requeuePool.current = requeuePool.current.filter(e => e.dueAt > now)
    const nextI = qiRef.current + 1
    setQueue(prev => { const next = [...prev]; due.forEach((e, i) => next.splice(nextI + i, 0, e.card)); queueRef.current = next; return next })
    setWaiting(false); qiRef.current = nextI; setQi(nextI); setFlipped(false)
  }, [])

  // ── Guards ────────────────────────────────────────────────────────────
  if (!deck) return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>
  if (!queue.length) return <div className="px-5 py-6 text-parchment-500">Loading…</div>
  if (done) return (
    <div className="h-full">
      <DoneScreen stats={stats} deckId={id} onRestart={buildQueue}
        troubleCards={troubleRef.current.map(t => t.card)} graduatedCards={graduatedRef.current} onReviewMistakes={startMistakesReview} />
      {undoToast && <UndoToast key={undoToast.cardId + undoToast.qi} label={undoToast.label} onUndo={performUndo} onExpire={() => setUndoToast(null)} />}
    </div>
  )
  if (waiting) return (
    <div className="h-full">
      <WaitingScreen requeuePool={requeuePool.current} onCheckNow={checkPoolNow} />
      {undoToast && <UndoToast key={undoToast.cardId + undoToast.qi} label={undoToast.label} onUndo={performUndo} onExpire={() => setUndoToast(null)} />}
    </div>
  )

  const current = queue[qi], groupParam = params.get('group')
  const uniqueRemaining = queue.slice(qi).filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i).length
  const pct = Math.max(0, Math.round(((qi) / queue.length) * 100))
  const showHints = shortcutUses < 10

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase hover:text-ember transition-colors touch-manipulation">✕ Quit</button>
        <div className="flex items-center gap-2">
          {groupParam && <span className="font-mono text-[9px] text-gold-400/50 tracking-widest border border-gold-400/15 rounded-md px-1.5 py-0.5 leading-none">{groupParam} stroke{groupParam !== '1' ? 's' : ''}</span>}
          <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest tabular-nums">{uniqueRemaining} left</span>
          {requeuePool.current.length > 0 && <span className="font-mono text-[9px] text-amber-500/60 tracking-widest">+{requeuePool.current.length} pending</span>}
        </div>
        <button onClick={() => navigate('/settings')} className="text-parchment-500/40 hover:text-gold-400 transition-colors touch-manipulation" title="Study settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M11.53 4.47l-1.42 1.42M4.97 11.03l-1.42 1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-5 pb-3">
        <div className="h-[2px] bg-ink-600 rounded-full overflow-hidden">
          <div className="h-full bg-gold-400/60 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="shrink-0 px-5 pb-3"><ModeToggle mode={mode} onChange={m => { setMode(m); setFlipped(false) }} /></div>

      {/* Card */}
      <div className="flex-1 min-h-0 px-5 pb-3">
        <div key={`${qi}-${current?.id}`} className="card-scene h-full animate-card-enter" onClick={handleFlip}>
          <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
            <CardFront card={current} mode={mode} peekActive={peekActive} onBurn={handleBurn} deckId={id} isNew={!getCardProgress(current.id)} />
            <CardBack card={current} mode={mode} shouldFocusStory={flipped ? storyFocusTick : 0} />
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 px-5 pb-6">
        {flipped ? (
          <div>
            <RatingButtons onRate={handleRate} settings={settings} />
            {showHints ? (
              <div className="flex items-center justify-center gap-4 mt-2.5">
                <span className="font-mono text-[8px] text-parchment-500/30 tracking-widest uppercase">1 · 2 · 3 · 4 keys</span>
                <span className="font-mono text-[8px] text-parchment-500/20">|</span>
                <span className="font-mono text-[8px] text-parchment-500/30 tracking-widest uppercase">← again · good →</span>
              </div>
            ) : (
              <p className="font-mono text-[8px] text-parchment-500/25 tracking-widest uppercase text-center mt-2">1 · 2 · 3 · 4</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-3 gap-1">
            <p className="font-mono text-[10px] text-parchment-500/35 tracking-widest uppercase">Tap or Space to reveal</p>
            {showHints && <p className="font-mono text-[8px] text-parchment-500/20 tracking-widest uppercase">Swipe up to flip</p>}
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoToast && <UndoToast key={undoToast.cardId + undoToast.qi} label={undoToast.label} onUndo={performUndo} onExpire={() => setUndoToast(null)} />}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────
function BackSection({ label, children }) {
  return <div className="mb-4"><p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">{label}</p>{children}</div>
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
