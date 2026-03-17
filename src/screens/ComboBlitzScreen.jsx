import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'
import { getMasteryStage } from '@/hooks/useMastery'

const BLITZ_SIZE = 20

// ─── Scoring constants ────────────────────────────────────────────────────
const BASE_POINTS    = 100
const SPEED_TIERS    = [
  { max: 2000,  bonus: 50, label: '⚡ Lightning' },
  { max: 4000,  bonus: 25, label: '🔥 Fast' },
  { max: 8000,  bonus: 10, label: 'Quick' },
  { max: Infinity, bonus: 0, label: '' },
]
const COMBO_TIERS = [
  { min: 0,  mult: 1 },
  { min: 3,  mult: 2 },
  { min: 6,  mult: 3 },
  { min: 10, mult: 4 },
  { min: 15, mult: 5 },
  { min: 20, mult: 6 },
]
function getComboMult(combo) {
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (combo >= COMBO_TIERS[i].min) return COMBO_TIERS[i].mult
  }
  return 1
}
function getSpeedBonus(ms) {
  return SPEED_TIERS.find(t => ms < t.max) || SPEED_TIERS[SPEED_TIERS.length - 1]
}
function getAccuracyMult(correct, total) {
  const pct = total > 0 ? correct / total : 0
  if (pct >= 1)   return { mult: 1.5, label: 'Perfect' }
  if (pct >= 0.9) return { mult: 1.2, label: 'Great' }
  if (pct >= 0.8) return { mult: 1.1, label: 'Good' }
  return { mult: 1.0, label: '' }
}
function getStars(score, cardCount) {
  const maxPerCard = (BASE_POINTS + 50) * 6
  const theoretical = Math.round(maxPerCard * cardCount * 1.5)
  const pct = theoretical > 0 ? score / theoretical : 0
  if (pct >= 0.6) return 3
  if (pct >= 0.3) return 2
  if (pct >= 0.1) return 1
  return 0
}

// ─── High score persistence ───────────────────────────────────────────────
const HS_KEY = 'kq-blitz-highscores'
function readHighScore(deckId) {
  try { const all = JSON.parse(localStorage.getItem(HS_KEY) || '{}'); return all[deckId] || 0 } catch { return 0 }
}
function writeHighScore(deckId, score) {
  try { const all = JSON.parse(localStorage.getItem(HS_KEY) || '{}'); all[deckId] = Math.max(all[deckId] || 0, score); localStorage.setItem(HS_KEY, JSON.stringify(all)) } catch {}
}

// ─── Voice matching helpers ───────────────────────────────────────────────
const FILLER_WORDS = new Set(['to', 'a', 'an', 'the', 'of', 'in', 'on', 'is', 'be', 'no', 'not'])

function extractKeywords(meaning) {
  return meaning
    .toLowerCase()
    .split(/[\/;,]/)
    .flatMap(part => part.trim().split(/\s+/))
    .filter(w => w.length > 1 && !FILLER_WORDS.has(w))
}

function checkVoiceMatch(transcript, keywords) {
  const spoken = transcript.toLowerCase().trim().split(/\s+/)
  return spoken.some(word => {
    const base = word.replace(/s$/, '')
    return keywords.some(kw => {
      const kwBase = kw.replace(/s$/, '')
      return word === kw || base === kw || word === kwBase || base === kwBase
    })
  })
}

// ─── Speech Recognition hook ──────────────────────────────────────────────
function useSpeechRecognition({ onResult, enabled }) {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const enabledRef = useRef(enabled)
  const onResultRef = useRef(onResult)
  const restartTimeoutRef = useRef(null)

  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    try { recognitionRef.current.start() } catch {}
  }, [])

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }
    if (!recognitionRef.current) return
    try { recognitionRef.current.abort() } catch {}
    setListening(false)
  }, [])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 3
    recognitionRef.current = recognition

    let lastProcessedFinal = ''

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event) => {
      if (!enabledRef.current) return

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript.trim()

        if (result.isFinal && transcript && transcript !== lastProcessedFinal) {
          lastProcessedFinal = transcript
          const allTranscripts = []
          for (let a = 0; a < result.length; a++) {
            allTranscripts.push(result[a].transcript.trim())
          }
          onResultRef.current?.(allTranscripts)
        }
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      console.warn('Speech recognition error:', event.error)
    }

    recognition.onend = () => {
      setListening(false)
      if (enabledRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (enabledRef.current) startListening()
        }, 100)
      }
    }

    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
      recognition.abort()
      recognitionRef.current = null
    }
  }, [])

  return { listening, supported, startListening, stopListening }
}


