import { useState, useMemo } from 'react'

// ─── All 214 Kangxi radicals + key primitives (sorted by stroke count) ──
// s=stroke count, c=character, n=English name, m=meaning, alt=common variant, cat=category
const RADICALS = [
  // 1 stroke
  {s:1,c:'一',n:'one',m:'one / horizontal stroke',cat:'number'},
  {s:1,c:'丨',n:'line',m:'vertical stroke / rod',cat:'shape'},
  {s:1,c:'丶',n:'dot',m:'dot / drop',cat:'shape'},
  {s:1,c:'丿',n:'slash',m:'left sweep / slash',cat:'shape'},
  {s:1,c:'乙',n:'second',m:'second / fishhook',alt:'乚 hook form',cat:'shape'},
  {s:1,c:'亅',n:'hook',m:'hook / barb',cat:'shape'},
  // 2 strokes
  {s:2,c:'二',n:'two',m:'two / pair',cat:'number'},
  {s:2,c:'亠',n:'lid',m:'kettle lid / top',cat:'shape'},
  {s:2,c:'人',n:'person',m:'person / human',alt:'亻 on left',cat:'person'},
  {s:2,c:'儿',n:'legs',m:'human legs / walking',cat:'body'},
  {s:2,c:'入',n:'enter',m:'enter / go in',cat:'action'},
  {s:2,c:'八',n:'eight',m:'eight / divide',cat:'number'},
  {s:2,c:'冂',n:'upside-down box',m:'wide / enclosure',cat:'shape'},
  {s:2,c:'冖',n:'cover',m:'cover / crown',cat:'shape'},
  {s:2,c:'冫',n:'ice',m:'ice / cold / frozen',cat:'nature'},
  {s:2,c:'几',n:'desk',m:'table / desk / stool',cat:'object'},
  {s:2,c:'凵',n:'open box',m:'receptacle / container',cat:'shape'},
  {s:2,c:'刀',n:'sword',m:'sword / knife / blade',alt:'刂 on right',cat:'object'},
  {s:2,c:'力',n:'power',m:'power / strength / force',cat:'concept'},
  {s:2,c:'勹',n:'wrap',m:'wrap / embrace',cat:'shape'},
  {s:2,c:'匕',n:'spoon',m:'spoon / ladle / dagger',cat:'object'},
  {s:2,c:'匚',n:'box',m:'hiding box / container',cat:'shape'},
  {s:2,c:'匸',n:'hiding',m:'hiding / conceal',cat:'shape'},
  {s:2,c:'十',n:'ten',m:'ten / cross',cat:'number'},
  {s:2,c:'卜',n:'divination',m:'divination / fortune',cat:'concept'},
  {s:2,c:'卩',n:'seal',m:'seal / kneeling person',alt:'㔾 variant',cat:'shape'},
  {s:2,c:'厂',n:'cliff',m:'cliff / factory',cat:'nature'},
  {s:2,c:'厶',n:'private',m:'private / self',cat:'concept'},
  {s:2,c:'又',n:'again',m:'again / right hand',cat:'body'},
  // key 2-stroke primitives
  {s:2,c:'乃',n:'from',m:'from / be / possessive',cat:'concept'},
  {s:2,c:'九',n:'nine',m:'nine',cat:'number'},
  {s:2,c:'了',n:'complete',m:'complete / finish',cat:'concept'},
  // 3 strokes
  {s:3,c:'口',n:'mouth',m:'mouth / opening',cat:'body'},
  {s:3,c:'囗',n:'enclosure',m:'enclosure / boundary',cat:'shape'},
  {s:3,c:'土',n:'earth',m:'earth / soil / ground',cat:'nature'},
  {s:3,c:'士',n:'samurai',m:'scholar / samurai / gentleman',cat:'person'},
  {s:3,c:'夂',n:'go',m:'go slowly / winter leg',cat:'action'},
  {s:3,c:'夊',n:'go slowly',m:'go slowly / limp',cat:'action'},
  {s:3,c:'夕',n:'evening',m:'evening / sunset',cat:'nature'},
  {s:3,c:'大',n:'big',m:'big / large / great',cat:'concept'},
  {s:3,c:'女',n:'woman',m:'woman / female',cat:'person'},
  {s:3,c:'子',n:'child',m:'child / seed / young',cat:'person'},
  {s:3,c:'宀',n:'roof',m:'roof / house / shelter',cat:'structure'},
  {s:3,c:'寸',n:'inch',m:'inch / small measure',cat:'concept'},
  {s:3,c:'小',n:'small',m:'small / little / tiny',cat:'concept'},
  {s:3,c:'尢',n:'lame',m:'lame / crooked',alt:'尣 variant',cat:'body'},
  {s:3,c:'尸',n:'corpse',m:'corpse / flag / body',cat:'body'},
  {s:3,c:'屮',n:'sprout',m:'sprout / growing plant',cat:'nature'},
  {s:3,c:'山',n:'mountain',m:'mountain / hill / peak',cat:'nature'},
  {s:3,c:'巛',n:'river',m:'river / flowing water',alt:'川 variant',cat:'nature'},
  {s:3,c:'工',n:'work',m:'work / craft / construction',cat:'action'},
  {s:3,c:'己',n:'self',m:'self / oneself / snake',cat:'concept'},
  {s:3,c:'巾',n:'cloth',m:'cloth / towel / turban',cat:'object'},
  {s:3,c:'干',n:'dry',m:'dry / shield / trunk',cat:'concept'},
  {s:3,c:'幺',n:'tiny',m:'tiny / thread / slight',cat:'concept'},
  {s:3,c:'广',n:'dotted cliff',m:'wide / building / house',cat:'structure'},
  {s:3,c:'廴',n:'long stride',m:'long stride / stretch',cat:'action'},
  {s:3,c:'廾',n:'two hands',m:'twenty / two hands joined',cat:'body'},
  {s:3,c:'弋',n:'ceremony',m:'ceremony / arrow / shoot',cat:'action'},
  {s:3,c:'弓',n:'bow',m:'bow (weapon) / arc',cat:'object'},
  {s:3,c:'彐',n:'snout',m:"pig's snout / broom",cat:'animal'},
  {s:3,c:'彡',n:'hair',m:'bristle / hair / streaks',cat:'body'},
  {s:3,c:'彳',n:'step',m:'left step / go little',cat:'action'},
  // key 3-stroke primitives
  {s:3,c:'才',n:'talent',m:'talent / ability',cat:'concept'},
  {s:3,c:'乍',n:'suddenly',m:'suddenly / for the first time',cat:'concept'},
  {s:3,c:'勿',n:'do not',m:'do not / negate',cat:'concept'},
  {s:3,c:'夬',n:'resolve',m:'resolve / cut / decide',cat:'action'},
  {s:3,c:'万',n:'ten thousand',m:'ten thousand / myriad',cat:'number'},
  // 4 strokes
  {s:4,c:'心',n:'heart',m:'heart / mind / spirit',alt:'忄 on left',cat:'body'},
  {s:4,c:'戈',n:'spear',m:'spear / halberd / weapon',cat:'object'},
  {s:4,c:'戸',n:'door',m:'door / house / counter',cat:'structure'},
  {s:4,c:'手',n:'hand',m:'hand / arm',alt:'扌 on left',cat:'body'},
  {s:4,c:'支',n:'branch',m:'branch / support',cat:'nature'},
  {s:4,c:'攴',n:'strike',m:'strike / tap / action',alt:'攵 variant',cat:'action'},
  {s:4,c:'文',n:'writing',m:'writing / culture / pattern',cat:'concept'},
  {s:4,c:'斗',n:'dipper',m:'big dipper / measure',cat:'object'},
  {s:4,c:'斤',n:'axe',m:'axe / catty / 600g',cat:'object'},
  {s:4,c:'方',n:'direction',m:'direction / square / method',cat:'concept'},
  {s:4,c:'无',n:'not',m:'not / nothing / without',cat:'concept'},
  {s:4,c:'日',n:'sun',m:'sun / day / daytime',cat:'nature'},
  {s:4,c:'曰',n:'say',m:'say / speak',cat:'action'},
  {s:4,c:'月',n:'moon',m:'moon / month',cat:'nature'},
  {s:4,c:'木',n:'tree',m:'tree / wood / timber',cat:'nature'},
  {s:4,c:'欠',n:'yawn',m:'yawn / lack / owe',cat:'action'},
  {s:4,c:'止',n:'stop',m:'stop / foot / footstep',cat:'action'},
  {s:4,c:'歹',n:'death',m:'death / bad / wicked',cat:'concept'},
  {s:4,c:'殳',n:'lance',m:'lance / weapon / strike',cat:'object'},
  {s:4,c:'毋',n:'do not',m:'do not / mother',cat:'concept'},
  {s:4,c:'比',n:'compare',m:'compare / match / ratio',cat:'concept'},
  {s:4,c:'毛',n:'fur',m:'fur / hair / feather',cat:'animal'},
  {s:4,c:'氏',n:'clan',m:'clan / family / Mr.',cat:'person'},
  {s:4,c:'气',n:'steam',m:'steam / air / breath',cat:'nature'},
  {s:4,c:'水',n:'water',m:'water / river / liquid',alt:'氵 on left',cat:'nature'},
  {s:4,c:'火',n:'fire',m:'fire / flame / burn',alt:'灬 at bottom',cat:'nature'},
  {s:4,c:'爪',n:'claw',m:'claw / nail / talon',alt:'爫 at top',cat:'animal'},
  {s:4,c:'父',n:'father',m:'father / dad',cat:'person'},
  {s:4,c:'爻',n:'mix',m:'mix / double X / lines',cat:'shape'},
  {s:4,c:'片',n:'slice',m:'slice / piece / card',cat:'object'},
  {s:4,c:'牙',n:'fang',m:'fang / tusk / tooth',cat:'animal'},
  {s:4,c:'牛',n:'cow',m:'cow / ox / bull',alt:'牜 on left',cat:'animal'},
  {s:4,c:'犬',n:'dog',m:'dog / canine',alt:'犭 on left',cat:'animal'},
  // key 4-stroke primitives
  {s:4,c:'王',n:'king',m:'king / ruler / jade',cat:'person'},
  {s:4,c:'五',n:'five',m:'five',cat:'number'},
  {s:4,c:'中',n:'middle',m:'middle / center / inside',cat:'concept'},
  {s:4,c:'内',n:'inside',m:'inside / within',cat:'concept'},
  {s:4,c:'少',n:'few',m:'few / little / young',cat:'concept'},
  // 5 strokes
  {s:5,c:'玄',n:'mysterious',m:'mysterious / dark / occult',cat:'concept'},
  {s:5,c:'玉',n:'jewel',m:'jewel / ball / jade',cat:'object'},
  {s:5,c:'瓜',n:'melon',m:'melon / gourd',cat:'nature'},
  {s:5,c:'瓦',n:'tile',m:'tile / roof tile',cat:'object'},
  {s:5,c:'甘',n:'sweet',m:'sweet / pleasant',cat:'concept'},
  {s:5,c:'生',n:'life',m:'life / birth / raw / fresh',cat:'concept'},
  {s:5,c:'用',n:'use',m:'use / employ / utilize',cat:'action'},
  {s:5,c:'田',n:'rice field',m:'rice field / paddy',cat:'nature'},
  {s:5,c:'疋',n:'bolt of cloth',m:'bolt of cloth / head',cat:'object'},
  {s:5,c:'疒',n:'sickness',m:'sickness / illness / disease',cat:'body'},
  {s:5,c:'癶',n:'legs apart',m:'footsteps / departure',cat:'action'},
  {s:5,c:'白',n:'white',m:'white / clear / pure',cat:'concept'},
  {s:5,c:'皮',n:'skin',m:'skin / hide / leather',cat:'body'},
  {s:5,c:'皿',n:'dish',m:'dish / plate / bowl',cat:'object'},
  {s:5,c:'目',n:'eye',m:'eye / look / see',cat:'body'},
  {s:5,c:'矛',n:'spear',m:'spear / halberd / pike',cat:'object'},
  {s:5,c:'矢',n:'arrow',m:'arrow / dart / vow',cat:'object'},
  {s:5,c:'石',n:'stone',m:'stone / rock / mineral',cat:'nature'},
  {s:5,c:'示',n:'altar',m:'altar / show / display',alt:'礻 on left',cat:'concept'},
  {s:5,c:'禸',n:'track',m:'animal tracks / nest',cat:'animal'},
  {s:5,c:'禾',n:'grain',m:'grain / rice plant / crop',cat:'nature'},
  {s:5,c:'穴',n:'hole',m:'hole / cave / pit',cat:'nature'},
  {s:5,c:'立',n:'stand',m:'stand / erect / establish',cat:'action'},
  // key 5-stroke primitives
  {s:5,c:'正',n:'correct',m:'correct / proper / just',cat:'concept'},
  {s:5,c:'四',n:'four',m:'four',cat:'number'},
  // 6 strokes
  {s:6,c:'竹',n:'bamboo',m:'bamboo / reed',cat:'nature'},
  {s:6,c:'米',n:'rice',m:'rice / grain / meter',cat:'nature'},
  {s:6,c:'糸',n:'thread',m:'thread / silk / string',alt:'纟 simplified',cat:'object'},
  {s:6,c:'缶',n:'jar',m:'jar / pot / tin can',cat:'object'},
  {s:6,c:'网',n:'net',m:'net / network / web',alt:'罒 at top',cat:'object'},
  {s:6,c:'羊',n:'sheep',m:'sheep / lamb / goat',cat:'animal'},
  {s:6,c:'羽',n:'feather',m:'feather / wing',cat:'animal'},
  {s:6,c:'老',n:'old',m:'old / aged / elder',cat:'concept'},
  {s:6,c:'而',n:'and',m:'and / but / beard',cat:'shape'},
  {s:6,c:'耒',n:'plow',m:'plow / plough',cat:'object'},
  {s:6,c:'耳',n:'ear',m:'ear / hear / listen',cat:'body'},
  {s:6,c:'聿',n:'brush',m:'writing brush / pen',cat:'object'},
  {s:6,c:'肉',n:'meat',m:'meat / flesh / body',alt:'月 as body part',cat:'body'},
  {s:6,c:'臣',n:'minister',m:'minister / retainer',cat:'person'},
  {s:6,c:'自',n:'self',m:'self / from / nose',cat:'body'},
  {s:6,c:'至',n:'arrive',m:'arrive / reach / until',cat:'action'},
  {s:6,c:'臼',n:'mortar',m:'mortar / grinding bowl',cat:'object'},
  {s:6,c:'舌',n:'tongue',m:'tongue / speech',cat:'body'},
  {s:6,c:'舟',n:'boat',m:'boat / ship / vessel',cat:'object'},
  {s:6,c:'艮',n:'tough',m:'tough / stubborn / blunt',cat:'concept'},
  {s:6,c:'色',n:'color',m:'color / appearance',cat:'concept'},
  {s:6,c:'艸',n:'grass',m:'grass / plant / herb',alt:'艹 at top',cat:'nature'},
  {s:6,c:'虍',n:'tiger stripes',m:'tiger / tiger stripes',cat:'animal'},
  {s:6,c:'虫',n:'insect',m:'insect / bug / worm',cat:'animal'},
  {s:6,c:'血',n:'blood',m:'blood / lineage',cat:'body'},
  {s:6,c:'行',n:'go',m:'go / walk / conduct',cat:'action'},
  {s:6,c:'衣',n:'clothing',m:'clothing / garment',alt:'衤 on left',cat:'object'},
  {s:6,c:'襾',n:'west',m:'cover / west',cat:'shape'},
  // key 6-stroke primitives
  {s:6,c:'六',n:'six',m:'six',cat:'number'},
  // 7 strokes
  {s:7,c:'見',n:'see',m:'see / look / view',cat:'action'},
  {s:7,c:'角',n:'horn',m:'horn / angle / corner',cat:'animal'},
  {s:7,c:'言',n:'words',m:'say / words / speech',alt:'訁 on left',cat:'action'},
  {s:7,c:'谷',n:'valley',m:'valley / gorge / ravine',cat:'nature'},
  {s:7,c:'豆',n:'bean',m:'bean / pea / miniature',cat:'nature'},
  {s:7,c:'豕',n:'pig',m:'pig / boar / swine',cat:'animal'},
  {s:7,c:'豸',n:'cat',m:'badger / cat / legless insect',cat:'animal'},
  {s:7,c:'貝',n:'shell',m:'shell / money / valuables',cat:'object'},
  {s:7,c:'赤',n:'red',m:'red / crimson / bare',cat:'concept'},
  {s:7,c:'走',n:'run',m:'run / walk fast / flee',cat:'action'},
  {s:7,c:'足',n:'foot',m:'foot / leg / enough',alt:'⻊ on left',cat:'body'},
  {s:7,c:'身',n:'body',m:'body / oneself',cat:'body'},
  {s:7,c:'車',n:'vehicle',m:'vehicle / car / wheel',cat:'object'},
  {s:7,c:'辛',n:'spicy',m:'spicy / hot / bitter',cat:'concept'},
  {s:7,c:'辰',n:'dragon',m:'dragon sign / morning',cat:'animal'},
  {s:7,c:'辵',n:'road',m:'walk / road',alt:'辶 at bottom',cat:'action'},
  {s:7,c:'邑',n:'city',m:'city / town / village',alt:'阝 on right',cat:'structure'},
  {s:7,c:'酉',n:'sake',m:'sake / wine / 10th sign',cat:'object'},
  {s:7,c:'釆',n:'distinguish',m:'distinguish / sort',cat:'action'},
  {s:7,c:'里',n:'village',m:'village / league / hometown',cat:'structure'},
  // key 7-stroke primitives
  {s:7,c:'七',n:'seven',m:'seven',cat:'number'},
  // 8 strokes
  {s:8,c:'金',n:'gold',m:'gold / metal / money',alt:'钅 on left',cat:'object'},
  {s:8,c:'長',n:'long',m:'long / leader / elder',cat:'concept'},
  {s:8,c:'門',n:'gate',m:'gate / door / entrance',cat:'structure'},
  {s:8,c:'阜',n:'mound',m:'mound / hill / dam',alt:'阝 on left',cat:'nature'},
  {s:8,c:'隶',n:'slave',m:'slave / servant / reach',cat:'person'},
  {s:8,c:'隹',n:'short-tailed bird',m:'old bird / small bird',cat:'animal'},
  {s:8,c:'雨',n:'rain',m:'rain / weather',cat:'nature'},
  {s:8,c:'青',n:'blue',m:'blue / green / young',cat:'concept'},
  {s:8,c:'非',n:'wrong',m:'wrong / not / injustice',cat:'concept'},
  // 9 strokes
  {s:9,c:'面',n:'face',m:'face / surface / mask',cat:'body'},
  {s:9,c:'革',n:'leather',m:'leather / reform / change',cat:'object'},
  {s:9,c:'韋',n:'tanned leather',m:'tanned leather / soft',cat:'object'},
  {s:9,c:'韭',n:'leek',m:'leek / chive',cat:'nature'},
  {s:9,c:'音',n:'sound',m:'sound / noise / music',cat:'concept'},
  {s:9,c:'頁',n:'head',m:'head / page / leaf',cat:'body'},
  {s:9,c:'風',n:'wind',m:'wind / style / manner',cat:'nature'},
  {s:9,c:'飛',n:'fly',m:'fly / soar / scatter',cat:'action'},
  {s:9,c:'食',n:'eat',m:'eat / food / meal',alt:'飠 on left',cat:'action'},
  {s:9,c:'首',n:'neck',m:'neck / head / leader',cat:'body'},
  {s:9,c:'香',n:'incense',m:'incense / fragrant / aroma',cat:'concept'},
  // 10 strokes
  {s:10,c:'馬',n:'horse',m:'horse / steed',cat:'animal'},
  {s:10,c:'骨',n:'bone',m:'bone / skeleton',cat:'body'},
  {s:10,c:'高',n:'tall',m:'tall / high / expensive',cat:'concept'},
  {s:10,c:'髟',n:'long hair',m:'long hair / flowing',cat:'body'},
  {s:10,c:'鬥',n:'fight',m:'fight / struggle / contest',cat:'action'},
  {s:10,c:'鬯',n:'herbs',m:'aromatic herbs / sacrificial wine',cat:'nature'},
  {s:10,c:'鬲',n:'cauldron',m:'cauldron / cooking pot',cat:'object'},
  {s:10,c:'鬼',n:'ghost',m:'ghost / demon / devil',cat:'concept'},
  // 11 strokes
  {s:11,c:'魚',n:'fish',m:'fish / seafood',cat:'animal'},
  {s:11,c:'鳥',n:'bird',m:'bird (long-tailed)',cat:'animal'},
  {s:11,c:'鹵',n:'salt',m:'salt / bitter / crude',cat:'nature'},
  {s:11,c:'鹿',n:'deer',m:'deer / elk',cat:'animal'},
  {s:11,c:'麦',n:'wheat',m:'wheat / barley / grain',cat:'nature'},
  {s:11,c:'麻',n:'hemp',m:'hemp / flax / numb',cat:'nature'},
  // 12+ strokes
  {s:12,c:'黄',n:'yellow',m:'yellow / gold',cat:'concept'},
  {s:12,c:'黍',n:'millet',m:'millet / glutinous',cat:'nature'},
  {s:12,c:'黒',n:'black',m:'black / dark / ink',cat:'concept'},
  {s:12,c:'黹',n:'embroidery',m:'embroidery / needlework',cat:'object'},
  {s:13,c:'黽',n:'frog',m:'frog / toad / effort',cat:'animal'},
  {s:13,c:'鼎',n:'tripod',m:'tripod / three-legged pot',cat:'object'},
  {s:13,c:'鼓',n:'drum',m:'drum / beat / encourage',cat:'object'},
  {s:13,c:'鼠',n:'rat',m:'rat / mouse / rodent',cat:'animal'},
  {s:14,c:'鼻',n:'nose',m:'nose / snout / origin',cat:'body'},
  {s:14,c:'齊',n:'even',m:'even / equal / uniform',cat:'concept'},
  {s:15,c:'歯',n:'tooth',m:'tooth / teeth / age',cat:'body'},
  {s:16,c:'龍',n:'dragon',m:'dragon / imperial',cat:'animal'},
  {s:16,c:'亀',n:'turtle',m:'turtle / tortoise',cat:'animal'},
  {s:17,c:'龠',n:'flute',m:'flute / pipe / key',cat:'object'},
]

