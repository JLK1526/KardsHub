/* ============================================================
 *  KARDS-like  ·  卡牌数据层
 *  收录：德国 / 美国 / 英国 / 苏联 / 日本
 * ============================================================ */

const NATION_META = {
  ger: {
    key: 'ger', name: '德国', en: 'GERMANY', short: '德',
    color: '#8b8f86', dark: '#3b403c', light: '#c9ccc2', accent: '#d8b34a',
    motto: '闪电战 · 装甲集群 · 空中支援'
  },
  usa: {
    key: 'usa', name: '美国', en: 'UNITED STATES', short: '美',
    color: '#7d8a51', dark: '#39432a', light: '#d4d8b8', accent: '#e2c66a',
    motto: '工业产能 · 空中优势 · 空降突击'
  },
  uk: {
    key: 'uk', name: '英国', en: 'UNITED KINGDOM', short: '英',
    color: '#9b7c4a', dark: '#453522', light: '#e0cfab', accent: '#c9533f',
    motto: '坚壁防守 · 皇家空军 · 精锐突击'
  },
  sov: {
    key: 'sov', name: '苏联', en: 'SOVIET UNION', short: '苏',
    color: '#a8474a', dark: '#4a1f1f', light: '#e6bcb6', accent: '#e4c34a',
    motto: '钢铁洪流 · 纵深防御 · 冬季战争'
  },
  jpn: {
    key: 'jpn', name: '日本', en: 'JAPAN', short: '日',
    color: '#c2683f', dark: '#4a221a', light: '#ecccae', accent: '#e4b24a',
    motto: '奇袭突击 · 海军航空 · 死战不退'
  }
};

const TYPE_META = {
  infantry: { name: '步兵', en: 'INFANTRY' },
  tank:     { name: '坦克', en: 'TANK' },
  artillery:{ name: '火炮', en: 'ARTILLERY' },
  fighter:  { name: '战斗机', en: 'FIGHTER' },
  bomber:   { name: '轰炸机', en: 'BOMBER' },
  order:    { name: '指令', en: 'ORDER' }
};

const RARITY_META = {
  common:    { name: '普通', color: '#a8a8a0' },
  rare:      { name: '限定', color: '#5fa8d8' },
  epic:      { name: '精英', color: '#b57ad8' },
  legendary: { name: '传说', color: '#e0ac42' }
};

/*  effects:  { kind, value }
 *   被动：blitz(部署当回合可行动) / guard(守护) / deployFront(空降，直接部署到前线)
 *         / bonusVsTank(攻击坦克时 +N) / antiAir(可攻击空军)
 *   触发：draw(抽牌) / damage(选一个敌方单位造成 N 伤害) / damageAllAir(敌方全体空军 N 伤害)
 *         / healHQ(己方总部回复 N) / kredit(本回合 +N 指挥点)
 */
