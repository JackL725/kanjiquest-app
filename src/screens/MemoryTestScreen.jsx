import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'
import { getMasteryStage } from '@/hooks/useMastery'

// ─── Scoring (shared formula with Combo Blitz) ────────────────────────────
const GAME_SIZE      = 20
const BASE_POINTS    = 100
const SPEED_TIERS    = [
  { max: 3000,     bonus: 50, label: '⚡ Lightning' },
  { max: 6000,     bonus: 25, label: '🔥 Fast' },
  { max: 10000,    bonus: 10, label: 'Quick' },
  { max: Infinity, bonus: 0,  label: '' },
]
const COMBO_TIERS = [
  { min: 0,  mult: 1 }, { min: 3,  mult: 2 }, { min: 6,  mult: 3 },
  { min: 10, mult: 4 }, { min: 15, mult: 5 }, { min: 20, mult: 6 },
]

function getComboMult(c) { for (let i = COMBO_TIERS.length - 1; i >= 0; i--) { if (c >= COMBO_TIERS[i].min) return COMBO_TIERS[i].mult } return 1 }
function getSpeedBonus(ms) { return SPEED_TIERS.find(t => ms < t.max) || SPEED_TIERS[3] }
function getAccuracyMult(cor, tot) {
  const p = tot > 0 ? cor / tot : 0
  if (p >= 1)   return { mult: 1.5, label: 'Perfect' }
  if (p >= 0.9) return { mult: 1.2, label: 'Great' }
  if (p >= 0.8) return { mult: 1.1, label: 'Good' }
  return { mult: 1.0, label: '' }
}
function getStars(score, n) {
  const mx = (BASE_POINTS + 50) * 6 * n * 1.5
  const p = mx > 0 ? score / mx : 0
  return p >= 0.6 ? 3 : p >= 0.3 ? 2 : p >= 0.1 ? 1 : 0
}

const HS_KEY = 'kq-memtest-highscores'
function readHS(id) { try { return JSON.parse(localStorage.getItem(HS_KEY) || '{}')[id] || 0 } catch { return 0 } }
function writeHS(id, s) { try { const a = JSON.parse(localStorage.getItem(HS_KEY) || '{}'); a[id] = Math.max(a[id] || 0, s); localStorage.setItem(HS_KEY, JSON.stringify(a)) } catch {} }

// ─── Pick 3 random distractors ───────────────────────────────────────────
function pickChoices(correctCard, pool) {
  const others = pool.filter(c => c.id !== correctCard.id)
  const shuffled = [...others].sort(() => Math.random() - 0.5)
  const distractors = shuffled.slice(0, 3)
  const choices = [...distractors, correctCard].sort(() => Math.random() - 0.5)
  return choices
}

