// ─── Mastery Stage System ─────────────────────────────────────────────────
//
// Six named stages, each mapped to a real memory consolidation milestone.
//
// The research: spaced repetition works because each successful retrieval
// at a longer interval triggers reconsolidation, making the memory more
// durable (Pashler et al., 2007; Carpenter et al., 2022). The stages below
// correspond to the thresholds where research shows qualitative shifts in
// memory durability:
//
//   Working memory → Short-term encoding → Medium-term consolidation
//   → Long-term storage → Deep/permanent memory
//
// Stage design inspired by WaniKani's Apprentice → Burned pipeline and
// the Leitner box system, adapted for SM-2's continuous interval model.
//
// ──────────────────────────────────────────────────────────────────────────

export const STAGES = [
  {
    id:          'unseen',
    label:       'Unseen',
    kanji:       '未',
    color:       'parchment-500/25',       // very dim
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
    science:     'In working memory. You\'ve seen it, but it hasn\'t stuck yet. The SRS will show it again soon.',
  },
  {
    id:          'familiar',
    label:       'Familiar',
    kanji:       '知',
    color:       'blue-400',
    barColor:    'bg-blue-400/60',
    borderColor: 'border-blue-400/20',
    desc:        'Short-term recall',
    science:     'Encoded in short-term memory. You can recall it within a few days, but the neural pathway is still fragile.',
  },
  {
    id:          'tempered',
    label:       'Tempered',
    kanji:       '鍛',
    color:       'gold-400',
    barColor:    'bg-gold-400/60',
    borderColor: 'border-gold-400/20',
    desc:        'Building long-term memory',
    science:     'Multiple successful retrievals have strengthened the memory trace. Consolidation is underway — the brain is moving this from hippocampus to cortex.',
  },
  {
    id:          'mastered',
    label:       'Mastered',
    kanji:       '達',
    color:       'emerald-400',
    barColor:    'bg-emerald-400/60',
    borderColor: 'border-emerald-400/25',
    desc:        'Long-term memory confirmed',
    science:     'You\'ve recalled this card correctly across a 3-week gap. Research shows memories that survive 21+ day intervals have undergone deep consolidation.',
  },
  {
    id:          'engraved',
    label:       'Engraved',
    kanji:       '刻',
    color:       'parchment-100',
    barColor:    'bg-parchment-100/50',
    borderColor: 'border-parchment-100/20',
    desc:        'Permanent memory',
    science:     'This kanji is deeply engraved. 90+ day intervals with consistent recall means the memory is practically permanent — it\'s part of your reading ability now.',
  },
]

// ─── Stage thresholds ─────────────────────────────────────────────────────
// Each stage requires ALL conditions to be met.
// Progress within a stage is calculated as a percentage toward the NEXT stage.

const THRESHOLDS = [
  // 0: Unseen   → no progress record
  // 1: Kindled  → has progress, not graduated
  { graduated: false },
  // 2: Familiar → graduated, any interval
  { graduated: true, minInterval: 0,  minReps: 0 },
  // 3: Tempered → graduated, interval >= 7, reps >= 2
  { graduated: true, minInterval: 7,  minReps: 2 },
  // 4: Mastered → graduated, interval >= 21, reps >= 4
  { graduated: true, minInterval: 21, minReps: 4 },
  // 5: Engraved → graduated, interval >= 90, reps >= 7
  { graduated: true, minInterval: 90, minReps: 7 },
]

// ─── Compute a card's mastery stage ───────────────────────────────────────
// Returns: { stage, stageIndex, progress, stumbled }
//   stage      — the STAGES entry (display-adjusted)
//   stageIndex — 0–5 (display-adjusted)
//   progress   — 0–100 within the current stage (toward next stage)
//   stumbled   — true if stumbledDate is today (stage frozen)

export function getMasteryStage(p) {
  if (!p) {
    return { stage: STAGES[0], stageIndex: 0, progress: 0, stumbled: false }
  }

  const today = new Date().toISOString().split('T')[0]
  const stumbled = p.stumbledDate === today

  // Determine true stage index (highest stage whose thresholds are met)
  let stageIndex = 1 // At minimum, if progress exists, you're Kindled

  if (p.graduated) {
    stageIndex = 2 // Familiar
    if (p.interval >= 7  && p.reps >= 2) stageIndex = 3 // Tempered
    if (p.interval >= 21 && p.reps >= 4) stageIndex = 4 // Mastered
    if (p.interval >= 90 && p.reps >= 7) stageIndex = 5 // Engraved
  }

  // If stumbled today, cap display at one stage below actual
  const displayIndex = stumbled && stageIndex > 1 ? stageIndex - 1 : stageIndex

  // Calculate progress toward NEXT stage (0–100)
  let progress = 0
  if (displayIndex < 5) {
    progress = calcProgress(p, displayIndex)
  } else {
    progress = 100 // Engraved is the final stage
  }

  return {
    stage: STAGES[displayIndex],
    stageIndex: displayIndex,
    progress,
    stumbled,
  }
}

// ─── Progress calculation within a stage ──────────────────────────────────
// Uses the two bottleneck metrics (interval and reps) and measures how far
// you are toward the next stage's requirements. The two dimensions are
// averaged so neither one alone can fill the bar — you need both.

function calcProgress(p, currentStageIndex) {
  if (!p || !p.graduated) {
    // Kindled → Familiar: progress = 0 until graduated
    // (graduation is a binary gate, not a gradient)
    return 0
  }

  const nextThreshold = THRESHOLDS[currentStageIndex + 1]
  if (!nextThreshold) return 100

  const prevThreshold = THRESHOLDS[currentStageIndex]

  // Interval progress: how far from current stage min to next stage min
  const intFloor = prevThreshold.minInterval || 0
  const intCeil  = nextThreshold.minInterval
  const intProg  = intCeil > intFloor
    ? Math.min(1, (p.interval - intFloor) / (intCeil - intFloor))
    : 1

  // Reps progress: how far from current stage min to next stage min
  const repFloor = prevThreshold.minReps || 0
  const repCeil  = nextThreshold.minReps
  const repProg  = repCeil > repFloor
    ? Math.min(1, (p.reps - repFloor) / (repCeil - repFloor))
    : 1

  // Average of both dimensions, capped at 95% (can't show 100% without
  // actually reaching the next stage)
  const avg = (intProg + repProg) / 2
  return Math.min(95, Math.round(avg * 100))
}

// ─── Stage filter helpers ─────────────────────────────────────────────────
export function isStageAtLeast(p, stageId) {
  const { stageIndex } = getMasteryStage(p)
  const targetIndex = STAGES.findIndex(s => s.id === stageId)
  return stageIndex >= targetIndex
}
