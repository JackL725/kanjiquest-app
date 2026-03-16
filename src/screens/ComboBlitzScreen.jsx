import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'

// ─── ComboBlitzScreen ─────────────────────────────────────────────────────
// Speed recall game: swipe right = know it, swipe left = don't.
// Wrong cards return to the back. Timer tracks your speed.

export default function ComboBlitzScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const deck = getDeckById(id)
  const { getCardProgress } = useSRS(id)

  const [queue, setQueue]       = useState([])
  const [qi, setQi]             = useState(0)
  const [started, setStarted]   = useState(false)
  const [done, setDone]         = useState(false)
  const [elapsed, setElapsed]   = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [wrong, setWrong]       = useState(0)
  const [combo, setCombo]       = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [swipeDir, setSwipeDir] = useState(null)  // 'left' | 'right' | null
  const [flipped, setFlipped]   = useState(false)

  const startTimeRef = useRef(null)
  const timerRef     = useRef(null)
  const queueRef     = useRef([])
  const qiRef        = useRef(0)

  // ── Build queue from all non-unseen cards ────────────────────────────
  useEffect(() => {
    if (!deck) return
    const cards = deck.cards.filter(c => getCardProgress(c.id))
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    queueRef.current = shuffled
    setQueue(shuffled)
    setQi(0)
    qiRef.current = 0
  }, [deck?.id])

  // ── Timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (started && !done) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current)
      }, 100)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started, done])

  // ── Format time ──────────────────────────────────────────────────────
  function fmtTime(ms) {
    const totalSecs = Math.floor(ms / 1000)
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    const d = Math.floor((ms % 1000) / 100)
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}.${d}` : `${s}.${d}s`
  }

  // ── Handle answer ────────────────────────────────────────────────────
  const handleAnswer = useCallback((isCorrect) => {
    if (done || swipeDir) return
    if (!started) setStarted(true)

    const cur = queueRef.current[qiRef.current]
    if (!cur) return

    // Animate swipe
    setSwipeDir(isCorrect ? 'right' : 'left')

    setTimeout(() => {
      if (isCorrect) {
        setCorrect(c => c + 1)
        setCombo(c => {
          const n = c + 1
          setMaxCombo(m => Math.max(m, n))
          return n
        })
      } else {
        setWrong(w => w + 1)
        setCombo(0)
        // Push card to the back
        queueRef.current = [...queueRef.current, cur]
        setQueue([...queueRef.current])
      }

      const nextI = qiRef.current + 1
      if (nextI >= queueRef.current.length) {
        // Done!
        setDone(true)
        if (timerRef.current) clearInterval(timerRef.current)
        setElapsed(Date.now() - startTimeRef.current)
      } else {
        qiRef.current = nextI
        setQi(nextI)
      }
      setSwipeDir(null)
      setFlipped(false)
    }, 300)
  }, [done, swipeDir, started])

  // ── Touch swipe on card ──────────────────────────────────────────────
  const touchRef = useRef(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)

  function onTouchStart(e) {
    if (e.touches.length !== 1) return
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    setDragging(true)
  }

  function onTouchMove(e) {
    if (!touchRef.current || !dragging) return
    const dx = e.touches[0].clientX - touchRef.current.x
    setDragX(dx)
  }

  function onTouchEnd() {
    if (!touchRef.current) return
    const threshold = 80
    if (dragX > threshold) {
      handleAnswer(true)
    } else if (dragX < -threshold) {
      handleAnswer(false)
    }
    touchRef.current = null
    setDragX(0)
    setDragging(false)
  }

  // ── Keyboard ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') handleAnswer(true)
      if (e.key === 'ArrowLeft') handleAnswer(false)
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleAnswer])

  // ── Guards ────────────────────────────────────────────────────────────
  if (!deck) return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>

  if (queue.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-6xl text-amber-500/15 mb-6">連</span>
      <p className="font-display italic text-2xl text-parchment-200 mb-2">No cards to blitz</p>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8">
        Study some cards first to build your review pool
      </p>
      <button onClick={() => navigate(`/deck/${id}`)}
        className="border border-gold-400/30 text-gold-400 font-display italic text-base py-3 px-8 rounded-xl hover:bg-gold-400/10 transition-colors">
        Back to deck
      </button>
    </div>
  )

  // ── Done screen ──────────────────────────────────────────────────────
  if (done) {
    const totalAnswers = correct + wrong
    const accuracy = totalAnswers ? Math.round((correct / totalAnswers) * 100) : 0
    const isPerfect = wrong === 0

    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center text-center px-8 py-10">
          {isPerfect ? (
            <>
              <span className="font-kanji text-8xl text-amber-500/30 mb-4 animate-perfect-burst">連勝</span>
              <h2 className="font-display italic text-3xl text-amber-500 mb-1 animate-fade-up delay-100">Flawless Blitz!</h2>
              <p className="font-mono text-[10px] text-amber-500/60 tracking-widest uppercase mb-8 animate-fade-up delay-100">
                Not a single miss
              </p>
            </>
          ) : (
            <>
              <span className="font-kanji text-7xl text-amber-500/15 mb-6 animate-fade-up">連</span>
              <h2 className="font-display italic text-3xl text-parchment-100 mb-1 animate-fade-up delay-100">Blitz complete</h2>
              <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8 animate-fade-up delay-100">
                Speed is nothing without accuracy
              </p>
            </>
          )}

          {/* Time — the hero stat */}
          <div className="mb-8 animate-fade-up delay-200">
            <p className="font-display italic text-6xl text-amber-500 leading-none tabular-nums">
              {fmtTime(elapsed)}
            </p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-2">Total time</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 mb-8 w-full animate-fade-up delay-300">
            {[
              { n: correct, l: 'Correct', c: 'text-emerald-400' },
              { n: wrong,   l: 'Missed',  c: 'text-ember' },
              { n: maxCombo > 1 ? `×${maxCombo}` : '—', l: 'Best combo', c: 'text-amber-500' },
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
            <button onClick={() => { 
              const cards = deck.cards.filter(c => getCardProgress(c.id))
              const sh = [...cards].sort(() => Math.random() - 0.5)
              queueRef.current = sh; setQueue(sh); qiRef.current = 0; setQi(0)
              setDone(false); setStarted(false); setElapsed(0)
              setCorrect(0); setWrong(0); setCombo(0); setMaxCombo(0)
              setSwipeDir(null); setFlipped(false)
            }}
              className="w-full border border-amber-500/30 text-amber-500 font-display italic text-lg py-4 rounded-xl hover:bg-amber-500/8 transition-colors">
              Blitz again →
            </button>
            <button onClick={() => navigate(`/deck/${id}`)}
              className="w-full border border-gold-400/35 text-gold-400 font-display italic text-lg py-4 rounded-xl hover:bg-gold-400/10 transition-colors">
              Back to deck
            </button>
            <button onClick={() => navigate('/library')}
              className="font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase w-full pt-1">
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active game ──────────────────────────────────────────────────────
  const current = queue[qi]
  const remaining = queue.length - qi
  const dragRotate = (dragX / 400) * 15  // subtle rotation while dragging
  const dragOpacity = 1 - Math.min(Math.abs(dragX) / 300, 0.4)

  // Swipe direction indicator colors
  const showRight = dragX > 30
  const showLeft = dragX < -30

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={() => navigate(`/deck/${id}`)}
          className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase
                     hover:text-ember transition-colors touch-manipulation">
          ✕ Quit
        </button>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-amber-500/80 tracking-widest tabular-nums font-medium">
            {started ? fmtTime(elapsed) : '0.0s'}
          </span>
        </div>

        <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest tabular-nums">
          {remaining} left
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="shrink-0 px-5 pb-4">
        <div className="h-[3px] bg-ink-600 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500/60 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${queue.length > 0 ? Math.round((qi / queue.length) * 100) : 0}%` }} />
        </div>
      </div>

      {/* ── Combo ── */}
      {combo >= 2 && (
        <div className="shrink-0 flex justify-center pb-2">
          <span className="font-mono text-[11px] text-amber-500/70 tracking-widest animate-combo-pop">
            ×{combo} combo
          </span>
        </div>
      )}

      {/* ── Swipe indicators ── */}
      <div className="shrink-0 flex justify-between px-8 pb-2">
        <span className={`font-mono text-[10px] tracking-widest uppercase transition-opacity duration-150
                          ${showLeft ? 'text-ember opacity-100' : 'text-ember/20 opacity-100'}`}>
          ← Wrong
        </span>
        <span className={`font-mono text-[10px] tracking-widest uppercase transition-opacity duration-150
                          ${showRight ? 'text-emerald-400 opacity-100' : 'text-emerald-400/20 opacity-100'}`}>
          Correct →
        </span>
      </div>

      {/* ── Card ── */}
      <div className="flex-1 min-h-0 px-5 pb-3 flex items-center justify-center">
        <div
          key={`${qi}-${current?.id}`}
          className={`w-full max-w-sm aspect-[3/4] relative touch-manipulation
                      ${swipeDir === 'right' ? 'animate-swipe-right' :
                        swipeDir === 'left' ? 'animate-swipe-left' :
                        !swipeDir && qi > 0 ? 'animate-swipe-enter' : 'animate-swipe-enter'}`}
          style={dragging ? {
            transform: `translateX(${dragX}px) rotate(${dragRotate}deg)`,
            opacity: dragOpacity,
            transition: 'none',
          } : undefined}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => setFlipped(f => !f)}
        >
          {/* Card face */}
          <div className={`absolute inset-0 bg-ink-800 rounded-2xl flex flex-col items-center justify-center p-8 select-none
                           border transition-colors duration-150
                           ${showRight ? 'border-emerald-400/40' :
                             showLeft ? 'border-ember/40' :
                             'border-gold-400/15'}`}>

            {/* Front: kanji */}
            {!flipped ? (
              <>
                <p className="font-mono text-[9px] text-parchment-500/40 tracking-[3px] uppercase mb-6">
                  Do you know this?
                </p>
                <p className="font-kanji text-[96px] text-parchment-100 leading-none mb-4">
                  {current?.kanji}
                </p>
                {current?.disambig && (
                  <span className="font-mono text-[9px] text-gold-400/70 tracking-[1.5px] uppercase
                                   border border-gold-400/20 rounded-full px-3 py-1
                                   bg-gold-400/5">{current.disambig}</span>
                )}
                <p className="font-mono text-[9px] text-parchment-500/20 tracking-widest mt-6">
                  tap to peek · swipe to answer
                </p>
              </>
            ) : (
              /* Back: meaning + reading */
              <>
                <p className="font-mono text-[9px] text-gold-400/50 tracking-[3px] uppercase mb-4">
                  Answer
                </p>
                <p className="font-kanji text-5xl text-parchment-100/30 leading-none mb-4">
                  {current?.kanji}
                </p>
                <p className="font-display italic text-2xl text-parchment-100 mb-2 text-center leading-tight">
                  {current?.meaning}
                </p>
                {current?.reading && (
                  <p className="font-display italic text-lg text-parchment-300">
                    {current.reading}
                  </p>
                )}
                <p className="font-mono text-[11px] text-parchment-500 mt-1">
                  {current?.romaji}
                </p>
                <p className="font-mono text-[9px] text-parchment-500/20 tracking-widest mt-6">
                  swipe to answer
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom controls (desktop fallback) ── */}
      <div className="shrink-0 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleAnswer(false)}
            className="border border-ember/25 text-ember font-display italic text-base py-3.5 rounded-xl
                       hover:bg-ember/8 transition-colors touch-manipulation">
            ✕ Wrong
          </button>
          <button onClick={() => handleAnswer(true)}
            className="border border-emerald-400/25 text-emerald-400 font-display italic text-base py-3.5 rounded-xl
                       hover:bg-emerald-400/8 transition-colors touch-manipulation">
            ✓ Correct
          </button>
        </div>
        <p className="font-mono text-[8px] text-parchment-500/25 tracking-widest uppercase text-center mt-2">
          ← → arrow keys · Space to peek
        </p>
      </div>
    </div>
  )
}
