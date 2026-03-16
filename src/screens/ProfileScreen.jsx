import { useNavigate } from 'react-router-dom'
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings'

// ─── Achievements ─────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first',    icon: '刀', label: 'First Card',      desc: 'Flip your first card',       earned: true  },
  { id: 'streak7',  icon: '火', label: '7-Day Streak',    desc: 'Study 7 days in a row',      earned: true  },
  { id: 'shadow50', icon: '影', label: 'Shadow Reader',   desc: 'Learn 50 kanji',             earned: false },
  { id: 'phantom',  icon: '仮', label: 'Phantom Thief',   desc: 'Complete the P5R deck',      earned: false },
  { id: 'radical',  icon: '源', label: 'Radical Master',  desc: 'Learn all primitives',       earned: false },
  { id: 'streak30', icon: '月', label: '30-Day Streak',   desc: 'Study 30 days in a row',     earned: false },
]

// ─── Shared SettingRow (same as SettingsScreen, inlined to avoid extra file) ──
function SettingRow({ label, description, value, min, max, step = 1, unit = '', onChange, last = false }) {
  const display = unit === '%' ? `${value}${unit}` : unit ? `${value} ${unit}` : `${value}`
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3.5
                     ${!last ? 'border-b border-gold-400/8' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-parchment-200 leading-tight">{label}</p>
        {description && (
          <p className="font-mono text-[10px] text-parchment-500/50 mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(10)))}
          className="w-8 h-8 rounded-lg bg-ink-700 border border-gold-400/12
                     text-parchment-400 font-mono text-lg leading-none
                     hover:border-gold-400/30 hover:text-gold-400
                     transition-colors duration-150 flex items-center justify-center touch-manipulation"
        >−</button>
        <span className="font-mono text-[12px] text-parchment-100 w-[60px] text-center tabular-nums">
          {display}
        </span>
        <button
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(10)))}
          className="w-8 h-8 rounded-lg bg-ink-700 border border-gold-400/12
                     text-parchment-400 font-mono text-lg leading-none
                     hover:border-gold-400/30 hover:text-gold-400
                     transition-colors duration-150 flex items-center justify-center touch-manipulation"
        >+</button>
      </div>
    </div>
  )
}

function SettingsBlock({ settings, updateSetting, resetToDefaults }) {
  const changed = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)
  const s = settings

  return (
    <div className="space-y-4">
      {/* Daily limits */}
      <div>
        <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase px-1 mb-1.5">
          Daily limits
        </p>
        <div className="bg-ink-800 border border-gold-400/8 rounded-xl overflow-hidden">
          <SettingRow label="New cards / day" value={s.newCardsPerDay}   min={1}  max={9999} step={5}
            onChange={v => updateSetting('newCardsPerDay', v)} />
          <SettingRow label="Max reviews / day" value={s.maxReviewsPerDay} min={10} max={9999} step={10}
            onChange={v => updateSetting('maxReviewsPerDay', v)} last />
        </div>
      </div>

      {/* Intervals */}
      <div>
        <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase px-1 mb-1.5">
          Intervals
        </p>
        <div className="bg-ink-800 border border-gold-400/8 rounded-xl overflow-hidden">
          <SettingRow label="Hard interval" value={s.hardIntervalMins}     min={1}  max={1440} step={5}  unit="min"
            onChange={v => updateSetting('hardIntervalMins', v)} />
          <SettingRow label="Good interval" value={s.goodIntervalDays}     min={1}  max={30}   step={1}  unit="days"
            onChange={v => updateSetting('goodIntervalDays', v)} />
          <SettingRow label="Easy interval" value={s.easyIntervalDays}     min={1}  max={90}   step={1}  unit="days"
            onChange={v => updateSetting('easyIntervalDays', v)} />
          <SettingRow label="Max interval"  value={s.maximumIntervalDays}  min={30} max={36500} step={30} unit="days"
            onChange={v => updateSetting('maximumIntervalDays', v)} last />
        </div>
      </div>

      {/* Ease */}
      <div>
        <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase px-1 mb-1.5">
          Ease factor
        </p>
        <div className="bg-ink-800 border border-gold-400/8 rounded-xl overflow-hidden">
          <SettingRow label="Starting ease"      value={s.startingEase}     min={130} max={500} step={10} unit="%"
            onChange={v => updateSetting('startingEase', v)} />
          <SettingRow label="Easy bonus"         value={s.easyBonus}        min={100} max={300} step={10} unit="%"
            onChange={v => updateSetting('easyBonus', v)} />
          <SettingRow label="Interval modifier"  value={s.intervalModifier} min={50}  max={500} step={5}  unit="%"
            onChange={v => updateSetting('intervalModifier', v)} />
          <SettingRow label="Minimum ease"       value={s.minimumEase}      min={100} max={250} step={5}  unit="%"
            onChange={v => updateSetting('minimumEase', v)} last />
        </div>
      </div>

      {changed && (
        <button
          onClick={() => { if (window.confirm('Reset all settings to defaults?')) resetToDefaults() }}
          className="w-full border border-ember/20 text-ember/60 font-mono text-[10px]
                     tracking-widest uppercase py-3 rounded-xl hover:border-ember/40
                     hover:text-ember transition-colors duration-200"
        >
          Reset to defaults
        </button>
      )}
    </div>
  )
}

