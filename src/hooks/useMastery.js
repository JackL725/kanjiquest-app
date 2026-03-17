// ─── Mastery Stage System (FSRS-powered) ─────────────────────────────────
//
// Now backed by FSRS's stability metric — a direct measure of memory
// durability expressed in days. Stability = how many days until your
// probability of recall drops to the desired retention threshold (90%).
//
// This is a huge improvement over the old SM-2 approach, which used
// interval + rep count as crude proxies. FSRS stability is calculated
// from a machine-learning model trained on millions of real reviews.
//
// Stage mapping:
//   Unseen   → no progress record
//   Kindled  → in learning or relearning phase (not yet graduated)
//   Familiar → graduated, stability < 7 days
//   Tempered → graduated, stability ≥ 7 days
//   Mastered → graduated, stability ≥ 21 days
//   Engraved → graduated, stability ≥ 90 days
//
// ──────────────────────────────────────────────────────────────────────────

import { State } from 'ts-fsrs'

export const STAGES = [
  {
    id:          'unseen',
    label:       'Unseen',
    kanji:       '未',
    color:       'parchment-500/25',
    barColor:    'bg-parchment-500/8',
    borderColor: 'border-parchment-500/8',
    desc:        'Not yet studied',
    science:     'This card hasn\'t entered your memory yet.',
  },
  {
    id:          'kindled',
    label:       'Kindled',
    kanji:       '火',
    color:       'amber-500',
    barColor:    'bg-amber-500/60',
    borderColor: 'border-amber-500/20',
    desc:        'In the learning phase',
    science:     'In working memory. The FSRS algorithm is rapidly testing you at short intervals to build initial stability.',
  },
  {
    id:          'familiar',
    label:       'Familiar',
    kanji:       '知',
    color:       'blue-400',
    barColor:    'bg-blue-400/60',
    borderColor: 'border-blue-400/20',
    desc:        'Short-term recall',
    science:     'Memory stability under 7 days. You can recall it now, but the neural pathway is still fragile. Each successful review strengthens it.',
  },
  {
    id:          'tempered',
    label:       'Tempered',
    kanji:       '鍛',
    color:       'gold-400',
    barColor:    'bg-gold-400/60',
    borderColor: 'border-gold-400/20',
    desc:        'Building long-term memory',
    science:     'Stability of 7+ days means multiple successful retrievals have consolidated this memory. The brain is moving it from hippocampus to cortex.',
  },
  {
    id:          'mastered',
    label:       'Mastered',
    kanji:       '達',
    color:       'emerald-400',
    barColor:    'bg-emerald-400/60',
    borderColor: 'border-emerald-400/25',
    desc:        'Long-term memory confirmed',
    science:     '21+ days of stability means deep consolidation. You can reliably recall this kanji after weeks without review.',
  },
  {
    id:          'engraved',
    label:       'Engraved',
    kanji:       '刻',
    color:       'parchment-100',
    barColor:    'bg-parchment-100/50',
    borderColor: 'border-parchment-100/20',
    desc:        'Permanent memory',
    science:     'Stability of 90+ days — this kanji is deeply engraved. FSRS models show memories at this level of stability are practically permanent.',
  },
]

// ─── Stability thresholds for each stage ─────────────────────────────────
const STABILITY_THRESHOLDS = [
  // Familiar: stability 0+
  0,
  // Tempered: stability 7+
  7,
  // Mastered: stability 21+
  21,
  // Engraved: stability 90+
  90,
]

// ─── Compute a card's mastery stage ───────────────────────────────────────
// Returns: { stage, stageIndex, progress, stumbled }
export function getMasteryStage(p) {
  if (!p) {
    return { stage: STAGES[0], stageIndex: 0, progress: 0, stumbled: false }
  }

  const state     = p.state ?? 0
  const stability = p.stability ?? 0

  // Cards in Learning or Relearning are Kindled
  if (state === State.Learning || state === State.Relearning) {
    return { stage: STAGES[1], stageIndex: 1, progress: 0, stumbled: false }
  }

  // New cards that somehow have a progress record but state=New
  if (state === State.New) {
    return { stage: STAGES[0], stageIndex: 0, progress: 0, stumbled: false }
  }

  // State = Review → determine stage from stability
  let stageIndex = 2 // Familiar (minimum for graduated)

  if (stability >= 90)  stageIndex = 5 // Engraved
  else if (stability >= 21) stageIndex = 4 // Mastered
  else if (stability >= 7)  stageIndex = 3 // Tempered
  // else stays at 2 (Familiar)

  // Detect if card recently lapsed (stability dropped below its stage's
  // threshold). This is the FSRS equivalent of "stumbled" — the algorithm
  // naturally handles this by reducing stability on lapses.
  const stumbled = p.lapses > 0 && stability < 7 && p.reps > 3

  // Calculate progress toward next stage (0–100)
  let progress = 0
  if (stageIndex < 5) {
    const threshIdx = stageIndex - 2 // offset because stages 0,1 have no threshold
    const current   = STABILITY_THRESHOLDS[threshIdx] || 0
    const next      = STABILITY_THRESHOLDS[threshIdx + 1]
    if (next !== undefined && next > current) {
      progress = Math.min(95, Math.round(((stability - current) / (next - current)) * 100))
    }
  } else {
    progress = 100
  }

  return {
    stage: STAGES[stageIndex],
    stageIndex,
    progress: Math.max(0, progress),
    stumbled,
  }
}

// ─── Stage filter helpers ─────────────────────────────────────────────────
export function isStageAtLeast(p, stageId) {
  const { stageIndex } = getMasteryStage(p)
  const targetIndex = STAGES.findIndex(s => s.id === stageId)
  return stageIndex >= targetIndex
}
