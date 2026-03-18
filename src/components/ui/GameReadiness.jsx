import { useMemo } from 'react'

// ─── Game Readiness Timeline ────────────────────────────────────────────
// Maps kanji mastery % to in-game milestones. Each deck can define custom
// milestones; decks without them get a generic set.
//
// Props: deckId, learnedPct (0–100), learned (count), total (count)

// ─── Per-deck milestone definitions ─────────────────────────────────────
const DECK_MILESTONES = {
  'p5r': [
    { pct: 5,   label: 'Navigate menus',          icon: '📋', desc: 'Settings, save/load, Velvet Room menus' },
    { pct: 15,  label: 'Read item names',          icon: '💊', desc: 'Consumables, equipment, key items' },
    { pct: 30,  label: 'Follow Confidant names',   icon: '🃏', desc: 'Recognize party members and social links' },
    { pct: 50,  label: 'Read dialogue hints',      icon: '💬', desc: 'Catch keywords in conversations' },
    { pct: 75,  label: 'Follow Palace text',       icon: '🏰', desc: 'Understand dungeon dialogue and objectives' },
    { pct: 100, label: 'Play in Japanese',          icon: '🎭', desc: 'Full comprehension of the Phantom Thieves\' story' },
  ],
  'zelda-alttp': [
    { pct: 5,   label: 'Navigate menus',          icon: '🗺️', desc: 'Equipment and map screens' },
    { pct: 20,  label: 'Read item descriptions',   icon: '⚔️', desc: 'Swords, shields, bottles, medallions' },
    { pct: 40,  label: 'Follow NPC dialogue',      icon: '👤', desc: 'Village characters and old man hints' },
    { pct: 65,  label: 'Understand dungeon text',   icon: '🏛️', desc: 'Dungeon objectives and boss hints' },
    { pct: 100, label: 'Play in Japanese',          icon: '🌟', desc: 'Full Hyrule adventure in Japanese' },
  ],
  'chrono-trigger': [
    { pct: 5,   label: 'Navigate menus',          icon: '⚙️', desc: 'Battle, equipment, and tech screens' },
    { pct: 20,  label: 'Read item & tech names',   icon: '✨', desc: 'Recognize equipment and Double/Triple Techs' },
    { pct: 40,  label: 'Follow era dialogue',      icon: '🕰️', desc: 'Understand NPC talk in each time period' },
    { pct: 70,  label: 'Follow the story',          icon: '📖', desc: 'Main plot events and character moments' },
    { pct: 100, label: 'Play in Japanese',          icon: '🌀', desc: 'Full time-travel adventure in Japanese' },
  ],
  'ni-no-kuni': [
    { pct: 5,   label: 'Navigate menus',          icon: '📕', desc: 'Wizard\'s Companion, familiars, equipment' },
    { pct: 20,  label: 'Read familiar names',      icon: '🐱', desc: 'Recognize your team of familiars' },
    { pct: 40,  label: 'Follow quest text',         icon: '📜', desc: 'Errands and bounty descriptions' },
    { pct: 70,  label: 'Understand story scenes',   icon: '🎬', desc: 'Cutscene dialogue with Oliver and friends' },
    { pct: 100, label: 'Play in Japanese',          icon: '🌏', desc: 'Full Studio Ghibli adventure in Japanese' },
  ],
  'ff6': [
    { pct: 5,   label: 'Navigate menus',          icon: '⚙️', desc: 'Equipment, magic, relics screens' },
    { pct: 20,  label: 'Read spell & item names',  icon: '🔮', desc: 'Espers, spells, and equipment' },
    { pct: 40,  label: 'Follow town dialogue',      icon: '🏘️', desc: 'NPC conversations in towns and the World of Balance' },
    { pct: 70,  label: 'Follow the story',          icon: '📖', desc: 'Main events through the World of Ruin' },
    { pct: 100, label: 'Play in Japanese',          icon: '🌅', desc: 'The full opera scene and beyond, in Japanese' },
  ],
  'pokemon-fr': [
    { pct: 5,   label: 'Navigate menus',          icon: '📱', desc: 'Pokédex, bag, party, save screens' },
    { pct: 20,  label: 'Read move names',           icon: '⚡', desc: 'Recognize attacks and their types' },
    { pct: 40,  label: 'Follow NPC hints',           icon: '👤', desc: 'Gym leaders, rivals, and route trainers' },
    { pct: 70,  label: 'Read story text',            icon: '📖', desc: 'Team Rocket events and major story beats' },
    { pct: 100, label: 'Play in Japanese',          icon: '🏆', desc: 'Full Kanto journey in Japanese' },
  ],
  'yokai-watch-1': [
    { pct: 5,   label: 'Navigate menus',          icon: '⌚', desc: 'Yo-kai Watch, medallium, items' },
    { pct: 20,  label: 'Read Yo-kai names',         icon: '👻', desc: 'Recognize your befriended Yo-kai' },
    { pct: 40,  label: 'Follow quest text',          icon: '📋', desc: 'Side quests and favor requests' },
    { pct: 70,  label: 'Follow the story',          icon: '📖', desc: 'Main story events in Springdale' },
    { pct: 100, label: 'Play in Japanese',          icon: '🌸', desc: 'Full Yo-kai adventure in Japanese' },
  ],
  'yotsuba': [
    { pct: 5,   label: 'Read sound effects',       icon: '💥', desc: 'Onomatopoeia and exclamations' },
    { pct: 20,  label: 'Catch simple dialogue',     icon: '💬', desc: 'Yotsuba\'s simple speech patterns' },
    { pct: 50,  label: 'Follow adult dialogue',     icon: '👨', desc: 'Conversations between Koiwai and neighbors' },
    { pct: 80,  label: 'Read narration',             icon: '📖', desc: 'Scene descriptions and inner thoughts' },
    { pct: 100, label: 'Read in Japanese',          icon: '📚', desc: 'Full Yotsuba&! manga in Japanese' },
  ],
}