const CATS = [
  { key: 'all',       label: 'All' },
  { key: 'nature',    label: 'Nature' },
  { key: 'body',      label: 'Body' },
  { key: 'action',    label: 'Action' },
  { key: 'concept',   label: 'Concept' },
  { key: 'object',    label: 'Object' },
  { key: 'person',    label: 'Person' },
  { key: 'animal',    label: 'Animal' },
  { key: 'shape',     label: 'Shape' },
  { key: 'structure', label: 'Structure' },
  { key: 'number',    label: 'Number' },
]

// ─── Group by stroke count ───────────────────────────────────────────────
function groupByStroke(items) {
  const groups = {}
  items.forEach(r => {
    const k = r.s
    if (!groups[k]) groups[k] = []
    groups[k].push(r)
  })
  return Object.entries(groups).sort(([a], [b]) => +a - +b)
}

// ─── Expanded radical detail ─────────────────────────────────────────────
function RadicalDetail({ r, onClose }) {
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

        {/* Large kanji */}
        <div className="text-center mb-4">
          <span className="font-kanji text-[80px] text-parchment-100 leading-none">{r.c}</span>
        </div>

        {/* Name + meaning */}
        <div className="text-center mb-4">
          <p className="font-display italic text-xl text-parchment-100">{r.n}</p>
          <p className="font-mono text-[11px] text-parchment-500 mt-1">{r.m}</p>
        </div>

        {/* Details grid */}
        <div className="bg-ink-700/50 rounded-xl p-3 space-y-2">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase">Strokes</span>
            <span className="font-mono text-[11px] text-parchment-300">{r.s}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase">Category</span>
            <span className="font-mono text-[11px] text-parchment-300 capitalize">{r.cat}</span>
          </div>
          {r.alt && (
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-parchment-500/60 tracking-widest uppercase">Variant</span>
              <span className="font-kanji text-[13px] text-gold-400/70">{r.alt}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── RadicalsScreen ──────────────────────────────────────────────────────
export default function RadicalsScreen() {
  const [cat, setCat]       = useState('all')
  const [q, setQ]           = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    return RADICALS.filter(r => {
      const catOk  = cat === 'all' || r.cat === cat
      const ql     = q.toLowerCase()
      const srchOk = !ql || r.c.includes(q) || r.n.includes(ql) || r.m.includes(ql) || (r.alt || '').toLowerCase().includes(ql)
      return catOk && srchOk
    })
  }, [cat, q])

  const groups = useMemo(() => groupByStroke(filtered), [filtered])

  return (
    <div className="px-5 py-6 pb-10">
      {/* Header */}
      <div className="mb-5 animate-fade-up">
        <h1 className="font-display italic text-2xl text-parchment-100">Radical Reference</h1>
        <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-1">
          {RADICALS.length} radicals & primitives · The building blocks of all kanji
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4 animate-fade-up delay-100">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-500/30" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by character, name, or meaning…"
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

      {/* Category chips */}
      <div className="flex gap-1.5 flex-wrap mb-5 animate-fade-up delay-200">
        {CATS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCat(key)}
            className={`font-mono text-[9px] tracking-widest uppercase px-2.5 py-1.5 rounded-full
                        border transition-colors duration-150 touch-manipulation
                        ${cat === key
                          ? 'bg-gold-400/15 border-gold-400/40 text-gold-400'
                          : 'border-gold-400/10 text-parchment-500/50 hover:border-gold-400/25 hover:text-parchment-400'}`}
          >
            {label}
          </button>
        ))}
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
            {items.map(r => (
              <button
                key={r.c + r.n}
                onClick={() => setSelected(r)}
                className="bg-ink-800 border border-gold-400/8 rounded-lg py-2.5 px-1
                           text-center hover:border-gold-400/25 hover:bg-ink-700/50
                           transition-all duration-150 touch-manipulation group"
              >
                <p className="font-kanji text-2xl text-parchment-200 leading-none mb-1
                              group-hover:text-parchment-100 transition-colors">
                  {r.c}
                </p>
                <p className="font-mono text-[9px] text-parchment-500/60 leading-tight truncate">
                  {r.n}
                </p>
                {r.alt && (
                  <p className="font-kanji text-[9px] text-gold-400/25 mt-0.5 truncate">{r.alt}</p>
                )}
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
        <RadicalDetail r={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

