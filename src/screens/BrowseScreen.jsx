import { useNavigate } from 'react-router-dom'
import { ALL_DECKS, OWNED_DECK_IDS } from '@/data/decks'

export default function BrowseScreen() {
  const navigate = useNavigate()

  return (
    <div className="px-5 py-6">
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display italic text-2xl text-parchment-100">Browse decks</h1>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
          Study before you play
        </p>
      </div>

      {/* Free section */}
      <div className="gold-divider mb-4 animate-fade-up delay-100">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">Free</span>
      </div>
      <div className="mb-6 space-y-3 animate-fade-up delay-200">
        <DeckTile
          title="Kanji Primer"
          sub="Radicals & Primitives · 214 cards"
          kanji="基"
          price={null}
          owned
          onPress={() => {}}
        />
      </div>

      {/* JRPG section */}
      <div className="gold-divider mb-4 animate-fade-up delay-200">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">JRPG</span>
      </div>
      <div className="space-y-3 animate-fade-up delay-300">
        {ALL_DECKS.map(deck => (
          <DeckTile
            key={deck.id}
            title={deck.title}
            sub={`${deck.developer} · ${deck.cards.length} cards`}
            kanji={deck.coverKanji}
            price={deck.price}
            owned={OWNED_DECK_IDS.includes(deck.id)}
            onPress={() => navigate(`/deck/${deck.id}`)}
          />
        ))}
        {/* Coming soon */}
        {['Persona 4 Golden', 'Final Fantasy XVI', 'Dragon Quest XI', 'Nier: Automata'].map((title, i) => (
          <DeckTile
            key={title}
            title={title}
            sub="Coming soon"
            kanji="？"
            price={2.99}
            owned={false}
            comingSoon
            onPress={() => {}}
          />
        ))}
      </div>
    </div>
  )
}

function DeckTile({ title, sub, kanji, price, owned, comingSoon, onPress }) {
  return (
    <button
      onClick={onPress}
      disabled={comingSoon}
      className={`w-full text-left bg-ink-800 border rounded-xl p-4 flex items-center gap-3
                  transition-colors duration-200
                  ${comingSoon
                    ? 'border-gold-400/5 opacity-40 cursor-not-allowed'
                    : 'border-gold-400/10 hover:border-gold-400/25 cursor-pointer'}`}
    >
      <div className="w-12 h-12 rounded-lg bg-ink-700 border border-gold-400/10
                      flex items-center justify-center font-kanji text-2xl text-gold-400/40 shrink-0">
        {kanji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display italic text-parchment-200 text-base truncate">{title}</p>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase">{sub}</p>
      </div>
      <div className="shrink-0">
        {owned ? (
          <span className="font-mono text-[9px] text-gold-400 tracking-widest uppercase
                           border border-gold-400/30 rounded px-2 py-0.5">
            Owned
          </span>
        ) : comingSoon ? (
          <span className="font-mono text-[9px] text-parchment-500/50 tracking-widest uppercase">
            Soon
          </span>
        ) : (
          <span className="font-display italic text-gold-400 text-base">${price}</span>
        )}
      </div>
    </button>
  )
}
