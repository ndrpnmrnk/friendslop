/* Пиксельные иконки интерфейса 12×12 (рисуются один раз в canvas → dataURL).
   Вместо эмодзи: один стиль для миссий, предметов, гаджетов и событий. */
const PAL = { k: '#17111f', o: '#ff8a1f', O: '#c85a0a', y: '#f5c542', g: '#9be36b', G: '#4f8a3a', r: '#ff5a6e', R: '#a8243a', b: '#4ab0f0', B: '#1e6aa8',
  w: '#f1e8ff', p: '#b18cff', P: '#6a4aa8', n: '#a8744a', N: '#6a4428', s: '#a8a8b8', d: '#4a4058', c: '#d8f0ff', m: '#eee8ff' };
const ART = {
  cat: ['.k........k.', '.kk......kk.', '.kok....kok.', '.kookkkkook.', 'kooooooooook', 'koykooookyok', 'kookooookook', 'kooookkoooo k', '.kooowwooook', '..kooooooook', '...kkkkkkkk.', '............'],
  puzzle: ['............', '..kkk..kkk..', '.kgggk.kbbk.', '.kgggkkbbbk.', '.kggggkbbbk.', '..kgkkkkbk..', '.kkkk..kkkk.', '.kyyykkoook.', '.kyyykooook.', '.kyyyykooook', '..kkkk.kkkk.', '............'],
  ttt: ['............', '...k...k....', '.r.k.r.k.ww.', '..rk.r.kw.w.', '.r.k.r.k.ww.', 'kkkkkkkkkkkk', '.ww.k.r.kr.r', 'w..wk..rk.r.', '.ww.k.r.kr.r', 'kkkkkkkkkkkk', '...k...k....', '............'],
  shells: ['............', '....kkkk....', '...krrrrk...', '...krRrrk...', '..krrrRrrk..', '..krrrrrrk..', '.krrrrrrrrk.', '.kkkkkkkkkk.', '...........', '.kkk.koko...', '.kOk.kook...', '............'],
  targets: ['....kkkk....', '..kkwwwwkk..', '.kwwrrrrwwk.', '.kwrrwwrrwk.', 'kwrrwrrwrrwk', 'kwrwrkkrwrwk', 'kwrwrkkrwrwk', 'kwrrwrrwrrwk', '.kwrrwwrrwk.', '.kwwrrrrwwk.', '..kkwwwwkk..', '....kkkk....'],
  cleanup: ['........kk..', '.......knk..', '......knk...', '.....knk....', '....knk.....', '...kyk......', '..kyyyk.....', '.kyykyyk....', 'kyykyykk....', 'kykyykk.....', '.kkkk.......', '............'],
  fish: ['............', '.......k....', '......kbk...', '.kk..kbbbkk.', 'kbbkkbbbbbbk', 'kbbbbbbbwkbk', 'kbbbbbbbbbbk', 'kbbkkbBBBBk.', '.kk..kBBBk..', '......kk....', '............', '............'],
  fuse: ['............', '......kkk...', '.....kyyk...', '....kyyk....', '...kyyk.....', '..kyyyyyk...', '.kkkkyyk....', '....kyk.....', '...kyk......', '..kyk.......', '..kk........', '............'],
  delivery: ['............', '..kkkkkkkk..', '.knnnnrnnnk.', 'knnnnnrnnnnk', 'kkkkkkrkkkkk', 'knnnnnrnnnnk', 'knnnnnrnnnnk', 'knnnnnrnnnnk', 'knnnnnrnnnnk', 'kNNNNNNNNNNk', '.kkkkkkkkkk.', '............'],
  safe: ['kkkkkkkkkkkk', 'kssssssssssk', 'ksddddddddsk', 'ksdkkkkkkdsk', 'ksdkyyyykdsk', 'ksdkyyky kdsk'.replace(' ', ''), 'ksdkykyykdsk', 'ksdkyyyykdsk', 'ksdkkkkkkdsk', 'ksddddddddsk', 'kssssssssssk', 'kkkkkkkkkkkk'],
  demolition: ['kkkkkkkkkk..', 'kyykyykyyk..', 'kkkkkkkkkk..', '........k...', '........k...', '........k...', '.......kkk..', '......kdddk.', '.....kdddddk', '.....kdsdddk', '.....kdddddk', '......kkkkk.'],
  // предметы
  balloon: ['....kkkk....', '...kbbbbk...', '..kbcbbbbk..', '..kbcbbbbk..', '..kbbbbbbk..', '..kbbbbbbk..', '...kbbbbk...', '....kBBk....', '.....kk.....', '......k.....', '.....k......', '......k.....'],
  tomato: ['............', '.....kgk....', '....kgggk...', '..kkrrrrkk..', '.krrrrrrrrk.', 'krwrrrrrrrrk', 'krwrrrrrrrrk', 'krrrrrrrrrrk', 'krrrrrrrrrRk', '.krrrrrrRRk.', '..kkkkkkkk..', '............'],
  pumpkin: ['.....kk.....', '.....kGk....', '...kkkkkk...', '..koOooOok..', '.kooOooOook.', 'kokkoOokkook', 'kooooOoooook', 'kokokkkkokok', 'koOkkokkkOok', '.kooOooOook.', '..kkkkkkkk..', '............'],
  ball: ['....kkkk....', '..kkooookk..', '.kookoookok.', '.kookoookok.', 'koookkkkooko', 'kkkkooookkkk', 'kookkkkoooko', 'koookoookook', '.koookoookk.', '.kookoookok.', '..kkooookk..', '....kkkk....'],
  brick: ['............', '............', '..kkkkkkkk..', '.krrrRrrrrk.', 'krrrrRrrrrRk', 'kRRRRRRRRRRk', 'krrRrrrrRrrk', 'krrRrrrrRrrk', 'kRRRRRRRRRRk', '.kkkkkkkkkk.', '............', '............'],
  chair: ['..kkkkkk....', '..knnnnk....', '..knnnnk....', '..knnnnk....', '..kkkkkkkkk.', '..knnnnnnnk.', '..kkkkkkkkk.', '..kn....kn..', '..kn....kn..', '..kn....kn..', '..kk....kk..', '............'],
  trash: ['.....kk.....', '....kddk....', '...kdkkdk...', '..kddddddk..', '.kdddddddsk.', 'kddsdddddsdk', 'kdddddsdddsk', 'kdsddddddddk', 'kdddsdddsddk', '.kddddddddk.', '..kkkkkkkk..', '............'],
  litter: ['............', '....kkkk....', '...krwrrk...', '...krwrrk...', '...kkkkkk...', '...kssssk...', '...krwrrk...', '...krwrrk...', '...krrrrk...', '...kkkkkk...', '............', '............'],
  parcel: ['............', '..kkkkkkkk..', '.knnnrrnnnk.', 'kkkkkrrkkkkk', 'knnnnrrnnnnk', 'knnnnrrnnnnk', 'knnnnnnnnnnk', 'knnnnnnnnnnk', 'kNNNNNNNNNNk', '.kkkkkkkkkk.', '............', '............'],
  cone: ['.....kk.....', '....kook....', '....kook....', '...kwwwwk...', '...koooo k..'.replace(' ', ''), '..kooooook..', '..kwwwwwwk..', '.koooooooook'.slice(0, 12), '.kooooooook.', 'kkkkkkkkkkkk', 'kddddddddddk', 'kkkkkkkkkkkk'],
  can: ['....kkkk....', '...kssssk...', '...krrrrk...', '...krwrrk...', '...krwrrk...', '...krwwrk...', '...krrwrk...', '...krrwrk...', '...krrrrk...', '...kssssk...', '....kkkk....', '............'],
  // гаджеты
  energy: ['....kkkk....', '...kssssk...', '...kggggk...', '...kgyggk...', '...kgyyg k..'.replace(' ', ''), '...kggyyk...', '...kgyggk...', '...kgygGk...', '...kggggk...', '...kssssk...', '....kkkk....', '............'],
  water: ['............', '..kkkkkkkk..', '.kbbbbbbbbkk', '.kbccbbbbbbk', '.kbbbbbbbkk.', '.kkbbkkkk...', '..kbbk......', '..kbbk......', '.kbbbk.c....', '.kkkkk..c...', '.......c....', '............'],
  firework: ['.....k......', '....krk.....', '...krwrk....', '...krrrk....', '...kwwwk....', '...krrrk....', '...krrrk....', '...kkkkk....', '....kyk..y..', '...y.y..y...', '..y..y.y....', '............'],
  popper: ['..r..y..g...', '.y..b....p..', '...g..r.....', '..kkkk..y...', '.kyyyyk.....', '.kyykyk.....', '..kyyk......', '..kyyk......', '...kk.......', '...kk.......', '............', '............'],
  sling: ['............', '.kk......kk.', '.knk....knk.', '.knkk..kknk.', '..knnkknnk..', '...knnnnk...', '....knnk....', '....knnk....', '....knnk....', '....knnk....', '....kkkk....', '............'],
  web: ['k....k....k.', '.k...k...k..', '..kkkkkkk...', '..kk.k.kk...', 'kkk.kkk.kkkk', '..k.kkk.k...', '..kk.k.kk...', '..kkkkkkk...', '.k...k...k..', 'k....k....k.', '............', '............'],
  boots: ['............', '....kkkk....', '....kppk....', '....kppk....', '....kppkkk..', '....kpppppk.', '....kkkkkkk.', '.....kyk....', '....kyk.....', '.....kyk....', '....kyk.....', '....kkkk....'],
  mask: ['....kkkk....', '..kkmmmmkk..', '.kmmmmmmmmk.', '.kmkkmmkkmk.', 'kmmkkmmkkmmk', 'kmmmmmmmmmmk', 'kmmmmkkmmmmk', 'kmmmmkkmmmmk', 'kmmmmmmmmmmk', 'kmkmmkkmmkmk', 'kk.kk..kk.kk', '............'],
  // инструменты
  slipper: ['............', '............', '............', '....kkkk....', '...krrrrk...', '..krrrrrrk..', '.kwwwkrrrrk.', 'kwwwwwkkkrrk', 'kRRRRRRRRRRk', '.kkkkkkkkkk.', '............', '............'],
  umbrella: ['.....kk.....', '...kkppkk...', '..kpppppPk..', '.kppppppPPk.', 'kppppppppPPk', 'kkkkkkkkkkkk', '.....kk.....', '.....kk.....', '.....kk.....', '.....kk.kk..', '......kkk...', '............'],
  extinguisher: ['....kkk.....', '...kkskkk...', '....kkk.kk..', '...krrrk.k..', '..krrrrrk.k.', '..krwwrrk.k.', '..krwwrrk.k.', '..krrrrrk.k.', '..krrrrrkk..', '..kRRRRRk...', '...kkkkk....', '............'],
  banana: ['.........kk.', '........kyk.', '.......kyyk.', '......kyyk..', '.....kyyyk..', '...kkyyyk...', '.kkyyyyk....', 'kyyyyykk....', 'kyyyyk......', '.kkkk.......', '............', '............'],
  pillow: ['............', '............', '.kk......kk.', 'kwwkkkkkkwwk', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '.kwwwpwwwwk.', '.kwwwwwwwwk.', 'kwwkkkkkkwwk', '.kk......kk.', '............', '............'],
  duck: ['............', '.....kkk....', '....kyyyk...', '....kykykk..', '....kyyykook', '.k..kyyykkk.', 'kyk.kyyyk...', 'kyykkyyyyk..', 'kyyyyyyyyyk.', 'kyyyyyyyyyk.', '.kyyyyyyyk..', '..kkkkkkk...'],
  bubbles: ['.....kk.....', '....kcck....', '...kc..ck...', '...kc..ck...', '....kcck....', '.....kk..kk.', '.....kk.kcck', '....kbbk.kk.', '...kbbbbk...', '...kbcbbk...', '...kbbbbk...', '....kkkk....'],
  whistle: ['............', '............', '..kkkkkkk...', '.ksssssssk..', 'kssssssssskk', 'kssskkkssssk', '.kssk.kssssk', '..kk...kkkk.', '............', '.....o......', '....o.......', '...o........'],
  magnet: ['............', '..kkkkkkkk..', '.krrrrrrrrk.', 'krrkkkkkkrrk', 'krrk....krrk', 'krrk....krrk', 'krrk....krrk', 'kwwk....kwwk', 'kwwk....kwwk', 'kkkk....kkkk', '............', '............'],
  paint: ['...kkkkkk...', '..k......k..', '.k........k.', 'kkkkkkkkkkkk', 'kbbbbbbbbbbk', 'kssssssssssk', '.kssssssssk.', '.kssssssssk.', '.kssbbbsssk.', '.ksssbssssk.', '..kkkkkkkk..', '............'],
  rake: ['.k.k.k.k....', '.k.k.k.k....', '.kkkkkkk....', '....kn......', '.....kn.....', '......kn....', '.......kn...', '........kn..', '.........kn.', '..........kn', '...........k', '............'],
  cushion: ['............', '............', '...kkkkk....', '..krrrrrk...', '.krrwrrrrk..', 'krrrrrrrrrkk', 'krrrrrrrrrrk', '.krrrrrrrkkk', '..kkkkkkk...', '............', '............', '............'],
  // предметы миссий
  cucumber: ['............', '.........kk.', '........kgGk', '.......kgGk.', '......kgGk..', '.....kgGk...', '....kgGk....', '...kgGk.....', '..kgGk......', '.kgGk.......', '.kkk........', '............'],
  bulb: ['....kkkk....', '...kyyyyk...', '..kyywyyyk..', '..kywyyyyk..', '..kyyyyyyk..', '...kyyyyk...', '....kyyk....', '....kssk....', '....kdsk....', '....kssk....', '.....kk.....', '............'],
  pizza: ['kkkkkkkkkkkk', 'koooooooooOk', '.kyryyyryyk.', '.kyyyyyyryk.', '..kyyryyyk..', '..kyyyyyyk..', '...kyryyk...', '...kyyyyk...', '....kyyk....', '....kyrk....', '.....kk.....', '............'],
  // новые миссии
  salad: ['............', '...g.r..g...', '..gGrrgGrg..', '.grgGgrrGgg.', 'kkkkkkkkkkkk', 'kwwwwwwwwwwk', '.kwwwwwwwwk.', '..kwwwwwwk..', '...kkkkkk...', '............', '............', '............'],
  phone: ['...kkkkkk...', '..kddddddk..', '..kcccccck..', '..kcbcbcck..', '..kcccccck..', '..kcgcpcck..', '..kcccccck..', '..kcccccck..', '..kddddddk..', '..kddkkddk..', '...kkkkkk...', '............'],
  catbox: ['............', '..k......k..', '.kok....kok.', '.kookkkkook.', 'kkkkkkkkkkkk', 'knnnnnnnnnnk', 'knnnNNNNnnnk', 'knnnnnnnnnnk', 'knnnnnnnnnnk', 'kNNNNNNNNNNk', 'kkkkkkkkkkkk', '............'],
  firebin: ['.....o......', '....oyo..o..', '...oyyo.oyo.', '..oyyyyooyo.', '.oyywyyyyyo.', 'kkkkkkkkkkkk', '.kssssssssk.', '.ksdsdsdsdk.', '.kssssssssk.', '.ksdsdsdsdk.', '.kssssssssk.', '..kkkkkkkk..'],
  // общие события и награды
  hill: ['....k.......', '....krrr....', '....krrrr...', '....krr.....', '....k.......', '....k.......', '...kgk......', '..kgggkk....', '.kgggggggk..', 'kgggGgggGggk', 'kGGGGGGGGGGk', 'kkkkkkkkkkkk'],
  moth: ['............', '.kk......kk.', 'kwwk.kk.kwwk', 'kwwwkwwkwwwk', 'kwswkwwkwswk', 'kwwwkrrkwwwk', '.kwwkwrkwwk.', '..kkkrrkkk..', '.....kk.....', '............', '............', '............'],
  football: ['kkkkkkkkkkkk', 'kw........wk', 'kw..kkkk..wk', 'kw.koooOk.wk', 'kw.kooOok.wk', 'kw.kOoook.wk', 'kw..kkkk..wk', 'kw........wk', 'kw........wk', 'kw........wk', 'kw........wk', '............'],
  crown: ['............', '............', 'k....kk....k', 'kk..kyyk..kk', 'kyk.kyyk.kyk', 'kyykyyyykyyk', 'kyyyyryyyyyk', 'kyyyrrryyyyk', 'kyyyyryyyyyk', 'kkkkkkkkkkkk', '............', '............'],
  rain: ['....kkkk....', '..kkddddkk..', '.kddddddddk.', 'kddddddddddk', 'kkkkkkkkkkkk', '............', '.b...b...b..', 'b...b...b...', '...b...b...b', '..b...b...b.', '............', '............'],
  // события и прочее
  flash: ['............', '.kkkk.......', 'kyyyykk.....', 'kyyyyssk....', 'kyyyysssk.y.', 'kyyyysssk..y', 'kyyyyssk..y.', 'kkkkkkk..y..', '...........y', '............', '............', '............'],
  flood: ['............', '............', '..b....b....', '.bcb..bcb..b', 'bbbbbbbbbbbb', 'BbbbBbbbBbbb', 'bbbbbbbbbbbb', 'BBbbBBbbBBbb', 'bbbbbbbbbbbb', 'BBBBBBBBBBBB', '............', '............'],
  mouse: ['....kkkk....', '...kwwwwk...', '..kwwkwwwk..', '..kwwkwwwk..', '..kwwkwwwk..', '..kkkkkkkk..', '..kwwwwwwk..', '..kwwwwwwk..', '..kwwwwwwk..', '...kwwwwk...', '....kkkk....', '............'],
  cart: ['k...........', '.k..........', '.kkkkkkkkkk.', '.kssssssssk.', '..ksssssssk.', '..kssssssk..', '...kkkkkkk..', '...k....k...', '..kdk..kdk..', '...k....k...', '............', '............'],
};
const CACHE = {}, CV = {};
// та же иконка на canvas (для значков миссий над миром и на мини-карте)
export function iconCanvas(name, scale = 2) {
  const key = name + '@' + scale; if (CV[key]) return CV[key];
  const rows = ART[name] || ART.parcel, c = document.createElement('canvas'); c.width = c.height = 12 * scale; const g = c.getContext('2d');
  rows.forEach((row, y) => { for (let x = 0; x < 12; x++) { const ch = row[x]; if (!ch || ch === '.' || ch === ' ') continue; g.fillStyle = PAL[ch] || '#ff00ff'; g.fillRect(x * scale, y * scale, scale, scale); } });
  return (CV[key] = c);
}
export function icon(name, scale = 3) {
  const key = name + scale; if (CACHE[key]) return CACHE[key];
  const rows = ART[name] || ART.parcel, c = document.createElement('canvas'); c.width = c.height = 12 * scale;
  const g = c.getContext('2d');
  rows.forEach((row, y) => { for (let x = 0; x < 12; x++) { const ch = row[x]; if (!ch || ch === '.' || ch === ' ') continue; g.fillStyle = PAL[ch] || '#ff00ff'; g.fillRect(x * scale, y * scale, scale, scale); } });
  return (CACHE[key] = c.toDataURL());
}
export const img = (name, size = 24) => `<img class="pxi" src="${icon(name)}" width="${size}" height="${size}" alt="">`;
