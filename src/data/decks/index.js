import primer from './primer'
import p5r    from './p5r'

// Primer is always first — it's the default owned deck
export const ALL_DECKS = [primer, p5r]

// Primer is free and owned by everyone; P5R is also owned for now (dev mode)
export const OWNED_DECK_IDS = ['primer', 'p5r']

export function getDeckById(id) {
  return ALL_DECKS.find(d => d.id === id) ?? null
}

export function getOwnedDecks() {
  return ALL_DECKS.filter(d => OWNED_DECK_IDS.includes(d.id))
}
