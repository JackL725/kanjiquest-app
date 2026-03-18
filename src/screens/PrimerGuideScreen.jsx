import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// ─── localStorage flag ───────────────────────────────────────────────────
const GUIDE_KEY = 'kq-primer-guide-complete'

export function isPrimerGuideComplete() {
  try { return JSON.parse(localStorage.getItem(GUIDE_KEY))?.complete === true } catch { return false }
}

function markGuideComplete() {
  try { localStorage.setItem(GUIDE_KEY, JSON.stringify({ complete: true, at: new Date().toISOString() })) } catch {}
}

// ─── Tutorial card data (first 3 kanji) ──────────────────────────────────
const TUTORIAL_CARDS = [
  {
    kanji: '日', reading: 'ニチ', romaji: 'nichi', meaning: 'day / sun',
    parts: ['日: sun, day, sun radical (no. 72)'],
    story1: 'A window with the curtains open — sunlight streams in, marking the start of a new day.',
    context: '日本（にほん）', contextEn: 'Japan (lit. "origin of the sun")',
  },
  {
    kanji: '月', reading: 'ゲツ', romaji: 'getsu', meaning: 'month / moon',
    parts: ['月: moon, month, moon radical (no. 74)'],
    story1: 'A crescent moon with two horizontal lines — like the moon\'s surface marked by craters.',
    context: '月曜日（げつようび）', contextEn: 'Monday (lit. "moon day")',
  },
  {
    kanji: '明', reading: 'メイ', romaji: 'mei', meaning: 'bright',
    parts: ['日: day; sun', '月: month; moon'],
    story1: 'The sun and the moon shine together in the sky — the two brightest things you can see. Together they make "bright."',
    context: '明日（あした）', contextEn: 'tomorrow (lit. "bright day")',
  },
]

// ─── Shared UI pieces ────────────────────────────────────────────────────
function StepShell({ children, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center px-6 animate-fade-up ${className}`}>
      {children}
    </div>
  )
}

function GoldDivider() {
  return (
    <div className="flex items-center gap-3 w-20 my-6">
      <div className="flex-1 h-px bg-gold-400/20" />
      <span className="font-kanji text-gold-400/25 text-xs">·</span>
      <div className="flex-1 h-px bg-gold-400/20" />
    </div>
  )
}

function ContinueButton({ onClick, label = 'Continue', delay = 'delay-300' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full max-w-[280px] bg-gold-400/10 border border-gold-400/40
                 text-gold-400 font-display italic text-lg py-3.5 rounded-xl
                 hover:bg-gold-400/20 transition-all duration-200 animate-fade-up ${delay}`}
    >
      {label}
    </button>
  )
}

function Footnote({ children, delay = 'delay-400' }) {
  return (
    <p className={`font-mono text-[9px] text-parchment-500/30 tracking-widest uppercase mt-4
                  animate-fade-up ${delay}`}>
      {children}
    </p>
  )
}

