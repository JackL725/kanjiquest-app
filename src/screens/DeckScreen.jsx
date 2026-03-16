import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'
import { isPrimerGuideComplete } from '@/screens/PrimerGuideScreen'

// ─── Stroke group helper ─────────────────────────────────────────────────
function getStrokeGroups(cards, getCardProgress) {
  const groups = {}
  cards.forEach(c => {
    const s = c.strokes ?? 0
    if (!groups[s]) groups[s] = { strokes: s, cards: [], learned: 0 }
    groups[s].cards.push(c)
    const p = getCardProgress(c.id)
    if (p?.graduated) groups[s].learned++
  })
  return Object.values(groups).sort((a, b) => a.strokes - b.strokes)
}

export default function DeckScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const deck = getDeckById(id)
  const { getLearnedCount, getDueCount, getNewCount, getCardProgress } = useSRS(id)

  const isFoundation = id === 'primer' || id === 'radicals'
  const isRadicals   = id === 'radicals'
  const needsGuide   = isFoundation && !isPrimerGuideComplete()

  const strokeGroups = useMemo(() => {
    if (!isRadicals || !deck) return []
    return getStrokeGroups(deck.cards, getCardProgress)
  }, [isRadicals, deck?.id])

  function handleStudy(mode) {
    if (needsGuide) {
      navigate('/primer-guide')
    } else if (mode === 'all') {
      navigate(`/study/${id}?mode=all`)
    } else {
      navigate(`/study/${id}`)
    }
  }

  function handleStudyGroup(strokeCount) {
    if (needsGuide) {
      navigate('/primer-guide')
    } else {
      navigate(`/study/${id}?group=${strokeCount}`)
    }
  }

  if (!deck) return (
    <div className="px-5 py-6 text-parchment-500 font-display italic text-lg">
      Deck not found.
    </div>
  )

  const learned  = getLearnedCount(deck.cards)
  const due      = getDueCount(deck.cards)
  const newCount = getNewCount(deck.cards)
  const pct      = Math.round((learned / deck.cards.length) * 100)

  return (
    <div className="px-5 py-6 pb-10">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="font-mono text-[10px] tracking-widest uppercase text-parchment-500
                   hover:text-gold-400 transition-colors mb-6 flex items-center gap-2"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display italic text-2xl text-parchment-100 leading-tight">
              {deck.title}
            </h1>
            <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
              {deck.genre} · {deck.developer}{deck.platforms.length ? ` · ${deck.platforms.join(' / ')}` : ''}
            </p>
          </div>
          <span className="font-kanji text-5xl text-gold-400/15 leading-none">
            {deck.coverKanji}
          </span>
        </div>
        <p className="font-display text-parchment-400 text-sm mt-3 leading-relaxed">
          {deck.description}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up delay-100">
        {[
          { num: learned,            lbl: 'Learned'   },
          { num: due,                lbl: 'Due today'  },
          { num: deck.cards.length,  lbl: 'Total'      },
        ].map(({ num, lbl }) => (
          <div key={lbl} className="bg-ink-800 rounded-xl p-3 text-center border border-gold-400/10">
            <p className="font-display italic text-2xl text-gold-400 leading-none">{num}</p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-1">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="mb-6 animate-fade-up delay-200">
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-parchment-500 uppercase tracking-widest">Progress</span>
          <span className="font-mono text-[10px] text-gold-400">{pct}%</span>
        </div>
        <div className="h-1 bg-ink-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Study buttons */}
      <div className="space-y-3 mb-8 animate-fade-up delay-300">
        <button
          onClick={() => handleStudy('normal')}
          className="w-full bg-transparent border border-gold-400/40 text-gold-400
                     font-display italic text-lg py-3 rounded-xl
                     hover:bg-gold-400/10 transition-colors duration-200"
        >
          {needsGuide
            ? 'Start learning →'
            : due > 0
              ? `Study ${due} card${due !== 1 ? 's' : ''} today`
              : 'All caught up'}
        </button>
        {!needsGuide && (
          <button
            onClick={() => handleStudy('all')}
            className="w-full bg-transparent border border-gold-400/10 text-parchment-500
                       font-mono text-[11px] tracking-widest uppercase py-3 rounded-xl
                       hover:border-gold-400/25 hover:text-parchment-400 transition-colors duration-200"
          >
            Practice all {deck.cards.length} cards
          </button>
        )}
        {isFoundation && !needsGuide && (
          <button
            onClick={() => navigate('/primer-guide')}
            className="w-full bg-transparent text-parchment-500/40
                       font-mono text-[10px] tracking-widest uppercase py-2
                       hover:text-parchment-400 transition-colors duration-200"
          >
            Replay study guide
          </button>
        )}
      </div>

      {/* ── Stroke Group Study (radicals only) ── */}
      {isRadicals && !needsGuide && (
        <>
          <div className="gold-divider mb-4 animate-fade-up delay-400">
            <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
              Study by stroke count
            </span>
          </div>

          <div className="space-y-2 mb-8">
            {strokeGroups.map((g, i) => {
              const gpct = g.cards.length > 0 ? Math.round((g.learned / g.cards.length) * 100) : 0
              const complete = g.learned === g.cards.length

              return (
                <button
                  key={g.strokes}
                  onClick={() => handleStudyGroup(g.strokes)}
                  className="w-full text-left bg-ink-800 border border-gold-400/8 rounded-xl
                             px-4 py-3 hover:border-gold-400/25 hover:bg-ink-700/40
                             transition-all duration-200 animate-fade-up group"
                  style={{ animationDelay: `${0.4 + i * 0.03}s`, opacity: 0 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {/* Stroke count badge */}
                      <div className="w-9 h-9 rounded-lg bg-ink-700 border border-gold-400/12
                                      flex items-center justify-center shrink-0">
                        <span className="font-display italic text-lg text-gold-400/70 leading-none">
                          {g.strokes}
                        </span>
                      </div>
                      <div>
                        <p className="font-display italic text-sm text-parchment-200 leading-tight">
                          {g.strokes} stroke{g.strokes !== 1 ? 's' : ''}
                        </p>
                        <p className="font-mono text-[9px] text-parchment-500/50">
                          {g.cards.length} radical{g.cards.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mini kanji preview */}
                      <div className="flex gap-0.5">
                        {g.cards.slice(0, 5).map(c => (
                          <span key={c.id} className="font-kanji text-[11px] text-parchment-500/30">
                            {c.kanji}
                          </span>
                        ))}
                        {g.cards.length > 5 && (
                          <span className="font-mono text-[8px] text-parchment-500/20">
                            +{g.cards.length - 5}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      {complete ? (
                        <span className="font-mono text-[9px] text-gold-400/60 tracking-widest">✓</span>
                      ) : (
                        <span className="font-mono text-[9px] text-parchment-500/30 tabular-nums">
                          {g.learned}/{g.cards.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tiny progress bar */}
                  <div className="h-[2px] bg-ink-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold-400/50 rounded-full transition-all duration-500"
                      style={{ width: `${gpct}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Gold divider */}
      <div className="gold-divider mb-4 animate-fade-up delay-400">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
          All cards
        </span>
      </div>

      {/* Card list */}
      <div className="space-y-2">
        {deck.cards.map((card, i) => {
          const p = getCardProgress(card.id)
          const cardNew      = !p
          const cardLearning = p && !p.graduated
          const cardLearned  = p?.graduated === true
          const cardDue      = p && new Date(p.next) <= new Date()
          return (
            <div
              key={card.id}
              className="flex items-center justify-between bg-ink-800 rounded-lg px-4 py-3
                         border border-gold-400/8 animate-fade-up"
              style={{ animationDelay: `${(i + 5) * 0.04}s`, opacity: 0 }}
            >
              <div className="flex items-center gap-3">
                <span className="font-kanji text-xl text-parchment-200">{card.kanji}</span>
                <div>
                  <p className="font-mono text-[11px] text-parchment-400">{card.romaji}</p>
                  <p className="font-mono text-[10px] text-parchment-500">{card.meaning}</p>
                </div>
              </div>
              <span className={`font-mono text-[9px] tracking-widest uppercase ${
                cardNew        ? 'text-parchment-500/40' :
                cardLearning   ? 'text-amber-500/70' :
                cardDue        ? 'text-gold-400' :
                                 'text-parchment-500/40'
              }`}>
                {cardNew        ? 'new' :
                 cardLearning   ? 'learning' :
                 cardDue        ? 'due' :
                                  `×${p.reps}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
