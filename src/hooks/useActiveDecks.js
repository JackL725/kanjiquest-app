// ─── Active Deck Management ────────────────────────────────────────────
// Controls which decks count toward "due today" on the Library screen,
// the review forecast, and the due banner. Disabled decks are still
// accessible — you can tap into them and study — they just don't add
// to your daily review workload.
//
// Default: all owned decks are active.

const KEY = 'kq-active-decks'

export function readActiveDecks() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function writeActiveDecks(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)) } catch {}
}

/**
 * Returns true if a deck is active (included in daily reviews).
 * Decks default to active if they have no entry in the map.
 */
export function isDeckActive(deckId) {
  const map = readActiveDecks()
  return map[deckId] !== false  // default = active
}

/**
 * Toggle a single deck's active state. Returns the new state.
 */
export function toggleDeckActive(deckId) {
  const map = readActiveDecks()
  const newState = map[deckId] === false  // was disabled → enable
  if (newState) {
    delete map[deckId]  // active = default, remove entry
  } else {
    map[deckId] = false
  }
  writeActiveDecks(map)
  return newState
}

/**
 * Filter a deck list to only active decks.
 */
export function filterActiveDecks(decks) {
  const map = readActiveDecks()
  return decks.filter(d => map[d.id] !== false)
}