// ─── MemoryTestScreen ─────────────────────────────────────────────────────
export default function MemoryTestScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const deck = getDeckById(id)
  const { getCardProgress } = useSRS(id)

  const [queue, setQueue]       = useState([])
  const [qi, setQi]             = useState(0)
  const [choices, setChoices]   = useState([])
  const [started, setStarted]   = useState(false)
  const [done, setDone]         = useState(false)
  const [elapsed, setElapsed]   = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [wrong, setWrong]       = useState(0)
  const [combo, setCombo]       = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [score, setScore]       = useState(0)
  const [feedback, setFeedback] = useState(null) // { choiceId, isCorrect, points, speedLabel, mult, key }
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos]   = useState({ x: 0, y: 0 })
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 })

  const startTimeRef = useRef(null)
  const timerRef     = useRef(null)
  const cardTimeRef  = useRef(null)
  const queueRef     = useRef([])
  const poolRef      = useRef([]) // full eligible pool for distractor picking
  const qiRef        = useRef(0)
  const comboRef     = useRef(0)
  const scoreRef     = useRef(0)
  const correctRef   = useRef(0)
  const wrongRef     = useRef(0)
  const cardCount    = useRef(0)
  const choiceRefs   = useRef([]) // DOM refs for the 4 choice boxes

  // ── Build pool ───────────────────────────────────────────────────────
  function buildPool() {
    if (!deck) return []
    return deck.cards.filter(c => {
      const p = getCardProgress(c.id)
      if (!p) return false
      const { stageIndex } = getMasteryStage(p)
      return stageIndex >= 2 && stageIndex <= 4
    })
  }

  function buildGame() {
    const pool = buildPool()
    poolRef.current = pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, GAME_SIZE)
    queueRef.current = shuffled
    cardCount.current = shuffled.length
    setQueue(shuffled)
    qiRef.current = 0; setQi(0)
    comboRef.current = 0; setCombo(0); setMaxCombo(0)
    scoreRef.current = 0; setScore(0)
    correctRef.current = 0; setCorrect(0)
    wrongRef.current = 0; setWrong(0)
    setDone(false); setStarted(false); setElapsed(0)
    setFeedback(null); setDragging(false)
    if (shuffled.length > 0) {
      setChoices(pickChoices(shuffled[0], pool))
    }
    cardTimeRef.current = Date.now()
  }

  useEffect(() => { buildGame() }, [deck?.id])

  // ── Timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (started && !done) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 100)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started, done])

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60, d = Math.floor((ms % 1000) / 100)
    return m > 0 ? `${m}:${String(r).padStart(2, '0')}.${d}` : `${r}.${d}s`
  }

  // ── Handle choice selection ──────────────────────────────────────────
  const handleSelect = useCallback((chosenCard) => {
    if (done || feedback) return
    if (!started) { setStarted(true); startTimeRef.current = Date.now(); cardTimeRef.current = Date.now() }

    const cur = queueRef.current[qiRef.current]
    if (!cur) return

    const isCorrect = chosenCard.id === cur.id
    const responseTime = Date.now() - (cardTimeRef.current || Date.now())

    let earnedPoints = 0
    let speedTier = { bonus: 0, label: '' }
    let mult = 1

    if (isCorrect) {
      comboRef.current += 1
      setCombo(comboRef.current)
      if (comboRef.current > maxCombo) setMaxCombo(comboRef.current)

      mult = getComboMult(comboRef.current)
      speedTier = getSpeedBonus(responseTime)
      earnedPoints = (BASE_POINTS + speedTier.bonus) * mult

      scoreRef.current += earnedPoints
      setScore(scoreRef.current)
      correctRef.current += 1
      setCorrect(correctRef.current)
    } else {
      comboRef.current = 0
      setCombo(0)
      wrongRef.current += 1
      setWrong(wrongRef.current)
      // Push to back
      queueRef.current = [...queueRef.current, cur]
      setQueue([...queueRef.current])
    }

    setFeedback({
      choiceId: chosenCard.id,
      correctId: cur.id,
      isCorrect,
      points: earnedPoints,
      speedLabel: speedTier.label,
      mult,
      key: Date.now(),
    })

    setTimeout(() => {
      const nextI = qiRef.current + 1
      if (nextI >= queueRef.current.length) {
        const accMult = getAccuracyMult(correctRef.current, correctRef.current + wrongRef.current)
        const finalScore = Math.round(scoreRef.current * accMult.mult)
        scoreRef.current = finalScore
        setScore(finalScore)
        setDone(true)
        if (timerRef.current) clearInterval(timerRef.current)
        setElapsed(Date.now() - startTimeRef.current)
        writeHS(id, finalScore)
      } else {
        qiRef.current = nextI
        setQi(nextI)
        setChoices(pickChoices(queueRef.current[nextI], poolRef.current))
        cardTimeRef.current = Date.now()
      }
      setFeedback(null)
      setDragging(false)
    }, 700)
  }, [done, feedback, started, maxCombo, id])

  // ── Drag handling ────────────────────────────────────────────────────
  function onDragStart(e) {
    if (feedback) return
    const point = e.touches ? e.touches[0] : e
    setDragging(true)
    setDragOrigin({ x: point.clientX, y: point.clientY })
    setDragPos({ x: point.clientX, y: point.clientY })
  }

  function onDragMove(e) {
    if (!dragging || feedback) return
    const point = e.touches ? e.touches[0] : e
    setDragPos({ x: point.clientX, y: point.clientY })
  }

  function onDragEnd(e) {
    if (!dragging || feedback) return
    const point = e.changedTouches ? e.changedTouches[0] : e

    // Check which choice box the pointer is over
    for (let i = 0; i < choiceRefs.current.length; i++) {
      const el = choiceRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (point.clientX >= rect.left && point.clientX <= rect.right &&
          point.clientY >= rect.top && point.clientY <= rect.bottom) {
        handleSelect(choices[i])
        return
      }
    }

    // Didn't land on any box — snap back
    setDragging(false)
    setDragPos({ x: 0, y: 0 })
  }

  // ── Keyboard (number keys) ───────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (feedback) return
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1
        if (choices[idx]) handleSelect(choices[idx])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSelect, choices, feedback])

  // ── Guards ────────────────────────────────────────────────────────────
  if (!deck) return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>

  if (queue.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-6xl text-blue-400/15 mb-6">試</span>
      <p className="font-display italic text-2xl text-parchment-200 mb-2">No cards to test</p>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8 max-w-[260px]">
        You need cards at Familiar stage or above — keep studying to unlock Memory Test
      </p>
      <button onClick={() => navigate(`/deck/${id}`)}
        className="border border-gold-400/30 text-gold-400 font-display italic text-base py-3 px-8 rounded-xl hover:bg-gold-400/10 transition-colors">
        Back to deck
      </button>
    </div>
  )

  // ── Done screen ──────────────────────────────────────────────────────
  if (done) {
    const totalAnswers = correctRef.current + wrongRef.current
    const accuracy = totalAnswers ? Math.round((correctRef.current / totalAnswers) * 100) : 0
    const isPerfect = wrongRef.current === 0
    const stars = getStars(score, cardCount.current)
    const highScore = readHS(id)
    const isNewHS = score >= highScore && score > 0
    const accInfo = getAccuracyMult(correctRef.current, totalAnswers)

    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center text-center px-8 py-10">

          {/* Stars */}
          <div className="flex gap-2 mb-4 animate-fade-up">
            {[1, 2, 3].map(i => (
              <span key={i} className={`text-3xl transition-all duration-300
                ${i <= stars ? 'text-blue-400 animate-combo-pop' : 'text-parchment-500/15'}`}
                style={i <= stars ? { animationDelay: `${i * 0.12}s` } : undefined}>★</span>
            ))}
          </div>

          {isPerfect ? (
            <>
              <span className="font-kanji text-7xl text-blue-400/30 mb-3 animate-perfect-burst">全問</span>
              <h2 className="font-display italic text-3xl text-blue-400 mb-1 animate-fade-up delay-100">Perfect Recall!</h2>
              <p className="font-mono text-[10px] text-blue-400/60 tracking-widest uppercase mb-6 animate-fade-up delay-100">Every match correct</p>
            </>
          ) : (
            <>
              <span className="font-kanji text-6xl text-blue-400/15 mb-3 animate-fade-up">試</span>
              <h2 className="font-display italic text-3xl text-parchment-100 mb-1 animate-fade-up delay-100">Test complete</h2>
              <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-6 animate-fade-up delay-100">Match kanji to meaning</p>
            </>
          )}

          {/* Score */}
          <div className="mb-2 animate-fade-up delay-200">
            <p className="font-display italic text-7xl text-blue-400 leading-none tabular-nums">{score.toLocaleString()}</p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-2">Total score</p>
          </div>

          {isNewHS && (
            <div className="mb-4 animate-combo-pop">
              <span className="font-mono text-[10px] text-blue-400 tracking-[3px] uppercase
                               bg-blue-400/10 border border-blue-400/30 rounded-full px-4 py-1.5">
                ★ New high score ★
              </span>
            </div>
          )}
          {!isNewHS && highScore > 0 && (
            <p className="font-mono text-[9px] text-parchment-500/40 tracking-widest mb-4 animate-fade-up delay-200">
              High score: {highScore.toLocaleString()}
            </p>
          )}

          <div className="mb-6 animate-fade-up delay-200">
            <p className="font-display italic text-2xl text-parchment-200 tabular-nums">{fmtTime(elapsed)}</p>
            <p className="font-mono text-[8px] text-parchment-500/40 tracking-widest uppercase mt-1">Time</p>
          </div>

          {/* Breakdown */}
          <div className="bg-ink-800 border border-gold-400/10 rounded-xl p-4 w-full mb-6 animate-fade-up delay-300">
            <p className="font-mono text-[9px] text-parchment-500/50 tracking-widest uppercase mb-3">Score breakdown</p>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="font-mono text-[10px] text-parchment-400">Base points</span><span className="font-mono text-[10px] text-parchment-300 tabular-nums">{correctRef.current} × {BASE_POINTS}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-parchment-400">Best combo multiplier</span><span className="font-mono text-[10px] text-blue-400 tabular-nums">×{getComboMult(maxCombo)}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-parchment-400">Accuracy bonus</span>
                <span className={`font-mono text-[10px] tabular-nums ${accInfo.mult > 1 ? 'text-emerald-400' : 'text-parchment-500'}`}>×{accInfo.mult}{accInfo.label ? ` (${accInfo.label})` : ''}</span>
              </div>
              <div className="h-px bg-gold-400/8 my-1" />
              <div className="flex justify-between"><span className="font-mono text-[10px] text-parchment-200 font-medium">Final score</span><span className="font-mono text-[10px] text-blue-400 font-medium tabular-nums">{score.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-8 w-full animate-fade-up delay-300">
            {[
              { n: correctRef.current, l: 'Correct', c: 'text-emerald-400' },
              { n: wrongRef.current,   l: 'Missed',  c: 'text-ember' },
              { n: maxCombo > 1 ? `×${maxCombo}` : '—', l: 'Best combo', c: 'text-blue-400' },
              { n: accuracy + '%', l: 'Accuracy', c: 'text-parchment-100' },
            ].map(({ n, l, c }) => (
              <div key={l} className="text-center">
                <p className={`font-display italic text-2xl leading-none ${c}`}>{n}</p>
                <p className="font-mono text-[8px] text-parchment-500 tracking-widest uppercase mt-1.5">{l}</p>
              </div>
            ))}
          </div>

          <div className="gold-divider w-full mb-8 animate-fade-up delay-300"><span /></div>

          <div className="w-full space-y-3 animate-fade-up delay-300">
            <button onClick={buildGame}
              className="w-full border border-blue-400/30 text-blue-400 font-display italic text-lg py-4 rounded-xl hover:bg-blue-400/8 transition-colors">
              Test again →
            </button>
            <button onClick={() => navigate(`/deck/${id}`)}
              className="w-full border border-gold-400/35 text-gold-400 font-display italic text-lg py-4 rounded-xl hover:bg-gold-400/10 transition-colors">
              Back to deck
            </button>
            <button onClick={() => navigate('/library')}
              className="font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase w-full pt-1">Home</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active game ──────────────────────────────────────────────────────
  const current = queue[qi]
  const remaining = queue.length - qi
  const mult = getComboMult(combo)

  // Drag offset from origin
  const dx = dragging ? dragPos.x - dragOrigin.x : 0
  const dy = dragging ? dragPos.y - dragOrigin.y : 0

  return (
    <div className="flex flex-col h-full select-none"
         onMouseMove={dragging ? onDragMove : undefined}
         onMouseUp={dragging ? onDragEnd : undefined}
         onTouchMove={dragging ? onDragMove : undefined}
         onTouchEnd={dragging ? onDragEnd : undefined}>

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-2">
        <button onClick={() => navigate(`/deck/${id}`)}
          className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase hover:text-ember transition-colors touch-manipulation">
          ✕ Quit
        </button>
        <span className="font-mono text-[12px] text-blue-400/80 tracking-widest tabular-nums font-medium">
          {started ? fmtTime(elapsed) : '0.0s'}
        </span>
        <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest tabular-nums">
          {remaining} left
        </span>
      </div>

      {/* Progress */}
      <div className="shrink-0 px-5 pb-2">
        <div className="h-[3px] bg-ink-600 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400/60 rounded-full transition-all duration-300"
            style={{ width: `${queue.length > 0 ? Math.round((qi / queue.length) * 100) : 0}%` }} />
        </div>
      </div>

      {/* Score + combo */}
      <div className="shrink-0 flex items-center justify-between px-5 pb-3">
        <span className="font-mono text-[11px] text-parchment-500/60 tracking-widest tabular-nums">
          {score.toLocaleString()} pts
        </span>
        {combo >= 3 && (
          <span className="font-mono text-[11px] text-blue-400 tracking-widest animate-combo-pop" key={combo}>
            ×{mult} multiplier
          </span>
        )}
        {combo > 0 && combo < 3 && (
          <span className="font-mono text-[10px] text-parchment-500/30 tracking-widest">{combo} streak</span>
        )}
      </div>

      {/* ── Choice boxes (4 meanings) — fill most of the screen ── */}
      <div className="flex-1 min-h-0 px-4 pb-3 flex flex-col">
        <div className="grid grid-cols-2 gap-3 flex-1">
          {choices.map((card, i) => {
            const isFeedbackTarget = feedback && feedback.choiceId === card.id
            const isCorrectChoice  = feedback && feedback.correctId === card.id
            const showCorrect = feedback && isCorrectChoice
            const showWrong   = isFeedbackTarget && !feedback.isCorrect

            return (
              <button
                key={`${card.id}-${qi}`}
                ref={el => choiceRefs.current[i] = el}
                onClick={() => !feedback && handleSelect(card)}
                disabled={!!feedback}
                className={`relative bg-ink-800 rounded-2xl px-4 text-center
                           border-2 transition-all duration-200 touch-manipulation
                           flex flex-col items-center justify-center gap-1
                           ${showCorrect ? 'border-emerald-400/50 bg-emerald-400/8 animate-drop-correct' :
                             showWrong ? 'border-ember/50 bg-ember/8 animate-drop-wrong' :
                             'border-gold-400/10 hover:border-blue-400/30 hover:bg-blue-400/5'}`}
              >
                <span className="font-mono text-[9px] text-parchment-500/25 absolute top-2.5 left-3">
                  {i + 1}
                </span>

                {/* Feedback points inside the box */}
                {showCorrect && feedback.isCorrect && (
                  <span className="absolute top-2.5 right-3 font-mono text-[10px] text-emerald-400 animate-fade-up">
                    +{feedback.points}
                  </span>
                )}

                <p className={`font-display italic text-lg leading-snug transition-colors
                              ${showCorrect ? 'text-emerald-400' :
                                showWrong ? 'text-ember' :
                                'text-parchment-100'}`}>
                  {card.meaning}
                </p>
                {card.romaji && (
                  <p className={`font-mono text-[10px] transition-colors
                                ${showCorrect ? 'text-emerald-400/50' :
                                  showWrong ? 'text-ember/50' :
                                  'text-parchment-500/40'}`}>
                    {card.romaji}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Feedback float (between boxes and kanji) ── */}
      {feedback && (
        <div className="shrink-0 flex justify-center py-1">
          {feedback.isCorrect ? (
            <div className="flex items-center gap-3 animate-fade-up">
              {feedback.speedLabel && <span className="font-mono text-[9px] text-blue-400/70 tracking-widest uppercase">{feedback.speedLabel}</span>}
              {feedback.mult > 1 && <span className="font-mono text-[9px] text-blue-400/50 tracking-widest">×{feedback.mult} combo</span>}
            </div>
          ) : (
            <span className="font-display italic text-base text-ember animate-fade-up drop-shadow-lg">
              Back of deck
            </span>
          )}
        </div>
      )}

      {/* ── Kanji card (pinned to bottom) ── */}
      <div className="shrink-0 px-5 pb-5 flex justify-center relative">
        <div className="relative">
          {dragging && (
            <div className="w-28 h-32 bg-ink-700/30 border border-dashed border-gold-400/10 rounded-xl" />
          )}

          <div
            className={`${dragging ? 'fixed z-50 pointer-events-none' : 'relative'} animate-kanji-reveal`}
            key={`kanji-${qi}-${current?.id}`}
            style={dragging ? {
              left: dragPos.x - 56,
              top: dragPos.y - 64,
              width: 112,
              height: 128,
            } : undefined}
          >
            <div
              className={`w-28 h-32 bg-ink-800 border rounded-xl flex flex-col items-center
                          justify-center cursor-grab active:cursor-grabbing touch-manipulation
                          transition-shadow duration-200
                          ${dragging ? 'border-blue-400/40 shadow-lg shadow-blue-400/10' :
                            feedback ? 'border-gold-400/10' :
                            'border-gold-400/15 hover:border-blue-400/25'}`}
              onMouseDown={!feedback ? onDragStart : undefined}
              onTouchStart={!feedback ? onDragStart : undefined}
            >
              <p className="font-kanji text-5xl text-parchment-100 leading-none">
                {current?.kanji}
              </p>
              {current?.disambig && (
                <span className="font-mono text-[7px] text-gold-400/60 tracking-wider uppercase mt-1.5
                                 border border-gold-400/15 rounded-full px-2 py-0.5 bg-gold-400/5">
                  {current.disambig}
                </span>
              )}
              {!dragging && !feedback && (
                <p className="font-mono text-[7px] text-parchment-500/15 tracking-widest mt-2 uppercase">
                  Drag or tap 1–4
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
