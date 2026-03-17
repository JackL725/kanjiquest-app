import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'
import { isPrimerGuideComplete } from '@/screens/PrimerGuideScreen'
import { STAGES, getMasteryStage } from '@/hooks/useMastery'

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
  const { getLearnedCount, getDueCount, getNewCount, getCardProgress, addBonusCards, getStudyQueue } = useSRS(id)

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
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get today's new card allocation so we know which unseen cards
    // are queued for study today
    const { newBatch } = getStudyQueue(deck.cards)
    const queuedNewIds = new Set(newBatch.map(c => c.id))

    return deck.cards.map(card => {
      const p = getCardProgress(card.id)
      const isDue = p && new Date(p.due) <= now
      const isUnseen = !p
      const isQueuedNew = isUnseen && queuedNewIds.has(card.id)

      // Unseen cards that are in today's study queue show as Kindled
      const mastery = isQueuedNew
        ? { stage: STAGES[1], stageIndex: 1, progress: 0, stumbled: false }
        : getMasteryStage(p)

      return {
        card,
        p,
        mastery,
        isNew:      p && p.firstStudied && new Date(p.firstStudied) >= oneDayAgo,
        isLearning: p?.state >= 1 && isDue,
        isDue:      !!isDue || isQueuedNew,
        isUnseen:   isUnseen && !isQueuedNew,
      }
    })
  }, [deck.cards, getCardProgress])

  // ── Filter counts ───────────────────────────────────────────────────
  const filterCounts = useMemo(() => ({
    all:      classifiedCards.length,
    new:      classifiedCards.filter(c => c.isNew).length,
    learning: classifiedCards.filter(c => !c.isUnseen).length,
    due:      classifiedCards.filter(c => c.isDue).length,
    mastered: classifiedCards.filter(c => c.mastery.stageIndex >= 4).length,
  }), [classifiedCards])

  // ── Filtered + searched cards ───────────────────────────────────────
  const visibleCards = useMemo(() => {
    let result = classifiedCards

    if (filter === 'new')      result = result.filter(c => c.isNew)
    if (filter === 'learning') result = result.filter(c => !c.isUnseen)
    if (filter === 'due')      result = result.filter(c => c.isDue)
    if (filter === 'mastered') result = result.filter(c => c.mastery.stageIndex >= 4)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(({ card }) =>
        card.kanji.includes(q) ||
        card.romaji.toLowerCase().includes(q) ||
        card.meaning.toLowerCase().includes(q) ||
        (card.reading && card.reading.includes(q))
      )
    }

    // Sort by mastery stage: Kindled(1) → Familiar(2) → Tempered(3) → Mastered(4) → Engraved(5) → Unseen(0) last
    result = [...result].sort((a, b) => {
      const sa = a.mastery.stageIndex || 6  // Unseen (0) → 6, sorts to bottom
      const sb = b.mastery.stageIndex || 6
      return sa - sb
    })

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
        {isFoundation && !needsGuide && (
          <button onClick={() => navigate('/primer-guide')}
            className="w-full bg-transparent text-parchment-500/40
                       font-mono text-[10px] tracking-widest uppercase py-2
                       hover:text-parchment-400 transition-colors duration-200">
            Replay study guide
          </button>
        )}

        {/* Review games */}
        {!needsGuide && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => navigate(`/combo-blitz/${id}`)}
              className="bg-ink-800 border border-blue-400/20 rounded-xl py-4 px-3
                         flex flex-col items-center gap-2
                         hover:border-blue-400/40 hover:bg-blue-400/5
                         transition-colors duration-200 touch-manipulation group">
              <span className="font-kanji text-2xl text-blue-400/60 group-hover:text-blue-400/80
                               transition-colors">試</span>
              <span className="font-display italic text-sm text-parchment-200">Memory Test</span>
              <span className="font-mono text-[8px] text-parchment-500/40 tracking-widest uppercase">
                Voice recall
              </span>
            </button>
            <button
              onClick={() => navigate(`/memory-test/${id}`)}
              className="bg-ink-800 border border-amber-500/20 rounded-xl py-4 px-3
                         flex flex-col items-center gap-2
                         hover:border-amber-500/40 hover:bg-amber-500/5
                         transition-colors duration-200 touch-manipulation group">
              <span className="font-kanji text-2xl text-amber-500/60 group-hover:text-amber-500/80
                               transition-colors">連</span>
              <span className="font-display italic text-sm text-parchment-200">Combo Blitz</span>
              <span className="font-mono text-[8px] text-parchment-500/40 tracking-widest uppercase">
                Speed match
              </span>
            </button>
          </div>
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

      {/* Mastery guide (collapsible) */}
      <MasteryGuide />

      {/* Card list */}
      {visibleCards.length === 0 ? (
        <div className="py-10 text-center">
          <p className="font-mono text-[11px] text-parchment-500/40 tracking-widest uppercase">
            {search ? 'No cards match your search' : 'No cards in this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleCards.map(({ card, p, mastery, isDue, isUnseen }, i) => {
            // Show a stage header when the stage changes
            const prevStage = i > 0 ? visibleCards[i - 1].mastery.stageIndex : null
            const curStage = mastery.stageIndex
            const showHeader = prevStage !== curStage

            return (
              <div key={card.id}>
                {showHeader && (
                  <StageGroupHeader stage={mastery.stage} stageIndex={curStage}
                    count={visibleCards.filter(c => c.mastery.stageIndex === curStage).length}
                    isFirst={i === 0} />
                )}
                <div
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
              <div className="flex items-center gap-2.5">
                {card.jlpt && (
                  <span className="font-mono text-[8px] text-parchment-500/25 tracking-widest">
                    N{card.jlpt}
                  </span>
                )}
                {isDue && (
                  <span className="font-mono text-[8px] text-gold-400 tracking-widest uppercase">due</span>
                )}
                <StageMeter mastery={mastery} />
              </div>
            </div>
          </div>
        )})}
        </div>
      )}
    </div>
  )
}