// ─── Combo Blitz Screen ───────────────────────────────────────────────────
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
  const [score, setScore]       = useState(0)
  const [cardAnim, setCardAnim] = useState('enter')   // 'enter' | 'shake' | 'correct' | 'wrong'
  const [cardFeedback, setCardFeedback] = useState(null)
  const [spokenText, setSpokenText] = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  const startTimeRef  = useRef(null)
  const timerRef      = useRef(null)
  const cardTimeRef   = useRef(null)
  const queueRef      = useRef([])
  const qiRef         = useRef(0)
  const comboRef      = useRef(0)
  const scoreRef      = useRef(0)
  const correctRef    = useRef(0)
  const wrongRef      = useRef(0)
  const deckCardCount = useRef(0)
  const processingRef = useRef(false)
  const keywordsRef   = useRef([])

  // ── Build blitz pool ──────────────────────────────────────────────
  function buildBlitzPool() {
    if (!deck) return []
    const eligible = deck.cards.filter(c => {
      const p = getCardProgress(c.id)
      if (!p) return false
      const { stageIndex } = getMasteryStage(p)
      return stageIndex >= 2 && stageIndex <= 4
    })
    const shuffled = [...eligible].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, BLITZ_SIZE)
  }

  // ── Build queue ───────────────────────────────────────────────────
  useEffect(() => {
    if (!deck) return
    const cards = buildBlitzPool()
    queueRef.current = cards
    deckCardCount.current = cards.length
    setQueue(cards)
    setQi(0); qiRef.current = 0
    cardTimeRef.current = Date.now()
    if (cards.length > 0) keywordsRef.current = extractKeywords(cards[0].meaning)
  }, [deck?.id])

  // Update keywords when card changes
  useEffect(() => {
    const cur = queue[qi]
    if (cur) keywordsRef.current = extractKeywords(cur.meaning)
  }, [qi, queue])

  // ── Timer ─────────────────────────────────────────────────────────
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

  // ── Advance to next card ──────────────────────────────────────────
  const advanceCard = useCallback(() => {
    const nextI = qiRef.current + 1
    if (nextI >= queueRef.current.length) {
      const accMult = getAccuracyMult(correctRef.current, correctRef.current + wrongRef.current)
      const finalScore = Math.round(scoreRef.current * accMult.mult)
      scoreRef.current = finalScore
      setScore(finalScore)
      setDone(true)
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(Date.now() - startTimeRef.current)
      writeHighScore(id, finalScore)
    } else {
      qiRef.current = nextI
      setQi(nextI)
      cardTimeRef.current = Date.now()
    }
    setCardAnim('enter')
    setCardFeedback(null)
    setSpokenText('')
    processingRef.current = false
  }, [id])

  // ── Handle correct answer ─────────────────────────────────────────
  const handleCorrect = useCallback(() => {
    if (done || processingRef.current) return
    processingRef.current = true
    if (!started) { setStarted(true); startTimeRef.current = Date.now(); cardTimeRef.current = Date.now() }

    const responseTime = Date.now() - (cardTimeRef.current || Date.now())

    comboRef.current += 1
    setCombo(comboRef.current)
    if (comboRef.current > maxCombo) setMaxCombo(comboRef.current)

    const mult = getComboMult(comboRef.current)
    const speedTier = getSpeedBonus(responseTime)
    const earnedPoints = (BASE_POINTS + speedTier.bonus) * mult

    scoreRef.current += earnedPoints
    setScore(scoreRef.current)
    correctRef.current += 1
    setCorrect(correctRef.current)

    setCardFeedback({ points: earnedPoints, speedLabel: speedTier.label, mult, isCorrect: true, key: Date.now() })
    setCardAnim('correct')

    setTimeout(advanceCard, 300)
  }, [done, started, maxCombo, advanceCard])

  // ── Handle "I don't know" ─────────────────────────────────────────
  const handleDontKnow = useCallback(() => {
    if (done || processingRef.current) return
    processingRef.current = true
    if (!started) { setStarted(true); startTimeRef.current = Date.now(); cardTimeRef.current = Date.now() }

    comboRef.current = 0
    setCombo(0)
    wrongRef.current += 1
    setWrong(wrongRef.current)

    const cur = queueRef.current[qiRef.current]
    if (cur) {
      queueRef.current = [...queueRef.current, cur]
      setQueue([...queueRef.current])
    }

    setCardFeedback({ points: 0, speedLabel: '', mult: 1, isCorrect: false, meaning: cur?.meaning, key: Date.now() })
    setCardAnim('wrong')

    setTimeout(advanceCard, 1500)
  }, [done, started, advanceCard])

  // ── Handle wrong voice guess (shake) ──────────────────────────────
  const handleWrongGuess = useCallback((text) => {
    if (processingRef.current) return
    setSpokenText(text)
    setCardAnim('shake')
    setShakeKey(k => k + 1)
    setTimeout(() => {
      if (!processingRef.current) setCardAnim('enter')
    }, 450)
  }, [])

  // ── Voice result handler ──────────────────────────────────────────
  const handleVoiceResult = useCallback((transcripts) => {
    if (processingRef.current || done) return

    if (!started) { setStarted(true); startTimeRef.current = Date.now(); cardTimeRef.current = Date.now() }

    const keywords = keywordsRef.current
    const matched = transcripts.some(t => checkVoiceMatch(t, keywords))

    if (matched) {
      setSpokenText('✓ ' + transcripts[0])
      handleCorrect()
    } else {
      handleWrongGuess(transcripts[0])
    }
  }, [done, started, handleCorrect, handleWrongGuess])

  // ── Speech recognition ────────────────────────────────────────────
  const micEnabled = !done && queue.length > 0
  const { listening, supported, startListening, stopListening } = useSpeechRecognition({
    onResult: handleVoiceResult,
    enabled: micEnabled,
  })

  useEffect(() => {
    if (micEnabled && !done) startListening()
    return () => stopListening()
  }, [micEnabled, done])

  // ── Keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Enter' || e.key === 'Escape') handleDontKnow()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDontKnow])

  // ── Reset ─────────────────────────────────────────────────────────
  function resetGame() {
    const cards = buildBlitzPool()
    queueRef.current = cards; deckCardCount.current = cards.length; setQueue(cards)
    qiRef.current = 0; setQi(0); comboRef.current = 0; setCombo(0); setMaxCombo(0)
    scoreRef.current = 0; setScore(0); correctRef.current = 0; setCorrect(0)
    wrongRef.current = 0; setWrong(0)
    setDone(false); setStarted(false); setElapsed(0)
    setCardAnim('enter'); setCardFeedback(null)
    setSpokenText(''); processingRef.current = false
    cardTimeRef.current = Date.now()
    if (cards.length > 0) keywordsRef.current = extractKeywords(cards[0].meaning)
    setTimeout(startListening, 200)
  }

  // ── Guards ────────────────────────────────────────────────────────
  if (!deck) return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>

  if (!supported) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-6xl text-ember/30 mb-6">音</span>
      <p className="font-display italic text-2xl text-parchment-200 mb-2">Voice not supported</p>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8 max-w-[260px]">
        Your browser doesn't support speech recognition — try Chrome or Edge
      </p>
      <button onClick={() => navigate(`/deck/${id}`)}
        className="border border-gold-400/30 text-gold-400 font-display italic text-base py-3 px-8 rounded-xl hover:bg-gold-400/10 transition-colors">
        Back to deck
      </button>
    </div>
  )

  if (queue.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="font-kanji text-6xl text-amber-500/15 mb-6">連</span>
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

  // ── Done screen ───────────────────────────────────────────────────
  if (done) {
    const totalAnswers = correctRef.current + wrongRef.current
    const accuracy = totalAnswers ? Math.round((correctRef.current / totalAnswers) * 100) : 0
    const isPerfect = wrongRef.current === 0
    const stars = getStars(score, deckCardCount.current)
    const highScore = readHighScore(id)
    const isNewHS = score >= highScore && score > 0
    const accInfo = getAccuracyMult(correctRef.current, totalAnswers)

    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center text-center px-8 py-10">

          {/* Stars */}
          <div className="flex gap-2 mb-4 animate-fade-up">
            {[1, 2, 3].map(i => (
              <span key={i} className={`text-3xl transition-all duration-300
                ${i <= stars ? 'text-amber-500 animate-combo-pop' : 'text-parchment-500/15'}`}
                style={i <= stars ? { animationDelay: `${i * 0.12}s` } : undefined}>
                ★
              </span>
            ))}
          </div>

          {isPerfect ? (
            <>
              <span className="font-kanji text-7xl text-amber-500/30 mb-3 animate-perfect-burst">連勝</span>
              <h2 className="font-display italic text-3xl text-amber-500 mb-1 animate-fade-up delay-100">Perfect Recall!</h2>
              <p className="font-mono text-[10px] text-amber-500/60 tracking-widest uppercase mb-6 animate-fade-up delay-100">Not a single miss</p>
            </>
          ) : (
            <>
              <span className="font-kanji text-6xl text-amber-500/15 mb-3 animate-fade-up">連</span>
              <h2 className="font-display italic text-3xl text-parchment-100 mb-1 animate-fade-up delay-100">Test complete</h2>
              <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-6 animate-fade-up delay-100">Speed × accuracy × combos</p>
            </>
          )}

          {/* Score */}
          <div className="mb-2 animate-fade-up delay-200">
            <p className="font-display italic text-7xl text-amber-500 leading-none tabular-nums">
              {score.toLocaleString()}
            </p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-2">Total score</p>
          </div>

          {isNewHS && (
            <div className="mb-4 animate-combo-pop">
              <span className="font-mono text-[10px] text-amber-500 tracking-[3px] uppercase
                               bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5">
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

          {/* Score breakdown */}
          <div className="bg-ink-800 border border-gold-400/10 rounded-xl p-4 w-full mb-6 animate-fade-up delay-300">
            <p className="font-mono text-[9px] text-parchment-500/50 tracking-widest uppercase mb-3">Score breakdown</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-parchment-400">Base points</span>
                <span className="font-mono text-[10px] text-parchment-300 tabular-nums">{correctRef.current} × {BASE_POINTS}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-parchment-400">Best combo multiplier</span>
                <span className="font-mono text-[10px] text-amber-500 tabular-nums">×{getComboMult(maxCombo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-parchment-400">Accuracy bonus</span>
                <span className={`font-mono text-[10px] tabular-nums ${accInfo.mult > 1 ? 'text-emerald-400' : 'text-parchment-500'}`}>
                  ×{accInfo.mult}{accInfo.label ? ` (${accInfo.label})` : ''}
                </span>
              </div>
              <div className="h-px bg-gold-400/8 my-1" />
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-parchment-200 font-medium">Final score</span>
                <span className="font-mono text-[10px] text-amber-500 font-medium tabular-nums">{score.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 mb-8 w-full animate-fade-up delay-300">
            {[
              { n: correctRef.current, l: 'Correct', c: 'text-emerald-400' },
              { n: wrongRef.current,   l: 'Missed',  c: 'text-ember' },
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
            <button onClick={resetGame}
              className="w-full border border-amber-500/30 text-amber-500 font-display italic text-lg py-4 rounded-xl hover:bg-amber-500/8 transition-colors">
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

  // ── Active game ───────────────────────────────────────────────────
  const current = queue[qi]
  const remaining = queue.length - qi
  const mult = getComboMult(combo)

  const cardAnimClass =
    cardAnim === 'correct' ? 'animate-voice-correct' :
    cardAnim === 'wrong'   ? 'animate-swipe-left' :
    cardAnim === 'shake'   ? 'animate-card-shake' :
    'animate-swipe-enter'

  return (
    <div className="flex flex-col h-full">

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-2">
        <button onClick={() => { stopListening(); navigate(`/deck/${id}`) }}
          className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase hover:text-ember transition-colors touch-manipulation">
          ✕ Quit
        </button>
        <span className="font-mono text-[12px] text-amber-500/80 tracking-widest tabular-nums font-medium">
          {started ? fmtTime(elapsed) : '0.0s'}
        </span>
        <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest tabular-nums">
          {remaining} left
        </span>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-5 pb-2">
        <div className="h-[3px] bg-ink-600 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500/60 rounded-full transition-all duration-300"
            style={{ width: `${queue.length > 0 ? Math.round((qi / queue.length) * 100) : 0}%` }} />
        </div>
      </div>

      {/* Score + combo row */}
      <div className="shrink-0 flex items-center justify-between px-5 pb-3">
        <span className="font-mono text-[11px] text-parchment-500/60 tracking-widest tabular-nums">
          {score.toLocaleString()} pts
        </span>
        {combo >= 3 && (
          <span className="font-mono text-[11px] text-amber-500 tracking-widest animate-combo-pop" key={combo}>
            ×{mult} multiplier
          </span>
        )}
        {combo > 0 && combo < 3 && (
          <span className="font-mono text-[10px] text-parchment-500/30 tracking-widest">
            {combo} streak
          </span>
        )}
      </div>

      {/* Mic status */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-5 pb-3">
        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          listening ? 'bg-gold-400 animate-mic-pulse' : 'bg-parchment-500/20'
        }`} />
        <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase">
          {listening ? 'Listening…' : 'Mic off'}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 min-h-0 px-5 pb-3 flex items-center justify-center relative">
        <div
          key={cardAnim === 'shake' ? `${qi}-shake-${shakeKey}` : `${qi}-${current?.id}`}
          className={`w-full max-w-sm aspect-[3/4] relative touch-manipulation ${cardAnimClass}`}
        >
          <div className="absolute inset-0 bg-ink-800 rounded-2xl flex flex-col items-center justify-center p-8 select-none
                           border border-gold-400/15 transition-colors duration-150">

            {/* ── Full-card answer reveal on "I don't know" ── */}
            {cardFeedback && !cardFeedback.isCorrect ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 animate-fade-up">
                <p className="font-kanji text-5xl text-parchment-100/25 leading-none">{current?.kanji}</p>
                <p className="font-display italic text-4xl text-ember leading-tight drop-shadow-lg px-2">
                  {cardFeedback.meaning || 'Missed'}
                </p>
                {current?.reading && (
                  <p className="font-display italic text-lg text-parchment-300/70">{current.reading}</p>
                )}
                <p className="font-mono text-[9px] text-parchment-500/40 tracking-widest uppercase mt-2">
                  Back of deck
                </p>
              </div>
            ) : (
              <>
                {/* Per-card correct feedback overlay */}
                {cardFeedback && cardFeedback.isCorrect && (
                  <div className="absolute top-10 inset-x-0 flex flex-col items-center gap-1 pointer-events-none z-10">
                    <span className="font-display italic text-xl text-emerald-400 animate-fade-up drop-shadow-lg">
                      +{cardFeedback.points}
                    </span>
                    {cardFeedback.speedLabel && (
                      <span className="font-mono text-[9px] text-amber-500/70 tracking-widest uppercase animate-fade-up"
                            style={{ animationDelay: '0.05s', opacity: 0 }}>
                        {cardFeedback.speedLabel}
                      </span>
                    )}
                    {cardFeedback.mult > 1 && (
                      <span className="font-mono text-[9px] text-amber-500/50 tracking-widest animate-fade-up"
                            style={{ animationDelay: '0.1s', opacity: 0 }}>
                        ×{cardFeedback.mult} combo
                      </span>
                    )}
                  </div>
                )}

                <p className="font-mono text-[9px] text-parchment-500/40 tracking-[3px] uppercase mb-6">
                  Say the meaning
                </p>
                <p className="font-kanji text-[96px] text-parchment-100 leading-none mb-4">{current?.kanji}</p>
                {current?.disambig && (
                  <span className="font-mono text-[9px] text-gold-400/70 tracking-[1.5px] uppercase border border-gold-400/20 rounded-full px-3 py-1 bg-gold-400/5">
                    {current.disambig}
                  </span>
                )}
                {/* Live spoken text feedback */}
                {spokenText && (
                  <p className={`font-body text-sm mt-4 transition-colors duration-200 ${
                    spokenText.startsWith('✓') ? 'text-emerald-400' : 'text-ember/70'
                  }`}>
                    "{spokenText}"
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom — "I don't know" button */}
      <div className="shrink-0 px-5 pb-6">
        <button onClick={handleDontKnow}
          className="w-full border border-ember/25 text-ember font-display italic text-base py-3.5 rounded-xl hover:bg-ember/8 transition-colors touch-manipulation">
          I don't know
        </button>
        <p className="font-mono text-[8px] text-parchment-500/25 tracking-widest uppercase text-center mt-2">
          Enter to skip
        </p>
      </div>
    </div>
  )
}
