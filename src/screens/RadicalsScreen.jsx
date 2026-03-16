import { useState, useMemo } from 'react'

const CATS = ['all','body','nature','action','concept','person','structure','object','animal','shape','number']

const RADS = [
  {c:'一',n:'one',m:'one / ceiling',cat:'number',s:1},
  {c:'丨',n:'line',m:'vertical line / rod',cat:'shape',s:1},
  {c:'丶',n:'dot',m:'dot / drop',cat:'shape',s:1},
  {c:'乙',n:'second',m:'second / fishhook',cat:'shape',s:1},
  {c:'亅',n:'hook',m:'hook / nail',cat:'shape',s:1},
  {c:'二',n:'two',m:'two',cat:'number',s:2},
  {c:'人',n:'person',m:'person / human',alt:'亻 on left',cat:'body',s:2},
  {c:'儿',n:'legs',m:'legs / walking person',cat:'body',s:2},
  {c:'入',n:'enter',m:'enter / go in',cat:'action',s:2},
  {c:'八',n:'eight',m:'eight / divide',cat:'number',s:2},
  {c:'刀',n:'sword',m:'sword / knife',alt:'刂 on right',cat:'object',s:2},
  {c:'力',n:'power',m:'power / strength',cat:'concept',s:2},
  {c:'又',n:'again',m:'again / right hand',cat:'body',s:2},
  {c:'口',n:'mouth',m:'mouth / opening',cat:'body',s:3},
  {c:'囗',n:'enclosure',m:'enclosure / boundary',cat:'shape',s:3},
  {c:'土',n:'earth',m:'earth / soil / ground',cat:'nature',s:3},
  {c:'士',n:'samurai',m:'scholar / samurai',cat:'person',s:3},
  {c:'大',n:'big',m:'big / large / great',cat:'concept',s:3},
  {c:'女',n:'woman',m:'woman / female',cat:'person',s:3},
  {c:'子',n:'child',m:'child / young / seed',cat:'person',s:3},
  {c:'宀',n:'roof',m:'roof / house / shelter',cat:'structure',s:3},
  {c:'寸',n:'inch',m:'inch / small measurement',cat:'concept',s:3},
  {c:'小',n:'small',m:'small / little / tiny',cat:'concept',s:3},
  {c:'山',n:'mountain',m:'mountain / hill',cat:'nature',s:3},
  {c:'工',n:'work',m:'work / craft / construction',cat:'action',s:3},
  {c:'才',n:'talent',m:'talent / ability / just now',cat:'concept',s:3},
  {c:'弓',n:'bow',m:'bow (weapon) / arc',cat:'object',s:3},
  {c:'彐',n:'snout',m:"pig's snout / bristle",cat:'animal',s:3},
  {c:'心',n:'heart',m:'heart / mind / spirit',alt:'忄 on left',cat:'body',s:4},
  {c:'戈',n:'spear',m:'spear / halberd / weapon',cat:'object',s:4},
  {c:'手',n:'hand',m:'hand / arm',alt:'扌 on left',cat:'body',s:4},
  {c:'攴',n:'strike',m:'strike / tap / action',alt:'攵 variant',cat:'action',s:4},
  {c:'文',n:'writing',m:'writing / culture',cat:'concept',s:4},
  {c:'日',n:'sun',m:'sun / day / daytime',cat:'nature',s:4},
  {c:'月',n:'moon',m:'moon / month',cat:'nature',s:4},
  {c:'木',n:'tree',m:'tree / wood / timber',cat:'nature',s:4},
  {c:'止',n:'stop',m:'stop / foot / footstep',cat:'action',s:4},
  {c:'殳',n:'lance',m:'lance / weapon / strike',cat:'object',s:4},
  {c:'水',n:'water',m:'water / river',alt:'氵 on left',cat:'nature',s:4},
  {c:'火',n:'fire',m:'fire / flame',alt:'灬 at bottom',cat:'nature',s:4},
  {c:'爪',n:'claw',m:'claw / nail / talon',alt:'爫 at top',cat:'animal',s:4},
  {c:'牛',n:'cow',m:'cow / ox / bull',alt:'牜 on left',cat:'animal',s:4},
  {c:'犬',n:'dog',m:'dog / canine',alt:'犭 on left',cat:'animal',s:4},
  {c:'王',n:'king',m:'king / ruler',cat:'person',s:4},
  {c:'正',n:'correct',m:'correct / proper / upright',cat:'concept',s:5},
  {c:'生',n:'life',m:'life / birth / raw',cat:'concept',s:5},
  {c:'田',n:'rice field',m:'rice field / paddy',cat:'nature',s:5},
  {c:'白',n:'white',m:'white / clear / pure',cat:'concept',s:5},
  {c:'目',n:'eye',m:'eye / look / see',cat:'body',s:5},
  {c:'矢',n:'arrow',m:'arrow / dart / vow',cat:'object',s:5},
  {c:'石',n:'stone',m:'stone / rock / mineral',cat:'nature',s:5},
  {c:'示',n:'altar',m:'altar / show / display',alt:'礻 on left',cat:'concept',s:5},
  {c:'禾',n:'grain',m:'grain / rice plant / crop',cat:'nature',s:5},
  {c:'立',n:'stand',m:'stand / erect / establish',cat:'action',s:5},
  {c:'竹',n:'bamboo',m:'bamboo',cat:'nature',s:6},
  {c:'米',n:'rice',m:'rice',cat:'nature',s:6},
  {c:'糸',n:'thread',m:'thread / silk / string',alt:'纟 simplified',cat:'object',s:6},
  {c:'羊',n:'sheep',m:'sheep / lamb / goat',cat:'animal',s:6},
  {c:'耳',n:'ear',m:'ear / hear / listen',cat:'body',s:6},
  {c:'肉',n:'meat',m:'meat / flesh / body',alt:'月 on left',cat:'body',s:6},
  {c:'自',n:'self',m:'self / from / nose',cat:'body',s:6},
  {c:'色',n:'color',m:'color / appearance',cat:'concept',s:6},
  {c:'虫',n:'insect',m:'insect / bug / worm',cat:'animal',s:6},
  {c:'行',n:'go',m:'go / walk / conduct',cat:'action',s:6},
  {c:'衣',n:'clothing',m:'clothing / garment',alt:'衤 on left',cat:'object',s:6},
  {c:'見',n:'see',m:'see / look / view',cat:'action',s:7},
  {c:'言',n:'words',m:'say / words / speech',alt:'訁 on left',cat:'action',s:7},
  {c:'貝',n:'shell',m:'shell / money / valuables',cat:'object',s:7},
  {c:'走',n:'run',m:'run / walk fast / flee',cat:'action',s:7},
  {c:'足',n:'foot',m:'foot / leg / enough',alt:'⻊ on left',cat:'body',s:7},
  {c:'身',n:'body',m:'body / oneself',cat:'body',s:7},
  {c:'車',n:'vehicle',m:'vehicle / car / wheel',cat:'object',s:7},
  {c:'金',n:'gold',m:'gold / metal / money',alt:'钅 on left',cat:'object',s:8},
  {c:'門',n:'gate',m:'gate / door / entrance',cat:'structure',s:8},
  {c:'雨',n:'rain',m:'rain / weather',cat:'nature',s:8},
  {c:'青',n:'blue',m:'blue / green / young',cat:'concept',s:8},
  {c:'音',n:'sound',m:'sound / noise / music',cat:'concept',s:9},
  {c:'食',n:'eat',m:'eat / food / meal',alt:'飠 on left',cat:'action',s:9},
  {c:'馬',n:'horse',m:'horse',cat:'animal',s:10},
  {c:'魚',n:'fish',m:'fish',cat:'animal',s:11},
  {c:'鳥',n:'bird',m:'bird (long-tailed)',cat:'animal',s:11},
  {c:'黒',n:'black',m:'black / dark',cat:'concept',s:11},
  {c:'象',n:'elephant',m:'elephant / image / form',cat:'animal',s:12},
  {c:'無',n:'nothing',m:'nothing / without / nothingness',cat:'concept',s:12},
  {c:'相',n:'mutual',m:'mutual / each other / appearance',cat:'concept',s:9},
  {c:'貫',n:'pierce',m:'pierce / penetrate through',cat:'action',s:11},
  {c:'乍',n:'suddenly',m:'suddenly / just / for the first time',cat:'concept',s:4},
  {c:'勿',n:'do not',m:'do not / swirling / negate',cat:'concept',s:4},
  {c:'吾',n:'I/me',m:'I / me / myself (literary)',cat:'person',s:7},
  {c:'夬',n:'resolve',m:'resolve / cut / decide forcefully',cat:'action',s:4},
]