// ─── Coaching tooltip ────────────────────────────────────────────────────
function CoachTip({ children, className = '' }) {
  return (
    <div className={`bg-gold-400/10 border border-gold-400/30 rounded-xl px-4 py-3
                    text-left animate-fade-up ${className}`}>
      <div className="flex items-start gap-2.5">
        <span className="font-kanji text-gold-400/60 text-sm mt-0.5 shrink-0">💡</span>
        <p className="font-body text-[12px] text-parchment-300 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

// ─── Step 0: The Method ──────────────────────────────────────────────────
function MethodStep({ onNext }) {
  return (
    <StepShell>
      <span className="font-kanji text-6xl text-gold-400/12 mb-4 animate-fade-up">道</span>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        The method behind the magic
      </h2>
      <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[320px] mb-6
                    animate-fade-up delay-100">
        Most people try to memorize kanji by brute force — staring at shapes
        and hoping they stick. There's a much better way.
      </p>

      <div className="w-full max-w-[320px] text-left space-y-4 mb-8">
        {[
          {
            kanji: '分',
            title: 'Kanji aren\'t random shapes',
            body: 'Every kanji is built from smaller, reusable pieces called radicals and primitives. There are only about 200 of them — and once you know them, new kanji stop looking like chaos.',
          },
          {
            kanji: '想',
            title: 'Your imagination is the key',
            body: 'For each kanji, you build a vivid mental image — a story — that connects its pieces to its meaning. The stranger or funnier the story, the better it sticks.',
          },
          {
            kanji: '順',
            title: 'Order matters',
            body: 'Cards are arranged so you always learn the building blocks before the kanji that use them. You never encounter a piece you haven\'t seen before.',
          },
        ].map(({ kanji, title, body }, i) => (
          <div
            key={i}
            className="flex items-start gap-3.5 animate-fade-up"
            style={{ animationDelay: `${0.2 + i * 0.08}s` }}
          >
            <div className="w-10 h-10 rounded-lg bg-ink-800 border border-gold-400/15
                            flex items-center justify-center shrink-0">
              <span className="font-kanji text-lg text-gold-400/50">{kanji}</span>
            </div>
            <div>
              <p className="font-display italic text-base text-parchment-200 leading-tight mb-1">
                {title}
              </p>
              <p className="font-body text-[12px] text-parchment-500 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <ContinueButton onClick={onNext} delay="delay-500" />
    </StepShell>
  )
}

// ─── Step 1: Radicals & Primitives ───────────────────────────────────────
function RadicalsStep({ onNext }) {
  return (
    <StepShell>
      <span className="font-kanji text-6xl text-gold-400/12 mb-4 animate-fade-up">部</span>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        Radicals & primitives
      </h2>
      <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[320px] mb-6
                    animate-fade-up delay-100">
        Think of kanji like Lego. Every creation uses the same small set of bricks.
      </p>

      {/* Visual decomposition example */}
      <div className="w-full max-w-[320px] bg-ink-800 border border-gold-400/15 rounded-xl
                      p-5 mb-6 animate-fade-up delay-200">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-widest uppercase mb-4">
          Example: how kanji decompose
        </p>

        {/* 休 = 人 + 木 */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-center">
            <span className="font-kanji text-4xl text-parchment-200">休</span>
            <p className="font-mono text-[10px] text-parchment-500 mt-1">rest</p>
          </div>
          <span className="font-mono text-parchment-500/40 text-lg">=</span>
          <div className="text-center">
            <span className="font-kanji text-3xl text-gold-400/70">亻</span>
            <p className="font-mono text-[10px] text-parchment-500 mt-1">person</p>
          </div>
          <span className="font-mono text-parchment-500/40 text-lg">+</span>
          <div className="text-center">
            <span className="font-kanji text-3xl text-gold-400/70">木</span>
            <p className="font-mono text-[10px] text-parchment-500 mt-1">tree</p>
          </div>
        </div>

        <p className="font-body text-[12px] text-parchment-400 leading-relaxed text-center">
          A <span className="text-gold-400">person</span> leaning against a{' '}
          <span className="text-gold-400">tree</span> is taking a{' '}
          <span className="text-parchment-100 font-medium">rest</span>.
        </p>
      </div>

      <div className="w-full max-w-[320px] bg-ink-800 border border-gold-400/15 rounded-xl
                      p-5 mb-6 animate-fade-up delay-300">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-widest uppercase mb-4">
          Another example
        </p>

        {/* 明 = 日 + 月 */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-center">
            <span className="font-kanji text-4xl text-parchment-200">明</span>
            <p className="font-mono text-[10px] text-parchment-500 mt-1">bright</p>
          </div>
          <span className="font-mono text-parchment-500/40 text-lg">=</span>
          <div className="text-center">
            <span className="font-kanji text-3xl text-gold-400/70">日</span>
            <p className="font-mono text-[10px] text-parchment-500 mt-1">sun</p>
          </div>
          <span className="font-mono text-parchment-500/40 text-lg">+</span>
          <div className="text-center">
            <span className="font-kanji text-3xl text-gold-400/70">月</span>
            <p className="font-mono text-[10px] text-parchment-500 mt-1">moon</p>
          </div>
        </div>

        <p className="font-body text-[12px] text-parchment-400 leading-relaxed text-center">
          The <span className="text-gold-400">sun</span> and{' '}
          <span className="text-gold-400">moon</span> together — the two{' '}
          <span className="text-parchment-100 font-medium">brightest</span> things in the sky.
        </p>
      </div>

      <CoachTip className="w-full max-w-[320px] mb-8 delay-300">
        You don't need to memorize all the primitives first.
        This deck teaches them in order — each new kanji only uses pieces you've already seen.
      </CoachTip>

      <ContinueButton onClick={onNext} delay="delay-400" />
    </StepShell>
  )
}

// ─── Step 2: Stories ─────────────────────────────────────────────────────
function StoriesStep({ onNext }) {
  return (
    <StepShell>
      <span className="font-kanji text-6xl text-gold-400/12 mb-4 animate-fade-up">物</span>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        The power of stories
      </h2>
      <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[320px] mb-6
                    animate-fade-up delay-100">
        Your brain is wired to remember stories, not abstract shapes.
        For every kanji, you'll see two community mnemonic stories — and you can write your own.
      </p>

      {/* Example story card */}
      <div className="w-full max-w-[320px] bg-ink-800 border border-gold-400/15 rounded-xl
                      p-5 mb-6 text-left animate-fade-up delay-200 relative overflow-hidden">
        <span className="absolute top-2 right-3 font-kanji text-[60px] leading-none
                         text-parchment-100/[0.06] select-none pointer-events-none">
          休
        </span>
        <p className="font-mono text-[9px] text-gold-400/60 tracking-widest uppercase mb-3">
          Example story for 休 (rest)
        </p>
        <div className="relative pl-5 bg-ink-700/70 rounded-lg p-3 mb-3">
          <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">1</span>
          <p className="font-mono text-[11px] text-parchment-400 leading-relaxed">
            After a long hike, you see a <span className="text-gold-400">person</span> leaning
            against a <span className="text-gold-400">tree</span>, completely at{' '}
            <span className="text-parchment-100">rest</span>. Their eyes are closed and
            they look perfectly peaceful.
          </p>
        </div>
        <p className="font-body text-[11px] text-parchment-500/70 leading-relaxed">
          See how the story uses the <span className="text-gold-400">primitives</span> (person, tree)
          to connect to the <span className="text-parchment-200">meaning</span> (rest)?
          The more vivid and personal, the better.
        </p>
      </div>

      <div className="w-full max-w-[320px] text-left space-y-3 mb-8">
        {[
          { icon: '📖', text: 'Each card has two community stories — read both, use the one that clicks.' },
          { icon: '✏️', text: 'You can write your own story in the "My Story" section. Personal stories stick the best.' },
          { icon: '🎭', text: 'Make your stories weird, funny, or dramatic. Emotion = memory.' },
        ].map(({ icon, text }, i) => (
          <div
            key={i}
            className="flex items-start gap-3 animate-fade-up"
            style={{ animationDelay: `${0.3 + i * 0.07}s` }}
          >
            <span className="text-sm mt-0.5">{icon}</span>
            <p className="font-body text-[12px] text-parchment-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <ContinueButton onClick={onNext} delay="delay-500" />
    </StepShell>
  )
}

// ─── Step 3: Interactive Card Tutorial ───────────────────────────────────
function CardTutorialStep({ onNext }) {
  const card = TUTORIAL_CARDS[0]
  const [flipped, setFlipped] = useState(false)
  const [hasFlipped, setHasFlipped] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const backRef = useRef(null)

  function handleFlip() {
    setFlipped(f => !f)
    if (!hasFlipped) setHasFlipped(true)
  }

  // Detect user scrolling the back of card
  useEffect(() => {
    const el = backRef.current
    if (!el) return
    function onScroll() { if (el.scrollTop > 30) setScrolled(true) }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [flipped])

  return (
    <StepShell className="!items-stretch">
      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up text-center">
        Your first card
      </h2>
      <p className="font-body text-sm text-parchment-500 mb-4 animate-fade-up delay-100 text-center">
        Let's walk through it together.
      </p>

      {/* Coaching prompt */}
      {!flipped && !hasFlipped && (
        <CoachTip className="w-full max-w-[320px] mx-auto mb-4 delay-200">
          This is the <strong className="text-parchment-200">front</strong> of a flashcard.
          You see a kanji and try to recall its meaning.
          The blurred hint below shows its building blocks — hover or tap to peek.
          <br /><br />
          <strong className="text-gold-400">Tap the card to flip it.</strong>
        </CoachTip>
      )}

      {flipped && !scrolled && (
        <CoachTip className="w-full max-w-[320px] mx-auto mb-4">
          This is the <strong className="text-parchment-200">back</strong>.
          You can see the meaning, reading, community stories, and components.
          <strong className="text-gold-400"> Scroll down</strong> to see everything.
        </CoachTip>
      )}

      {flipped && scrolled && (
        <CoachTip className="w-full max-w-[320px] mx-auto mb-4">
          Great! Every card back has: <strong className="text-parchment-200">meaning</strong>,{' '}
          <strong className="text-parchment-200">reading</strong>,{' '}
          <strong className="text-parchment-200">two mnemonic stories</strong>,{' '}
          <strong className="text-parchment-200">a space for your own story</strong>,{' '}
          <strong className="text-parchment-200">components</strong>, and{' '}
          <strong className="text-parchment-200">in-game context</strong>.
        </CoachTip>
      )}

      {/* Mini card */}
      <div className="w-full max-w-[320px] mx-auto animate-fade-up delay-200">
        <div
          className="card-scene w-full"
          style={{ height: '340px' }}
          onClick={handleFlip}
        >
          <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
            {/* Front */}
            <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15
                            rounded-2xl flex flex-col items-center justify-center p-6
                            cursor-pointer select-none">
              <p className="font-mono text-[9px] text-parchment-500/60 tracking-[3px] uppercase mb-6">
                What does this mean?
              </p>
              <p className="font-kanji text-[88px] text-parchment-100 leading-none mb-5">
                {card.kanji}
              </p>
              <p className="font-mono text-[11px] text-parchment-500/70 blur-reveal text-center leading-relaxed">
                {card.parts.join(' · ')}
              </p>
              <p className="font-mono text-[9px] text-parchment-500/25 mt-2.5 tracking-widest">
                hover to peek at components
              </p>
            </div>

            {/* Back */}
            <div className="card-face card-face-back absolute inset-0 bg-ink-800
                            border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
              <span className="absolute top-2 right-3 font-kanji text-[70px] leading-none
                               text-parchment-100 select-none pointer-events-none">
                {card.kanji}
              </span>

              <div ref={backRef} className="h-full overflow-y-auto p-5">
                {/* Meaning */}
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-1.5">
                    Meaning
                  </p>
                  <p className="font-display italic text-2xl text-parchment-100 leading-tight">
                    {card.meaning}
                  </p>
                </div>

                {/* Reading */}
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-1.5">
                    Reading
                  </p>
                  <p className="font-display italic text-lg text-parchment-200">{card.reading}</p>
                  <p className="font-mono text-[11px] text-parchment-500 mt-0.5">{card.romaji}</p>
                </div>

                <div className="h-px bg-gold-400/10 my-3" />

                {/* Stories */}
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">
                    Mnemonic
                  </p>
                  <div className="space-y-2">
                    {[card.story1].filter(Boolean).map((s, i) => (
                      <div key={i} className="relative pl-5 bg-ink-700/70 rounded-lg p-3">
                        <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">
                          
                        </span>
                        <p className="font-mono text-[11px] text-parchment-400 leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* My Story placeholder */}
                <div className="mb-3" onClick={e => e.stopPropagation()}>
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">
                    My story
                  </p>
                  <div className="bg-ink-700/60 border border-gold-400/12 border-dashed rounded-lg
                                  px-3 py-3 text-center">
                    <p className="font-mono text-[10px] text-parchment-500/30">
                      ✏️ Write your own mnemonic here during real study
                    </p>
                  </div>
                </div>

                <div className="h-px bg-gold-400/10 my-3" />

                {/* Components */}
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">
                    Components
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {card.parts.map(p => (
                      <span key={p} className="font-mono text-[10px] text-parchment-500
                                               border border-gold-400/15 rounded px-2 py-0.5">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Context */}
                <div className="mb-2">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">
                    In-game context
                  </p>
                  <p className="font-kanji text-sm text-parchment-300">{card.context}</p>
                  <p className="font-mono text-[10px] text-parchment-500/70 mt-1 italic">
                    {card.contextEn}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue — only after they've flipped */}
      {hasFlipped && (
        <div className="mt-5 flex flex-col items-center animate-fade-up">
          <ContinueButton onClick={onNext} delay="" />
        </div>
      )}

      {!hasFlipped && (
        <p className="font-mono text-[9px] text-parchment-500/25 tracking-widest uppercase
                      mt-4 animate-fade-up delay-300 text-center">
          Tap the card to continue
        </p>
      )}
    </StepShell>
  )
}

// ─── Step 4: Rating Buttons ──────────────────────────────────────────────
function RatingStep({ onNext }) {
  const [selected, setSelected] = useState(null)

  const ratings = [
    {
      label: 'Again', color: 'text-ember', border: 'border-ember/30',
      bg: 'bg-ember/5', bar: 'bg-ember/70', sub: 'reset',
      desc: 'I had no idea. Show this card again soon.',
    },
    {
      label: 'Hard', color: 'text-amber-500', border: 'border-amber-500/30',
      bg: 'bg-amber-500/5', bar: 'bg-amber-500/70', sub: '10m',
      desc: 'I got it wrong, or barely remembered. Show it again in a few minutes.',
    },
    {
      label: 'Good', color: 'text-blue-400', border: 'border-blue-400/30',
      bg: 'bg-blue-400/5', bar: 'bg-blue-400/70', sub: '1d',
      desc: 'I remembered it with some effort. Show it tomorrow.',
    },
    {
      label: 'Easy', color: 'text-emerald-400', border: 'border-emerald-400/30',
      bg: 'bg-emerald-400/5', bar: 'bg-emerald-400/70', sub: '3d',
      desc: 'I knew it instantly. Push it out further.',
    },
  ]

  return (
    <StepShell>
      <span className="font-kanji text-5xl text-gold-400/12 mb-4 animate-fade-up">答</span>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        How to rate yourself
      </h2>
      <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[320px] mb-2
                    animate-fade-up delay-100">
        After flipping each card, you tell the app how well you knew it.
        This drives the spaced repetition system.
      </p>
      <p className="font-body text-[12px] text-parchment-500/70 leading-relaxed max-w-[320px] mb-6
                    animate-fade-up delay-200">
        Cards you struggle with come back soon. Cards you know well space out further and further —
        from days to weeks to months. Over time, everything moves into long-term memory.
      </p>

      {/* Interactive rating demo */}
      <div className="w-full max-w-[320px] mb-4 animate-fade-up delay-200">
        <p className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase mb-3 text-center">
          Tap a button to learn what it does
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ratings.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setSelected(i)}
              className={`relative rounded-xl border overflow-hidden flex flex-col items-center
                          justify-center gap-1.5 py-4 transition-all duration-200 touch-manipulation
                          ${selected === i ? `${r.border} ${r.bg} scale-105 ring-1 ring-white/10` : `${r.border} ${r.bg}`}`}
            >
              <div className={`absolute top-0 inset-x-0 h-[2px] ${r.bar}`} />
              <span className={`font-display italic text-[14px] leading-none ${r.color}`}>
                {r.label}
              </span>
              <span className="font-mono text-[9px] text-parchment-500/50 leading-none">
                {r.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected explanation */}
      {selected !== null && (
        <div className="w-full max-w-[320px] bg-ink-800 border border-gold-400/12 rounded-xl
                        px-4 py-3 mb-6 text-left animate-fade-up">
          <p className={`font-display italic text-base mb-1 ${ratings[selected].color}`}>
            {ratings[selected].label}
          </p>
          <p className="font-body text-[12px] text-parchment-400 leading-relaxed">
            {ratings[selected].desc}
          </p>
        </div>
      )}

      <CoachTip className="w-full max-w-[320px] mb-8 delay-300">
        <strong className="text-parchment-200">Be honest with yourself.</strong> The system only works
        if you rate accurately. It's better to press "Again" and see a card more often than to
        press "Easy" and forget it later.
      </CoachTip>

      <ContinueButton onClick={onNext} delay="delay-400" />
    </StepShell>
  )
}

// ─── Step 5: Practice (cards 2 & 3) ──────────────────────────────────────
function PracticeStep({ onNext }) {
  const [cardIdx, setCardIdx] = useState(0)  // 0 or 1 (cards index 1 and 2)
  const [flipped, setFlipped] = useState(false)
  const [rated, setRated] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const card = TUTORIAL_CARDS[cardIdx + 1] // skip card 0, we already showed it

  function handleFlip() {
    if (!flipped) setFlipped(true)
  }

  function handleRate() {
    setRated(true)
    setTimeout(() => {
      if (cardIdx === 0) {
        // Move to card 3
        setCardIdx(1)
        setFlipped(false)
        setRated(false)
      } else {
        setAllDone(true)
      }
    }, 300)
  }

  const ratingBtns = [
    { label: 'Again', color: 'text-ember', border: 'border-ember/30', bg: 'bg-ember/5 hover:bg-ember/12', bar: 'bg-ember/70' },
    { label: 'Hard',  color: 'text-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/5 hover:bg-amber-500/12', bar: 'bg-amber-500/70' },
    { label: 'Good',  color: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/5 hover:bg-blue-400/12', bar: 'bg-blue-400/70' },
    { label: 'Easy',  color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/5 hover:bg-emerald-400/12', bar: 'bg-emerald-400/70' },
  ]

  if (allDone) {
    return (
      <StepShell>
        <span className="font-kanji text-7xl text-gold-400/15 mb-4 animate-fade-up">完</span>
        <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
          You've got it!
        </h2>
        <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[300px] mb-8
                      animate-fade-up delay-200">
          You just studied your first three kanji: 日, 月, 明.
          That last one — 明 (bright) — was built from the first two.
          That's the whole system in action. Flip, recall, rate, repeat.
        </p>
        <ContinueButton onClick={onNext} delay="delay-300" />
      </StepShell>
    )
  }

  return (
    <StepShell className="!items-stretch">
      <h2 className="font-display italic text-2xl text-parchment-100 mb-1 text-center animate-fade-up">
        Your turn
      </h2>
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mb-4
                    text-center animate-fade-up delay-100">
        Card {cardIdx + 2} of 3
      </p>

      {!flipped && (
        <p className="font-body text-[12px] text-parchment-500/60 text-center mb-3 animate-fade-up delay-100">
          Look at the kanji and try to recall its meaning. Then tap to flip.
        </p>
      )}

      {flipped && !rated && (
        <p className="font-body text-[12px] text-parchment-500/60 text-center mb-3 animate-fade-up">
          Read the back, then pick a rating below.
        </p>
      )}

      {/* Card */}
      <div
        key={cardIdx}
        className="w-full max-w-[320px] mx-auto animate-card-enter"
        style={{ height: '280px' }}
      >
        <div
          className={`card-scene w-full h-full`}
          onClick={handleFlip}
        >
          <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
            {/* Front */}
            <div className="card-face absolute inset-0 bg-ink-800 border border-gold-400/15
                            rounded-2xl flex flex-col items-center justify-center p-6
                            cursor-pointer select-none">
              <p className="font-mono text-[9px] text-parchment-500/60 tracking-[3px] uppercase mb-5">
                What does this mean?
              </p>
              <p className="font-kanji text-[80px] text-parchment-100 leading-none mb-4">
                {card.kanji}
              </p>
              <p className="font-mono text-[11px] text-parchment-500/70 blur-reveal text-center">
                {card.parts.join(' · ')}
              </p>
            </div>

            {/* Back */}
            <div className="card-face card-face-back absolute inset-0 bg-ink-800
                            border border-gold-400/20 rounded-2xl cursor-pointer overflow-hidden">
              <span className="absolute top-2 right-3 font-kanji text-[60px] leading-none
                               text-parchment-100 select-none pointer-events-none">
                {card.kanji}
              </span>
              <div className="h-full overflow-y-auto p-5">
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-1.5">
                    Meaning
                  </p>
                  <p className="font-display italic text-2xl text-parchment-100">{card.meaning}</p>
                </div>
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-1.5">
                    Reading
                  </p>
                  <p className="font-display italic text-lg text-parchment-200">{card.reading}</p>
                  <p className="font-mono text-[11px] text-parchment-500">{card.romaji}</p>
                </div>
                <div className="h-px bg-gold-400/10 my-3" />
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-2">
                    Mnemonic
                  </p>
                  <div className="space-y-2">
                    {[card.story1].filter(Boolean).map((s, i) => (
                      <div key={i} className="relative pl-5 bg-ink-700/70 rounded-lg p-3">
                        <span className="absolute left-2.5 top-3 font-mono text-[9px] text-gold-400/40">
                          
                        </span>
                        <p className="font-mono text-[11px] text-parchment-400 leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-gold-400/10 my-3" />
                <div className="mb-2">
                  <p className="font-mono text-[9px] text-gold-400/60 tracking-[2px] uppercase mb-1.5">
                    Context
                  </p>
                  <p className="font-kanji text-sm text-parchment-300">{card.context}</p>
                  <p className="font-mono text-[10px] text-parchment-500/70 mt-1 italic">
                    {card.contextEn}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons — only when flipped */}
      {flipped && !rated && (
        <div className="w-full max-w-[320px] mx-auto mt-4 animate-fade-up">
          <div className="grid grid-cols-4 gap-2">
            {ratingBtns.map(r => (
              <button
                key={r.label}
                onClick={(e) => { e.stopPropagation(); handleRate() }}
                className={`relative rounded-xl border overflow-hidden flex flex-col items-center
                            justify-center gap-1.5 py-3.5 transition-colors duration-150
                            touch-manipulation ${r.border} ${r.bg}`}
              >
                <div className={`absolute top-0 inset-x-0 h-[2px] ${r.bar}`} />
                <span className={`font-display italic text-[14px] leading-none ${r.color}`}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!flipped && (
        <p className="font-mono text-[9px] text-parchment-500/25 tracking-widest uppercase
                      mt-4 text-center">
          Tap card to flip
        </p>
      )}
    </StepShell>
  )
}

// ─── Step 6: Tips & Launch ───────────────────────────────────────────────
function TipsStep({ onFinish }) {
  const tips = [
    {
      icon: '📅',
      title: 'Study every day',
      body: 'Even 5 minutes a day beats one long session a week. Consistency is everything with spaced repetition.',
    },
    {
      icon: '⬆️',
      title: 'Swipe up to master',
      body: 'Already know a card? Swipe up on new cards to instantly master them. A fresh card takes its place — so you only study what you don\'t know.',
    },
    {
      icon: '🔄',
      title: 'Reviews first, then new cards',
      body: 'Always clear your due reviews before learning new cards. Don\'t let the review pile grow.',
    },
    {
      icon: '✏️',
      title: 'Write your own stories',
      body: 'The community stories are a starting point. Rewrite them in your own words — personal connections are the strongest memories.',
    },
    {
      icon: '🎮',
      title: 'Use what you learn',
      body: 'When you see a kanji in a game, try to recall its meaning. Real-world recognition is the ultimate test.',
    },
  ]

  return (
    <StepShell>
      <span className="font-kanji text-5xl text-gold-400/12 mb-4 animate-fade-up">心</span>

      <h2 className="font-display italic text-2xl text-parchment-100 mb-2 animate-fade-up delay-100">
        Tips for success
      </h2>
      <p className="font-body text-sm text-parchment-500 leading-relaxed max-w-[320px] mb-6
                    animate-fade-up delay-100">
        You have the tools. Here's how to get the most from them.
      </p>

      <div className="w-full max-w-[320px] text-left space-y-4 mb-8">
        {tips.map(({ icon, title, body }, i) => (
          <div
            key={i}
            className="flex items-start gap-3 animate-fade-up"
            style={{ animationDelay: `${0.2 + i * 0.08}s` }}
          >
            <span className="text-base mt-0.5 shrink-0">{icon}</span>
            <div>
              <p className="font-display italic text-base text-parchment-200 leading-tight mb-1">
                {title}
              </p>
              <p className="font-body text-[12px] text-parchment-500 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mode toggle preview */}
      <div className="w-full max-w-[320px] bg-ink-800 border border-gold-400/12 rounded-xl
                      p-4 mb-8 text-left animate-fade-up delay-500">
        <p className="font-mono text-[9px] text-gold-400/60 tracking-widest uppercase mb-2">
          One more thing
        </p>
        <p className="font-body text-[12px] text-parchment-400 leading-relaxed">
          During study, you'll see a <strong className="text-parchment-200">mode toggle</strong> at the top:
          <span className="text-gold-400"> Kanji → Meaning</span> and{' '}
          <span className="text-gold-400">Meaning → Kanji</span>.
          Start with Kanji → Meaning. Once you're comfortable recognizing characters,
          switch to the other mode to test recall.
        </p>
      </div>

      <button
        onClick={onFinish}
        className="w-full max-w-[280px] bg-gold-400/12 border border-gold-400/50
                   text-gold-400 font-display italic text-xl py-4 rounded-xl
                   hover:bg-gold-400/20 hover:border-gold-400/70
                   transition-all duration-200 animate-fade-up delay-500"
      >
        Begin studying →
      </button>

      <Footnote delay="delay-500">
        You can review this guide anytime from the deck page
      </Footnote>
    </StepShell>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────
const TOTAL_STEPS = 7

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

// ─── PrimerGuideScreen ───────────────────────────────────────────────────
export default function PrimerGuideScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const scrollRef = useRef(null)

  // Which deck the user was trying to study (default to primer)
  const targetDeck = searchParams.get('deck') || 'primer'

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)) }
  function back() { setStep(s => Math.max(s - 1, 0)) }

  function handleFinish() {
    markGuideComplete()
    navigate(`/study/${targetDeck}`, { replace: true })
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto">
      {/* Top bar */}
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
            <button
              onClick={() => navigate(-1)}
              className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase
                         hover:text-parchment-300 transition-colors touch-manipulation"
            >
              ✕ Skip
            </button>
          )}
          <span className="font-mono text-[10px] text-parchment-500/30 tracking-widest tabular-nums">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <ProgressBar step={step} />
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col justify-center py-6">
        {step === 0 && <MethodStep onNext={next} />}
        {step === 1 && <RadicalsStep onNext={next} />}
        {step === 2 && <StoriesStep onNext={next} />}
        {step === 3 && <CardTutorialStep onNext={next} />}
        {step === 4 && <RatingStep onNext={next} />}
        {step === 5 && <PracticeStep onNext={next} />}
        {step === 6 && <TipsStep onFinish={handleFinish} />}
      </div>
    </div>
  )
}
