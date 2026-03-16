import { useNavigate } from 'react-router-dom'
import { getOwnedDecks } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'

function DeckCard({ deck }) {
  const navigate = useNavigate()
  const { getLearnedCount, getDueCount } = useSRS(deck.id)
  const learned = getLearnedCount(deck.cards)
  const due     = getDueCount(deck.cards)
  const pct     = Math.round((learned / deck.cards.length) * 100)

  return (
    <div
      onClick={() => navigate(`/deck/${deck.id}`)}
      className="bg-ink-800 border border-gold-400/10 rounded-xl p-4 cursor-pointer
                 hover:border-gold-400/25 transition-colors duration-200 animate-fade-up"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-display italic text-parchment-100 text-lg leading-tight">
            {deck.title}
          </p>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">
            {deck.genre} · {deck.developer}
          </p>
        </div>
        <span className="font-kanji text-3xl text-gold-400/20 leading-none">
          {deck.coverKanji}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-ink-600 rounded-full mb-2 overflow-hidden">
        <div
          className="h-full bg-gold-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-parchment-500">
          {learned} / {deck.cards.length} learned
        </span>
        {due > 0 && (
          <span className="font-mono text-[10px] text-gold-400">
            {due} due
          </span>
        )}
        {due === 0 && learned > 0 && (
          <span className="font-mono text-[10px] text-parchment-500/50">
            up to date
          </span>
        )}
      </div>
    </div>
  )
}

export default function LibraryScreen() {
  const navigate  = useNavigate()
  const decks     = getOwnedDecks()
  const today     = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // Total due across all owned decks
  const totalDue = decks.reduce((sum, deck) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { getDueCount } = useSRS(deck.id)
    return sum + getDueCount(deck.cards)
  }, 0)

  return (
    <div className="px-5 py-6 space-y-6">

      {/* Greeting */}
      <div className="animate-fade-up">
        <h1 className="font-display italic text-2xl text-parchment-100">
          Good evening, <em className="text-gold-400 not-italic">Learner</em>
        </h1>
        <p className="font-mono text-[11px] text-parchment-500 tracking-widest uppercase mt-1">
          {today}
        </p>
      </div>

      {/* Due today card */}
      {totalDue > 0 && (
        <div className="bg-ink-800 border border-gold-400/20 rounded-xl p-4
                        flex items-center justify-between animate-fade-up delay-100">
          <div>
            <p className="font-display italic text-4xl text-gold-400 leading-none">
              {totalDue}
            </p>
            <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
              cards due today
            </p>
          </div>
          <button
            onClick={() => navigate(`/study/${decks[0]?.id}`)}
            className="border border-gold-400/40 text-gold-400 font-display italic
                       text-sm px-5 py-2 rounded-lg hover:bg-gold-400/10
                       transition-colors duration-200"
          >
            Begin study
          </button>
        </div>
      )}

      {totalDue === 0 && decks.length > 0 && (
        <div className="bg-ink-800 border border-gold-400/10 rounded-xl p-4
                        text-center animate-fade-up delay-100">
          <p className="font-kanji text-3xl text-gold-400/30 mb-2">完</p>
          <p className="font-display italic text-parchment-300 text-lg">All caught up</p>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
            Come back tomorrow
          </p>
        </div>
      )}

      {/* Gold divider */}
      <div className="gold-divider animate-fade-up delay-200">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
          My library
        </span>
      </div>

      {/* Deck list */}
      <div className="space-y-3">
        {decks.map((deck, i) => (
          <div key={deck.id} style={{ animationDelay: `${(i + 3) * 0.1}s` }}>
            <DeckCard deck={deck} />
          </div>
        ))}

        {/* Add more */}
        <button
          onClick={() => navigate('/browse')}
          className="w-full border border-dashed border-gold-400/15 rounded-xl p-4
                     text-parchment-500 hover:border-gold-400/30 hover:text-parchment-400
                     transition-colors duration-200 font-mono text-[11px] tracking-widest
                     uppercase animate-fade-up delay-400"
        >
          + Browse more decks
        </button>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-3 pt-2 animate-fade-up delay-500">
        <div className="w-8 h-8 rounded-full bg-ember/10 border border-ember/20
                        flex items-center justify-center text-ember text-sm">
          ◆
        </div>
        <div>
          <p className="font-display italic text-parchment-200 text-sm">12-day streak</p>
          <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase">
            Keep it going
          </p>
        </div>
      </div>
    </div>
  )
}
