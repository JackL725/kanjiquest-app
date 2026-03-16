import { useParams, useNavigate } from 'react-router-dom'
import { getDeckById } from '@/data/decks'
import { useSRS } from '@/hooks/useSRS'

export default function DeckScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const deck = getDeckById(id)
  const { getLearnedCount, getDueCount, getCardProgress } = useSRS(id)

  if (!deck) return (
    <div className="px-5 py-6 text-parchment-500 font-display italic text-lg">
      Deck not found.
    </div>
  )

  const learned = getLearnedCount(deck.cards)
  const due     = getDueCount(deck.cards)
  const pct     = Math.round((learned / deck.cards.length) * 100)

  return (
    <div className="px-5 py-6">

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
              {deck.genre} · {deck.developer} · {deck.platforms.join(' / ')}
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
          { num: deck.cards.length, lbl: 'Total cards' },
          { num: learned,           lbl: 'Learned' },
          { num: due,               lbl: 'Due today' },
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
          onClick={() => navigate(`/study/${id}`)}
          className="w-full bg-transparent border border-gold-400/40 text-gold-400
                     font-display italic text-lg py-3 rounded-xl
                     hover:bg-gold-400/10 transition-colors duration-200"
        >
          {due > 0 ? `Study ${due} due card${due !== 1 ? 's' : ''}` : 'Review all cards'}
        </button>
        <button
          onClick={() => navigate(`/study/${id}?mode=all`)}
          className="w-full bg-transparent border border-gold-400/10 text-parchment-500
                     font-mono text-[11px] tracking-widest uppercase py-3 rounded-xl
                     hover:border-gold-400/25 hover:text-parchment-400 transition-colors duration-200"
        >
          Practice all {deck.cards.length} cards
        </button>
      </div>

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
          const cardDue = !p || p.reps === 0 || new Date(p.next) <= new Date()
          const cardLearned = (p?.reps ?? 0) > 0
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
                !cardLearned ? 'text-parchment-500/40' :
                cardDue      ? 'text-gold-400' :
                               'text-parchment-500/40'
              }`}>
                {!cardLearned ? 'new' : cardDue ? 'due' : `×${p.reps}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
