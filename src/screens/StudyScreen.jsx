import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'

const MODES = ['kanji → meaning', 'kanji → reading', 'meaning → kanji']

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

  // Build queue on mount
  useEffect(() => {
    if (!deck) return
    const all = params.get('mode') === 'all'
    const cards = all ? [...deck.cards] : getDueCards(deck.cards)
    const final = cards.length ? cards : [...deck.cards]
    setQueue(final.sort(() => Math.random() - 0.5))
  }, [deck?.id])

  const current = queue[qi]

  const handleRate = useCallback((q) => {
    if (!current) return
    rate(current.id, q)
    setStats(s => ({ ok: s.ok + (q >= 3 ? 1 : 0), miss: s.miss + (q < 3 ? 1 : 0) }))
    if (qi + 1 >= queue.length) { setDone(true); return }
    setQi(i => i + 1)
    setFlipped(false)
  }, [current, qi, queue.length, rate])

  if (!deck) return <div className="px-5 py-6 text-parchment-500">Deck not found.</div>
  if (!queue.length) return <div className="px-5 py-6 text-parchment-500">Loading...</div>

  if (done) {
    const total = stats.ok + stats.miss
    const pct   = total ? Math.round((stats.ok / total) * 100) : 0
    return (
      <div className="px-5 py-6 flex flex-col items-center justify-center min-h-full text-center">
        <span className="font-kanji text-6xl text-gold-400/20 mb-4">完</span>
        <h2 className="font-display italic text-3xl text-parchment-100 mb-1">Session complete</h2>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-8">
          Consistency is the secret
        </p>
        <div className="flex gap-8 mb-10">
          {[{ n: stats.ok, l: 'correct' }, { n: stats.miss, l: 'again' }, { n: pct + '%', l: 'accuracy' }].map(({ n, l }) => (
            <div key={l}>
              <p className="font-display italic text-4xl text-gold-400">{n}</p>
              <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">{l}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate(`/deck/${id}`)}
          className="w-full border border-gold-400/40 text-gold-400 font-display italic
                     text-lg py-3 rounded-xl hover:bg-gold-400/10 transition-colors mb-3"
        >
          Back to deck
        </button>
        <button
          onClick={() => navigate('/library')}
          className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase"
        >
          Home
        </button>
      </div>
    )
  }

  const ms  = MODES[mode]
  const p   = getCardProgress(current.id)
  const goodD = Math.round((p?.interval || 1) * 2.5)
  const easyD = Math.round((p?.interval || 1) * 3.5)
  const pct = Math.round((qi / queue.length) * 100)

  return (
    <div className="px-5 py-5 flex flex-col h-full">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)}
          className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase hover:text-gold-400 transition-colors">
          ✕ Quit
        </button>
        <span className="font-mono text-[10px] text-parchment-500 tracking-widest">
          {qi + 1} / {queue.length}
        </span>
        <select
          value={mode}
          onChange={e => setMode(+e.target.value)}
          className="bg-ink-800 border border-gold-400/15 text-parchment-500 font-mono
                     text-[10px] rounded px-2 py-1 outline-none"
        >
          {MODES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-ink-600 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-gold-400 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }} />
      </div>

      {/* Card */}
      <div className="card-scene flex-1 mb-4" onClick={() => setFlipped(f => !f)}>
        <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>

          {/* Front */}
          <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15
                          rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer">
            <p className="font-mono text-[9px] text-parchment-500 tracking-[3px] uppercase mb-6">
              {ms === 'kanji → meaning' ? 'What does this mean?' :
               ms === 'kanji → reading' ? 'How do you read this?' :
               'What is the kanji?'}
            </p>
            {ms !== 'meaning → kanji' ? (
              <>
                <p className="font-kanji text-[80px] text-parchment-100 leading-none mb-4">
                  {current.kanji}
                </p>
                <p className="blur-reveal font-mono text-[11px] text-parchment-500 text-center">
                  {current.parts.join(' · ')}
                </p>
                <p className="font-mono text-[9px] text-parchment-500/40 mt-2 tracking-widest">
                  hover to peek
                </p>
              </>
            ) : (
              <>
                <p className="font-display italic text-2xl text-parchment-100 text-center mb-2">
                  {current.meaning}
                </p>
                <p className="font-mono text-[12px] text-parchment-500">{current.romaji}</p>
              </>
            )}
          </div>

          {/* Back */}
          <div className="card-face card-face-back absolute inset-0 bg-ink-800
                          border border-gold-400/20 rounded-2xl p-5 overflow-y-auto cursor-pointer">

            {/* Ghost kanji top-right */}
            <p className="absolute top-3 right-4 font-kanji text-5xl text-gold-400/8
                          leading-none pointer-events-none select-none">
              {current.kanji}
            </p>

            {ms !== 'meaning → kanji' ? (
              <>
                <Section label="Reading">
                  <p className="font-display italic text-2xl text-parchment-100">{current.reading}</p>
                  <p className="font-mono text-[11px] text-parchment-500 mt-0.5">{current.romaji}</p>
                </Section>
                <Section label="Meaning">
                  <p className="font-display italic text-lg text-parchment-200">{current.meaning}</p>
                </Section>
              </>
            ) : (
              <>
                <Section label="Kanji">
                  <p className="font-kanji text-5xl text-parchment-100 leading-none">{current.kanji}</p>
                </Section>
                <Section label="Reading">
                  <p className="font-display italic text-xl text-parchment-100">{current.reading}</p>
                  <p className="font-mono text-[11px] text-parchment-500 mt-0.5">{current.romaji}</p>
                </Section>
              </>
            )}

            <Divider />

            <Section label="RTK radical stories">
              <div className="space-y-2">
                <Story num={1}>{current.rtk1}</Story>
                <Story num={2}>{current.rtk2}</Story>
              </div>
            </Section>

            <Section label="Components">
              <div className="flex flex-wrap gap-1.5">
                {current.parts.map(p => (
                  <span key={p} className="font-mono text-[10px] text-parchment-500
                                            border border-gold-400/15 rounded px-2 py-0.5">
                    {p}
                  </span>
                ))}
              </div>
            </Section>

            <Section label="From P5R">
              <p className="font-kanji text-sm text-parchment-300 leading-relaxed">{current.context}</p>
              <p className="font-mono text-[10px] text-parchment-500 mt-1 italic">{current.contextEn}</p>
            </Section>
          </div>
        </div>
      </div>

      {/* Flip hint */}
      {!flipped && (
        <p className="text-center font-mono text-[10px] text-parchment-500/50 tracking-widest
                      uppercase mb-3">
          Tap card to reveal
        </p>
      )}

      {/* Rating buttons */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2 animate-fade-up">
          <RateBtn onClick={() => handleRate(0)} color="text-ember border-ember/40 hover:bg-ember/10"
            label="Again" sub="<1 day" />
          <RateBtn onClick={() => handleRate(2)} color="text-amber-600 border-amber-600/40 hover:bg-amber-600/10"
            label="Hard" sub="+1 day" />
          <RateBtn onClick={() => handleRate(4)} color="text-blue-400 border-blue-400/40 hover:bg-blue-400/10"
            label="Good" sub={`+${goodD}d`} />
          <RateBtn onClick={() => handleRate(5)} color="text-green-500 border-green-500/40 hover:bg-green-500/10"
            label="Easy" sub={`+${easyD}d`} />
        </div>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="mb-3">
      <p className="font-mono text-[9px] text-gold-400/70 tracking-[2px] uppercase mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gold-400/10 my-3" />
}

function Story({ num, children }) {
  return (
    <div className="relative pl-6 bg-ink-700 rounded-lg p-2.5">
      <span className="absolute left-2 top-2.5 font-mono text-[9px] text-gold-400/60">{num}</span>
      <p className="font-mono text-[11px] text-parchment-500 leading-relaxed">{children}</p>
    </div>
  )
}

function RateBtn({ onClick, color, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={`border rounded-xl py-2.5 flex flex-col items-center gap-0.5
                  transition-colors duration-150 ${color}`}
    >
      <span className="font-display italic text-sm">{label}</span>
      <span className="font-mono text-[9px] opacity-70">{sub}</span>
    </button>
  )
}
