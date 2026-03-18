// ─── Heisig Primitives Registry ──────────────────────────────────────────
// Master lookup for every primitive from "Remembering the Kanji".
// 228 entries: each primitive has a character (standard Unicode or PUA),
// a Heisig name, stroke count, and book page reference.
//
// PUA characters (U+E000–E0FF) are rendered by the KanjiQuest Primitives
// font (src/assets/fonts/kanjiquest-primitives.woff2). Standard characters
// render via Zen Kaku Gothic New.
//
// This file is the SINGLE SOURCE OF TRUTH for:
//   - The "Kanji Primitives" study deck
//   - Component hints in the Kanji 101 deck
//   - The Radicals reference screen

// PUA base: U+E000. Custom glyphs start here.
const PUA = (offset) => String.fromCodePoint(0xE000 + offset)

const PRIMITIVES = [
  // ── Page 1 ──
  { id: 'eye',              char: '目',       name: 'eye',              strokes: 5,  page: 20,  pua: false },
  { id: 'walking-stick',    char: '丨',       name: 'walking stick',    strokes: 1,  page: 27,  pua: false },
  { id: 'drop-of',          char: '丶',       name: 'drop of',          strokes: 1,  page: 27,  pua: false },
  { id: 'acupuncturist',    char: '専',       name: 'acupuncturist',    strokes: 10, page: 31,  pua: false },
  // ── Page 2 ──
  { id: 'divining-rod',     char: '卜',       name: 'divining rod',     strokes: 2,  page: 32,  pua: false },
  { id: 'mist',             char: '卓',       name: 'mist',             strokes: 8,  page: 34,  pua: false },
  { id: 'animal-legs',      char: '八',       name: 'animal legs',      strokes: 2,  page: 35,  pua: false },
  { id: 'human-legs',       char: '儿',       name: 'human legs',       strokes: 2,  page: 35,  pua: false },
  { id: 'wind-vane',        char: '几',       name: 'wind/weather vane', strokes: 2, page: 36,  pua: false },
  // ── Page 3 ──
  { id: 'bound-up',         char: '勹',       name: 'bound up',         strokes: 2,  page: 36,  pua: false },
  { id: 'bound-up-small',   char: PUA(10),    name: 'bound up small',   strokes: 2,  page: 36,  pua: true },
  { id: 'horns',            char: PUA(11),    name: 'horns',            strokes: 2,  page: 36,  pua: true },
  { id: 'straightened-hook', char: PUA(12),   name: 'straightened hook', strokes: 1, page: 44,  pua: true },
  // ── Page 4 ──
  { id: 'hook',             char: '乚',       name: 'hook',             strokes: 1,  page: 44,  pua: false },
  { id: 'tool',             char: PUA(14),    name: 'tool',             strokes: 3,  page: 45,  pua: true },
  { id: 'by-ones-side',     char: PUA(15),    name: 'by one\'s side',   strokes: 2,  page: 46,  pua: true },
  { id: 'saber',            char: '刂',       name: 'saber',            strokes: 2,  page: 48,  pua: false },
  { id: 'wealth',           char: '畐',       name: 'wealth',           strokes: 9,  page: 50,  pua: false },
  // ── Page 5 ──
  { id: 'mama',             char: '毋',       name: 'mama',             strokes: 4,  page: 54,  pua: false },
  { id: 'little',           char: '⺌',       name: 'little',           strokes: 3,  page: 57,  pua: false },
  { id: 'cliff',            char: '厂',       name: 'cliff',            strokes: 2,  page: 59,  pua: false },
  { id: 'river-alt-1',      char: '巛',       name: 'river alt 1',      strokes: 3,  page: 64,  pua: false },
  { id: 'river-alt-2',      char: PUA(22),    name: 'river alt 2',      strokes: 3,  page: 64,  pua: true },
  // ── Page 6 ──
  { id: 'water',            char: '氵',       name: 'water',            strokes: 3,  page: 65,  pua: false },
  { id: 'spring',           char: '泉',       name: 'spring',           strokes: 8,  page: 66,  pua: false },
  { id: 'fire-alt',         char: '灬',       name: 'fire alt',         strokes: 4,  page: 76,  pua: false },
  { id: 'hood',             char: '冂',       name: 'hood',             strokes: 2,  page: 83,  pua: false },
  { id: 'house',            char: '宀',       name: 'house',            strokes: 3,  page: 85,  pua: false },
  // ── Page 7 ──
  { id: 'pole',             char: PUA(28),    name: 'pole',             strokes: 4,  page: 88,  pua: true },
  { id: 'flower',           char: '艹',       name: 'flower',           strokes: 3,  page: 97,  pua: false },
  { id: 'graveyard',        char: '莫',       name: 'graveyard',        strokes: 10, page: 99,  pua: false },
  { id: 'turtle',           char: PUA(31),    name: 'turtle',           strokes: 3,  page: 104, pua: true },
  { id: 'pack-of-dogs',     char: '犭',       name: 'pack of dogs',     strokes: 3,  page: 105, pua: false },
  // ── Page 8 ──
  { id: 'cow',              char: '牜',       name: 'cow',              strokes: 4,  page: 107, pua: false },
  { id: 'umbrella',         char: '𠆢',       name: 'umbrella',         strokes: 2,  page: 109, pua: false },
  { id: 'meeting',          char: PUA(35),    name: 'meeting',          strokes: 3,  page: 110, pua: true },
  { id: 'road',             char: '⻌',       name: 'road',             strokes: 3,  page: 122, pua: false },
  // ── Page 9 ──
  { id: 'walking-legs',     char: '夂',       name: 'walking legs',     strokes: 3,  page: 125, pua: false },
  { id: 'convoy',           char: '俞',       name: 'convoy',           strokes: 9,  page: 125, pua: false },
  { id: 'crown',            char: '冖',       name: 'crown',            strokes: 2,  page: 128, pua: false },
  { id: 'top-hat',          char: '亠',       name: 'top hat',          strokes: 2,  page: 130, pua: false },
  { id: 'whirlwind',        char: PUA(41),    name: 'whirlwind',        strokes: 4,  page: 130, pua: true },
  // ── Page 10 ──
  { id: 'tall',             char: PUA(42),    name: 'tall',             strokes: 5,  page: 131, pua: true },
  { id: 'lidded-crock',     char: '吉',       name: 'lidded crock',     strokes: 6,  page: 133, pua: false },
  { id: 'schoolhouse',      char: PUA(44),    name: 'schoolhouse',      strokes: 5,  page: 135, pua: true },
  { id: 'brush',            char: '聿',       name: 'brush',            strokes: 6,  page: 136, pua: false },
  { id: 'brush-alt',        char: PUA(46),    name: 'brush alt',        strokes: 6,  page: 136, pua: true },
  // ── Page 11 ──
  { id: 'taskmaster',       char: '攵',       name: 'taskmaster',       strokes: 4,  page: 137, pua: false },
  { id: 'arrow',            char: '弋',       name: 'arrow',            strokes: 3,  page: 143, pua: false },
  { id: 'quiver',           char: PUA(49),    name: 'quiver',           strokes: 4,  page: 144, pua: true },
  { id: 'fiesta',           char: '戈',       name: 'fiesta',           strokes: 4,  page: 144, pua: false },
  { id: 'parade',           char: '戊',       name: 'parade',           strokes: 5,  page: 145, pua: false },
  // ── Page 12 ──
  { id: 'thanksgiving',     char: PUA(52),    name: 'thanksgiving',     strokes: 6,  page: 145, pua: true },
  { id: 'march',            char: '戌',       name: 'march',            strokes: 6,  page: 147, pua: false },
  { id: 'float',            char: PUA(54),    name: 'float',            strokes: 6,  page: 148, pua: true },
  { id: 'mending',          char: PUA(55),    name: 'mending',          strokes: 5,  page: 152, pua: true },
  { id: 'stretch',          char: PUA(56),    name: 'stretch',          strokes: 3,  page: 154, pua: true },
  // ── Page 13 ──
  { id: 'zoo',              char: PUA(57),    name: 'zoo',              strokes: 5,  page: 155, pua: true },
  { id: 'zoo-alt',          char: PUA(58),    name: 'zoo alt',          strokes: 5,  page: 155, pua: true },
  { id: 'scarf',            char: PUA(59),    name: 'scarf',            strokes: 4,  page: 156, pua: true },
  { id: 'cloak',            char: '衤',       name: 'cloak',            strokes: 5,  page: 156, pua: false },
  { id: 'top-hat-scarf',    char: PUA(61),    name: 'top hat and scarf', strokes: 6, page: 156, pua: true },
  // ── Page 14 ──
  { id: 'apron',            char: '巾',       name: 'apron',            strokes: 3,  page: 160, pua: false },
  { id: 'belt',             char: PUA(63),    name: 'belt',             strokes: 2,  page: 161, pua: true },
  { id: 'buckle',           char: '世',       name: 'buckle',           strokes: 5,  page: 161, pua: false },
  { id: 'rising-cloud',     char: '云',       name: 'rising cloud',     strokes: 4,  page: 162, pua: false },
  { id: 'rain',             char: '雨',       name: 'rain',             strokes: 8,  page: 163, pua: false },
  // ── Page 15 ──
  { id: 'ice',              char: '冫',       name: 'ice',              strokes: 2,  page: 164, pua: false },
  { id: 'ice-alt',          char: PUA(68),    name: 'ice alternate',    strokes: 2,  page: 164, pua: true },
  { id: 'witch',            char: PUA(69),    name: 'witch',            strokes: 4,  page: 164, pua: true },
  { id: 'angel',            char: '喬',       name: 'angel',            strokes: 12, page: 165, pua: false },
  { id: 'antique',          char: '商',       name: 'antique',          strokes: 11, page: 167, pua: false },
  // ── Page 16 ──
  { id: 'siesta',           char: PUA(72),    name: 'siesta',           strokes: 8,  page: 171, pua: true },
  { id: 'reclining',        char: PUA(73),    name: 'reclining',        strokes: 2,  page: 173, pua: true },
  { id: 'double-back',      char: '复',       name: 'double back',      strokes: 9,  page: 175, pua: false },
  { id: 'muzzle',           char: PUA(75),    name: 'muzzle',           strokes: 8,  page: 178, pua: true },
  { id: 'kazoo',            char: PUA(76),    name: 'kazoo',            strokes: 12, page: 179, pua: true },
  // ── Page 17 ──
  { id: 'mirror',           char: '竟',       name: 'mirror',           strokes: 11, page: 180, pua: false },
  { id: 'devil',            char: '兑',       name: 'devil',            strokes: 7,  page: 183, pua: false },
  { id: 'porter',           char: '壬',       name: 'porter',           strokes: 4,  page: 185, pua: false },
  { id: 'scorpion',         char: '也',       name: 'scorpion',         strokes: 3,  page: 191, pua: false },
  // ── Page 18 ──
  { id: 'gnats',            char: PUA(81),    name: 'gnats',            strokes: 7,  page: 193, pua: true },
  { id: 'eel',              char: PUA(82),    name: 'eel',              strokes: 5,  page: 195, pua: true },
  { id: 'sow',              char: PUA(83),    name: 'sow',              strokes: 7,  page: 196, pua: true },
  { id: 'piglet',           char: PUA(84),    name: 'piglet',           strokes: 5,  page: 197, pua: true },
  { id: 'piggy-bank',       char: '易',       name: 'piggy bank',       strokes: 9,  page: 197, pua: false },
  // ── Page 19 ──
  { id: 'sheep',            char: '羊',       name: 'sheep',            strokes: 6,  page: 198, pua: false },
  { id: 'wool',             char: PUA(87),    name: 'wool',             strokes: 7,  page: 199, pua: true },
  { id: 'turkey',           char: '隹',       name: 'turkey',           strokes: 8,  page: 200, pua: false },
  { id: 'pegasus',          char: PUA(89),    name: 'pegasus',          strokes: 11, page: 203, pua: true },
  { id: 'feathers',         char: '羽',       name: 'feathers',         strokes: 6,  page: 204, pua: false },
  // ── Page 20 ──
  { id: 'pent-in',          char: '囗',       name: 'pent in',          strokes: 3,  page: 206, pua: false },
  { id: 'cave',             char: '广',       name: 'cave',             strokes: 3,  page: 208, pua: false },
  { id: 'state-of-mind',    char: '忄',       name: 'state of mind',    strokes: 3,  page: 209, pua: false },
  { id: 'valentine',        char: PUA(94),    name: 'valentine',        strokes: 4,  page: 209, pua: true },
  { id: 'finger',           char: '扌',       name: 'finger',           strokes: 3,  page: 216, pua: false },
  // ── Page 21 ──
  { id: 'two-hands',        char: '廾',       name: 'two hands',        strokes: 4,  page: 219, pua: false },
  { id: 'genius',           char: PUA(97),    name: 'genius',           strokes: 3,  page: 221, pua: true },
  { id: 'arm',              char: '𠂉',       name: 'arm',              strokes: 2,  page: 222, pua: false },
  { id: 'missile',          char: PUA(99),    name: 'missile',          strokes: 4,  page: 225, pua: true },
  { id: 'spool',            char: PUA(100),   name: 'spool',            strokes: 5,  page: 226, pua: true },
  // ── Page 22 ──
  { id: 'vulture',          char: PUA(101),   name: 'vulture',          strokes: 4,  page: 227, pua: true },
  { id: 'fledgling',        char: '孚',       name: 'fledgling',        strokes: 7,  page: 228, pua: false },
  { id: 'elbow',            char: PUA(103),   name: 'elbow',            strokes: 2,  page: 229, pua: true },
  { id: 'birdhouse',        char: PUA(104),   name: 'birdhouse',        strokes: 6,  page: 229, pua: true },
  { id: 'wall',             char: PUA(105),   name: 'wall',             strokes: 3,  page: 231, pua: true },
  // ── Page 23 ──
  { id: 'infant',           char: PUA(106),   name: 'infant',           strokes: 4,  page: 232, pua: true },
  { id: 'gully',            char: PUA(107),   name: 'gully',            strokes: 5,  page: 237, pua: true },
  { id: 'outhouse',         char: PUA(108),   name: 'outhouse',         strokes: 8,  page: 238, pua: true },
  { id: 'bone',             char: PUA(109),   name: 'bone',             strokes: 4,  page: 240, pua: true },
  { id: 'sunglasses',       char: PUA(110),   name: 'sunglasses',       strokes: 7,  page: 241, pua: true },
  // ── Page 24 ──
  { id: 'mandala',          char: '曼',       name: 'mandala',          strokes: 11, page: 242, pua: false },
  { id: 'chapel',           char: PUA(112),   name: 'chapel',           strokes: 4,  page: 247, pua: true },
  { id: 'going',            char: '彳',       name: 'going',            strokes: 3,  page: 248, pua: false },
  { id: 'wheat',            char: '禾',       name: 'wheat',            strokes: 5,  page: 251, pua: false },
  { id: 'grains-of-rice',   char: PUA(115),   name: 'grains of rice',   strokes: 5,  page: 255, pua: true },
  // ── Page 25 ──
  { id: 'person',           char: '亻',       name: 'person',           strokes: 2,  page: 259, pua: false },
  { id: 'assembly-line',    char: '从',       name: 'assembly line',    strokes: 4,  page: 268, pua: false },
  { id: 'plow',             char: PUA(118),   name: 'plow',             strokes: 2,  page: 269, pua: true },
  { id: 'puzzle',           char: '并',       name: 'puzzle',           strokes: 6,  page: 269, pua: false },
  { id: 'sunglasses-one-lens', char: PUA(120), name: 'sunglasses with one lens popped out', strokes: 4, page: 271, pua: true },
  // ── Page 26 ──
  { id: 'shredder',         char: PUA(121),   name: 'shredder',         strokes: 12, page: 271, pua: true },
  { id: 'banner',           char: PUA(122),   name: 'banner',           strokes: 6,  page: 272, pua: true },
  { id: 'rag',              char: PUA(123),   name: 'rag',              strokes: 4,  page: 273, pua: true },
  { id: 'flag',             char: '尸',       name: 'flag',             strokes: 3,  page: 274, pua: false },
  // ── Page 27 ──
  { id: 'altar',            char: '礻',       name: 'altar',            strokes: 4,  page: 278, pua: false },
  { id: 'saw',              char: PUA(126),   name: 'saw',              strokes: 5,  page: 286, pua: true },
  { id: 'broom',            char: PUA(127),   name: 'broom',            strokes: 3,  page: 287, pua: true },
  { id: 'broom-alt',        char: PUA(128),   name: 'broom alt',        strokes: 3,  page: 287, pua: true },
  { id: 'broom-old',        char: PUA(129),   name: 'broom old',        strokes: 3,  page: 288, pua: true },
  // ── Page 28 ──
  { id: 'rake',             char: PUA(130),   name: 'rake',             strokes: 4,  page: 289, pua: true },
  { id: 'mop',              char: '尹',       name: 'mop',              strokes: 4,  page: 289, pua: false },
  { id: 'sieve',            char: '隶',       name: 'sieve',            strokes: 8,  page: 289, pua: false },
  { id: 'comb',             char: '而',       name: 'comb',             strokes: 6,  page: 290, pua: false },
  { id: 'shovel',           char: '凵',       name: 'shovel',           strokes: 2,  page: 291, pua: false },
  // ── Page 29 ──
  { id: 'salad',            char: PUA(135),   name: 'salad',            strokes: 4,  page: 294, pua: true },
  { id: 'haystack',         char: '丼',       name: 'haystack',         strokes: 5,  page: 295, pua: false },
  { id: 'caverns',          char: PUA(137),   name: 'caverns',          strokes: 7,  page: 295, pua: true },
  { id: 'strawman',         char: PUA(138),   name: 'strawman',         strokes: 8,  page: 296, pua: true },
  { id: 'quarter',          char: PUA(139),   name: 'quarter',          strokes: 6,  page: 297, pua: true },
  // ── Page 30 ──
  { id: 'spear',            char: PUA(140),   name: 'spear',            strokes: 2,  page: 301, pua: true },
  { id: 'dollarsign',       char: '弗',       name: 'dollarsign',       strokes: 5,  page: 302, pua: false },
  { id: 'dollarsign-alt',   char: PUA(142),   name: 'dollarsign alt',   strokes: 5,  page: 302, pua: true },
  { id: 'snare',            char: '乃',       name: 'snare',            strokes: 2,  page: 303, pua: false },
  { id: 'turkey-coop',      char: '雀',       name: 'turkey coop',      strokes: 10, page: 303, pua: false },
  // ── Page 31 ──
  { id: 'slingshot',        char: '与',       name: 'slingshot',        strokes: 2,  page: 304, pua: false },
  { id: 'old-man',          char: PUA(146),   name: 'old man',          strokes: 4,  page: 305, pua: true },
  { id: 'scissors',         char: '夹',       name: 'scissors',         strokes: 6,  page: 307, pua: false },
  { id: 'maestro',          char: PUA(148),   name: 'maestro',          strokes: 6,  page: 308, pua: true },
  // ── Page 32 ──
  { id: 'jawbone',          char: PUA(149),   name: 'jawbone',          strokes: 9,  page: 311, pua: true },
  { id: 'pinnacle',         char: PUA(150),   name: 'pinnacle',         strokes: 3,  page: 312, pua: true },
  { id: 'miss-universe',    char: PUA(151),   name: 'miss universe/paper punch', strokes: 4, page: 316, pua: true },
  { id: 'cocoon',           char: '幺',       name: 'cocoon',           strokes: 3,  page: 322, pua: false },
  { id: 'stamp',            char: PUA(153),   name: 'stamp',            strokes: 2,  page: 325, pua: true },
  // ── Page 33 ──
  { id: 'chop-seal',        char: PUA(154),   name: 'chop-seal',        strokes: 2,  page: 325, pua: true },
  { id: 'chop-seal-small',  char: PUA(155),   name: 'chop-seal small',  strokes: 2,  page: 326, pua: true },
  { id: 'fingerprint',      char: '巳',       name: 'fingerprint',      strokes: 2,  page: 328, pua: false },
  { id: 'mailbox',          char: PUA(157),   name: 'mailbox',          strokes: 5,  page: 328, pua: true },
  { id: 'receipt',          char: PUA(158),   name: 'receipt',          strokes: 3,  page: 329, pua: true },
  // ── Page 34 ──
  { id: 'staples',          char: PUA(159),   name: 'staples',          strokes: 4,  page: 329, pua: true },
  { id: 'drum',             char: '壴',       name: 'drum',             strokes: 9,  page: 333, pua: false },
  { id: 'silver-alt',       char: PUA(161),   name: 'silver alt',       strokes: 5,  page: 334, pua: true },
  { id: 'silver',           char: '艮',       name: 'silver',           strokes: 6,  page: 334, pua: false },
  { id: 'good-alt',         char: '良',       name: 'good alt',         strokes: 6,  page: 336, pua: false },
  // ── Page 35 ──
  { id: 'waitress',         char: PUA(164),   name: 'waitress',         strokes: 4,  page: 337, pua: true },
  { id: 'sheaf',            char: '乂',       name: 'sheaf',            strokes: 2,  page: 339, pua: false },
  { id: 'earthworm',        char: '屯',       name: 'earthworm',        strokes: 4,  page: 340, pua: false },
  { id: 'red-pepper',       char: PUA(167),   name: 'red pepper',       strokes: 9,  page: 341, pua: true },
  { id: 'ketchup',          char: PUA(168),   name: 'ketchup',          strokes: 13, page: 341, pua: true },
  // ── Page 36 ──
  { id: 'cornucopia',       char: PUA(169),   name: 'cornucopia',       strokes: 2,  page: 342, pua: true },
  { id: 'rice-seedling',    char: PUA(170),   name: 'rice seedling',    strokes: 5,  page: 343, pua: true },
  { id: 'resin',            char: PUA(171),   name: 'resin',            strokes: 5,  page: 345, pua: true },
  { id: 'celery',           char: PUA(172),   name: 'celery',           strokes: 5,  page: 345, pua: true },
  { id: 'grass-skirt',      char: PUA(173),   name: 'grass skirt',      strokes: 13, page: 346, pua: true },
  // ── Page 37 ──
  { id: 'grow',             char: PUA(174),   name: 'grow',             strokes: 4,  page: 347, pua: true },
  { id: 'bushes',           char: '丰',       name: 'bushes',           strokes: 4,  page: 350, pua: false },
  { id: 'christmas-tree',   char: PUA(176),   name: 'christmas tree',   strokes: 6,  page: 351, pua: true },
  { id: 'cornstalk',        char: PUA(177),   name: 'cornstalk',        strokes: 3,  page: 352, pua: true },
  { id: 'bush-alt',         char: PUA(178),   name: 'bush alt',         strokes: 4,  page: 352, pua: true },
  // ── Page 38 ──
  { id: 'bonsai',           char: PUA(179),   name: 'bonsai',           strokes: 5,  page: 352, pua: true },
  { id: 'cabbage',          char: PUA(180),   name: 'cabbage',          strokes: 10, page: 353, pua: true },
  { id: 'scarecrow',        char: PUA(181),   name: 'scarecrow',        strokes: 10, page: 353, pua: true },
  { id: 'silage',           char: PUA(182),   name: 'silage',           strokes: 6,  page: 354, pua: true },
  // ── Page 39 ──
  { id: 'old-west',         char: '西',       name: 'old west',         strokes: 6,  page: 358, pua: false },
  { id: 'key',              char: PUA(184),   name: 'key',              strokes: 2,  page: 363, pua: true },
  { id: 'guillotine',       char: PUA(185),   name: 'guillotine',       strokes: 4,  page: 363, pua: true },
  { id: 'locket',           char: '韋',       name: 'locket',           strokes: 10, page: 364, pua: false },
  { id: 'potato',           char: '干',       name: 'potato',           strokes: 3,  page: 366, pua: false },
  // ── Page 40 ──
  { id: 'awl',              char: PUA(188),   name: 'awl',              strokes: 8,  page: 368, pua: true },
  { id: 'sickness',         char: '疒',       name: 'sickness',         strokes: 5,  page: 370, pua: false },
  { id: 'box',              char: '匚',       name: 'box',              strokes: 2,  page: 371, pua: false },
  { id: 'box-small',        char: '匸',       name: 'box small',        strokes: 2,  page: 371, pua: false },
  { id: 'teepee',           char: PUA(192),   name: 'teepee',           strokes: 5,  page: 373, pua: true },
  // ── Page 41 ──
  { id: 'pop-tent',         char: PUA(193),   name: 'pop tent',         strokes: 12, page: 373, pua: true },
  { id: 'shape',            char: '彡',       name: 'shape',            strokes: 3,  page: 374, pua: false },
  { id: 'fenceposts',       char: PUA(195),   name: 'fenceposts',       strokes: 2,  page: 377, pua: true },
  { id: 'sparkler',         char: PUA(196),   name: 'sparkler',         strokes: 4,  page: 378, pua: true },
  { id: 'apple',            char: '亦',       name: 'apple',            strokes: 6,  page: 379, pua: false },
  // ── Page 42 ──
  { id: 'mosaic',           char: '巴',       name: 'mosaic',           strokes: 4,  page: 380, pua: false },
  { id: 'bushel-basket',    char: '其',       name: 'bushel basket',    strokes: 8,  page: 382, pua: false },
  { id: 'purse',            char: PUA(200),   name: 'purse',            strokes: 5,  page: 383, pua: true },
  { id: 'shelf',            char: '且',       name: 'shelf',            strokes: 5,  page: 384, pua: false },
  { id: 'oaken-tub',        char: PUA(202),   name: 'oaken tub',        strokes: 6,  page: 384, pua: true },
  // ── Page 43 ──
  { id: 'row',              char: '亜',       name: 'row',              strokes: 6,  page: 386, pua: false },
  { id: 'funnel',           char: PUA(204),   name: 'funnel',           strokes: 10, page: 390, pua: true },
  { id: 'scrapbook',        char: '冊',       name: 'scrapbook',        strokes: 5,  page: 391, pua: false },
  { id: 'calling-card',     char: '氏',       name: 'calling card',     strokes: 5,  page: 393, pua: false },
  { id: 'dog-tag',          char: PUA(207),   name: 'dog tag',          strokes: 7,  page: 393, pua: true },
  // ── Page 44 ──
  { id: 'city-walls',       char: '⻏',       name: 'city walls',       strokes: 3,  page: 394, pua: false },
  { id: 'drag',             char: PUA(209),   name: 'drag',             strokes: 2,  page: 396, pua: true },
  { id: 'drag-alt',         char: PUA(210),   name: 'drag alt',         strokes: 2,  page: 396, pua: true },
  { id: 'clothes-hanger',   char: PUA(211),   name: 'clothes hanger',   strokes: 1,  page: 397, pua: true },
  { id: 'stapler',          char: PUA(212),   name: 'stapler',          strokes: 5,  page: 397, pua: true },
  // ── Page 45 ──
  { id: 'lock-of-hair',     char: '毛',       name: 'lock of hair',     strokes: 3,  page: 406, pua: false },
  { id: 'animal-tracks',    char: '采',       name: 'animal tracks',    strokes: 7,  page: 406, pua: false },
  { id: 'tail-feathers',    char: PUA(215),   name: 'tail feathers',    strokes: 5,  page: 407, pua: true },
  { id: 'hairpin',          char: PUA(216),   name: 'hairpin',          strokes: 4,  page: 408, pua: true },
  { id: 'mane',             char: '巨',       name: 'mane',             strokes: 5,  page: 408, pua: false },
  // ── Page 46 ──
  { id: 'hair',             char: PUA(218),   name: 'hair',             strokes: 7,  page: 408, pua: true },
  { id: 'owl',              char: PUA(219),   name: 'owl',              strokes: 3,  page: 409, pua: true },
  { id: 'migrating-ducks',  char: PUA(220),   name: 'migrating ducks',  strokes: 9,  page: 412, pua: true },
  { id: 'mountain-goat',    char: PUA(221),   name: 'mountain goat',    strokes: 6,  page: 413, pua: true },
  // ── Page 47 ──
  { id: 'talking-cricket',  char: PUA(222),   name: 'talking cricket',  strokes: 9,  page: 413, pua: true },
  { id: 'condor',           char: PUA(223),   name: 'condor',           strokes: 9,  page: 414, pua: true },
  { id: 'skunk',            char: PUA(224),   name: 'skunk',            strokes: 7,  page: 416, pua: true },
  { id: 'tiger',            char: '虍',       name: 'tiger',            strokes: 6,  page: 419, pua: false },
  // ── Page 48 ──
  { id: 'deer',             char: PUA(226),   name: 'deer',             strokes: 7,  page: 421, pua: true },
  { id: 'gold-calf',        char: PUA(227),   name: 'gold calf',        strokes: 6,  page: 423, pua: true },
]

// ── Lookup helpers ───────────────────────────────────────────────────────
export function getPrimitiveByName(name) {
  return PRIMITIVES.find(p => p.name.toLowerCase() === name.toLowerCase()) ?? null
}

export function getPrimitiveById(id) {
  return PRIMITIVES.find(p => p.id === id) ?? null
}

export function getPrimitiveByChar(char) {
  return PRIMITIVES.find(p => p.char === char) ?? null
}

export function getAllPrimitives() {
  return PRIMITIVES
}

export function getPUAPrimitives() {
  return PRIMITIVES.filter(p => p.pua)
}

export function getStandardPrimitives() {
  return PRIMITIVES.filter(p => !p.pua)
}

export default PRIMITIVES
