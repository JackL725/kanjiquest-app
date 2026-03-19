import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getDeckById, getOwnedDecks } from '@/data/decks'
import { useSRS, Rating } from '@/hooks/useSRS'
import { useSettings } from '@/hooks/useSettings'
import { getMasteryStage, STAGES } from '@/hooks/useMastery'
import { useAudio } from '@/hooks/useAudio'

// ─── Part format helpers ──────────────────────────────────────────────────
// Primer parts are objects: { c: '日', n: 'sun, day', p: 0 }
// Game deck parts are strings: '日: day; sun; Japan'
function isObjectPart(p) { return p && typeof p === 'object' && 'n' in p }
function partLabel(p) {
  if (isObjectPart(p)) return p.c ? `${p.c} ${p.n}` : p.n
  return String(p)
}
function partKey(p) {
  if (isObjectPart(p)) return p.c ?? p.n
  return String(p)
}

// Render a single structured part as inline elements (char + name)
function PartInline({ part }) {
  if (!isObjectPart(part)) return <span className="font-mono">{String(part)}</span>
  return (
    <span className="inline-flex items-center gap-1">
      {part.c && <span className={`font-kanji text-parchment-300 ${part.p ? 'font-kanji' : ''}`}>{part.c}</span>}
      <span className="font-mono text-parchment-500/70">{part.n}</span>
    </span>
  )
}

// Render a part badge (card back / component section)
function PartBadge({ part, size = 'md' }) {
  if (!isObjectPart(part)) {
    return <span className={`font-mono ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'} text-parchment-400 bg-ink-700/60 border border-gold-400/10 rounded-lg px-2.5 py-1`}>{String(part)}</span>
  }
  const charSize = size === 'sm' ? 'text-[20px]' : 'text-[26px]'
  const nameSize = size === 'sm' ? 'text-[8px]' : 'text-[9px]'
  return (
    <span className={`inline-flex flex-col items-center bg-ink-700/60 border border-gold-400/10 rounded-xl ${size === 'sm' ? 'px-2.5 py-1.5 min-w-[48px]' : 'px-3 py-2 min-w-[56px]'}`}>
      {part.c ? (
        <span className={`font-kanji ${charSize} text-parchment-100 leading-none`}>{part.c}</span>
      ) : (
        <span className={`font-mono ${size === 'sm' ? 'text-[11px]' : 'text-[12px]'} text-parchment-500/40 leading-none`}>?</span>
      )}
      <span className={`font-mono ${nameSize} text-parchment-500 mt-1 text-center leading-tight max-w-[72px]`}>{part.n}</span>
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const STORIES_KEY = 'kq-user-stories'
function readUserStories() { try { return JSON.parse(localStorage.getItem(STORIES_KEY) || '{}') } catch { return {} } }
function writeUserStory(id, t) { try { const s = readUserStories(); localStorage.setItem(STORIES_KEY, JSON.stringify({ ...s, [id]: t })) } catch {} }

const BURNED_KEY = 'kq-burned'
function readBurned(deckId) { try { const a = JSON.parse(localStorage.getItem(BURNED_KEY) || '{}'); return new Set(a[deckId] ?? []) } catch { return new Set() } }
function writeBurned(deckId, s) { try { const a = JSON.parse(localStorage.getItem(BURNED_KEY) || '{}'); localStorage.setItem(BURNED_KEY, JSON.stringify({ ...a, [deckId]: [...s] })) } catch {} }

const SC_KEY = 'kq-shortcut-uses'
function getSCUses() { try { return parseInt(localStorage.getItem(SC_KEY) || '0', 10) } catch { return 0 } }
function bumpSC() { try { const n = getSCUses() + 1; localStorage.setItem(SC_KEY, String(n)); return n } catch { return 999 } }

function getTomorrowForecast() {
  try {
    const prog = JSON.parse(localStorage.getItem('kq-srs-progress') || '{}')
    const decks = getOwnedDecks()
    const tm = new Date(); tm.setDate(tm.getDate() + 1); tm.setHours(23, 59, 59, 999)
    let c = 0
    for (const d of decks) { const dp = prog[d.id] || {}; for (const card of d.cards) { const p = dp[card.id]; if (p?.state >= 2 && new Date(p.due) <= tm) c++ } }
    return c
  } catch { return 0 }
}

// ─── XP System (FSRS-aware) ───────────────────────────────────────────────
// Base XP by rating. Hard is a successful recall in FSRS — rewarded fairly.
const BASE_XP = { 1: 0, 2: 3, 3: 5, 4: 8 }

// Difficulty bonus: FSRS difficulty (1–10) rewards harder cards
function getDifficultyBonus(p) {
  if (!p || !p.difficulty) return 0
  if (p.difficulty >= 7) return 4   // tough card
  if (p.difficulty >= 4) return 2   // moderate
  return 0                          // easy card
}

// Stability bonus: reward maintaining long-term memories
function getStabilityBonus(p) {
  if (!p || !p.stability) return 0
  if (p.stability >= 90) return 3   // engraved
  if (p.stability >= 30) return 2   // mastered
  if (p.stability >= 7)  return 1   // tempered
  return 0                          // still building
}

// Combo multiplier: capped and stepped (no more runaway scaling)
const COMBO_MULT_TIERS = [
  { min: 0,  mult: 1.0 },
  { min: 3,  mult: 1.5 },
  { min: 6,  mult: 2.0 },
  { min: 10, mult: 2.5 },
  { min: 15, mult: 3.0 },  // max
]
function getComboMult(combo) {
  for (let i = COMBO_MULT_TIERS.length - 1; i >= 0; i--) {
    if (combo >= COMBO_MULT_TIERS[i].min) return COMBO_MULT_TIERS[i].mult
  }
  return 1.0
}

// Calculate total XP for a single rating
function calcXP(q, combo, cardProgress) {
  const base = BASE_XP[q] || 0
  if (base === 0) return 0
  const diff  = getDifficultyBonus(cardProgress)
  const stab  = getStabilityBonus(cardProgress)
  const mult  = getComboMult(combo)
  return Math.round((base + diff + stab) * mult)
}

// ─── Rating feedback messages ─────────────────────────────────────────────
const FEEDBACK = {
  1: { msgs: ['Keep going!', 'You\'ll get it!', 'Almost there!', 'Stay with it!'], color: 'text-ember' },
  2: { msgs: ['Remembered!', 'Tough one!', 'Got it!', 'Not easy, but you knew it!'], color: 'text-amber-500' },
  3: { msgs: ['Nice!', 'Got it!', 'Solid!', 'Well done!', 'Clean!'], color: 'text-blue-400' },
  4: { msgs: ['Perfect!', 'Flawless!', 'Crushed it!', 'Effortless!', '完璧!'], color: 'text-emerald-400' },
}
function randomMsg(q) { const m = FEEDBACK[q].msgs; return m[Math.floor(Math.random() * m.length)] }

const RATING_META = [
  { q: Rating.Again, label: 'Again', color: 'text-ember',       border: 'border-ember/30',       bg: 'bg-ember/5 hover:bg-ember/12',        bar: 'bg-ember/70'         },
  { q: Rating.Hard,  label: 'Hard',  color: 'text-amber-500',   border: 'border-amber-500/30',   bg: 'bg-amber-500/5 hover:bg-amber-500/12',bar: 'bg-amber-500/70'     },
  { q: Rating.Good,  label: 'Good',  color: 'text-blue-400',    border: 'border-blue-400/30',    bg: 'bg-blue-400/5 hover:bg-blue-400/12',  bar: 'bg-blue-400/70'      },
  { q: Rating.Easy,  label: 'Easy',  color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/5 hover:bg-emerald-400/12', bar: 'bg-emerald-400/70' },
]

const MODES = [
  { key: 'meaning', label: 'Kanji → Meaning' },
  { key: 'kanji',   label: 'Meaning → Kanji' },
]

// ─── Hooks ────────────────────────────────────────────────────────────────
function useShake(onShake, threshold = 18) {
  useEffect(() => {
    let last = { x: 0, y: 0, z: 0, t: 0 }
    function h(e) { const a = e.accelerationIncludingGravity; if (!a) return; const n = Date.now(); if (n - last.t < 100) return; if (Math.abs((a.x??0)-last.x)+Math.abs((a.y??0)-last.y)+Math.abs((a.z??0)-last.z) > threshold) onShake(); last = { x:a.x??0, y:a.y??0, z:a.z??0, t:n } }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') { DeviceMotionEvent.requestPermission().then(r => { if (r === 'granted') window.addEventListener('devicemotion', h) }).catch(() => {}) } else { window.addEventListener('devicemotion', h) }
    return () => window.removeEventListener('devicemotion', h)
  }, [onShake, threshold])
}

function useSwipe({ onSwipeUp, onSwipeLeft, onSwipeRight }) {
  const ref = useRef(null)
  useEffect(() => {
    function s(e) { if (e.touches.length === 1) ref.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } }
    function e2(e) { if (!ref.current) return; const t = e.changedTouches[0], dx = t.clientX-ref.current.x, dy = t.clientY-ref.current.y, dt = Date.now()-ref.current.t; ref.current = null; if (dt > 500) return; const ax = Math.abs(dx), ay = Math.abs(dy); if (ay > ax && ay > 50 && dy < 0) { onSwipeUp?.(); return }; if (ax > ay && ax > 50) { dx < 0 ? onSwipeLeft?.() : onSwipeRight?.() } }
    window.addEventListener('touchstart', s, { passive: true }); window.addEventListener('touchend', e2, { passive: true })
    return () => { window.removeEventListener('touchstart', s); window.removeEventListener('touchend', e2) }
  }, [onSwipeUp, onSwipeLeft, onSwipeRight])
}

// ─── Feedback messages lookup (used by CardFront) ─────────────────────────
function StageUpCelebration({ stage, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t) }, [])
  const colorMap = { 'amber-500': 'text-amber-500', 'blue-400': 'text-blue-400', 'gold-400': 'text-gold-400', 'emerald-400': 'text-emerald-400', 'parchment-100': 'text-parchment-100' }
  const glowMap = { 'amber-500': 'rgba(245,158,11,0.15)', 'blue-400': 'rgba(96,165,250,0.15)', 'gold-400': 'rgba(201,168,76,0.15)', 'emerald-400': 'rgba(52,211,153,0.15)', 'parchment-100': 'rgba(245,239,224,0.1)' }
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-ink-950/80 backdrop-blur-sm"
         onClick={onDone}>
      {/* Glow circle */}
      <div className="absolute w-64 h-64 rounded-full animate-stage-up-glow"
           style={{ background: `radial-gradient(circle, ${glowMap[stage.color] || 'rgba(201,168,76,0.1)'} 0%, transparent 70%)` }} />
      <div className="animate-stage-up-enter relative z-10 flex flex-col items-center">
        <p className="font-mono text-[9px] text-parchment-500 tracking-[4px] uppercase mb-4">Stage up</p>
        <span className={`font-kanji text-8xl leading-none animate-stage-up-kanji ${colorMap[stage.color] || 'text-gold-400'}`}>
          {stage.kanji}
        </span>
        <p className={`font-display italic text-3xl mt-4 ${colorMap[stage.color] || 'text-gold-400'}`}>
          {stage.label}
        </p>
        <p className="font-mono text-[10px] text-parchment-500/60 tracking-wide mt-2 max-w-[240px] text-center">
          {stage.desc}
        </p>
      </div>
    </div>
  )
}

