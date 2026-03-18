import { useNavigate } from 'react-router-dom'
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings'
import { useState, useEffect } from 'react'
import { useAudio, writeAudioSettings } from '@/hooks/useAudio'

// ─── Section header ───────────────────────────────────────────────────────
function Section({ label, children }) {
  return (
    <div className="mb-2 animate-fade-up">
      <div className="gold-divider mb-1">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
          {label}
        </span>
      </div>
      <div className="bg-ink-800 border border-gold-400/8 rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ─── Setting row with stepper ─────────────────────────────────────────────
function SettingRow({ label, description, value, min, max, step = 1, unit = '', onChange, last = false }) {
  const display = unit === '%' ? `${value}${unit}` : unit ? `${value} ${unit}` : `${value}`

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3.5
                     ${!last ? 'border-b border-gold-400/8' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-parchment-200 leading-tight">{label}</p>
        <p className="font-mono text-[10px] text-parchment-500/60 mt-0.5 leading-snug">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(10)))}
          className="w-8 h-8 rounded-lg bg-ink-700 border border-gold-400/12
                     text-parchment-400 font-mono text-lg leading-none
                     hover:border-gold-400/30 hover:text-gold-400
                     transition-colors duration-150 flex items-center justify-center
                     touch-manipulation"
        >
          −
        </button>
        <span className="font-mono text-[12px] text-parchment-100 w-[64px] text-center tabular-nums">
          {display}
        </span>
        <button
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(10)))}
          className="w-8 h-8 rounded-lg bg-ink-700 border border-gold-400/12
                     text-parchment-400 font-mono text-lg leading-none
                     hover:border-gold-400/30 hover:text-gold-400
                     transition-colors duration-150 flex items-center justify-center
                     touch-manipulation"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Retention slider ───────────────────────────────────────────────────