const CARD_LIST = [
  /* ---------------- 德国 ---------------- */
  { id:'g01', n:'ger', name:'第9步兵团', en:'Infanterie Regiment 9', type:'infantry', cost:1, op:1, atk:1, def:2, rarity:'common', text:'国防军的基础步兵。', effects:[] },
  { id:'g02', n:'ger', name:'装甲掷弹兵', en:'Panzergrenadier', type:'infantry', cost:2, op:1, atk:2, def:2, rarity:'common', text:'闪击：部署的当回合即可行动。', effects:[{kind:'blitz'}] },
  { id:'g03', n:'ger', name:'三号坦克', en:'Panzer III', type:'tank', cost:3, op:1, atk:3, def:3, rarity:'common', text:'闪电战的装甲矛头。', effects:[] },
  { id:'g04', n:'ger', name:'四号坦克', en:'Panzer IV', type:'tank', cost:4, op:1, atk:4, def:4, rarity:'rare', text:'可靠的装甲主力。', effects:[] },
  { id:'g05', n:'ger', name:'88毫米高射炮', en:'Flak 88', type:'artillery', cost:4, op:1, atk:2, def:5, rarity:'rare', text:'守护：敌军必须优先攻击守护单位。\n可攻击空军。', effects:[{kind:'guard'},{kind:'antiAir'}] },
  { id:'g06', n:'ger', name:'旋风式自行高炮', en:'Wirbelwind', type:'tank', cost:4, op:1, atk:2, def:4, rarity:'rare', text:'可攻击空军。对飞机造成 +2 伤害。', effects:[{kind:'antiAir'},{kind:'bonusVsAir',value:2}] },
  { id:'g07', n:'ger', name:'Bf 109 战斗机', en:'Messerschmitt Bf 109', type:'fighter', cost:3, op:1, atk:3, def:2, rarity:'common', text:'争夺制空权。', effects:[] },
  { id:'g08', n:'ger', name:'Ju 87 斯图卡', en:'Junkers Ju 87 Stuka', type:'bomber', cost:4, op:2, atk:4, def:3, rarity:'rare', text:'俯冲轰炸，撕开敌方防线。', effects:[] },
  { id:'g09', n:'ger', name:'豹式坦克', en:'Panther', type:'tank', cost:6, op:2, atk:5, def:5, rarity:'epic', text:'部署：抽 1 张牌。', effects:[{kind:'draw',value:1}] },
  { id:'g10', n:'ger', name:'虎式坦克', en:'Tiger I', type:'tank', cost:7, op:2, atk:6, def:7, rarity:'legendary', text:'守护：敌军必须优先攻击守护单位。', effects:[{kind:'guard'}] },
  { id:'g11', n:'ger', name:'闪电战', en:'Blitzkrieg', type:'order', cost:3, op:0, atk:0, def:0, rarity:'rare', text:'本回合获得 2 点指挥点，抽 1 张牌。', effects:[{kind:'kredit',value:2},{kind:'draw',value:1}] },
  { id:'g12', n:'ger', name:'狼群战术', en:'Wolfpack', type:'order', cost:2, op:0, atk:0, def:0, rarity:'common', text:'抽 2 张牌。', effects:[{kind:'draw',value:2}] },

  /* ---------------- 美国 ---------------- */
  { id:'u01', n:'usa', name:'步枪班', en:'Rifle Squad', type:'infantry', cost:1, op:1, atk:1, def:2, rarity:'common', text:'训练有素的步兵班。', effects:[] },
  { id:'u02', n:'usa', name:'巴祖卡小组', en:'Bazooka Team', type:'infantry', cost:2, op:1, atk:2, def:1, rarity:'common', text:'攻击坦克时 +2 攻击力。', effects:[{kind:'bonusVsTank',value:2}] },
  { id:'u03', n:'usa', name:'M10 狼獾', en:'M10 Wolverine', type:'tank', cost:3, op:1, atk:3, def:2, rarity:'common', text:'坦克歼击车。', effects:[] },
  { id:'u04', n:'usa', name:'M4 谢尔曼', en:'M4 Sherman', type:'tank', cost:4, op:1, atk:3, def:4, rarity:'common', text:'量产化的装甲中坚。', effects:[] },
  { id:'u05', n:'usa', name:'101空降师', en:'101st Airborne', type:'infantry', cost:4, op:1, atk:3, def:3, rarity:'rare', text:'空降：直接部署到前线。', effects:[{kind:'deployFront'}] },
  { id:'u06', n:'usa', name:'海军陆战队', en:'US Marines', type:'infantry', cost:3, op:1, atk:3, def:2, rarity:'common', text:'闪击：部署的当回合即可行动。', effects:[{kind:'blitz'}] },
  { id:'u07', n:'usa', name:'P-38 闪电', en:'P-38 Lightning', type:'fighter', cost:3, op:1, atk:2, def:3, rarity:'common', text:'双身远程护航战斗机。', effects:[] },
  { id:'u08', n:'usa', name:'P-51 野马', en:'P-51 Mustang', type:'fighter', cost:4, op:1, atk:4, def:3, rarity:'rare', text:'部署：抽 1 张牌。', effects:[{kind:'draw',value:1}] },
  { id:'u09', n:'usa', name:'B-17 空中堡垒', en:'B-17 Flying Fortress', type:'bomber', cost:6, op:2, atk:4, def:6, rarity:'epic', text:'守护：敌军必须优先攻击守护单位。', effects:[{kind:'guard'}] },
  { id:'u10', n:'usa', name:'M26 潘兴', en:'M26 Pershing', type:'tank', cost:7, op:2, atk:6, def:6, rarity:'legendary', text:'部署：对 1 个敌方单位造成 2 点伤害。', effects:[{kind:'damage',value:2}] },
  { id:'u11', n:'usa', name:'战争机器', en:'War Machine', type:'order', cost:2, op:0, atk:0, def:0, rarity:'common', text:'本回合获得 3 点指挥点。', effects:[{kind:'kredit',value:3}] },
  { id:'u12', n:'usa', name:'战略空袭', en:'Strategic Bombing', type:'order', cost:4, op:0, atk:0, def:0, rarity:'rare', text:'对 1 个敌方单位造成 4 点伤害。', effects:[{kind:'damage',value:4}] },

  /* ---------------- 英国 ---------------- */
  { id:'b01', n:'uk', name:'来复枪旅', en:'Rifle Brigade', type:'infantry', cost:1, op:1, atk:1, def:2, rarity:'common', text:'战线上的基石。', effects:[] },
  { id:'b02', n:'uk', name:'霍克飓风', en:'Hawker Hurricane', type:'fighter', cost:2, op:1, atk:2, def:2, rarity:'common', text:'不列颠上空的守卫者。', effects:[] },
  { id:'b03', n:'uk', name:'玛蒂尔达 II', en:'Matilda II', type:'tank', cost:3, op:1, atk:2, def:5, rarity:'common', text:'守护：敌军必须优先攻击守护单位。', effects:[{kind:'guard'}] },
  { id:'b04', n:'uk', name:'QF 25磅炮', en:'QF 25-pounder', type:'artillery', cost:3, op:1, atk:2, def:4, rarity:'common', text:'可攻击空军。', effects:[{kind:'antiAir'}] },
  { id:'b05', n:'uk', name:'喷火战斗机', en:'Supermarine Spitfire', type:'fighter', cost:3, op:1, atk:3, def:3, rarity:'rare', text:'部署：抽 1 张牌。', effects:[{kind:'draw',value:1}] },
  { id:'b06', n:'uk', name:'突击队', en:'Commandos', type:'infantry', cost:3, op:1, atk:3, def:2, rarity:'common', text:'闪击：部署的当回合即可行动。', effects:[{kind:'blitz'}] },
  { id:'b07', n:'uk', name:'丘吉尔坦克', en:'Churchill Mk III', type:'tank', cost:5, op:2, atk:3, def:7, rarity:'rare', text:'厚重装甲，寸步不退。', effects:[] },
  { id:'b08', n:'uk', name:'禁卫装甲师', en:'Guards Armoured Div.', type:'tank', cost:6, op:2, atk:5, def:5, rarity:'epic', text:'闪击：部署的当回合即可行动。', effects:[{kind:'blitz'}] },
  { id:'b09', n:'uk', name:'兰开斯特轰炸机', en:'Avro Lancaster', type:'bomber', cost:6, op:2, atk:5, def:5, rarity:'epic', text:'部署：对 1 个敌方单位造成 2 点伤害。', effects:[{kind:'damage',value:2}] },
  { id:'b10', n:'uk', name:'不列颠之战', en:'Battle of Britain', type:'order', cost:4, op:0, atk:0, def:0, rarity:'rare', text:'对所有敌方空军单位造成 3 点伤害。', effects:[{kind:'damageAllAir',value:3}] },
  { id:'b11', n:'uk', name:'本土链雷达', en:'Chain Home', type:'order', cost:2, op:0, atk:0, def:0, rarity:'common', text:'抽 1 张牌，己方总部回复 3 点。', effects:[{kind:'draw',value:1},{kind:'healHQ',value:3}] },
  { id:'b12', n:'uk', name:'SAS 突袭', en:'SAS Raid', type:'order', cost:3, op:0, atk:0, def:0, rarity:'rare', text:'对 1 个敌方单位造成 3 点伤害。', effects:[{kind:'damage',value:3}] },

  /* ---------------- 苏联 ---------------- */
  { id:'s01', n:'sov', name:'动员步兵', en:'Conscript Infantry', type:'infantry', cost:1, op:1, atk:1, def:2, rarity:'common', text:'红军的基础步兵。', effects:[] },
  { id:'s02', n:'sov', name:'红军步兵', en:'Red Army Riflemen', type:'infantry', cost:2, op:1, atk:2, def:2, rarity:'common', text:'闪击：部署的当回合即可行动。', effects:[{kind:'blitz'}] },
  { id:'s03', n:'sov', name:'T-34 中型坦克', en:'T-34 Medium', type:'tank', cost:3, op:1, atk:3, def:3, rarity:'common', text:'苏维埃的传奇坦克。', effects:[] },
  { id:'s04', n:'sov', name:'KV-1 重型坦克', en:'KV-1 Heavy', type:'tank', cost:4, op:1, atk:4, def:5, rarity:'rare', text:'守护：敌军必须优先攻击守护单位。', effects:[{kind:'guard'}] },
  { id:'s05', n:'sov', name:'喀秋莎火箭炮', en:'Katyusha Rocket', type:'artillery', cost:4, op:1, atk:2, def:5, rarity:'rare', text:'部署：对所有敌方空军单位造成 2 点伤害。', effects:[{kind:'damageAllAir',value:2}] },
  { id:'s06', n:'sov', name:'SU-85 歼击车', en:'SU-85 Tank Destroyer', type:'tank', cost:4, op:1, atk:2, def:4, rarity:'rare', text:'攻击坦克时 +3 攻击力。', effects:[{kind:'bonusVsTank',value:3}] },
  { id:'s07', n:'sov', name:'雅克-3 战斗机', en:'Yak-3 Fighter', type:'fighter', cost:3, op:1, atk:3, def:2, rarity:'common', text:'争夺制空权。', effects:[] },
  { id:'s08', n:'sov', name:'IL-2 强击机', en:'Il-2 Sturmovik', type:'bomber', cost:4, op:2, atk:4, def:3, rarity:'rare', text:'部署：对 1 个敌方单位造成 2 点伤害。', effects:[{kind:'damage',value:2}] },
  { id:'s09', n:'sov', name:'IS-2 重型坦克', en:'IS-2 Heavy', type:'tank', cost:6, op:2, atk:5, def:5, rarity:'epic', text:'部署：抽 1 张牌。', effects:[{kind:'draw',value:1}] },
  { id:'s10', n:'sov', name:'IS-3 斯大林', en:'IS-3 Stalin', type:'tank', cost:7, op:2, atk:6, def:7, rarity:'legendary', text:'守护：敌军必须优先攻击守护单位。', effects:[{kind:'guard'}] },
  { id:'s11', n:'sov', name:'冬季动员', en:'Winter Mobilization', type:'order', cost:2, op:0, atk:0, def:0, rarity:'common', text:'本回合获得 2 点指挥点，抽 1 张牌。', effects:[{kind:'kredit',value:2},{kind:'draw',value:1}] },
  { id:'s12', n:'sov', name:'火力覆盖', en:'Artillery Barrage', type:'order', cost:3, op:0, atk:0, def:0, rarity:'rare', text:'对 1 个敌方单位造成 3 点伤害。', effects:[{kind:'damage',value:3}] },

  /* ---------------- 日本 ---------------- */
  { id:'j01', n:'jpn', name:'步兵分队', en:'Infantry Squad', type:'infantry', cost:1, op:1, atk:1, def:2, rarity:'common', text:'皇军的基础步兵。', effects:[] },
  { id:'j02', n:'jpn', name:'特别陆战队', en:'Special Naval Landing', type:'infantry', cost:2, op:1, atk:2, def:1, rarity:'common', text:'攻击坦克时 +2 攻击力。', effects:[{kind:'bonusVsTank',value:2}] },
  { id:'j03', n:'jpn', name:'九五式轻战车', en:'Type 95 Ha-Go', type:'tank', cost:3, op:1, atk:3, def:2, rarity:'common', text:'轻快的侦察坦克。', effects:[] },
  { id:'j04', n:'jpn', name:'九七式中战车', en:'Type 97 Chi-Ha', type:'tank', cost:4, op:1, atk:4, def:3, rarity:'rare', text:'量产化的装甲主力。', effects:[] },
  { id:'j05', n:'jpn', name:'零式战斗机', en:'A6M Zero', type:'fighter', cost:2, op:1, atk:2, def:2, rarity:'common', text:'太平洋上空的传奇。', effects:[] },
  { id:'j06', n:'jpn', name:'紫电战斗机', en:'Shiden Fighter', type:'fighter', cost:4, op:1, atk:4, def:3, rarity:'rare', text:'部署：抽 1 张牌。', effects:[{kind:'draw',value:1}] },
  { id:'j07', n:'jpn', name:'一式陆攻', en:'G4M Betty', type:'bomber', cost:4, op:2, atk:4, def:3, rarity:'rare', text:'远程海上打击机。', effects:[] },
  { id:'j08', n:'jpn', name:'银河轰炸机', en:'P1Y Ginga', type:'bomber', cost:6, op:2, atk:5, def:5, rarity:'epic', text:'部署：对 1 个敌方单位造成 2 点伤害。', effects:[{kind:'damage',value:2}] },
  { id:'j09', n:'jpn', name:'三式中战车', en:'Type 3 Chi-Nu', type:'tank', cost:5, op:2, atk:3, def:6, rarity:'rare', text:'守护：敌军必须优先攻击守护单位。', effects:[{kind:'guard'}] },
  { id:'j10', n:'jpn', name:'四式战车', en:'Type 4 Chi-To', type:'tank', cost:7, op:2, atk:6, def:6, rarity:'legendary', text:'部署：抽 1 张牌。', effects:[{kind:'draw',value:1}] },
  { id:'j11', n:'jpn', name:'玉碎突击', en:'Banzai Charge', type:'order', cost:2, op:0, atk:0, def:0, rarity:'common', text:'本回合获得 2 点指挥点，抽 1 张牌。', effects:[{kind:'kredit',value:2},{kind:'draw',value:1}] },
  { id:'j12', n:'jpn', name:'珍珠港奇袭', en:'Pearl Harbor', type:'order', cost:4, op:0, atk:0, def:0, rarity:'rare', text:'对 1 个敌方单位造成 4 点伤害。', effects:[{kind:'damage',value:4}] }
];

const CARD_INDEX = Object.fromEntries(CARD_LIST.map(c => [c.id, c]));

function cardsOfNation(n) { return CARD_LIST.filter(c => c.n === n); }

/* 依据费用权重把 12 种卡牌铺成 30 张卡组 */
function buildDeck(n) {
  const deck = [];
  cardsOfNation(n).forEach(c => {
    const copies = c.cost <= 2 ? 3 : (c.cost <= 4 ? 2 : 1);
    for (let i = 0; i < copies; i++) deck.push(c.id);
  });
  // 补齐 / 裁剪到 30 张
  const cheap = cardsOfNation(n).filter(c => c.cost <= 2).map(c => c.id);
  let i = 0;
  while (deck.length < 30) deck.push(cheap[i++ % cheap.length]);
  return shuffle(deck.slice(0, 30));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasEffect(card, kind) {
  return (card.effects || []).some(e => e.kind === kind);
}
function effectValue(card, kind) {
  const e = (card.effects || []).find(x => x.kind === kind);
  return e ? (e.value || 0) : 0;
}
function isAir(card) { return card.type === 'fighter' || card.type === 'bomber'; }
function isUnit(card) { return card.type !== 'order'; }