export default function RadicalsScreen() {
  const [cat, setCat]   = useState('all')
  const [q, setQ]       = useState('')

  const filtered = useMemo(() => {
    return RADS.filter(r => {
      const catOk = cat === 'all' || r.cat === cat
      const ql    = q.toLowerCase()
      const srchOk = !ql || r.c.includes(q) || r.n.includes(ql) || r.m.includes(ql) || (r.alt||'').includes(ql)
      return catOk && srchOk
    })
  }, [cat, q])

  return (
    <div className="px-5 py-6">
      <div className="mb-5 animate-fade-up">
        <h1 className="font-display italic text-2xl text-parchment-100">Primitives & Radicals</h1>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
          The building blocks of all kanji
        </p>
      </div>

      {/* Search */}
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search by character, name or meaning..."
        className="w-full bg-ink-800 border border-gold-400/15 rounded-xl px-4 py-2.5
                   font-mono text-[12px] text-parchment-300 placeholder-parchment-500/40
                   outline-none focus:border-gold-400/35 transition-colors mb-4
                   animate-fade-up delay-100"
      />

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-5 animate-fade-up delay-200">
        {CATS.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 rounded-full
                        border transition-colors duration-150
                        ${cat === c
                          ? 'bg-gold-400 border-gold-400 text-ink-900'
                          : 'border-gold-400/20 text-parchment-500 hover:border-gold-400/40'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="font-mono text-[10px] text-parchment-500 tracking-widest mb-4 animate-fade-up delay-200">
        {filtered.length} primitives
      </p>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map((r, i) => (
          <div
            key={r.c}
            className="bg-ink-800 border border-gold-400/8 rounded-xl p-3 text-center
                       hover:border-gold-400/20 transition-colors animate-fade-up"
            style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s`, opacity: 0 }}
          >
            <p className="font-kanji text-3xl text-parchment-200 leading-none mb-2">{r.c}</p>
            <p className="font-display italic text-[12px] text-parchment-300 leading-tight">{r.n}</p>
            <p className="font-mono text-[9px] text-parchment-500 leading-snug mt-0.5">{r.m}</p>
            {r.alt && (
              <p className="font-mono text-[8px] text-gold-400/40 mt-1">{r.alt}</p>
            )}
            <p className="font-mono text-[8px] text-parchment-500/30 mt-1">{r.s}s</p>
          </div>
        ))}
      </div>
    </div>
  )
}