function RetentionSlider({ value, onChange }) {
  const pct = Math.round(value * 100)

  // Color shifts: green (high retention) → gold (balanced) → amber (low retention)
  const colorClass =
    pct >= 92 ? 'text-emerald-400' :
    pct >= 85 ? 'text-blue-400' :
    pct >= 80 ? 'text-gold-400' :
    'text-amber-500'

  const desc =
    pct >= 95 ? 'Very high retention — many reviews, excellent recall' :
    pct >= 90 ? 'Recommended — good balance of retention and workload' :
    pct >= 85 ? 'Moderate — fewer reviews, some forgetting is expected' :
    pct >= 80 ? 'Relaxed — lighter workload, more re-learning' :
    'Minimal — least reviews, but you will forget more cards'

  return (
    <div className="px-4 py-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="font-body text-sm text-parchment-200">Desired retention</p>
        <span className={`font-display italic text-2xl tabular-nums ${colorClass}`}>
          {pct}%
        </span>
      </div>
      <p className="font-mono text-[10px] text-parchment-500/60 mb-4 leading-snug">
        {desc}
      </p>

      <input
        type="range"
        min={70} max={97} step={1}
        value={pct}
        onChange={e => onChange(parseInt(e.target.value, 10) / 100)}
        className="w-full h-1.5 bg-ink-600 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                   [&::-webkit-slider-thumb]:bg-gold-400 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-gold-400/20
                   [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-800
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:appearance-none
                   [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                   [&::-moz-range-thumb]:bg-gold-400 [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink-800
                   [&::-moz-range-thumb]:cursor-pointer"
      />
      <div className="flex justify-between mt-1.5">
        <span className="font-mono text-[8px] text-parchment-500/30 tracking-widest">FEWER REVIEWS</span>
        <span className="font-mono text-[8px] text-parchment-500/30 tracking-widest">BETTER RECALL</span>
      </div>
    </div>
  )
}

// ─── Toggle row ──────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onChange, last = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3.5
                     ${!last ? 'border-b border-gold-400/8' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-parchment-200 leading-tight">{label}</p>
        <p className="font-mono text-[10px] text-parchment-500/60 mt-0.5 leading-snug">
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full border transition-colors duration-200 relative shrink-0
          ${value ? 'bg-gold-400/20 border-gold-400/40' : 'bg-ink-700 border-ink-500'}`}
      >
        <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all duration-200
          ${value ? 'left-[21px] bg-gold-400' : 'left-[3px] bg-parchment-500/50'}`} />
      </button>
    </div>
  )
}

// ─── Audio settings section ──────────────────────────────────────────────
function AudioSection() {
  const AUDIO_KEY = 'kq-audio-settings'
  const { speak, isAvailable } = useAudio()

  const [audio, setAudio] = useState(() => {
    try {
      const raw = localStorage.getItem(AUDIO_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      return {
        enabled: parsed.enabled !== false,
        autoPlay: parsed.autoPlay !== false,
        rate: parsed.rate ?? 0.85,
      }
    } catch {
      return { enabled: true, autoPlay: true, rate: 0.85 }
    }
  })

  function update(key, val) {
    const next = { ...audio, [key]: val }
    setAudio(next)
    writeAudioSettings(next)
  }

  function testAudio() {
    speak('漢字', { force: true, rate: audio.rate })
  }

  return (
    <Section label="Audio">
      <ToggleRow
        label="Pronunciation audio"
        description={isAvailable ? 'Play Japanese TTS when cards are revealed' : 'No Japanese voice available on this device'}
        value={audio.enabled}
        onChange={v => update('enabled', v)}
      />
      <ToggleRow
        label="Auto-play on flip"
        description="Automatically pronounce when you reveal a card"
        value={audio.autoPlay}
        onChange={v => update('autoPlay', v)}
      />
      <SettingRow
        label="Speech rate"
        description="Speed of pronunciation audio"
        value={audio.rate}
        min={0.5} max={1.5} step={0.05}
        onChange={v => update('rate', Math.round(v * 100) / 100)}
        last
      />
      {isAvailable && (
        <div className="px-4 py-3 border-t border-gold-400/8">
          <button
            onClick={testAudio}
            className="font-mono text-[10px] text-gold-400/60 tracking-widest uppercase
                       hover:text-gold-400 transition-colors"
          >
            ▶ Test: 漢字 (kanji)
          </button>
        </div>
      )}
    </Section>
  )
}

// ─── SettingsScreen ───────────────────────────────────────────────────────
export default function SettingsScreen() {
  const navigate = useNavigate()
  const { settings, updateSetting, resetToDefaults } = useSettings()
  const s = settings

  const changed = JSON.stringify(s) !== JSON.stringify(DEFAULT_SETTINGS)

  return (
    <div className="px-5 py-6 pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="font-display italic text-2xl text-parchment-100">Study settings</h1>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
            Powered by FSRS
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase
                     hover:text-parchment-300 transition-colors pt-1 touch-manipulation"
        >
          ← Back
        </button>
      </div>

      {/* ── FSRS Algorithm ── */}
      <Section label="Algorithm">
        <RetentionSlider
          value={s.desiredRetention}
          onChange={v => updateSetting('desiredRetention', v)}
        />
        <div className="h-px bg-gold-400/8" />
        <SettingRow
          label="Maximum interval"
          description="Cards will never be scheduled further than this"
          value={s.maximumIntervalDays}
          min={30} max={36500} step={30}
          unit="days"
          onChange={v => updateSetting('maximumIntervalDays', v)}
          last
        />
      </Section>

      {/* FSRS explainer */}
      <div className="bg-ink-800/50 border border-gold-400/8 rounded-xl px-4 py-3.5 animate-fade-up">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">How FSRS works</p>
        <p className="font-mono text-[10px] text-parchment-500/70 leading-relaxed">
          FSRS uses a machine-learning model to predict exactly when you're about to forget each card.
          It tracks memory <em className="not-italic text-parchment-400">stability</em> (how durable the memory is)
          and <em className="not-italic text-parchment-400">difficulty</em> (how hard the card is for you specifically)
          to schedule reviews at the optimal time — right before the probability of recall drops below your desired retention.
        </p>
        <p className="font-mono text-[10px] text-parchment-500/50 leading-relaxed mt-2">
          This means ~30% fewer reviews than traditional SRS algorithms like SM-2, with the same or better retention.
        </p>
      </div>

      {/* ── Daily Limits ── */}
      <Section label="Daily limits">
        <SettingRow
          label="New cards per day"
          description="Maximum new cards introduced in a single day"
          value={s.newCardsPerDay}
          min={1} max={9999} step={5}
          onChange={v => updateSetting('newCardsPerDay', v)}
        />
        <SettingRow
          label="Max reviews per day"
          description="Cap on total review cards shown per day"
          value={s.maxReviewsPerDay}
          min={10} max={9999} step={10}
          onChange={v => updateSetting('maxReviewsPerDay', v)}
          last
        />
      </Section>

      {/* ── Audio ── */}
      <AudioSection />

      {/* Reset */}
      {changed && (
        <button
          onClick={() => {
            if (window.confirm('Reset all settings to defaults?')) resetToDefaults()
          }}
          className="w-full border border-ember/25 text-ember/70 font-mono text-[10px]
                     tracking-widest uppercase py-3.5 rounded-xl
                     hover:border-ember/40 hover:text-ember
                     transition-colors duration-200 animate-fade-up"
        >
          Reset to defaults
        </button>
      )}

      {/* Info footer */}
      <div className="text-center pt-2 animate-fade-up">
        <p className="font-mono text-[9px] text-parchment-500/30 tracking-widest uppercase leading-relaxed">
          Settings apply immediately · Progress is never deleted
        </p>
      </div>
    </div>
  )
}
