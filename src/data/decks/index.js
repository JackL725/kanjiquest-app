import radicals from './radicals'
import primer   from './primer'
import p5r      from './p5r'

// Radicals first (building blocks), then Kanji 101 (single characters), then game decks
export const ALL_DECKS = [radicals, primer, p5r]

// Free decks owned by everyone; P5R also owned for dev/testing (will come from Supabase later)
export const OWNED_DECK_IDS = ['radicals', 'primer', 'p5r']

export function getDeckById(id) {
  return ALL_DECKS.find(d => d.id === id) ?? null
}

export function getOwnedDecks() {
  return ALL_DECKS.filter(d => OWNED_DECK_IDS.includes(d.id))
}