// ─── Undo toast ───────────────────────────────────────────────────────────
function UndoToast({ label, onUndo, onExpire }) {
  const [pct, setPct] = useState(100)
  useEffect(() => { const d = 4000, s = Date.now(); let id; const t = () => { const p = Math.max(0, 100-((Date.now()-s)/d)*100); setPct(p); if (Date.now()-s < d) id = requestAnimationFrame(t); else onExpire() }; id = requestAnimationFrame(t); return () => cancelAnimationFrame(id) }, [])
  return (
    <div className="fixed bottom-24 left-4 z-50 animate-fade-up">
      <button onClick={onUndo} className="relative bg-ink-700 border border-gold-400/30 rounded-xl px-6 py-4 flex items-center gap-3 shadow-lg shadow-black/40 overflow-hidden hover:border-gold-400/50 transition-colors touch-manipulation">
        <div className="absolute bottom-0 left-0 h-[2px] bg-gold-400/50 transition-none" style={{ width: `${pct}%` }} />
        <span className="font-mono text-[12px] text-parchment-400 tracking-wide">{label}</span>
        <span className="font-mono text-[12px] text-gold-400 tracking-widest uppercase font-medium">Undo</span>
      </button>
    </div>
  )
}

// ─── Done screen (enhanced with XP + combo + stage-ups) ───────────────────
function DoneScreen({ stats, deckId, onRestart, troubleCards, graduatedCards, onReviewMistakes, sessionXP, maxCombo, stageUps, isPerfect, sessionDuration }) {
  const navigate = useNavigate()
  const total = stats.ok + stats.miss, pct = total ? Math.round((stats.ok / total) * 100) : 0
  const forecast = getTomorrowForecast()
  const timeStr = sessionDuration >= 60 ? `${Math.floor(sessionDuration / 60)}m ${sessionDuration % 60}s` : `${sessionDuration}s`
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col items-center text-center px-8 py-10">
        {isPerfect ? (
          <>
            <span className="font-kanji text-8xl text-emerald-400/30 mb-4 animate-perfect-burst">完璧</span>
            <h2 className="font-display italic text-3xl text-emerald-400 mb-1 animate-fade-up delay-100">Perfect session!</h2>
            <p className="font-mono text-[10px] text-emerald-400/60 tracking-widest uppercase mb-8 animate-fade-up delay-100">Not a single mistake</p>
          </>
        ) : (
          <>
            <span className="font-kanji text-7xl text-gold-400/15 mb-6 animate-fade-up">完</span>
            <h2 className="font-display italic text-3xl text-parchment-100 mb-1 animate-fade-up delay-100">Session complete</h2>
            <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8 animate-fade-up delay-100">Consistency is the secret</p>
          </>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-2 mb-6 w-full animate-fade-up delay-200">
          {[
            { n: sessionXP, l: 'XP earned', c: 'text-gold-400' },
            { n: stats.ok,  l: 'Correct',   c: 'text-blue-400' },
            { n: maxCombo >= 3 ? `×${getComboMult(maxCombo)}` : maxCombo > 0 ? maxCombo : '—', l: maxCombo >= 3 ? 'Peak mult' : 'Best streak', c: 'text-amber-500' },
            { n: pct + '%', l: 'Accuracy',   c: 'text-parchment-100' },
            { n: timeStr,   l: 'Time',       c: 'text-parchment-300' },
          ].map(({ n, l, c }) => (
            <div key={l} className="text-center">
              <p className={`font-display italic text-xl leading-none ${c}`}>{n}</p>
              <p className="font-mono text-[8px] text-parchment-500 tracking-widest uppercase mt-1.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Stage-ups */}
        {stageUps > 0 && (
          <div className="bg-ink-800 border border-gold-400/15 rounded-xl px-5 py-3 mb-4 w-full animate-fade-up delay-200">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase">Stage advances</span>
              <span className="font-display italic text-lg text-gold-400">{stageUps} card{stageUps !== 1 ? 's' : ''} leveled up</span>
            </div>
          </div>
        )}

        {/* Tomorrow forecast */}
        <div className="bg-ink-800 border border-gold-400/10 rounded-xl px-5 py-3 mb-6 w-full animate-fade-up delay-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase">Tomorrow</span>
            <span className="font-display italic text-lg text-gold-400">{forecast} review{forecast !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Graduated */}
        {graduatedCards.length > 0 && (
          <div className="w-full mb-5 animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-3"><div className="flex-1 h-px bg-emerald-400/15" /><span className="font-mono text-[9px] text-emerald-400/70 tracking-widest uppercase">Graduated</span><div className="flex-1 h-px bg-emerald-400/15" /></div>
            <div className="flex flex-wrap justify-center gap-2">
              {graduatedCards.map(c => (<div key={c.id} className="bg-ink-800 border border-emerald-400/20 rounded-lg px-3 py-2 flex items-center gap-2"><span className="font-kanji text-lg text-emerald-400">{c.kanji}</span><span className="font-mono text-[10px] text-parchment-400">{c.meaning}</span></div>))}
            </div>
          </div>
        )}

        {/* Trouble */}
        {troubleCards.length > 0 && (
          <div className="w-full mb-5 animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-3"><div className="flex-1 h-px bg-ember/15" /><span className="font-mono text-[9px] text-ember/70 tracking-widest uppercase">Needs work</span><div className="flex-1 h-px bg-ember/15" /></div>
            <div className="flex flex-wrap justify-center gap-2">
              {troubleCards.map(c => (<div key={c.id} className="bg-ink-800 border border-ember/15 rounded-lg px-3 py-2 flex items-center gap-2"><span className="font-kanji text-lg text-ember/80">{c.kanji}</span><span className="font-mono text-[10px] text-parchment-500">{c.meaning}</span></div>))}
            </div>
          </div>
        )}

        <div className="gold-divider w-full mb-6 animate-fade-up delay-300"><span /></div>

        <div className="w-full space-y-3 animate-fade-up delay-300">
          {troubleCards.length > 0 && (
            <button onClick={onReviewMistakes} className="w-full border border-ember/30 text-ember font-display italic text-lg py-4 rounded-xl hover:bg-ember/8 transition-colors">
              Review {troubleCards.length} mistake{troubleCards.length !== 1 ? 's' : ''} →
            </button>
          )}
          <button onClick={() => navigate(`/deck/${deckId}`)} className="w-full border border-gold-400/35 text-gold-400 font-display italic text-lg py-4 rounded-xl hover:bg-gold-400/10 transition-colors">Back to deck</button>
          <button onClick={onRestart} className="w-full border border-parchment-500/15 text-parchment-500 font-display italic text-base py-3 rounded-xl hover:bg-parchment-500/5 transition-colors">Study again</button>
          <button onClick={() => navigate('/library')} className="font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase w-full pt-1">Home</button>
        </div>
      </div>
    </div>
  )
}

// ─── Waiting screen ───────────────────────────────────────────────────────
function WaitingScreen({ requeuePool, onCheckNow }) {
  const soonest = requeuePool.reduce((min, e) => Math.min(min, e.dueAt), Infinity)
  const [secs, setSecs] = useState(Math.max(0, Math.ceil((soonest - Date.now()) / 1000)))
  useEffect(() => { const t = setInterval(() => { const l = Math.max(0, Math.ceil((soonest - Date.now()) / 1000)); setSecs(l); if (l === 0) onCheckNow() }, 1000); return () => clearInterval(t) }, [soonest])
  const m = Math.floor(secs / 60), s = secs % 60
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-6xl text-gold-400/15 mb-6">待</span>
      <p className="font-display italic text-2xl text-parchment-200 mb-2">Cards pending</p>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8">Next card due in</p>
      <p className="font-display italic text-5xl text-gold-400 mb-10 tabular-nums">{m > 0 ? `${m}m ${s}s` : `${s}s`}</p>
      <p className="font-mono text-[9px] text-parchment-500/40 tracking-widest uppercase">{requeuePool.length} card{requeuePool.length !== 1 ? 's' : ''} waiting</p>
    </div>
  )
}

// ─── Card components ──────────────────────────────────────────────────────
function CardFront({ card, mode, peekActive, onBurn, isNew, deckId, feedback }) {
  const isMF = mode === 'kanji', hideHint = deckId === 'radicals'
  return (
    <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15 rounded-2xl flex flex-col items-center justify-center p-7 cursor-pointer select-none">
      {isNew && (
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
          <div className="animate-new-card-pop pointer-events-none flex items-center gap-1.5 bg-gold-400/15 border border-gold-400/40 rounded-full px-3 py-1.5 animate-new-card-glow">
            <span className="text-gold-400 text-[11px] leading-none select-none">✦</span>
            <span className="font-mono text-[10px] tracking-[2px] uppercase font-medium text-gold-400 leading-none">First look</span>
          </div>
          <button onClick={e => { e.stopPropagation(); onBurn() }} className="pointer-events-auto flex items-center gap-1.5 border border-parchment-500/25 rounded-full px-3 py-1.5 hover:border-gold-400/50 hover:bg-gold-400/8 transition-all duration-200 touch-manipulation animate-new-card-pop" style={{ animationDelay: '0.08s' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0 text-parchment-400"><circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.1"/><path d="M3.5 5.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="font-mono text-[10px] tracking-wide uppercase text-parchment-400 leading-none whitespace-nowrap">I know this</span>
          </button>
        </div>
      )}

      {/* ── Rating feedback (top-center, between First Look and prompt) ── */}
      {feedback && (
        <div className="absolute top-14 inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none z-10">
          <p className={`font-display italic text-2xl ${FEEDBACK[feedback.q].color} animate-fade-up drop-shadow-lg`}>
            {feedback.msg}
          </p>
          {feedback.xp > 0 && (
            <span className={`font-mono text-[11px] ${FEEDBACK[feedback.q].color} tracking-widest animate-fade-up`}
                  style={{ animationDelay: '0.05s', opacity: 0 }}>
              +{feedback.xp} XP
            </span>
          )}
          {feedback.combo >= 2 && (
            <span className="font-mono text-[11px] text-gold-400/70 tracking-widest animate-combo-pop"
                  style={{ animationDelay: '0.1s' }}>
              {feedback.comboMult > 1 ? `×${feedback.comboMult} combo` : `${feedback.combo} streak`}
            </span>
          )}
        </div>
      )}

      <p className="font-mono text-[9px] text-parchment-500/60 tracking-[3px] uppercase mb-8">{deckId === 'primitives' ? 'What is this primitive?' : isMF ? 'What is the kanji?' : 'What does this mean?'}</p>
      {deckId === 'primitives' ? (
        <div className="flex flex-col items-center">
          <p className={`font-kanji text-[96px] text-parchment-100 leading-none ${card.isPua ? '' : ''}`}>{card.kanji}</p>
          {card.strokeCount && <p className="font-mono text-[10px] text-parchment-500/40 mt-4 tracking-widest">{card.strokeCount} stroke{card.strokeCount !== 1 ? 's' : ''}</p>}
        </div>
      ) : isMF ? (
        <div className="text-center">
          <p className="font-display italic text-3xl text-parchment-100 mb-3 leading-tight">{card.meaning}</p>
          <p className="font-mono text-sm text-parchment-500">{card.romaji}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="font-kanji text-[96px] text-parchment-100 leading-none mb-6">{card.kanji}</p>
          {card.disambig && <span className="font-mono text-[9px] text-gold-400/70 tracking-[1.5px] uppercase border border-gold-400/20 rounded-full px-3 py-1 mb-4 bg-gold-400/5 select-none">{card.disambig}</span>}
          {!hideHint && (card.parts || []).length > 0 && (<>
            <div className={`transition-all duration-300 flex flex-wrap items-start justify-center gap-1.5 px-2 ${peekActive ? '' : 'blur-reveal'}`}>
              {(card.parts || []).map((p, i) => (
                isObjectPart(p) ? (
                  <span key={i} className="inline-flex flex-col items-center bg-ink-700/50 border border-gold-400/8 rounded-lg px-2 py-1.5 min-w-[44px]">
                    {p.c ? (
                      <span className="font-kanji text-[18px] text-parchment-200 leading-none">{p.c}</span>
                    ) : (
                      <span className="font-mono text-[10px] text-parchment-500/30 leading-none">?</span>
                    )}
                    <span className="font-mono text-[8px] text-parchment-500/60 mt-0.5 text-center leading-tight max-w-[60px]">{p.n}</span>
                  </span>
                ) : (
                  <span key={i} className="font-mono text-[10px] text-parchment-500/60 bg-ink-700/50 border border-gold-400/8 rounded-lg px-2 py-1.5">{String(p)}</span>
                )
              ))}
            </div>
            <p className="font-mono text-[9px] text-parchment-500/25 mt-2.5 tracking-widest">hover or shake to peek</p>
          </>)}
        </div>
      )}
    </div>
  )
}

function UserStorySection({ cardId }) {
  const [text, setText] = useState(() => readUserStories()[cardId] ?? '')
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)
  useEffect(() => { setText(readUserStories()[cardId] ?? ''); setEditing(false) }, [cardId])
  const isEmpty = !text.trim()
  return (
    <div className="mb-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase">My story</p>
        {!isEmpty && !editing && <button onClick={() => { setEditing(true); setTimeout(() => ref.current?.focus(), 0) }} className="font-mono text-[8px] text-parchment-500/40 tracking-widest uppercase hover:text-gold-400/60 transition-colors">Edit</button>}
      </div>
      {editing || isEmpty ? (
        <textarea ref={ref} value={text} onChange={e => { setText(e.target.value); writeUserStory(cardId, e.target.value) }} onBlur={() => setEditing(false)} placeholder="Write your own mnemonic…" rows={3} className="w-full bg-ink-700/60 border border-gold-400/12 rounded-lg px-3 py-2.5 font-mono text-[11px] text-parchment-300 placeholder:text-parchment-500/30 leading-relaxed outline-none focus:border-gold-400/30 resize-none transition-colors duration-150" />
      ) : (
        <button onClick={() => { setEditing(true); setTimeout(() => ref.current?.focus(), 0) }} className="w-full text-left relative pl-6 bg-ink-700/70 rounded-lg p-3 border border-transparent hover:border-gold-400/12 transition-colors">
          <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">✎</span>
          <p className="font-mono text-[11px] text-parchment-400 leading-relaxed">{text}</p>
        </button>
      )}
    </div>
  )
}

// ─── CardBack dispatcher — picks layout based on deck type ───────────────
function CardBack({ card, mode, deckId }) {
  if (deckId === 'primitives') return <PrimitivesCardBack card={card} />
  const isFoundation = deckId === 'primer' || deckId === 'radicals'
  return isFoundation
    ? <FoundationCardBack card={card} mode={mode} deckId={deckId} />
    : <GameCardBack card={card} mode={mode} deckId={deckId} />
}

// ─── Primitives Card Back ────────────────────────────────────────────────
// Minimal layout: big primitive, meaning, stroke count, Heisig page.
function PrimitivesCardBack({ card }) {
  return (
    <div className="card-face card-face-back absolute inset-0 bg-ink-800 border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
      {/* Ghost primitive watermark */}
      <span className="absolute top-3 right-4 font-kanji text-[80px] leading-none text-gold-400/60 select-none pointer-events-none">{card.kanji}</span>

      <div className="h-full overflow-y-auto p-5 flex flex-col items-center justify-center text-center">
        {/* Big primitive character */}
        <p className="font-kanji text-[88px] text-parchment-100 leading-none mb-6 animate-fade-up">{card.kanji}</p>

        {/* Gold divider */}
        <div className="flex items-center gap-3 w-24 mb-6 animate-fade-up delay-100">
          <div className="flex-1 h-px bg-gold-400/20" />
          <span className="font-kanji text-gold-400/25 text-xs">·</span>
          <div className="flex-1 h-px bg-gold-400/20" />
        </div>

        {/* Meaning — the answer */}
        <p className="font-display italic text-3xl text-gold-400 mb-8 animate-fade-up delay-200">{card.meaning}</p>

        {/* Metadata */}
        <div className="flex items-center gap-6 animate-fade-up delay-300">
          <div className="text-center">
            <p className="font-mono text-[8px] text-parchment-500/40 tracking-[2px] uppercase mb-1">Strokes</p>
            <p className="font-mono text-[14px] text-parchment-400">{card.strokeCount}</p>
          </div>
          <div className="w-px h-6 bg-gold-400/10" />
          <div className="text-center">
            <p className="font-mono text-[8px] text-parchment-500/40 tracking-[2px] uppercase mb-1">RTK Page</p>
            <p className="font-mono text-[14px] text-parchment-400">{card.heisigPage}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Foundation Card Back (primer + radicals) ────────────────────────────
// Rich educational layout: big kanji, structured readings grid,
// Mnemonic stories with prominence, components, JLPT badge, context.
function FoundationCardBack({ card, mode, deckId }) {
  const isMF = mode === 'kanji'
  const hasReadings = card.onyomi || card.kunyomi
  const hasContext = card.context && card.context.trim()

  return (
    <div className="card-face card-face-back absolute inset-0 bg-ink-800 border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
      {/* Ghost kanji watermark */}
      <span className="absolute top-3 right-4 font-kanji text-[80px] leading-none text-gold-400/60 select-none pointer-events-none">{card.kanji}</span>

      <div className="h-full overflow-y-auto p-5">

        {/* ── 1. Kanji + Meaning header ── */}
        {isMF ? (
          <BSection label="Kanji">
            <p className="font-kanji text-6xl text-parchment-100 leading-none mb-2">{card.kanji}</p>
            {card.disambig && (
              <span className="font-mono text-[9px] text-gold-400/70 tracking-[1.5px] uppercase border border-gold-400/20 rounded-full px-3 py-1 bg-gold-400/5 inline-block mb-2">{card.disambig}</span>
            )}
            <div className="flex items-center gap-2">
              <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
            </div>
            <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
          </BSection>
        ) : (
          <>
            <BSection label="Meaning">
              <p className="font-display italic text-2xl text-parchment-100 leading-tight">{card.meaning}</p>
            </BSection>
            <BSection label="Reading">
              <div className="flex items-center gap-2">
                <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
              </div>
              <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
            </BSection>
          </>
        )}

        <Div />

        {/* ── 2. Components / Radicals ── */}
        {card.parts && card.parts.length > 0 && (
          <BSection label="Components">
            <div className="bg-ink-700/40 border border-gold-400/8 rounded-xl p-3">
              <div className="flex flex-wrap gap-2 justify-center">
                {card.parts.map((p, i) => (
                  <PartBadge key={isObjectPart(p) ? (p.c ?? p.n) + i : p} part={p} />
                ))}
              </div>
            </div>
          </BSection>
        )}

        {/* ── ★ Primitive Alias Note ── */}
        {card.primNote && Array.isArray(card.primNote) && card.primNote.length > 0 && (
          <BSection label="★ As a Primitive">
            <div className="bg-gold-400/5 border border-gold-400/15 rounded-xl p-4">
              <p className="font-mono text-[11px] text-parchment-300 leading-relaxed">
                When this kanji appears as a building block in other kanji, it can be remembered as {card.primNote.map((n, i) => (
                  <span key={n}>{i > 0 && (i === card.primNote.length - 1 ? ', or ' : ', ')}<span className="text-gold-400 font-medium">{n}</span></span>
                ))} — use whichever fits your story best.
              </p>
            </div>
          </BSection>
        )}
        {card.primNote === true && (
          <BSection label="★ As a Primitive">
            <div className="bg-gold-400/5 border border-gold-400/15 rounded-xl p-4">
              <p className="font-mono text-[11px] text-parchment-300 leading-relaxed">
                This kanji is also used as a building block in other kanji.
              </p>
            </div>
          </BSection>
        )}

        {/* ── 3. Mnemonic Story ── */}
        {card.story1 && (
          <BSection label="Mnemonic">
            <div className="bg-ink-700/70 border border-gold-400/8 rounded-xl p-4">
              <StoryText text={card.story1} />
            </div>
          </BSection>
        )}

        {/* ── 4. My Story ── */}
        <UserStorySection cardId={card.id} />
        <Div />

        {/* ── 5. Readings grid (On / Kun / Nanori) ── */}
        {hasReadings && (
          <>
            <BSection label="Readings">
              <div className="bg-ink-700/50 border border-gold-400/8 rounded-xl overflow-hidden">
                {card.onyomi && (
                  <div className="px-4 py-3 border-b border-gold-400/6">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[8px] text-gold-400/50 tracking-[2px] uppercase w-12 shrink-0">On</span>
                      <p className="font-kanji text-[15px] text-parchment-200 leading-relaxed">{card.onyomi}</p>
                    </div>
                  </div>
                )}
                {card.kunyomi && (
                  <div className={`px-4 py-3 ${card.nanori ? 'border-b border-gold-400/6' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[8px] text-gold-400/50 tracking-[2px] uppercase w-12 shrink-0">Kun</span>
                      <p className="font-kanji text-[15px] text-parchment-200 leading-relaxed">{card.kunyomi}</p>
                    </div>
                  </div>
                )}
                {card.nanori && (
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[8px] text-parchment-500/40 tracking-[2px] uppercase w-12 shrink-0 mt-0.5">Name</span>
                      <p className="font-kanji text-[13px] text-parchment-500/70 leading-relaxed">{card.nanori}</p>
                    </div>
                  </div>
                )}
              </div>
            </BSection>
          </>
        )}

        {/* ── 6. Context example ── */}
        {hasContext && (
          <>
            <Div />
            <BSection label="Example">
              <p className="font-kanji text-[15px] text-parchment-300 leading-relaxed">{card.context}</p>
              {card.contextEn && <p className="font-mono text-[11px] text-parchment-500/60 mt-1.5 italic">{card.contextEn}</p>}
            </BSection>
          </>
        )}

        {/* ── 7. JLPT badge ── */}
        {card.jlpt > 0 && (
          <div className="mt-4 pt-3 border-t border-gold-400/8 flex items-center justify-between">
            <span className="font-mono text-[9px] text-parchment-500/40 tracking-[2px] uppercase">JLPT Level</span>
            <span className="font-mono text-[12px] tracking-widest font-medium px-3 py-1 rounded-md bg-gold-400/8 border border-gold-400/20 text-gold-400">N{card.jlpt}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Game / Manga Card Back ─────────────────────────────────────────────
// Compact layout: meaning, reading, components, in-game context, frequency.
// Used for P5R, Zelda, Chrono Trigger, Yotsuba, etc. — unchanged.
function GameCardBack({ card, mode, deckId }) {
  const isMF = mode === 'kanji'

  return (
    <div className="card-face card-face-back absolute inset-0 bg-ink-800 border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
      <span className="absolute top-3 right-4 font-kanji text-[80px] leading-none text-gold-400/60 select-none pointer-events-none">{card.kanji}</span>
      <div className="h-full overflow-y-auto p-5">
        {/* 1. Meaning + Reading */}
        {isMF ? (
          <BSection label="Kanji">
            <p className="font-kanji text-6xl text-parchment-100 leading-none mb-1">{card.kanji}</p>
            <div className="flex items-center gap-2">
              <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
            </div>
            <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
          </BSection>
        ) : (
          <>
            <BSection label="Meaning">
              <p className="font-display italic text-2xl text-parchment-100 leading-tight">{card.meaning}</p>
            </BSection>
            <BSection label="Reading">
              <div className="flex items-center gap-2">
                <p className="font-display italic text-xl text-parchment-200">{card.reading}</p>
              </div>
              <p className="font-mono text-[12px] text-parchment-500 mt-0.5">{card.romaji}</p>
            </BSection>
          </>
        )}
        <Div />

        {/* 2. My Story */}
        <UserStorySection cardId={card.id} />
        <Div />

        {/* 3. Components */}
        {card.parts && card.parts.length > 0 && (
          <BSection label="Components">
            <div className="bg-ink-700/40 border border-gold-400/8 rounded-xl p-3">
              <div className="flex flex-wrap gap-2 justify-center">{card.parts.map((p, i) => <PartBadge key={isObjectPart(p) ? (p.c ?? p.n) + i : p} part={p} size="sm" />)}</div>
            </div>
          </BSection>
        )}

        {/* 4. In-game context */}
        {card.context && (
          <>
            <Div />
            <BSection label="In-game context">
              <p className="font-kanji text-sm text-parchment-300 leading-relaxed">{card.context}</p>
              <p className="font-mono text-[10px] text-parchment-500/70 mt-1.5 italic">{card.contextEn}</p>
            </BSection>
          </>
        )}

        {/* 5. Frequency rank */}
        {card.frequency > 0 && (
          <div className="mt-4 pt-3 border-t border-gold-400/8 flex items-center justify-between">
            <span className="font-mono text-[9px] text-parchment-500/40 tracking-[2px] uppercase">Game frequency</span>
            <span className="font-mono text-[11px] text-gold-400/70 tracking-widest font-medium">#{card.frequency} / 500</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ModeToggle({ mode, onChange }) {
  return (<div className="flex bg-ink-700 border border-gold-400/10 rounded-lg p-0.5 gap-0.5">{MODES.map(m => (<button key={m.key} onClick={() => onChange(m.key)} className={`flex-1 font-mono text-[9px] tracking-wide py-1.5 px-2 rounded-md transition-colors duration-150 touch-manipulation whitespace-nowrap ${mode === m.key ? 'bg-ink-800 text-gold-400 border border-gold-400/20' : 'text-parchment-500/60 hover:text-parchment-400'}`}>{m.label}</button>))}</div>)
}

function RatingButtons({ onRate, preview }) {
  return (<div className="grid grid-cols-4 gap-2 animate-fade-up">{RATING_META.map((r) => (<button key={r.label} onClick={() => onRate(r.q)} className={`relative rounded-xl border overflow-hidden flex flex-col items-center justify-center gap-1.5 py-4 transition-colors duration-150 touch-manipulation ${r.border} ${r.bg}`}><div className={`absolute top-0 inset-x-0 h-[2px] ${r.bar}`} /><span className={`font-display italic text-[15px] leading-none ${r.color}`}>{r.label}</span><span className="font-mono text-[9px] text-parchment-500/50 leading-none">{preview?.[r.q]?.interval || '—'}</span></button>))}</div>)
}

// ─── Main StudyScreen ─────────────────────────────────────────────────────
export default function StudyScreen() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const deck = getDeckById(id)
  const { rate, burnCard, getStudyQueue, getCardProgress, restoreCardProgress, getSchedulingPreview, simulateRate } = useSRS(id)
  const { settings } = useSettings()

  const [mode, setMode] = useState('meaning')
  const [queue, setQueue] = useState([])
  const [qi, setQi] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ ok: 0, miss: 0 })
  const [done, setDone] = useState(false)
  const [peekActive, setPeek] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [scUses, setSCUses] = useState(getSCUses)
  const [undoToast, setUndoToast] = useState(null)

  // ── Dopamine state ───────────────────────────────────────────────────
  const [combo, setCombo]           = useState(0)
  const [sessionXP, setSessionXP]   = useState(0)
  const [maxCombo, setMaxCombo]     = useState(0)
  const [stageUps, setStageUps]     = useState(0)
  const [feedback, setFeedback]     = useState(null)    // { q, msg, xp, combo, key }
  const [stageUpEvent, setStageUpEvent] = useState(null)  // STAGES entry
  const [sessionDuration, setSessionDuration] = useState(0)

  // ── Audio pronunciation ───────────────────────────────────────────────
  const { speak, speakReading, stop: stopAudio, getSettings: getAudioSettings } = useAudio()

  // Auto-play pronunciation when card flips to back
  useEffect(() => {
    if (!flipped) return
    const audioSettings = getAudioSettings()
    if (!audioSettings.enabled || !audioSettings.autoPlay) return
    const card = queueRef.current[qiRef.current]
    if (!card) return
    // Speak the reading (hiragana) — always accurate pronunciation
    // Fall back to kanji if no reading available
    if (card.reading) speakReading(card.reading)
    else speak(card.kanji)
  }, [flipped, qi])

  const troubleRef = useRef([])
  const graduatedRef = useRef([])
  const requeuePool = useRef([])
  const queueRef = useRef([])
  const qiRef = useRef(0)
  const burnedRef = useRef(readBurned(id))
  const sessionStartRef = useRef(Date.now())

  // ── Session logging (for heatmap) ──────────────────────────────────
  const logSession = useCallback((finalStats, finalXP) => {
    try {
      const LOG_KEY = 'kq-session-logs'
      const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
      const now = new Date()
      logs.push({
        date:     now.toISOString().split('T')[0],
        ts:       now.toISOString(),
        deckId:   id,
        reviewed: finalStats.ok + finalStats.miss,
        correct:  finalStats.ok,
        xp:       finalXP,
        duration: Math.round((Date.now() - sessionStartRef.current) / 1000),
      })
      // Keep last 365 days of logs
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 365)
      const filtered = logs.filter(l => new Date(l.date) >= cutoff)
      localStorage.setItem(LOG_KEY, JSON.stringify(filtered))
    } catch {}
  }, [id])

  // ── Build queue ──────────────────────────────────────────────────────
  const buildQueue = useCallback(() => {
    if (!deck) return
    requeuePool.current = []; troubleRef.current = []; graduatedRef.current = []
    const isAll = params.get('mode') === 'all', group = params.get('group'), burned = burnedRef.current
    const src = group ? deck.cards.filter(c => String(c.strokes) === group) : deck.cards
    let cards
    if (isAll || group) { cards = src.filter(c => !burned.has(c.id)) }
    else { const { newBatch, reviewBatch, learning } = getStudyQueue(src); cards = [...learning, ...reviewBatch, ...newBatch].filter(c => !burned.has(c.id)); if (!cards.length) cards = src.filter(c => !burned.has(c.id)) }
    const shuffled = cards.sort(() => Math.random() - 0.5)
    queueRef.current = shuffled; setQueue(shuffled); qiRef.current = 0; setQi(0)
    setFlipped(false); setDone(false); setWaiting(false); setStats({ ok: 0, miss: 0 })
    setCombo(0); setSessionXP(0); setMaxCombo(0); setStageUps(0); setUndoToast(null); setFeedback(null); setStageUpEvent(null)
    sessionStartRef.current = Date.now()
  }, [deck?.id, settings.newCardsPerDay, settings.maxReviewsPerDay])

  useEffect(() => { buildQueue() }, [deck?.id])

  const startMistakesReview = useCallback(() => {
    const cards = troubleRef.current.map(t => t.card); if (!cards.length) return
    troubleRef.current = []; graduatedRef.current = []; requeuePool.current = []
    const sh = cards.sort(() => Math.random() - 0.5)
    queueRef.current = sh; setQueue(sh); qiRef.current = 0; setQi(0)
    setFlipped(false); setDone(false); setWaiting(false); setStats({ ok: 0, miss: 0 })
    setCombo(0); setSessionXP(0); setMaxCombo(0); setStageUps(0); setUndoToast(null); setFeedback(null); setStageUpEvent(null)
  }, [])

  // ── Requeue polling ──────────────────────────────────────────────────
  useEffect(() => { const iv = setInterval(() => { const now = Date.now(), due = requeuePool.current.filter(e => e.dueAt <= now); if (!due.length) return; requeuePool.current = requeuePool.current.filter(e => e.dueAt > now); setQueue(p => { const n = [...p]; due.forEach((e, i) => n.splice(qiRef.current+1+i, 0, e.card)); queueRef.current = n; return n }); setWaiting(false) }, 30000); return () => clearInterval(iv) }, [])

  // ── Burn (mark as Engraved, remove from queue, replace) ────────────
  const [burnAnim, setBurnAnim] = useState(false)

  const handleBurn = useCallback(() => {
    const cQ = queueRef.current, cI = qiRef.current, card = cQ[cI]; if (!card) return

    // Save snapshot for undo (null = card was new/unseen)
    const snapshot = getCardProgress(card.id) || null
    const queueSnapshot = [...cQ]

    // Trigger fly-up animation
    setBurnAnim(true)

    // Mark as Engraved in FSRS
    burnCard(card.id)

    // Add to burned list so it doesn't show in "All" mode
    burnedRef.current.add(card.id); writeBurned(id, burnedRef.current)

    // Set undo toast immediately so it appears during/after animation
    setUndoToast({
      label: 'Engraved',
      snapshot,
      cardId: card.id,
      qi: cI,
      queueSnapshot,
      isBurn: true,
      statsDelta: { ok: 0, miss: 0 },
      xpDelta: 0,
      comboDelta: { prev: combo },
      ts: Date.now(),
    })

    // After animation, swap card in queue with next unseen card
    setTimeout(() => {
      setBurnAnim(false)
      const queued = new Set(cQ.map(c => c.id))
      const rep = deck?.cards.find(c => !queued.has(c.id) && !burnedRef.current.has(c.id) && !getCardProgress(c.id))
      setQueue(p => {
        const n = p.filter((_, i) => i !== cI)
        if (rep) n.splice(cI, 0, rep)
        queueRef.current = n
        return n
      })
      if (cQ.length - 1 + (rep ? 1 : 0) === 0) { setSessionDuration(Math.round((Date.now() - sessionStartRef.current) / 1000)); logSession(stats, sessionXP); setDone(true); return }
      setFlipped(false)
    }, 550)
  }, [deck, id, burnCard, getCardProgress, combo])

  // ── Shake / Swipe / Keyboard ─────────────────────────────────────────
  useShake(useCallback(() => { if (!flipped) { setPeek(true); setTimeout(() => setPeek(false), 2000) } }, [flipped]))

  const swipeUp = useCallback(() => {
    const card = queueRef.current[qiRef.current]
    const isNewCard = card && !getCardProgress(card.id)
    if (!flipped && isNewCard) {
      // Swipe up on a new card = burn/master it
      handleBurn()
    } else if (!flipped) {
      // Swipe up on a seen card = flip
      setFlipped(true); setSCUses(bumpSC())
    }
  }, [flipped, getCardProgress, handleBurn])
  const swipeL = useCallback(() => { if (flipped) { handleRate(Rating.Again); setSCUses(bumpSC()) } }, [flipped])
  const swipeR = useCallback(() => { if (flipped) { handleRate(Rating.Good); setSCUses(bumpSC()) } }, [flipped])
  useSwipe({ onSwipeUp: swipeUp, onSwipeLeft: swipeL, onSwipeRight: swipeR })

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f); setSCUses(bumpSC()) }
      if (flipped) { if (e.key==='1'){handleRate(Rating.Again);setSCUses(bumpSC())} if (e.key==='2'){handleRate(Rating.Hard);setSCUses(bumpSC())} if (e.key==='3'){handleRate(Rating.Good);setSCUses(bumpSC())} if (e.key==='4'){handleRate(Rating.Easy);setSCUses(bumpSC())} }
      if ((e.ctrlKey||e.metaKey) && e.key==='z' && undoToast) { e.preventDefault(); performUndo() }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [flipped, undoToast])

  // ── Undo ─────────────────────────────────────────────────────────────
  const performUndo = useCallback(() => {
    if (!undoToast) return
    const { snapshot, cardId, qi: pQi, statsDelta, requeueEntry, xpDelta, comboDelta, isBurn, queueSnapshot } = undoToast

    // Restore card progress (null snapshot = delete progress entirely)
    restoreCardProgress(cardId, snapshot)

    // If this was a burn undo, also remove from burned set and restore the original queue
    if (isBurn) {
      burnedRef.current.delete(cardId)
      writeBurned(id, burnedRef.current)
      if (queueSnapshot) {
        queueRef.current = queueSnapshot
        setQueue(queueSnapshot)
      }
    }

    setStats(s => ({ ok: s.ok - (statsDelta.ok||0), miss: s.miss - (statsDelta.miss||0) }))
    setSessionXP(x => x - (xpDelta||0))
    setCombo(comboDelta?.prev ?? 0)
    troubleRef.current = troubleRef.current.filter(t => t.card.id !== cardId)
    graduatedRef.current = graduatedRef.current.filter(c => c.id !== cardId)
    if (requeueEntry) requeuePool.current = requeuePool.current.filter(e => e !== requeueEntry)
    qiRef.current = pQi; setQi(pQi); setFlipped(false); setDone(false); setWaiting(false); setUndoToast(null); setFeedback(null)
  }, [undoToast, restoreCardProgress, id])

  // ── Rate (with combo, XP, stage-up detection) ────────────────────────
  const handleRate = useCallback((q) => {
    const cQ = queueRef.current, cI = qiRef.current, card = cQ[cI]
    if (!card) return

    // Snapshot before rating
    const prevProg = getCardProgress(card.id)
    const snapshot = prevProg ? { ...prevProg } : null
    const prevStage = getMasteryStage(prevProg)

    // Simulate to get expected new state (for stage-up detection & requeue timing)
    const afterProg = simulateRate(card.id, q)
    const afterStage = getMasteryStage(afterProg)

    // Apply the actual rating
    rate(card.id, q)

    // In FSRS, Hard (2) is a successful recall — only Again (1) is a failure
    const isPass = q >= Rating.Hard
    const statsDelta = { ok: isPass ? 1 : 0, miss: isPass ? 0 : 1 }

    // Combo: Hard+ continues, only Again breaks
    const prevCombo = combo
    const newCombo = isPass ? combo + 1 : 0
    setCombo(newCombo)
    if (newCombo > maxCombo) setMaxCombo(newCombo)

    // XP: base + difficulty bonus + stability bonus, × capped combo multiplier
    const earnedXP = calcXP(q, isPass ? newCombo : 0, prevProg)
    setSessionXP(x => x + earnedXP)

    // Tracking
    if (!isPass && !troubleRef.current.find(t => t.card.id === card.id)) troubleRef.current.push({ card, q })
    if (isPass && (!prevProg || prevProg.state === undefined || prevProg.state <= 1) && !graduatedRef.current.find(c => c.id === card.id)) graduatedRef.current.push(card)

    setStats(s => ({ ok: s.ok + statsDelta.ok, miss: s.miss + statsDelta.miss }))

    // Show feedback (include combo multiplier tier for display)
    const msg = randomMsg(q)
    const comboMult = getComboMult(newCombo)
    setFeedback({ q, msg, xp: earnedXP, combo: newCombo, comboMult, key: Date.now() })
    setTimeout(() => setFeedback(null), 900)

    // Stage-up check
    if (afterStage.stageIndex > prevStage.stageIndex && afterStage.stageIndex >= 2) {
      setStageUps(s => s + 1)
      setTimeout(() => setStageUpEvent(afterStage.stage), 500)
    }

    // Requeue logic — only Again requeues
    let requeueEntry = null
    if (!isPass) {
      const dueAt = new Date(afterProg.due).getTime()
      requeueEntry = { card, dueAt }
      requeuePool.current.push(requeueEntry)
    }
    const now = Date.now(), dueNow = requeuePool.current.filter(e => e.dueAt <= now); requeuePool.current = requeuePool.current.filter(e => e.dueAt > now)
    const nextI = cI + 1
    setQueue(p => { const n = [...p]; dueNow.forEach((e, i) => n.splice(nextI+i, 0, e.card)); queueRef.current = n; return n })

    const undo = { label: `Rated ${RATING_META.find(r => r.q === q)?.label || '?'}`, snapshot, cardId: card.id, qi: cI, statsDelta, requeueEntry, xpDelta: earnedXP, comboDelta: { prev: prevCombo }, ts: Date.now() }

    if (nextI >= cQ.length + dueNow.length) {
      if (requeuePool.current.length > 0) {
        const pending = requeuePool.current.map(e => e.card)
        requeuePool.current = []
        setQueue(prev => {
          const next = [...prev, ...pending]
          queueRef.current = next
          return next
        })
        qiRef.current = nextI; setQi(nextI); setFlipped(false)
        setUndoToast(undo)
        return
      }
      const finalStats = { ok: stats.ok + statsDelta.ok, miss: stats.miss + statsDelta.miss }
      const finalXP = sessionXP + earnedXP
      setSessionDuration(Math.round((Date.now() - sessionStartRef.current) / 1000))
      logSession(finalStats, finalXP)
      setDone(true); setUndoToast(undo); return
    }
    qiRef.current = nextI; setQi(nextI); setFlipped(false); setUndoToast(undo)
  }, [rate, simulateRate, getCardProgress, combo, maxCombo, logSession, stats, sessionXP])

  const handleFlip = useCallback(() => { setFlipped(f => !f) }, [])
  const checkPoolNow = useCallback(() => { const now = Date.now(), due = requeuePool.current.filter(e => e.dueAt <= now); if (!due.length) return; requeuePool.current = requeuePool.current.filter(e => e.dueAt > now); const nI = qiRef.current + 1; setQueue(p => { const n = [...p]; due.forEach((e, i) => n.splice(nI+i, 0, e.card)); queueRef.current = n; return n }); setWaiting(false); qiRef.current = nI; setQi(nI); setFlipped(false) }, [])

  // ── Guards ────────────────────────────────────────────────────────────
  if (!deck) return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>
  if (!queue.length) return <div className="px-5 py-6 text-parchment-500">Loading…</div>

  const isPerfect = stats.ok > 0 && stats.miss === 0

  if (done) return (
    <div className="h-full">
      <DoneScreen stats={stats} deckId={id} onRestart={buildQueue} troubleCards={troubleRef.current.map(t => t.card)} graduatedCards={graduatedRef.current} onReviewMistakes={startMistakesReview} sessionXP={sessionXP} maxCombo={maxCombo} stageUps={stageUps} isPerfect={isPerfect} sessionDuration={sessionDuration} />
      {undoToast && <UndoToast key={undoToast.cardId+undoToast.qi+(undoToast.ts||0)} label={undoToast.label} onUndo={performUndo} onExpire={() => setUndoToast(null)} />}
    </div>
  )
  if (waiting) return (
    <div className="h-full">
      <WaitingScreen requeuePool={requeuePool.current} onCheckNow={checkPoolNow} />
      {undoToast && <UndoToast key={undoToast.cardId+undoToast.qi+(undoToast.ts||0)} label={undoToast.label} onUndo={performUndo} onExpire={() => setUndoToast(null)} />}
    </div>
  )

  const current = queue[qi], groupParam = params.get('group')
  const uniqueRem = queue.slice(qi).filter((c, i, a) => a.findIndex(x => x.id === c.id) === i).length
  const pct = Math.max(0, Math.round((qi / queue.length) * 100))
  const showHints = scUses < 10

  // Card animation class based on last feedback (FSRS: Again=1, Hard=2, Good=3, Easy=4)
  const cardAnimClass = feedback ? (feedback.q === Rating.Again ? 'animate-wrong' : feedback.q === Rating.Hard ? 'animate-hard' : feedback.q === Rating.Easy ? 'animate-easy' : 'animate-correct') : ''

  return (
    <div className="flex flex-col h-full relative">

      {/* Stage-up celebration overlay */}
      {stageUpEvent && <StageUpCelebration stage={stageUpEvent} onDone={() => setStageUpEvent(null)} />}

      {/* Top bar — XP + progress */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase hover:text-ember transition-colors touch-manipulation">✕ Quit</button>
        <div className="flex items-center gap-3">
          {/* Session XP */}
          <span className="font-mono text-[10px] text-gold-400/70 tracking-widest tabular-nums">
            {sessionXP} XP
          </span>
          <span className="text-parchment-500/15">·</span>
          <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest tabular-nums">{uniqueRem} left</span>
          {requeuePool.current.length > 0 && <span className="font-mono text-[9px] text-amber-500/60 tracking-widest">+{requeuePool.current.length}</span>}
        </div>
        <button onClick={() => navigate('/settings')} className="text-parchment-500/40 hover:text-gold-400 transition-colors touch-manipulation" title="Settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M11.53 4.47l-1.42 1.42M4.97 11.03l-1.42 1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Progress bar (with glow) */}
      <div className="shrink-0 px-5 pb-3">
        <div className="h-[3px] bg-ink-600 rounded-full overflow-hidden">
          <div className={`h-full bg-gold-400 rounded-full transition-all duration-500 ease-out ${pct > 5 ? 'progress-bar-glow' : ''}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="shrink-0 px-5 pb-3"><ModeToggle mode={mode} onChange={m => { setMode(m); setFlipped(false) }} /></div>

      {/* Card area */}
      <div className="flex-1 min-h-0 px-5 pb-3 relative">
        <div key={`${qi}-${current?.id}`}
          className={`card-scene h-full animate-card-enter ${cardAnimClass} ${burnAnim ? 'animate-burn-up' : ''}`}
          onClick={handleFlip}>
          <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
            <CardFront card={current} mode={mode} peekActive={peekActive} onBurn={handleBurn} deckId={id} isNew={!getCardProgress(current.id)} feedback={feedback} />
            <CardBack card={current} mode={mode} deckId={id} />
          </div>
        </div>

        {/* Engraved celebration — positioned below the peek hint text */}
        {burnAnim && (
          <div className="absolute inset-0 flex items-end justify-center pb-[18%] pointer-events-none z-30">
            <div className="flex flex-col items-center gap-3 animate-fade-up">
              <span className="font-kanji text-6xl text-parchment-100 drop-shadow-lg">刻</span>
              <span className="font-display italic text-3xl text-parchment-100 drop-shadow-lg tracking-wide">Engraved</span>
              <div className="h-px w-16 bg-parchment-100/30 mt-1" />
              <span className="font-mono text-[10px] text-parchment-100/50 tracking-widest uppercase">Already known</span>
            </div>
          </div>
        )}
      </div>

      {/* Combo counter (persistent, above rating buttons) */}
      {combo >= 2 && !feedback && (
        <div className="shrink-0 flex justify-center pb-1">
          <span className="font-mono text-[11px] text-gold-400/60 tracking-widest animate-combo-pop">
            {getComboMult(combo) > 1 ? `×${getComboMult(combo)} combo` : `${combo} streak`}
          </span>
        </div>
      )}

      {/* Bottom controls */}
      <div className="shrink-0 px-5 pb-6">
        {flipped ? (
          <div>
            <RatingButtons onRate={handleRate} preview={current ? getSchedulingPreview(current.id) : null} />
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
            {showHints && current && !getCardProgress(current.id) && (
              <p className="font-mono text-[8px] text-gold-400/30 tracking-widest uppercase">↑ Swipe up to engrave</p>
            )}
            {showHints && current && getCardProgress(current.id) && (
              <p className="font-mono text-[8px] text-parchment-500/20 tracking-widest uppercase">Swipe up to flip</p>
            )}
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoToast && <UndoToast key={undoToast.cardId+undoToast.qi+(undoToast.ts||0)} label={undoToast.label} onUndo={performUndo} onExpire={() => setUndoToast(null)} />}
    </div>
  )
}

// ─── Component Library overlay ───────────────────────────────────────────
export function ComponentLibrary({ deckId, onClose }) {
  const deck = getDeckById(deckId)
  const [search, setSearch] = useState('')

  // Extract and deduplicate all components from the deck
  const components = useMemo(() => {
    if (!deck) return []
    const seen = new Map()
    deck.cards.forEach(card => {
      if (!card.parts) return
      card.parts.forEach(part => {
        let char, desc, pua
        if (isObjectPart(part)) {
          char = part.c ?? part.n
          desc = part.n
          pua = !!part.p
        } else {
          // Legacy string format: 'kanji: description'
          const colonIdx = part.indexOf(':')
          char = colonIdx > 0 ? part.substring(0, colonIdx).trim() : part.trim()
          desc = colonIdx > 0 ? part.substring(colonIdx + 1).trim() : ''
          pua = false
        }

        if (!seen.has(char)) {
          seen.set(char, { char, desc, pua, cards: [card.kanji] })
        } else {
          const existing = seen.get(char)
          if (!existing.cards.includes(card.kanji)) {
            existing.cards.push(card.kanji)
          }
          if (desc.length > existing.desc.length) existing.desc = desc
        }
      })
    })
    return [...seen.values()].sort((a, b) => b.cards.length - a.cards.length)
  }, [deck])

  const filtered = search.trim()
    ? components.filter(c =>
        c.char.includes(search) || c.desc.toLowerCase().includes(search.toLowerCase())
      )
    : components

  return (
    <div className="absolute inset-0 z-50 bg-ink-950/95 backdrop-blur-sm flex flex-col rounded-2xl overflow-hidden"
         onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display italic text-lg text-parchment-100">Component Library</h3>
            <p className="font-mono text-[9px] text-parchment-500/50 tracking-widest uppercase mt-0.5">
              {components.length} unique components
            </p>
          </div>
          <button onClick={onClose}
            className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase
                       hover:text-parchment-300 transition-colors px-2 py-1">
            ✕ Close
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search components..."
          className="w-full bg-ink-800 border border-gold-400/12 rounded-lg px-3 py-2
                     font-mono text-[11px] text-parchment-300 placeholder:text-parchment-500/30
                     outline-none focus:border-gold-400/30 transition-colors"
        />
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="space-y-1.5">
          {filtered.map(comp => (
            <div key={comp.char}
              className="flex items-center gap-3 bg-ink-800/70 border border-gold-400/8 rounded-lg px-3 py-2.5">
              <span className="font-kanji text-xl text-parchment-200 w-8 text-center shrink-0">{comp.char}</span>
              <div className="flex-1 min-w-0">
                {comp.desc && (
                  <p className="font-mono text-[10px] text-parchment-400 leading-snug truncate">{comp.desc}</p>
                )}
                <p className="font-mono text-[9px] text-parchment-500/40 mt-0.5 truncate">
                  Used in: {comp.cards.slice(0, 8).join(' · ')}{comp.cards.length > 8 ? ` +${comp.cards.length - 8}` : ''}
                </p>
              </div>
              <span className="font-mono text-[9px] text-gold-400/40 shrink-0">{comp.cards.length}</span>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="font-mono text-[10px] text-parchment-500/30 tracking-widest uppercase text-center mt-8">
            No components match your search
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────
function BSection({ label, children }) { return <div className="mb-4"><p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">{label}</p>{children}</div> }
function Div() { return <div className="h-px bg-gold-400/10 my-4" /> }

// Renders story text with **bold** markers as gold-highlighted spans
function StoryText({ text }) {
  if (!text) return null
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <p className="font-body text-[13px] text-parchment-400 leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="text-gold-400/80 font-medium">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </p>
  )
}