// ─── ProfileScreen ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigate                           = useNavigate()
  const { settings, updateSetting, resetToDefaults } = useSettings()

  return (
    <div className="px-5 py-6 pb-10 space-y-6">

      {/* ── Avatar + name ── */}
      <div className="flex items-center gap-4 animate-fade-up">
        <div className="w-16 h-16 rounded-full border-2 border-gold-400/40
                        flex items-center justify-center font-kanji text-3xl text-gold-400">
          侍
        </div>
        <div>
          <h1 className="font-display italic text-2xl text-parchment-100">Phantom</h1>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-0.5">
            Member since March 2026
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up delay-100">
        {[{ n: '14', l: 'Learned' }, { n: '12', l: 'Day streak' }, { n: '1', l: 'Decks' }].map(({ n, l }) => (
          <div key={l} className="bg-ink-800 rounded-xl p-3 text-center border border-gold-400/10">
            <p className="font-display italic text-3xl text-gold-400 leading-none">{n}</p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* ── Achievements ── */}
      <div className="animate-fade-up delay-200">
        <div className="gold-divider mb-4">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
            Achievements
          </span>
        </div>
        <div className="space-y-2">
          {ACHIEVEMENTS.map((a, i) => (
            <div
              key={a.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border
                          transition-colors animate-fade-up
                          ${a.earned ? 'bg-ink-800 border-gold-400/15' : 'bg-ink-900 border-gold-400/6'}`}
              style={{ animationDelay: `${(i + 3) * 0.06}s`, opacity: a.earned ? 1 : 0.45 }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                               font-kanji text-lg shrink-0
                               ${a.earned ? 'bg-gold-400/10 text-gold-400' : 'bg-ink-700 text-parchment-500/30'}`}>
                {a.icon}
              </div>
              <div>
                <p className={`font-display italic text-base leading-tight
                               ${a.earned ? 'text-parchment-200' : 'text-parchment-500'}`}>{a.label}</p>
                <p className="font-mono text-[10px] text-parchment-500 tracking-wide">{a.desc}</p>
              </div>
              {a.earned && <span className="ml-auto font-mono text-[9px] text-gold-400">✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── SRS Settings ── */}
      <div className="animate-fade-up">
        <div className="gold-divider mb-4">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
            Study settings
          </span>
        </div>
        <SettingsBlock
          settings={settings}
          updateSetting={updateSetting}
          resetToDefaults={resetToDefaults}
        />
        <p className="font-mono text-[9px] text-parchment-500/30 tracking-widest uppercase
                      text-center mt-4">
          Settings apply immediately · Progress is never deleted
        </p>
      </div>

      {/* ── Account ── */}
      <div className="animate-fade-up">
        <div className="gold-divider mb-4">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
            Account
          </span>
        </div>
        <div className="space-y-1">
          {['Edit profile', 'Manage subscription', 'Sync progress', 'Sign out'].map(label => (
            <button key={label}
              className="w-full text-left px-1 py-3 font-display italic text-parchment-400
                         border-b border-gold-400/8 hover:text-gold-400 transition-colors
                         text-base last:border-0">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
