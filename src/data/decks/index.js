import primer   from './primer'
import p5r      from './p5r'
import zeldaAlttp from './zelda-alttp'
import yotsuba from './yotsuba'
import chronoTrigger from './chrono-trigger'
import ninoKuni from './ni-no-kuni'
import ff6 from './ff6'
import pokemonFr from './pokemon-fr'
import yokaiWatch1 from './yokai-watch-1'

// Kanji 101 (free foundation), then game decks
export const ALL_DECKS = [primer, p5r, zeldaAlttp, chronoTrigger, ninoKuni, ff6, pokemonFr, yotsuba, yokaiWatch1]

// Free decks owned by everyone; content decks also owned for dev/testing (will come from Supabase later)
export const OWNED_DECK_IDS = ['primer', 'p5r', 'zelda-alttp', 'chrono-trigger', 'ni-no-kuni', 'ff6', 'pokemon-fr', 'yotsuba', 'yokai-watch-1']

export function getDeckById(id) {
  return ALL_DECKS.find(d => d.id === id) ?? null
}

export function getOwnedDecks() {
  return ALL_DECKS.filter(d => OWNED_DECK_IDS.includes(d.id))
}
