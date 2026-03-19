import { useState, useMemo } from 'react'
import PRIMITIVES from '@/data/primitives/registry'

// ─── Group by stroke count ───────────────────────────────────────────────
function groupByStroke(items) {
  const groups = {}
  items.forEach(p => {
    const k = p.strokes
    if (!groups[k]) groups[k] = []
    groups[k].push(p)
  })
  return Object.entries(groups).sort(([a], [b]) => +a - +b)
}

// ─── Expanded primitive detail ───────────────────────────────────────────
function PrimitiveDetail({ p, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
      <div
        className="relative bg-ink-800 border border-gold-400/25 rounded-2xl p-6 w-full max-w-[320px]
                   animate-fade-up shadow-xl shadow-black/40"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 font-mono text-[10px] text-parchment-500/40
                     hover:text-parchment-300 transition-colors touch-manipulation"
        >
          ✕
        </button>

        {/* Large character */}
        <div className="text-center mb-4">
          <span className="font-kanji text-[80px] text-parchment-100 leading-none">{p.char}</span>
        </div>

        {/* Name */}
        <div className="text-center mb-4">
          <p className="font-display italic text-xl text-parchment-100">{p.name}</p>
        </div>

        {/* Details grid */}
        <div className="bg-ink-700/50 rounded-xl p-3 space-y-2">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase">Strokes</span>
            <span className="font-mono text-[11px] text-parchment-300">{p.strokes}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase">RTK page</span>
            <span className="font-mono text-[11px] text-parchment-300">p. {p.page}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase">Type</span>
            <span className="font-mono text-[11px] text-parchment-300">{p.pua ? 'Custom glyph' : 'Unicode'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── RadicalsScreen ──────────────────────────────────────────────────────
export default function RadicalsScreen() {
  const [q, setQ]               = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim()
    if (!ql) return PRIMITIVES
    return PRIMITIVES.filter(p =>
      p.name.toLowerCase().includes(ql) ||
      p.char.includes(q) ||
      p.id.includes(ql)
    )
  }, [q])

  const groups = useMemo(() => groupByStroke(filtered), [filtered])

  return (
    <div className="px-5 py-6 pb-10">
      {/* Header */}
      <div className="mb-5 animate-fade-up">
        <h1 className="font-display italic text-2xl text-parchment-100">Primitives Reference</h1>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
          {PRIMITIVES.length} Heisig primitives · The building blocks of all kanji
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5 animate-fade-up delay-100">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-500/30" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or character…"
          className="w-full bg-ink-800 border border-gold-400/15 rounded-xl pl-9 pr-4 py-2.5
                     font-mono text-[12px] text-parchment-300 placeholder-parchment-500/30
                     outline-none focus:border-gold-400/35 transition-colors"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px]
                       text-parchment-500/40 hover:text-parchment-300 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="font-mono text-[10px] text-parchment-500/40 tracking-widest mb-4 animate-fade-up delay-200">
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grouped grid */}
      {groups.map(([strokeCount, items]) => (
        <div key={strokeCount} className="mb-5">
          {/* Stroke count header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] text-gold-400/50 tracking-widest uppercase">
              {strokeCount} stroke{+strokeCount !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 h-px bg-gold-400/8" />
            <span className="font-mono text-[9px] text-parchment-500/25">{items.length}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {items.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="bg-ink-800 border border-gold-400/8 rounded-lg py-2.5 px-1
                           text-center hover:border-gold-400/25 hover:bg-ink-700/50
                           transition-all duration-150 touch-manipulation group"
              >
                <p className="font-kanji text-2xl text-parchment-200 leading-none mb-1
                              group-hover:text-parchment-100 transition-colors">
                  {p.char}
                </p>
                <p className="font-mono text-[9px] text-parchment-500/60 leading-tight truncate px-0.5">
                  {p.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <span className="font-kanji text-4xl text-parchment-500/15">無</span>
          <p className="font-display italic text-parchment-500/40 mt-3">No matches found</p>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <PrimitiveDetail p={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