// ─── Generic milestones for decks without custom ones ───────────────────
const GENERIC_MILESTONES = [
  { pct: 10,  label: 'Navigate menus',       icon: '📋', desc: 'Basic UI navigation and options' },
  { pct: 25,  label: 'Read common words',     icon: '📝', desc: 'Frequently appearing vocabulary' },
  { pct: 50,  label: 'Follow basic dialogue', icon: '💬', desc: 'Simple conversations and descriptions' },
  { pct: 75,  label: 'Understand story text', icon: '📖', desc: 'Main plot events and character development' },
  { pct: 100, label: 'Play in Japanese',      icon: '🎮', desc: 'Full experience in Japanese' },
]

export default function GameReadiness({ deckId, learnedPct, learned, total }) {
  const milestones = DECK_MILESTONES[deckId] || GENERIC_MILESTONES
  const isFoundation = deckId === 'primer' || deckId === 'radicals'

  // Don't show for foundation decks (they don't map to a game)
  if (isFoundation) return null

  const unlockedCount = milestones.filter(m => learnedPct >= m.pct).length
  const nextMilestone = milestones.find(m => learnedPct < m.pct)

  return (
    <div className="mb-6 animate-fade-up delay-200">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gold-400/10" />
        <span className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase">
          Game Readiness
        </span>
        <div className="flex-1 h-px bg-gold-400/10" />
      </div>

      <div className="bg-ink-800 border border-gold-400/10 rounded-xl p-4 relative overflow-hidden">
        {/* Ghost kanji */}
        <span className="absolute -top-2 right-3 font-kanji text-6xl leading-none
                         text-gold-400/[0.04] select-none pointer-events-none">
          準
        </span>

        {/* Summary line */}
        {nextMilestone ? (
          <div className="mb-4">
            <p className="font-mono text-[10px] text-parchment-500/60 tracking-wide">
              Next unlock at <span className="text-gold-400">{nextMilestone.pct}%</span>
            </p>
            <p className="font-display italic text-sm text-parchment-200 mt-0.5">
              {nextMilestone.label}
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <p className="font-display italic text-base text-emerald-400">
              You're ready to play!
            </p>
            <p className="font-mono text-[10px] text-emerald-400/50 tracking-wide mt-0.5">
              All milestones unlocked
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="relative pl-5">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-ink-600 rounded-full overflow-hidden">
            <div
              className="w-full bg-gold-400/50 rounded-full transition-all duration-700"
              style={{ height: `${learnedPct}%` }}
            />
          </div>

          {/* Milestone nodes */}
          <div className="space-y-3">
            {milestones.map((m, i) => {
              const unlocked = learnedPct >= m.pct
              const isNext   = nextMilestone?.pct === m.pct

              return (
                <div key={i} className="flex items-start gap-3 relative">
                  {/* Node dot */}
                  <div className={`absolute left-[-15px] top-[6px] w-[14px] h-[14px] rounded-full border-2 transition-all duration-500 flex items-center justify-center
                    ${unlocked
                      ? 'bg-gold-400/20 border-gold-400/60'
                      : isNext
                      ? 'bg-ink-700 border-gold-400/30'
                      : 'bg-ink-700 border-ink-500'
                    }`}>
                    {unlocked && (
                      <div className="w-[6px] h-[6px] rounded-full bg-gold-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 pb-1 transition-opacity duration-300
                    ${unlocked ? 'opacity-100' : isNext ? 'opacity-70' : 'opacity-35'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{m.icon}</span>
                      <p className={`font-display italic text-sm leading-tight
                        ${unlocked ? 'text-gold-400' : 'text-parchment-300'}`}>
                        {m.label}
                      </p>
                      <span className="font-mono text-[8px] text-parchment-500/30 tabular-nums">
                        {m.pct}%
                      </span>
                    </div>
                    <p className={`font-mono text-[10px] mt-0.5 leading-snug
                      ${unlocked ? 'text-parchment-500/50' : 'text-parchment-500/30'}`}>
                      {m.desc}
                    </p>
                  </div>

                  {/* Unlocked badge */}
                  {unlocked && (
                    <span className="shrink-0 font-mono text-[8px] text-gold-400/50 tracking-widest uppercase mt-1">
                      ✓
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
