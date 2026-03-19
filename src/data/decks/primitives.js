import PRIMITIVES from '@/data/primitives/registry'

const primitivesDeck = {
  id: 'primitives',
  title: 'Kanji Primitives',
  subtitle: '327 Building Blocks',
  game: null,
  platforms: [],
  genre: 'Foundation',
  developer: 'KanjiQuest',
  difficulty: 'beginner',
  cardCount: 327,
  price: null,
  free: true,
  description:
    'The complete set of Heisig primitives — the building blocks that every kanji is made from. ' +
    'Learn these shapes and their names first, and every kanji you see becomes a combination of familiar pieces.',
  coverKanji: '部',
  accentColor: '#C9A84C',
  deckType: 'primitives',
  // Cards are generated from the primitives registry at runtime
  get cards() {
    return PRIMITIVES.map((p, i) => ({
      id: p.id,
      kanji: p.char,
      meaning: p.name,
      strokeCount: p.strokes,
      heisigPage: p.page,
      isPua: p.pua,
      frequency: i + 1,
    }))
  },
}

export default primitivesDeck