// ─── Stage meter (compact, per-card-row) ──────────────────────────────────
function StageMeter({ mastery }) {
  const { stage, stageIndex, progress, stumbled } = mastery

  if (stageIndex === 0) {
    return (
      <span className="font-mono text-[8px] text-parchment-500/20 tracking-widest uppercase">
        unseen
      </span>
    )
  }

  // Stage color classes (can't use dynamic template strings in Tailwind)
  const textColors = {
    'amber-500':       'text-amber-500',
    'blue-400':        'text-blue-400',
    'gold-400':        'text-gold-400',
    'emerald-400':     'text-emerald-400',
    'parchment-100':   'text-parchment-100',
  }
  const bgColors = {
    'bg-amber-500/60':       'bg-amber-500/60',
    'bg-blue-400/60':        'bg-blue-400/60',
    'bg-gold-400/60':        'bg-gold-400/60',
    'bg-emerald-400/60':     'bg-emerald-400/60',
    'bg-parchment-100/50':   'bg-parchment-100/50',
  }

  const tc = textColors[stage.color] || 'text-parchment-500'
  const bc = bgColors[stage.barColor] || 'bg-parchment-500/30'

  return (
    <div className="flex items-center gap-2 min-w-[90px] justify-end">
      {stumbled && (
        <span className="font-mono text-[7px] text-ember/50 tracking-widest uppercase">⚠</span>
      )}
      <span className={`font-mono text-[8px] tracking-widest uppercase ${stumbled ? 'text-ember/50' : tc}`}>
        {stage.label}
      </span>
      {/* Progress bar within stage */}
      <div className="w-[32px] h-[4px] bg-parchment-500/8 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${stumbled ? 'bg-ember/30' : bc}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ─── Stage guide (collapsible, educational) ───────────────────────────────
function MasteryGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 group w-full">
        {/* Mini stage preview */}
        <div className="flex gap-[2px]">
          {STAGES.slice(1).map((s, i) => (
            <div key={i} className={`w-[8px] h-[3px] rounded-full ${s.barColor}`} />
          ))}
        </div>
        <span className="font-mono text-[9px] text-parchment-500/40 tracking-widest uppercase
                         group-hover:text-parchment-400 transition-colors">
          How mastery works
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          className={`text-parchment-500/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="mt-3 bg-ink-800 border border-gold-400/10 rounded-xl p-4 space-y-1 animate-fade-up">

          {/* Intro */}
          <p className="font-body text-[12px] text-parchment-400 leading-relaxed mb-3">
            Every card progresses through six stages as the SRS confirms your memory is getting
            stronger. Each stage maps to a real milestone in how your brain consolidates knowledge.
          </p>

          {/* Journey visualization */}
          <div className="flex items-center gap-[3px] mb-4 px-1">
            {STAGES.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full h-[4px] rounded-full ${i === 0 ? 'bg-parchment-500/8' : s.barColor}`} />
                <span className="font-kanji text-[11px] leading-none"
                  style={{ opacity: i === 0 ? 0.15 : 0.5 }}>
                  {s.kanji}
                </span>
              </div>
            ))}
          </div>

          {/* Stage details */}
          {STAGES.slice(1).map((s, i) => (
            <StageRow key={s.id} stage={s} index={i} />
          ))}

          {/* Queued new cards rule */}
          <div className="pt-2 mt-2 border-t border-gold-400/8">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-ink-700 border border-amber-500/15
                              flex items-center justify-center shrink-0 mt-0.5">
                <span className="font-kanji text-xs text-amber-500/40">火</span>
              </div>
              <div>
                <p className="font-mono text-[10px] text-parchment-200 tracking-wide">New cards in today's queue</p>
                <p className="font-mono text-[10px] text-parchment-500/50 mt-0.5 leading-snug">
                  Unseen cards that are queued for today's study session
                  show as Kindled — they're about to enter your memory.
                </p>
              </div>
            </div>
          </div>

          {/* Stumble rule */}
          <div className="pt-2 mt-2 border-t border-gold-400/8">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-ink-700 border border-ember/15
                              flex items-center justify-center shrink-0 mt-0.5">
                <span className="font-kanji text-xs text-ember/40">躓</span>
              </div>
              <div>
                <p className="font-mono text-[10px] text-parchment-200 tracking-wide">Stumble protection</p>
                <p className="font-mono text-[10px] text-parchment-500/50 mt-0.5 leading-snug">
                  Rating Again or Hard pauses your progress for that card today.
                  Answer Good or Easy to clear the pause and resume advancing.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

