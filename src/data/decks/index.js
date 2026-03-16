import p5r from './p5r'

// All available decks in the store
export const ALL_DECKS = [p5r]

// Decks the current user owns (will come from Supabase later)
export const OWNED_DECK_IDS = ['p5r']

export function getDeckById(id) {
  return ALL_DECKS.find(d => d.id === id) ?? null
}

export function getOwnedDecks() {
  return ALL_DECKS.filter(d => OWNED_DECK_IDS.includes(d.id))
}
