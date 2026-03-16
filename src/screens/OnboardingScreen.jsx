import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding, PACE_PRESETS, EXPERIENCE_LEVELS, AVATAR_OPTIONS } from '@/hooks/useOnboarding'
import { useSettings } from '@/hooks/useSettings'

const TOTAL_STEPS = 6

// ─── Progress Bar ────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  const pct = Math.round((step / (TOTAL_STEPS - 1)) * 100)
  return (
    <div className="h-[2px] bg-ink-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-gold-400/70 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Step wrapper (shared layout) ────────────────────────────────────────
function StepShell({ children, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center px-6 animate-fade-up ${className}`}>
      {children}
    </div>
  )
}

// ─── Step 0: Welcome ─────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  return (
    <StepShell>
      {/* Floating ghost kanji */}
      <div className="relative mb-6 select-none pointer-events-none">
        <span className="font-kanji text-[120px] leading-none text-gold-400/[0.08]
                         animate-fade-up">
          漢
        </span>
        <span className="absolute inset-0 font-kanji text-[120px] leading-none
                         text-gold-400/[0.04] blur-lg animate-fade-up delay-200">
          漢
        </span>
      </div>

      {/* Title */}
      <h1 className="font-display italic text-4xl text-gold-400 mb-2 animate-fade-up delay-100">
        KanjiQuest
      </h1>
      <p className="font-kanji text-sm text-gold-400/30 mb-6 animate-fade-up delay-100">
        漢字クエスト
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 w-24 mb-6 animate-fade-up delay-200">
        <div className="flex-1 h-px bg-gold-400/20" />
        <span className="font-kanji text-gold-400/25 text-xs">·</span>
        <div className="flex-1 h-px bg-gold-400/20" />
      </div>

      {/* Tagline */}
      <p className="font-display italic text-xl text-parchment-200 leading-relaxed mb-3
                    animate-fade-up delay-200">
        Study the kanji before you play.
      </p>
      <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[300px] mb-10
                    animate-fade-up delay-300">
        Master the kanji from your favorite JRPGs — so when you play in Japanese,
        you can actually read what's on screen.
      </p>

      {/* CTA */}
      <button
        onClick={onNext}
        className="w-full max-w-[280px] bg-gold-400/10 border border-gold-400/40
                   text-gold-400 font-display italic text-xl py-4 rounded-xl
                   hover:bg-gold-400/20 hover:border-gold-400/60
                   transition-all duration-200 animate-fade-up delay-400"
      >
        Get started
      </button>

      <p className="font-mono text-[9px] text-parchment-500/25 tracking-widest uppercase mt-4
                    animate-fade-up delay-500">
        Takes less than a minute
      </p>
    </StepShell>
  )
}

// ─── Step 1: Name + Avatar ───────────────────────────────────────────────
function NameStep({ profile, updateProfile, onNext }) {
  const inputRef = useRef(null)
  const [localName, setLocalName] = useState(profile.displayName)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400)
    return () => clearTimeout(t)
  }, [])

  function handleContinue() {
    const trimmed = localName.trim()
    if (!trimmed) return
    updateProfile('displayName', trimmed)
    onNext()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleContinue()
  }

  return (
    <StepShell>
      {/* Avatar preview */}
      <div className="w-20 h-20 rounded-full border-2 border-gold-400/30 bg-ink-800
                      flex items-center justify-center mb-6 animate-fade-up
                      transition-all duration-300">
        <span className="font-kanji text-4xl text-gold-400/80">{profile.avatarKanji}</span>
      </div>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        What should we call you?
      </h2>
      <p className="font-body text-sm text-parchment-500 mb-6 animate-fade-up delay-100">
        This appears on your dashboard and profile.
      </p>

      {/* Name input */}
      <input
        ref={inputRef}
        type="text"
        value={localName}
        onChange={e => setLocalName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Your name"
        maxLength={20}
        className="w-full max-w-[280px] bg-ink-800 border border-gold-400/20 rounded-xl
                   px-4 py-3.5 text-center font-display italic text-xl text-parchment-100
                   placeholder:text-parchment-500/30 focus:border-gold-400/50
                   focus:outline-none transition-colors duration-200 mb-6
                   animate-fade-up delay-200"
      />

      {/* Avatar picker */}
      <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase mb-3
                    animate-fade-up delay-200">
        Choose your avatar kanji
      </p>
      <div className="grid grid-cols-6 gap-2 mb-8 animate-fade-up delay-300">
        {AVATAR_OPTIONS.map(({ kanji, label }) => (
          <button
            key={kanji}
            onClick={() => updateProfile('avatarKanji', kanji)}
            title={label}
            className={`w-11 h-11 rounded-lg flex items-center justify-center
                        font-kanji text-xl transition-all duration-200 touch-manipulation
                        ${profile.avatarKanji === kanji
                          ? 'bg-gold-400/15 border-2 border-gold-400/60 text-gold-400 scale-110'
                          : 'bg-ink-800 border border-gold-400/10 text-parchment-400 hover:border-gold-400/30'
                        }`}
          >
            {kanji}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleContinue}
        disabled={!localName.trim()}
        className={`w-full max-w-[280px] border font-display italic text-lg py-3.5 rounded-xl
                    transition-all duration-200 animate-fade-up delay-300
                    ${localName.trim()
                      ? 'bg-gold-400/10 border-gold-400/40 text-gold-400 hover:bg-gold-400/20'
                      : 'border-parchment-500/15 text-parchment-500/30 cursor-not-allowed'
                    }`}
      >
        Continue
      </button>
    </StepShell>
  )
}

// ─── Step 2: Experience Level ────────────────────────────────────────────
function ExperienceStep({ profile, updateProfile, onNext }) {
  const entries = Object.entries(EXPERIENCE_LEVELS)

  return (
    <StepShell>
      <span className="font-kanji text-5xl text-gold-400/15 mb-4 animate-fade-up">
        {EXPERIENCE_LEVELS[profile.experienceLevel]?.kanji ?? '初'}
      </span>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        How much Japanese do you know?
      </h2>
      <p className="font-body text-sm text-parchment-500 mb-6 animate-fade-up delay-100">
        This helps us recommend where to start.
      </p>

      <div className="w-full max-w-[320px] space-y-2 mb-8">
        {entries.map(([key, { label, description, kanji }], i) => (
          <button
            key={key}
            onClick={() => updateProfile('experienceLevel', key)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200
                        animate-fade-up touch-manipulation
                        ${profile.experienceLevel === key
                          ? 'bg-gold-400/10 border-gold-400/40'
                          : 'bg-ink-800 border-gold-400/8 hover:border-gold-400/25'
                        }`}
            style={{ animationDelay: `${0.15 + i * 0.06}s` }}
          >
            <div className="flex items-center gap-3">
              <span className={`font-kanji text-xl shrink-0 transition-colors duration-200
                               ${profile.experienceLevel === key ? 'text-gold-400' : 'text-parchment-500/40'}`}>
                {kanji}
              </span>
              <div>
                <p className={`font-display italic text-base leading-tight transition-colors duration-200
                              ${profile.experienceLevel === key ? 'text-parchment-100' : 'text-parchment-300'}`}>
                  {label}
                </p>
                <p className="font-mono text-[10px] text-parchment-500 mt-0.5">
                  {description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-[280px] bg-gold-400/10 border border-gold-400/40
                   text-gold-400 font-display italic text-lg py-3.5 rounded-xl
                   hover:bg-gold-400/20 transition-all duration-200 animate-fade-up delay-400"
      >
        Continue
      </button>
    </StepShell>
  )
}

// ─── Step 3: Study Pace ──────────────────────────────────────────────────
function PaceStep({ profile, updateProfile, onNext }) {
  const entries = Object.entries(PACE_PRESETS)

  return (
    <StepShell>
      <span className="font-kanji text-5xl text-gold-400/15 mb-4 animate-fade-up">日</span>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        Set your daily goal
      </h2>
      <p className="font-body text-sm text-parchment-500 mb-6 animate-fade-up delay-100">
        How many new cards do you want to learn each day?
        You can always change this later.
      </p>

      <div className="w-full max-w-[320px] space-y-2 mb-8">
        {entries.map(([key, { label, subtitle, description, emoji }], i) => (
          <button
            key={key}
            onClick={() => updateProfile('studyPace', key)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200
                        animate-fade-up touch-manipulation
                        ${profile.studyPace === key
                          ? 'bg-gold-400/10 border-gold-400/40'
                          : 'bg-ink-800 border-gold-400/8 hover:border-gold-400/25'
                        }`}
            style={{ animationDelay: `${0.15 + i * 0.06}s` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0 w-8 text-center">{emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className={`font-display italic text-base leading-tight transition-colors duration-200
                                ${profile.studyPace === key ? 'text-parchment-100' : 'text-parchment-300'}`}>
                    {label}
                  </p>
                  <span className="font-mono text-[10px] text-parchment-500">{subtitle}</span>
                </div>
                <p className="font-mono text-[10px] text-parchment-500/60 mt-0.5">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-[280px] bg-gold-400/10 border border-gold-400/40
                   text-gold-400 font-display italic text-lg py-3.5 rounded-xl
                   hover:bg-gold-400/20 transition-all duration-200 animate-fade-up delay-400"
      >
        Continue
      </button>
    </StepShell>
  )
}

// ─── Step 4: How It Works ────────────────────────────────────────────────
function HowItWorksStep({ onNext }) {
  const steps = [
    {
      kanji:   '本',
      title:   'Pick a game deck',
      body:    'Each deck contains the kanji from a specific JRPG. Every card comes from real in-game text — menus, dialogue, and story.',
    },
    {
      kanji:   '学',
      title:   'Study with flashcards',
      body:    'Cards show you kanji, readings, meanings, and mnemonic stories. Tap to flip, then rate how well you knew it.',
    },
    {
      kanji:   '繰',
      title:   'Spaced repetition does the rest',
      body:    'Cards you know well come back less often. Cards you struggle with come back sooner. Over time, everything sticks.',
    },
  ]

  return (
    <StepShell>
      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up">
        How KanjiQuest works
      </h2>
      <p className="font-body text-sm text-parchment-500 mb-8 animate-fade-up delay-100">
        Three simple steps to reading Japanese.
      </p>

      <div className="w-full max-w-[320px] space-y-4 mb-8">
        {steps.map(({ kanji, title, body }, i) => (
          <div
            key={i}
            className="flex items-start gap-4 text-left animate-fade-up"
            style={{ animationDelay: `${0.15 + i * 0.1}s` }}
          >
            {/* Numbered kanji badge */}
            <div className="w-12 h-12 rounded-xl bg-ink-800 border border-gold-400/15
                            flex flex-col items-center justify-center shrink-0 relative">
              <span className="font-kanji text-lg text-gold-400/60 leading-none">{kanji}</span>
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full
                               bg-gold-400 flex items-center justify-center
                               font-mono text-[10px] text-ink-950 font-medium leading-none">
                {i + 1}
              </span>
            </div>

            <div className="pt-0.5">
              <p className="font-display italic text-base text-parchment-200 leading-tight mb-1">
                {title}
              </p>
              <p className="font-body text-[12px] text-parchment-500 leading-relaxed">
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-[280px] bg-gold-400/10 border border-gold-400/40
                   text-gold-400 font-display italic text-lg py-3.5 rounded-xl
                   hover:bg-gold-400/20 transition-all duration-200 animate-fade-up delay-500"
      >
        Continue
      </button>
    </StepShell>
  )
}

// ─── Step 5: Ready (summary + launch) ────────────────────────────────────
function ReadyStep({ profile, onFinish }) {
  const pace = PACE_PRESETS[profile.studyPace]
  const exp  = EXPERIENCE_LEVELS[profile.experienceLevel]

  // Determine recommended starting point
  const isNewToKanji = profile.experienceLevel === 'none' || profile.experienceLevel === 'kana'
  const recommendation = isNewToKanji
    ? 'We recommend starting with How to Read Kanji — it teaches you the building blocks every kanji is made from.'
    : 'You\'re ready to jump into a game deck. The How to Read Kanji deck is also available if you want to fill any gaps.'

  return (
    <StepShell>
      {/* Avatar */}
      <div className="w-20 h-20 rounded-full border-2 border-gold-400/40 bg-ink-800
                      flex items-center justify-center mb-4 animate-fade-up">
        <span className="font-kanji text-4xl text-gold-400">{profile.avatarKanji}</span>
      </div>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-1 animate-fade-up delay-100">
        You're all set, <span className="text-gold-400">{profile.displayName}</span>
      </h2>
      <p className="font-body text-sm text-parchment-500 mb-8 animate-fade-up delay-100">
        Here's your study plan.
      </p>

      {/* Summary card */}
      <div className="w-full max-w-[320px] bg-ink-800 border border-gold-400/15 rounded-xl
                      p-5 mb-6 text-left animate-fade-up delay-200">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase">
              Daily pace
            </span>
            <span className="font-display italic text-parchment-200 text-sm">
              {pace?.emoji} {pace?.label} — {pace?.subtitle}
            </span>
          </div>
          <div className="h-px bg-gold-400/8" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase">
              Experience
            </span>
            <span className="font-display italic text-parchment-200 text-sm">
              {exp?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="w-full max-w-[320px] bg-ink-700/50 border border-gold-400/10 rounded-xl
                      p-4 mb-8 text-left animate-fade-up delay-300">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-widest uppercase mb-2">
          Recommended
        </p>
        <p className="font-body text-[12px] text-parchment-400 leading-relaxed">
          {recommendation}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onFinish}
        className="w-full max-w-[280px] bg-gold-400/12 border border-gold-400/50
                   text-gold-400 font-display italic text-xl py-4 rounded-xl
                   hover:bg-gold-400/20 hover:border-gold-400/70
                   transition-all duration-200 animate-fade-up delay-400"
      >
        Enter KanjiQuest
      </button>

      <p className="font-mono text-[9px] text-parchment-500/25 tracking-widest uppercase mt-4
                    animate-fade-up delay-500">
        You can change any of these in Settings
      </p>
    </StepShell>
  )
}

// ─── OnboardingScreen ────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const navigate = useNavigate()
  const { profile, updateProfile, completeOnboarding } = useOnboarding()
  const { updateSetting } = useSettings()
  const [step, setStep] = useState(0)
  const scrollRef = useRef(null)

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)) }
  function back() { setStep(s => Math.max(s - 1, 0)) }

  function handleFinish() {
    // Apply pace preset to SRS settings
    const pace = PACE_PRESETS[profile.studyPace]
    if (pace) {
      updateSetting('newCardsPerDay',   pace.newCardsPerDay)
      updateSetting('maxReviewsPerDay', pace.maxReviewsPerDay)
    }

    completeOnboarding()
    navigate('/library', { replace: true })
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto">
      {/* Top area: back button + progress */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          {step > 0 ? (
            <button
              onClick={back}
              className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase
                         hover:text-parchment-300 transition-colors touch-manipulation"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <span className="font-mono text-[10px] text-parchment-500/30 tracking-widest tabular-nums">
            {step > 0 ? `${step} / ${TOTAL_STEPS - 1}` : ''}
          </span>
        </div>
        {step > 0 && <ProgressBar step={step} />}
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col justify-center py-6">
        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <NameStep profile={profile} updateProfile={updateProfile} onNext={next} />}
        {step === 2 && <ExperienceStep profile={profile} updateProfile={updateProfile} onNext={next} />}
        {step === 3 && <PaceStep profile={profile} updateProfile={updateProfile} onNext={next} />}
        {step === 4 && <HowItWorksStep onNext={next} />}
        {step === 5 && <ReadyStep profile={profile} onFinish={handleFinish} />}
      </div>
    </div>
  )
}
