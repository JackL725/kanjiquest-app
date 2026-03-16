import { useNavigate } from 'react-router-dom'
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings'

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
            Customize your SRS experience
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

      {/* ── Intervals ── */}
      <Section label="Intervals">
        <SettingRow
          label="Hard interval"
          description="How soon a Hard card reappears"
          value={s.hardIntervalMins}
          min={1} max={1440} step={5}
          unit="min"
          onChange={v => updateSetting('hardIntervalMins', v)}
        />
        <SettingRow
          label="Good interval"
          description="Days until a Good card is due again (first rep)"
          value={s.goodIntervalDays}
          min={1} max={30} step={1}
          unit="days"
          onChange={v => updateSetting('goodIntervalDays', v)}
        />
        <SettingRow
          label="Easy interval"
          description="Days until an Easy card is due again (first rep)"
          value={s.easyIntervalDays}
          min={1} max={90} step={1}
          unit="days"
          onChange={v => updateSetting('easyIntervalDays', v)}
        />
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

      {/* ── Ease Factor ── */}
      <Section label="Ease factor">
        <SettingRow
          label="Starting ease"
          description="Initial interval multiplier for new cards"
          value={s.startingEase}
          min={130} max={500} step={10}
          unit="%"
          onChange={v => updateSetting('startingEase', v)}
        />
        <SettingRow
          label="Easy bonus"
          description="Extra multiplier applied when rating Easy"
          value={s.easyBonus}
          min={100} max={300} step={10}
          unit="%"
          onChange={v => updateSetting('easyBonus', v)}
        />
        <SettingRow
          label="Interval modifier"
          description="Global multiplier applied to all review intervals"
          value={s.intervalModifier}
          min={50} max={500} step={5}
          unit="%"
          onChange={v => updateSetting('intervalModifier', v)}
        />
        <SettingRow
          label="Minimum ease"
          description="Ease factor cannot drop below this value"
          value={s.minimumEase}
          min={100} max={250} step={5}
          unit="%"
          onChange={v => updateSetting('minimumEase', v)}
          last
        />
      </Section>

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
