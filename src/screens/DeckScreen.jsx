import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'
import { isPrimerGuideComplete } from '@/screens/PrimerGuideScreen'

const BONUS_OPTIONS = [5, 10, 15, 20]

const FILTERS = [
  { key: 'all',      label: 'All'      },
  { key: 'new',      label: 'New'      },
  { key: 'learning', label: 'Learning' },
  { key: 'due',      label: 'Due'      },
  { key: 'mastered', label: 'Mastered' },
]

export default function DeckScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const deck = getDeckById(id)
  const { getLearnedCount, getDueCount, getNewCount, getCardProgress, addBonusCards } = useSRS(id)

  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')

  const isFoundation = id === 'primer' || id === 'radicals'
  const needsGuide = isFoundation && !isPrimerGuideComplete()

  function handleStudy(mode) {
    if (needsGuide) navigate('/primer-guide')
    else if (mode === 'all') navigate(`/study/${id}?mode=all`)
    else navigate(`/study/${id}`)
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
  const caughtUp = !needsGuide && due === 0
  const hasMoreNew = newCount > 0

  // ── Card classification ─────────────────────────────────────────────
  const classifiedCards = useMemo(() => {
    return deck.cards.map(card => {
      const p = getCardProgress(card.id)
      const isNew      = !p
      const isLearning = p && !p.graduated
      const isMastered = p?.graduated === true
      const isDue      = p && new Date(p.next) <= new Date()
      return { card, p, isNew, isLearning, isMastered, isDue }
    })
  }, [deck.cards, getCardProgress])

  // ── Filter counts ───────────────────────────────────────────────────
  const filterCounts = useMemo(() => ({
    all:      classifiedCards.length,
    new:      classifiedCards.filter(c => c.isNew).length,
    learning: classifiedCards.filter(c => c.isLearning).length,
    due:      classifiedCards.filter(c => c.isDue).length,
    mastered: classifiedCards.filter(c => c.isMastered && !c.isDue).length,
  }), [classifiedCards])

  // ── Filtered + searched cards ───────────────────────────────────────
  const visibleCards = useMemo(() => {
    let result = classifiedCards

    // Apply filter
    if (filter === 'new')      result = result.filter(c => c.isNew)
    if (filter === 'learning') result = result.filter(c => c.isLearning)
    if (filter === 'due')      result = result.filter(c => c.isDue)
    if (filter === 'mastered') result = result.filter(c => c.isMastered && !c.isDue)

    // Apply search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(({ card }) =>
        card.kanji.includes(q) ||
        card.romaji.toLowerCase().includes(q) ||
        card.meaning.toLowerCase().includes(q) ||
        (card.reading && card.reading.includes(q))
      )
    }

    return result
  }, [classifiedCards, filter, search])

  function handleAddMore(count) {
    addBonusCards(count)
    setShowPicker(false)
  }

  return (
    <div className="px-5 py-6 pb-28">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="font-mono text-[10px] tracking-widest uppercase text-parchment-500
                   hover:text-gold-400 transition-colors mb-6 flex items-center gap-2">
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
          <span className="font-kanji text-5xl text-gold-400/15 leading-none">{deck.coverKanji}</span>
        </div>
        <p className="font-display text-parchment-400 text-sm mt-3 leading-relaxed">{deck.description}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up delay-100">
        {[
          { num: learned,           lbl: 'Learned'  },
          { num: due,               lbl: 'Due today' },
          { num: deck.cards.length, lbl: 'Total'    },
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
          <div className="h-full bg-gold-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Study buttons */}
      <div className="space-y-3 mb-8 animate-fade-up delay-300">
        <button onClick={() => handleStudy('normal')}
          className="w-full bg-transparent border border-gold-400/40 text-gold-400
                     font-display italic text-lg py-3 rounded-xl
                     hover:bg-gold-400/10 transition-colors duration-200">
          {needsGuide ? 'Start learning →' : due > 0 ? `Study ${due} card${due !== 1 ? 's' : ''} today` : 'All caught up'}
        </button>
        {!needsGuide && (
          <button onClick={() => handleStudy('all')}
            className="w-full bg-transparent border border-gold-400/10 text-parchment-500
                       font-mono text-[11px] tracking-widest uppercase py-3 rounded-xl
                       hover:border-gold-400/25 hover:text-parchment-400 transition-colors duration-200">
            Practice all {deck.cards.length} cards
          </button>
        )}
        {isFoundation && !needsGuide && (
          <button onClick={() => navigate('/primer-guide')}
            className="w-full bg-transparent text-parchment-500/40
                       font-mono text-[10px] tracking-widest uppercase py-2
                       hover:text-parchment-400 transition-colors duration-200">
            Replay study guide
          </button>
        )}
      </div>

      {/* Add more cards */}
      {caughtUp && hasMoreNew && !showPicker && (
        <div className="mb-8 animate-fade-up delay-300">
          <button onClick={() => setShowPicker(true)}
            className="w-full border border-dashed border-gold-400/20 text-parchment-500
                       font-mono text-[11px] tracking-widest uppercase py-3 rounded-xl
                       hover:border-gold-400/35 hover:text-parchment-300 transition-colors duration-200">
            + Add more cards for today
          </button>
          <p className="font-mono text-[9px] text-parchment-500/30 text-center mt-2">
            {newCount.toLocaleString()} unseen card{newCount !== 1 ? 's' : ''} remaining
          </p>
        </div>
      )}

      {/* Bonus picker */}
      {showPicker && (
        <div className="mb-8 bg-ink-800 border border-gold-400/15 rounded-xl p-5 animate-fade-up">
          <p className="font-display italic text-base text-parchment-200 mb-1">How many extra cards?</p>
          <p className="font-mono text-[10px] text-parchment-500/50 mb-4">These will be added to today's session only.</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {BONUS_OPTIONS.map(n => {
              const capped = Math.min(n, newCount)
              return (
                <button key={n} onClick={() => handleAddMore(capped)} disabled={newCount === 0}
                  className="bg-ink-700 border border-gold-400/15 rounded-lg py-3 flex flex-col items-center gap-1
                             hover:border-gold-400/40 hover:bg-ink-700/80 transition-all duration-150 touch-manipulation">
                  <span className="font-display italic text-xl text-gold-400 leading-none">{capped}</span>
                  <span className="font-mono text-[8px] text-parchment-500/40 tracking-widest">cards</span>
                </button>
              )
            })}
          </div>
          <button onClick={() => setShowPicker(false)}
            className="w-full font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase py-2 hover:text-parchment-400 transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Gold divider + search */}
      <div className="gold-divider mb-4 animate-fade-up delay-400">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
          {visibleCards.length === classifiedCards.length ? 'All cards' : `${visibleCards.length} cards`}
        </span>
      </div>

      {/* Search bar */}
      <div className="mb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-500/30" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search kanji, meaning, or reading…"
            className="w-full bg-ink-800 border border-gold-400/10 rounded-lg pl-9 pr-3 py-2.5
                       font-mono text-[11px] text-parchment-300 placeholder:text-parchment-500/25
                       outline-none focus:border-gold-400/30 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment-500/30
                         hover:text-parchment-400 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => {
          const count = filterCounts[f.key]
          const active = filter === f.key
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 rounded-lg
                          border transition-colors duration-150 touch-manipulation flex items-center gap-1.5
                          ${active
                            ? 'bg-ink-700 border-gold-400/25 text-gold-400'
                            : 'border-gold-400/8 text-parchment-500/50 hover:text-parchment-400 hover:border-gold-400/15'}`}>
              {f.label}
              <span className={`tabular-nums ${active ? 'text-gold-400/60' : 'text-parchment-500/25'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Card list */}
      {visibleCards.length === 0 ? (
        <div className="py-10 text-center">
          <p className="font-mono text-[11px] text-parchment-500/40 tracking-widest uppercase">
            {search ? 'No cards match your search' : 'No cards in this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleCards.map(({ card, p, isNew, isLearning, isDue }, i) => (
            <div key={card.id}
              className="flex items-center justify-between bg-ink-800 rounded-lg px-4 py-3
                         border border-gold-400/8 animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 20) * 0.03}s`, opacity: 0 }}>
              <div className="flex items-center gap-3">
                <span className="font-kanji text-xl text-parchment-200">{card.kanji}</span>
                <div>
                  <p className="font-mono text-[11px] text-parchment-400">{card.romaji}</p>
                  <p className="font-mono text-[10px] text-parchment-500">{card.meaning}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {card.jlpt && (
                  <span className="font-mono text-[8px] text-parchment-500/25 tracking-widest">
                    N{card.jlpt}
                  </span>
                )}
                <span className={`font-mono text-[9px] tracking-widest uppercase ${
                  isNew      ? 'text-parchment-500/40' :
                  isLearning ? 'text-amber-500/70' :
                  isDue      ? 'text-gold-400' :
                               'text-parchment-500/40'
                }`}>
                  {isNew      ? 'new' :
                   isLearning ? 'learning' :
                   isDue      ? 'due' :
                                `×${p.reps}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
