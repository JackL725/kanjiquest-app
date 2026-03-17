import radicals from './radicals'
import primer   from './primer'
import p5r      from './p5r'
import zeldaAlttp from './zelda-alttp'
import yotsuba from './yotsuba'
import chronoTrigger from './chrono-trigger'
import ninoKuni from './ni-no-kuni'

// Radicals first (building blocks), then Kanji 101 (single characters), then content decks
export const ALL_DECKS = [radicals, primer, p5r, zeldaAlttp, chronoTrigger, ninoKuni, yotsuba]

// Free decks owned by everyone; content decks also owned for dev/testing (will come from Supabase later)
export const OWNED_DECK_IDS = ['radicals', 'primer', 'p5r', 'zelda-alttp', 'chrono-trigger', 'ni-no-kuni', 'yotsuba']

export function getDeckById(id) {
  return ALL_DECKS.find(d => d.id === id) ?? null
}

export function getOwnedDecks() {
  return ALL_DECKS.filter(d => OWNED_DECK_IDS.includes(d.id))
}
