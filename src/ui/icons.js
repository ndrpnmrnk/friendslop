/* Пиксельные иконки интерфейса 12×12 (рисуются один раз в canvas → dataURL).
   Вместо эмодзи: один стиль для миссий, предметов, гаджетов и событий. */
const PAL = { k: '#17111f', o: '#ff8a1f', O: '#c85a0a', y: '#f5c542', g: '#9be36b', G: '#4f8a3a', r: '#ff5a6e', R: '#a8243a', b: '#4ab0f0', B: '#1e6aa8',
  w: '#f1e8ff', p: '#b18cff', P: '#6a4aa8', n: '#a8744a', N: '#6a4428', s: '#a8a8b8', d: '#4a4058', c: '#d8f0ff', m: '#eee8ff' };
const ART = {
  mammoth:['............','....nnnn....','..nnnnnnnn..','.nnnnnnnnnn.','nnnnnnnnnnnk','nnnnnnnnnnwk','nnnnnnnnn.wk','.nnnnnnnn.w.','..nn..nn..w.','..nn..nn....','..kk..kk....','............'],
  // v0.23: значки новых миссий
  doorbell: ['..kkkkkkkk..', '..knnnnnnk..', '..knNNNNnk..', '..knNNNNnk..', '..knnnnnnk..', '..knNNNNnk..', '..knNNyNnk..', '..knnnnnnk..', '..knNNNNnk..', '..knnnnnnk..', '.kkkkkkkkkk.', '............'],
  steal: ['......kkk...', '.....kwwwk..', '.....kwkwk..', '.....kwwwk..', '......kkk...', '..kk...k....', '.krrk..k....', '.krwrk.kk...', '.krrk..k.k..', '..kk..k...k.', '.....k.....k', '............'],
  grill: ['............', '...kkkkkk...', '..koooooook.', '.kooooooook.', '.kkkkkkkkkk.', '.kNNNNNNNNk.', '.kgggggggggk', '.kNNNNNNNNk.', '.koooooooook', '..kkkkkkkk..', '............', '............'],
  generator: ['............', '.kkkkkkkkkk.', '.kyyyyyyyyk.', '.kykkkkkkyk.', '.kykwwrwkyk.', '.kykwwwwkyk.', '.kykkkkkkyk.', '.kyyyyyyyyk.', '.kkkkkkkkkk.', '..kk....kk..', '..kk....kk..', '............'],
  bells: ['kkkkkkkkkkkk', '..k.....k...', '.kok...kok..', 'kooo.k.kooo.', 'kooo..kooo..', 'kooo..kooo..', 'koook.koook.', 'kkkkk.kkkkk.', '..k.....k...', '............', '............', '............'],
  moths: ['............', '.kk......kk.', 'kppk....kppk', 'kpppk..kpppk', 'kppppkkppppk', '.kppkddkppk.', '..kkkddkkk..', '.kppkddkppk.', 'kpppk..kpppk', '.kkk....kkk.', '............', '............'],
  carwash: ['....b..b....', '...b..b..b..', '............', '..kkkkkkkk..', '.kbbbbbbbbk.', 'kbccbbbbccbk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '.kdk....kdk.', '..k......k..', '............', '............'],
  balloon: ['....kkkk....', '...krrrrk...', '..krwrrrrk..', '..krrrrrrk..', '..krrrrrrk..', '...krrrrk...', '....kkkk....', '.....kk.....', '......k.....', '.....k......', '......k.....', '.....k......'],
  mail: ['............', '............', 'kkkkkkkkkkkk', 'kwkwwwwwwkwk', 'kwwkwwwwkwwk', 'kwwwkwwkwwwk', 'kwwwwkkwwwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............', '............'],
  detector: ['........kkk.', '.......kyyk.', '......kyk...', '.....kyk....', '....kyk.....', '...kyk......', '..kyk.......', '.kkk........', 'kssk........', 'kssk..b..b..', '.kk..b..b...', '............'],
  cart: ['k...........', 'kk..........', '.kkkkkkkkkk.', '.kwkwkwkwkk.', '.kkkkkkkkkk.', '..kwkwkwkk..', '..kkkkkkkk..', '...k....k...', '...kkkkkk...', '..kk....kk..', '..kk....kk..', '............'],
  ghost: ['....kkkk....', '..kkwwwwkk..', '.kwwwwwwwwk.', '.kwkkwwkkwk.', '.kwkkwwkkwk.', '.kwwwwwwwwk.', '.kwwwkkwwwk.', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '.kwkwwkwwkk.', '.kk.kk.kk...', '............'],
  antenna: ['...kkkkk....', '..kssssk....', '.kssssk.....', 'kssssk..k...', 'kssssk.k....', 'kssssskk....', '.kssssk.....', '..kkkk......', '....k.......', '....k.......', '...kkk......', '..kkkkk.....'],
  pigeon: ['............', '.....kkk....', '....kdddk...', '...kdkddko..', '...kdddkk...', '..kddddk....', '.kssssssk...', 'kssssssssk..', '.kssssssk...', '..kkkkkk....', '...o..o.....', '............'],
  // v0.21: значки управления вертушкой
  dart: ['............', '..........y.', '.........yy.', '........yy..', '.......kk...', '......kk....', '.....kk.....', '....kk......', '.rrkk.......', '.rrk........', 'rr..........', '............'],
  candy: ['............', '............', '.y........y.', '.yy..kk..yy.', '.yyykrrkyyy.', '.yykrwrrkyy.', '.yykrrrrkyy.', '.yyykrrkyyy.', '.yy..kk..yy.', '.y........y.', '............', '............'],
  updown: ['.....kk.....', '....kwwk....', '...kwwwwk...', '..kkkwwkkk..', '....kwwk....', '............', '............', '....kwwk....', '..kkkwwkkk..', '...kwwwwk...', '....kwwk....', '.....kk.....'],
  net: ['............', '.k.k.k.k.k..', 'kwkwkwkwkwk.', '.k.k.k.k.k..', 'kwkwkwkwkwk.', '.k.k.k.k.k..', '....kkk.....', '...kGGGkkkk.', '...kGGGGGGGk', '...kGkkkkkk.', '...kk.......', '............'],
  badge: ['............', '.kkkkkkkkkk.', '.kBBBBBBBBk.', '.kBBByyBBBk.', '.kByyyyyyBk.', '.kBByyyyBBk.', '.kBByyyyBBk.', '.kByyBByyBk.', '.kBBBBBBBBk.', '.kkkkkkkkkk.', '............', '............'],
  glove: ['............', '......kkkk..', '.....krrrrk.', '....krrrrrrk', '....krrwrrrk', '....krrrrrrk', '.....krrrrk.', '..ksskkkkk..', '.ksk.k......', 'ksk.........', 'kk..........', '............'],
  vacuum: ['............', '...kkkkk....', '..kpppppk...', '..kpwpppk...', '..kpppppkkk.', '..kpppppk.k.', '..kkkkkkk.k.', '...k.k....k.', '..........k.', '.......kkkk.', '.......kssk.', '............'],
  zombie: ['...kkkkkk...', '..kggggggk..', '.kggGgggGgk.', '.kgkkggkkgk.', '.kgkrgkrgk..'.padEnd(12, '.'), '.kggggggggk.', '.kggkkkkggk.', '.kgkwkwkwgk.', '..kggggggk..', '...kkGGkk...', '....kGGk....', '.....kk.....'],
  potato: ['.......y....', '......yoy...', '.......y....', '......k.....', '....kkOkk...', '...kooooOk..', '..koOooooOk.', '..kooooooOk.', '..koOoooOok.', '...kooooOk..', '....kkkkk...', '............'],
  lava: ['............', '............', '..y.....y...', '.yoy...yoy..', '.oro..yoroy.', 'ororoyororor', 'rorrorrorror', 'RrRRrRRrRRrR', 'RRRRRRRRRRRR', 'kkkkkkkkkkkk', '............', '............'],
  paint: ['............', '..kkkkkkk...', '..kbbbbbk...', '..kbbbbbk...', '..kkkkkkk...', '.....kk.....', '.....kk..b..', '.....kk.bbb.', '.p...kk..b..', 'ppp..kk.....', '.p...kk..g..', '.....kk.....'],
  leaves: ['............', '....o.......', '...ooo..O...', '..oOooOOOO..', '.ooooOOOoOO.', 'ooOoooyyyOOo', 'oooooykkyooO', 'OOoooyyyyoOO', '.OOooooOOoo.', '..OOOooOOO..', '............', '............'],
  graffiti: ['......kkk...', '.....kwwk...', '.....kkkk...', '....krrrrk..', '....krwrrk..', '.b..krwrrk..', 'b.b.krrrrk..', '.b..krrrrk..', 'b...krrrrk..', '....krrrrk..', '....kkkkkk..', '............'],
  intercom: ['..kkkkkkkk..', '..kssssssk..', '..ksbbbbsk..', '..kssssssk..', '..ksgsgsgk..', '..kssssssk..', '..ksgsgsgk..', '..kssssssk..', '..ksgsgsgk..', '..kssssssk..', '..kkkkkkkk..', '............'],
  lockpick: ['............', '...kkkkk....', '..kssssk....', '..ks..ks....', '.kyyyyyyk...', '.kyykkyyk...', '.kyykkyyk...', '.kyyykyyk..s', '.kyyyyyyk.s.', '.kkkkkkkkss.', '.........s..', '............'],
  pipes: ['............', 'kkkkk.......', 'sbbbk.......', 'kkkbk.......', '..kbk.......', '..kbkkkkkkkk', '..kbbbbbbbbs', '..kkkkkkkbkk', '........kbk.', '........kbk.', '........kbk.', '........kkk.'],
  gear: ['.....kk.....', '..k.kwwk.k..', '.kwkwwwwkwk.', '..kwwkkwwk..', '.kwwk..kwwk.', 'kwwk....kwwk', 'kwwk....kwwk', '.kwwk..kwwk.', '..kwwkkwwk..', '.kwkwwwwkwk.', '..k.kwwk.k..', '.....kk.....'],
  mic: ['....kkkk....', '...kwwwwk...', '...kwkkwk...', '...kwwwwk...', '...kwkkwk...', '.k.kwwwwk.k.', '.k..kkkk..k.', '..k......k..', '...kkkkkk...', '.....kk.....', '....kkkk....', '............'],
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
