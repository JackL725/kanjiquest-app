const ACHIEVEMENTS = [
  { id: 'first', icon: '刀', label: 'First Card', desc: 'Flip your first card', earned: true },
  { id: 'streak7', icon: '火', label: '7-Day Streak', desc: 'Study 7 days in a row', earned: true },
  { id: 'shadow50', icon: '影', label: 'Shadow Reader', desc: 'Learn 50 kanji', earned: false },
  { id: 'phantom', icon: '仮', label: 'Phantom Thief', desc: 'Complete the P5R deck', earned: false },
  { id: 'radical', icon: '源', label: 'Radical Master', desc: 'Learn all primitives', earned: false },
  { id: 'streak30', icon: '月', label: '30-Day Streak', desc: 'Study 30 days in a row', earned: false },
]

export default function ProfileScreen() {
  return (
    <div className="px-5 py-6">

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-8 animate-fade-up">
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-up delay-100">
        {[
          { n: '14',  l: 'Learned' },
          { n: '12',  l: 'Day streak' },
          { n: '1',   l: 'Decks' },
        ].map(({ n, l }) => (
          <div key={l} className="bg-ink-800 rounded-xl p-3 text-center border border-gold-400/10">
            <p className="font-display italic text-3xl text-gold-400 leading-none">{n}</p>
            <p className="font-mono text-[9px] text-parchment-500 tracking-widest uppercase mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="gold-divider mb-4 animate-fade-up delay-200">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
          Achievements
        </span>
      </div>

      {/* Achievements */}
      <div className="space-y-2 mb-8">
        {ACHIEVEMENTS.map((a, i) => (
          <div
            key={a.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border
                        animate-fade-up transition-colors
                        ${a.earned
                          ? 'bg-ink-800 border-gold-400/15'
                          : 'bg-ink-900 border-gold-400/6 opacity-50'}`}
            style={{ animationDelay: `${(i + 3) * 0.06}s`, opacity: a.earned ? undefined : 0 }}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                             font-kanji text-lg shrink-0
                             ${a.earned
                               ? 'bg-gold-400/10 text-gold-400'
                               : 'bg-ink-700 text-parchment-500/30'}`}>
              {a.icon}
            </div>
            <div>
              <p className={`font-display italic text-base leading-tight
                             ${a.earned ? 'text-parchment-200' : 'text-parchment-500'}`}>
                {a.label}
              </p>
              <p className="font-mono text-[10px] text-parchment-500 tracking-wide">{a.desc}</p>
            </div>
            {a.earned && (
              <div className="ml-auto">
                <span className="font-mono text-[9px] text-gold-400 tracking-widest">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="gold-divider mb-4 animate-fade-up">
        <span className="font-mono text-[9px] tracking-widest uppercase text-parchment-500">
          Account
        </span>
      </div>

      {/* Settings stubs */}
      <div className="space-y-1 animate-fade-up">
        {['Edit profile', 'Manage subscription', 'Sync progress', 'Sign out'].map(label => (
          <button
            key={label}
            className="w-full text-left px-1 py-3 font-display italic text-parchment-400
                       border-b border-gold-400/8 hover:text-gold-400 transition-colors
                       text-base last:border-0"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
