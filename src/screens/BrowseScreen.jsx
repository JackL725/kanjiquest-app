import { useNavigate } from 'react-router-dom'
import { ALL_DECKS, OWNED_DECK_IDS } from '@/data/decks'

// ─── Coming-soon deck catalogue ───────────────────────────────────────────
const COMING_SOON = [
  {
    title:      'Persona 4 Golden',
    developer:  'Atlus',
    kanji:      '真',
    kanjiLabel: 'truth',
    eta:        'Q3 2025',
  },
  {
    title:      'Final Fantasy XVI',
    developer:  'Square Enix',
    kanji:      '炎',
    kanjiLabel: 'flame',
    eta:        'Q4 2025',
  },
  {
    title:      'Dragon Quest XI',
    developer:  'Square Enix',
    kanji:      '勇',
    kanjiLabel: 'courage',
    eta:        '2026',
  },
  {
    title:      'Nier: Automata',
    developer:  'Square Enix',
    kanji:      '命',
    kanjiLabel: 'fate',
    eta:        '2026',
  },
]

// ─── Featured Banner ──────────────────────────────────────────────────────
function FeaturedBanner({ deck, owned, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-full text-left rounded-2xl overflow-hidden border border-gold-400/15
                 hover:border-gold-400/35 transition-all duration-300 group
                 animate-fade-up delay-100 relative"
      style={{
        background: `radial-gradient(ellipse at 80% 50%, ${deck.accentColor}33 0%, #1A1814 65%)`,
      }}
    >
      {/* Ghost kanji — large background artwork */}
      <span
        className="absolute -right-4 -top-4 font-kanji leading-none select-none
                   pointer-events-none transition-transform duration-500
                   group-hover:scale-105"
        style={{
          fontSize: '160px',
          color: `${deck.accentColor}20`,
        }}
      >
        {deck.coverKanji}
      </span>

      {/* Gradient fade over the kanji so text stays legible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, #1A1814 35%, transparent 100%)',
        }}
      />

      <div className="relative z-10 p-5">
        {/* Featured label */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: deck.accentColor }}
          />
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
            Featured deck
          </span>
        </div>

        {/* Title block */}
        <p className="font-display italic text-parchment-100 text-2xl leading-tight mb-1">
          {deck.title}
        </p>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-4">
          {deck.developer} · {deck.cards.length} cards · {deck.difficulty}
        </p>

        {/* Description — capped to 2 lines */}
        <p className="font-body text-sm text-parchment-400 leading-relaxed mb-5
                      line-clamp-2 max-w-[75%]">
          {deck.description}
        </p>

        {/* Platform pills */}
        <div className="flex items-center gap-1.5 mb-5">
          {deck.platforms.map(p => (
            <span
              key={p}
              className="font-mono text-[8px] tracking-widest uppercase
                         border border-parchment-500/20 text-parchment-500/60
                         rounded px-1.5 py-0.5"
            >
              {p}
            </span>
          ))}
        </div>

        {/* CTA row */}
        <div className="flex items-center gap-3">
          {owned ? (
            <>
              <span
                className="font-mono text-[9px] tracking-widest uppercase
                           border rounded px-2.5 py-1.5"
                style={{
                  color: deck.accentColor,
                  borderColor: `${deck.accentColor}50`,
                  background: `${deck.accentColor}12`,
                }}
              >
                Owned
              </span>
              <span
                className="font-display italic text-base
                           group-hover:translate-x-0.5 transition-transform duration-200"
                style={{ color: deck.accentColor }}
              >
                View deck →
              </span>
            </>
          ) : (
            <>
              <span
                className="font-display italic text-xl"
                style={{ color: deck.accentColor }}
              >
                ${deck.price}
              </span>
              <span
                className="font-mono text-[9px] tracking-widest uppercase
                           border rounded px-3 py-1.5 transition-colors duration-200"
                style={{
                  color: deck.accentColor,
                  borderColor: `${deck.accentColor}50`,
                  background: `${deck.accentColor}12`,
                }}
              >
                Get deck
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Artwork box ──────────────────────────────────────────────────────────
// Shared between DeckTile and the Kanji Primer tile.
function ArtworkBox({ kanji, accentColor, size = 'md' }) {
  const dims  = size === 'lg' ? 'w-16 h-16' : 'w-14 h-14'
  const ksize = size === 'lg' ? 'text-4xl'  : 'text-3xl'

  return (
    <div
      className={`${dims} rounded-xl shrink-0 flex items-center justify-center
                  border border-white/5 relative overflow-hidden`}
      style={{
        background: accentColor
          ? `radial-gradient(circle at 60% 40%, ${accentColor}30 0%, #221F1A 80%)`
          : 'radial-gradient(circle at 60% 40%, rgba(201,168,76,0.12) 0%, #221F1A 80%)',
      }}
    >
      {/* Subtle noise/grain layer */}
      <div className="absolute inset-0 opacity-[0.03] bg-paper" />
      <span
        className={`font-kanji ${ksize} leading-none relative z-10`}
        style={{ color: accentColor ? `${accentColor}CC` : 'rgba(201,168,76,0.5)' }}
      >
        {kanji}
      </span>
    </div>
  )
}

// ─── Deck Tile ────────────────────────────────────────────────────────────
function DeckTile({ deck, owned, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-full text-left bg-ink-800 border border-gold-400/10 rounded-xl
                 p-4 flex items-center gap-4 hover:border-gold-400/30 hover:bg-ink-700/40
                 transition-all duration-200 group"
    >
      <ArtworkBox kanji={deck.coverKanji} accentColor={deck.accentColor} size="lg" />

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="font-display italic text-parchment-100 text-base leading-tight truncate">
          {deck.title}
        </p>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">
          {deck.developer} · {deck.cards.length} cards
        </p>

        {/* Platform pills */}
        <div className="flex items-center gap-1 mt-2">
          {deck.platforms.slice(0, 3).map(p => (
            <span
              key={p}
              className="font-mono text-[7px] tracking-widest uppercase
                         border border-parchment-500/15 text-parchment-500/50
                         rounded px-1 py-0.5"
            >
              {p}
            </span>
          ))}
          {deck.platforms.length > 3 && (
            <span className="font-mono text-[7px] text-parchment-500/30">
              +{deck.platforms.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Right: price / owned */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        {owned ? (
          <span
            className="font-mono text-[9px] tracking-widest uppercase
                       border border-gold-400/30 text-gold-400 rounded px-2 py-1"
          >
            Owned
          </span>
        ) : (
          <>
            <span className="font-display italic text-gold-400 text-xl leading-none">
              ${deck.price}
            </span>
            <span className="font-mono text-[8px] text-parchment-500/50 tracking-widest uppercase">
              one-time
            </span>
          </>
        )}
      </div>
    </button>
  )
}

// ─── Free Deck Tile ──────────────────────────────────────────────────────
function FreeDeckTile({ deck, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-full text-left bg-ink-800 border border-gold-400/15 rounded-xl
                 p-4 flex items-center gap-4 hover:border-gold-400/30 hover:bg-ink-700/40
                 transition-all duration-200 group"
    >
      <ArtworkBox kanji={deck.coverKanji} accentColor={deck.accentColor} size="lg" />

      <div className="flex-1 min-w-0">
        <p className="font-display italic text-parchment-100 text-base leading-tight truncate">
          {deck.title}
        </p>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">
          {deck.cards.length} cards · {deck.subtitle}
        </p>
        <p className="font-body text-[11px] text-parchment-500/70 mt-1.5 leading-snug line-clamp-2">
          {deck.description}
        </p>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        <span className="font-mono text-[9px] tracking-widest uppercase
                         border border-gold-400/30 text-gold-400 rounded px-2 py-1">
          Free
        </span>
        <span className="font-mono text-[8px] text-parchment-500/40 tracking-widest uppercase">
          included
        </span>
      </div>
    </button>
  )
}

// ─── Coming Soon Tile ─────────────────────────────────────────────────────
function ComingSoonTile({ title, developer, kanji, kanjiLabel, eta, index }) {
  return (
    <div
      className="w-full bg-ink-800/50 border border-dashed border-parchment-500/10
                 rounded-xl p-4 flex items-center gap-4 animate-fade-up"
      style={{ animationDelay: `${0.3 + index * 0.07}s` }}
    >
      {/* Artwork — locked treatment */}
      <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center
                      border border-parchment-500/8 bg-ink-700/40 relative overflow-hidden">
        <span className="font-kanji text-3xl leading-none text-parchment-500/15">
          {kanji}
        </span>
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="text-parchment-500/20"
          >
            <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="font-display italic text-parchment-400/70 text-base leading-tight truncate">
          {title}
        </p>
        <p className="font-mono text-[10px] text-parchment-500/40 tracking-widest uppercase mt-0.5">
          {developer}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="font-kanji text-[11px] text-parchment-500/25">{kanji}</span>
          <span className="font-mono text-[8px] text-parchment-500/25 tracking-widest uppercase">
            {kanjiLabel}
          </span>
        </div>
      </div>

      {/* ETA */}
      <div className="shrink-0 text-right">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500/30">
          {eta}
        </span>
      </div>
    </div>
  )
}

// ─── Section Divider ──────────────────────────────────────────────────────
function SectionDivider({ label, delay = 0 }) {
  return (
    <div
      className="gold-divider animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
        {label}
      </span>
    </div>
  )
}

// ─── BrowseScreen ─────────────────────────────────────────────────────────
export default function BrowseScreen() {
  const navigate  = useNavigate()

  const freeDecks  = ALL_DECKS.filter(d => d.free)
  const gameDecks  = ALL_DECKS.filter(d => !d.free && d.genre !== 'Manga')
  const mangaDecks = ALL_DECKS.filter(d => !d.free && d.genre === 'Manga')
  const featured   = gameDecks[0]  // P5R is the hero for now

  return (
    <div className="px-5 py-6 pb-10 space-y-5">

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-display italic text-2xl text-parchment-100">Browse decks</h1>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
          Study before you play
        </p>
      </div>

      {/* ── Featured Deck ── */}
      {featured && (
        <FeaturedBanner
          deck={featured}
          owned={OWNED_DECK_IDS.includes(featured.id)}
          onPress={() => navigate(`/deck/${featured.id}`)}
        />
      )}

      {/* ── Free ── */}
      <SectionDivider label="Free" delay={0.15} />

      <div className="space-y-3">
        {freeDecks.map((deck, i) => (
          <div key={deck.id} className="animate-fade-up" style={{ animationDelay: `${0.17 + i * 0.06}s` }}>
            <FreeDeckTile deck={deck} onPress={() => navigate(`/deck/${deck.id}`)} />
          </div>
        ))}
      </div>

      {/* ── Games ── */}
      {gameDecks.length > 0 && (
        <>
          <SectionDivider label="Games" delay={0.2} />
          <div className="space-y-3">
            {gameDecks.map((deck, i) => (
              <div key={deck.id} className="animate-fade-up" style={{ animationDelay: `${0.22 + i * 0.07}s` }}>
                <DeckTile deck={deck} owned={OWNED_DECK_IDS.includes(deck.id)} onPress={() => navigate(`/deck/${deck.id}`)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Manga ── */}
      {mangaDecks.length > 0 && (
        <>
          <SectionDivider label="Manga" delay={0.25} />
          <div className="space-y-3">
            {mangaDecks.map((deck, i) => (
              <div key={deck.id} className="animate-fade-up" style={{ animationDelay: `${0.27 + i * 0.07}s` }}>
                <DeckTile deck={deck} owned={OWNED_DECK_IDS.includes(deck.id)} onPress={() => navigate(`/deck/${deck.id}`)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Coming Soon ── */}
      <SectionDivider label="Coming soon" delay={0.28} />

      <div className="space-y-2.5">
        {COMING_SOON.map((entry, i) => (
          <ComingSoonTile key={entry.title} {...entry} index={i} />
        ))}
      </div>

      {/* Footer note */}
      <p className="font-mono text-[9px] text-parchment-500/30 tracking-widest uppercase
                    text-center pt-2 animate-fade-up"
         style={{ animationDelay: '0.6s' }}
      >
        New decks added regularly · All Access $4.99/mo
      </p>
    </div>
  )
}