function StageRow({ stage, index }) {
  // Requirements text
  const reqs = [
    'Study the card for the first time',
    'Rate Good or Easy to graduate the card',
    '7+ day interval and 2+ consecutive recalls',
    '21+ day interval and 4+ consecutive recalls',
    '90+ day interval and 7+ consecutive recalls',
  ]

  const textColors = {
    'amber-500':     'text-amber-500/70',
    'blue-400':      'text-blue-400/70',
    'gold-400':      'text-gold-400/70',
    'emerald-400':   'text-emerald-400/70',
    'parchment-100': 'text-parchment-100/70',
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`w-7 h-7 rounded-lg bg-ink-700 border ${stage.borderColor}
                        flex items-center justify-center shrink-0 mt-0.5`}>
        <span className={`font-kanji text-xs ${textColors[stage.color] || 'text-parchment-500/50'}`}>
          {stage.kanji}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] tracking-wide ${textColors[stage.color] || 'text-parchment-400'}`}>
            {stage.label}
          </span>
          <span className="font-mono text-[8px] text-parchment-500/30">—</span>
          <span className="font-mono text-[8px] text-parchment-500/30 tracking-wide">
            {stage.desc}
          </span>
        </div>
        <p className="font-mono text-[9px] text-parchment-500/40 mt-0.5 leading-snug">
          {reqs[index]}
        </p>
        <p className="font-body text-[10px] text-parchment-500/30 mt-1 leading-snug italic">
          {stage.science}
        </p>
      </div>
    </div>
  )
}
// ─── Stage group header ───────────────────────────────────────────────────
function StageGroupHeader({ stage, stageIndex, count, isFirst }) {
  const textColors = {
    'amber-500':     'text-amber-500/60',
    'blue-400':      'text-blue-400/60',
    'gold-400':      'text-gold-400/60',
    'emerald-400':   'text-emerald-400/60',
    'parchment-100': 'text-parchment-100/50',
    'parchment-500/25': 'text-parchment-500/30',
  }
  const tc = textColors[stage.color] || 'text-parchment-500/40'
  const isUnseen = stageIndex === 0

  return (
    <div className={`flex items-center gap-2.5 ${isFirst ? 'mb-2' : 'mt-4 mb-2'}`}>
      <span className={`font-kanji text-sm ${tc}`}>{stage.kanji}</span>
      <span className={`font-mono text-[9px] tracking-widest uppercase ${tc}`}>
        {stage.label}
      </span>
      <div className="flex-1 h-px bg-gold-400/6" />
      <span className="font-mono text-[9px] text-parchment-500/20 tabular-nums">
        {count}
      </span>
    </div>
  )
}
