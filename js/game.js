/* ==================================================================
 *  KARDS-like  ·  对局逻辑
 * ================================================================== */
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DIFF = {
  easy:   { label:'低', aiHQ:16, slotBonus:0, startSlots:0, extraDraw:0, smart:0.30, waste:0.35 },
  normal: { label:'中', aiHQ:20, slotBonus:0, startSlots:0, extraDraw:0, smart:0.80, waste:0.10 },
  hard:   { label:'高', aiHQ:25, slotBonus:1, startSlots:1, extraDraw:1, smart:1.00, waste:0.00 }
};
const ROW_SIZE = { foe:4, front:5, player:4 };
const HAND_LIMIT = 9;
const MAX_SLOTS = 12;

let S = null;
let gameSeq = 0;      // 对局代号：让上一局残留的异步回调失效
let uidSeq = 1;
const newUid = () => 'u' + (uidSeq++);

/* ---------------- 启动页 ---------------- */
let chosenDiff = 'normal';
let chosenNation = 'ger';
// 隐藏阵营（国民党）只能由彩蛋启用，且仅对当前这一局生效。
// 用它而不直接改 chosenNation，避免污染开始页的选择状态；用完立即清空。
let secretNationOnce = null;
const SECRET_NATION = 'ktm';

// 强制让开始页高亮与 chosenNation 一致。任何路径回到主界面都调用一次，
// 避免「界面选的是 A、内部却记成 B」这种状态漂移；隐藏阵营若混入则回退到默认。
function syncNationSelection() {
  if (chosenNation === SECRET_NATION || !NATION_META[chosenNation]) chosenNation = 'ger';
  $$('.nation').forEach(b => b.classList.toggle('on', b.dataset.nation === chosenNation));
}

function initStartScreen() {
  $$('[data-badge]').forEach(el => el.innerHTML = nationBadge(el.dataset.badge, 36));
  syncNationSelection();

  $('#diffRow').addEventListener('click', e => {
    const b = e.target.closest('.diff'); if (!b) return;
    $$('.diff').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); chosenDiff = b.dataset.diff;
  });
  $('#nationRow').addEventListener('click', e => {
    const b = e.target.closest('.nation'); if (!b) return;
    chosenNation = b.dataset.nation;
    syncNationSelection();
  });
  $('#startBtn').addEventListener('click', startNewGame);
  $('#restartBtn').addEventListener('click', () => { $('#overlay').classList.add('hidden'); restartSameGame(); });
  $('#menuBtn').addEventListener('click', () => {
    $('#overlay').classList.add('hidden');
    $('#gameScreen').classList.add('hidden');
    $('#startScreen').classList.remove('hidden');
    syncNationSelection();
  });
}

/* ---------------- 建立对局 ---------------- */
// 重开当前对局：沿用当前阵营。隐藏阵营是唯一需要显式续用的情况，
// 避免彩蛋局点「再战一局」后悄悄变成开始页选中的国家。
function restartSameGame() {
  if (S && S.playerNation === SECRET_NATION) secretNationOnce = SECRET_NATION;
  startNewGame();
}

function startNewGame() {
  // 清掉上一局尚未触发的定时器，避免旧回调作用到新对局
  cancelAutoEnd();
  if (S && S.aiTimer) { clearTimeout(S.aiTimer); S.aiTimer = null; }
  gameSeq++;
  const gen = gameSeq;
  // 彩蛋阵营只影响这一局；隐藏阵营永远不进入常规对手随机池
  const nation = secretNationOnce || chosenNation;
  secretNationOnce = null;
  const others = Object.keys(NATION_META).filter(n => n !== nation && n !== SECRET_NATION);
  const foeNation = others[Math.floor(Math.random() * others.length)];
  const d = DIFF[chosenDiff];

  S = {
    gen, aiTimer:null,
    diff: chosenDiff, cfg: d,
    playerNation: nation, foeNation,
    turn: 1, tick: 0, current: 'player', phase: 'idle', over: false,
    frontOwner: 'none',
    p: {
      player: makePlayer(20),
      foe: makePlayer(d.aiHQ)
    },
    board: { foe:Array(4).fill(null), front:Array(5).fill(null), player:Array(4).fill(null) },
    selectedHand: null, selectedUnit: null,
    inspect: null,           // 右侧预览区当前展示的 { id, uid }
    pending: null,           // 待选目标的指令 / 部署效果
    targetMode: null,        // 仅法术选目标使用：'spell'（单位攻击改为选中即高亮）
    autoEndScheduled: false, autoEndTimer: null,
    stats: { deployed:0, kills:0, dmg:0 }
  };
  S.p.player.deck = buildDeck(nation);
  S.p.foe.deck    = buildDeck(foeNation);
  // 起手 4 张
  draw('player', 4, true); draw('foe', 4, true);

  $('#startScreen').classList.add('hidden');
  $('#gameScreen').classList.remove('hidden');
  $('#overlay').classList.add('hidden');
  $('#logBody').innerHTML = '';

  const pm = NATION_META[nation], fm = NATION_META[foeNation];
  $('#foeAvatar').innerHTML = nationBadge(foeNation, 28);
  // 顶部这一栏是对手信息，必须显式标出「敌方」，否则玩家会误以为是自己选的国家。
  // 副标题同时给出我方国家，方便一眼对照，避免「选了 A 却显示 B」的错觉。
  $('#foeName').textContent = '敌方 · ' + fm.name + ' 指挥官';
  $('#foeSub').textContent = '我方 ' + pm.name + ' ｜ 敌方 ' + fm.name + ' · ' + d.label + '难度';
  $('#diffChip').textContent = '难度：' + d.label;
  $('#foeHqBadge').innerHTML = nationBadge(foeNation, 44);
  $('#playerHqBadge').innerHTML = nationBadge(nation, 44);
  $('#playerName').innerHTML = nationBadge(nation, 22) + pm.name + ' · 我方';
  S.p.foe.slots += d.startSlots;

  log('=== 战斗开始 ===', 'sys');
  log(`我方 ${pm.name} vs 敌方 ${fm.name}（${d.label}难度）`, 'sys');
  log('我方先手，争夺前线！', 'me');

  startTurn('player', true);
}

function makePlayer(hp) {
  return { hp, maxHp:hp, deck:[], hand:[], slots:1, kredit:0, fatigue:0 };
}

/* ---------------- 回合流程 ---------------- */
function startTurn(side, first) {
  if (S.over) return;
  cancelAutoEnd();
  S.tick++;
  S.current = side;
  const p = S.p[side];
  const bonus = side === 'foe' ? S.cfg.slotBonus : 0;
  p.slots = Math.min(MAX_SLOTS, p.slots + 1 + bonus);
  p.kredit = p.slots;
  resetActions(side);
  clearSelection();
  S.phase = 'idle';
  draw(side, 1 + (side === 'foe' ? S.cfg.extraDraw : 0));
  render();
  showHint(side === 'player' ? `第 ${S.turn} 回合 · 轮到你了` : '敌方回合', side === 'foe');
  // 回合切换：无线电提示音 + 濒危检测（居中横幅已按要求移除）
  SFX.play('radio');
  FX.updateDanger();
  if (side === 'player') {
    $('#endTurnBtn').classList.remove('waiting');
    $('#endTurnSub').textContent = 'END TURN';
    checkAutoEnd();   // 回合一开始就没有可打出的牌时，同样自动结束
  } else {
    $('#endTurnBtn').classList.add('waiting');
    $('#endTurnSub').textContent = '敌方行动中';
    const gen = S.gen;
    S.aiTimer = setTimeout(() => {
      if (S && !S.over && S.gen === gen && S.current === 'foe') runAI(gen);
    }, 620);
  }
}

function endTurn() {
  if (S.over || S.phase === 'ai' || S.current !== 'player') return;
  clearSelection();
  $('#endTurnBtn').classList.add('waiting');
  startTurn('foe');
}

function nextPlayerTurn() {
  if (S.over) return;
  S.turn++;
  startTurn('player');
}

/* ---------------- 无可用行动 → 自动结束玩家回合 ---------------- */
function cancelAutoEnd() {
  if (!S) return;
  if (S.autoEndTimer) { clearTimeout(S.autoEndTimer); S.autoEndTimer = null; }
  if (S.autoEndScheduled) $('#hint').classList.add('hidden');
  S.autoEndScheduled = false;
}
// 是否还有能打出的手牌（费用够 + 单位卡要有空位可放）
function canPlayAnyCard(p) {
  return p.hand.some(h => {
    const c = CARD_INDEX[h.id];
    if (!c || c.cost > p.kredit) return false;
    if (!isUnit(c)) return true;
    const canFront = hasEffect(c, 'deployFront')
      && (frontOwner() === 'none' || frontOwner() === 'player')
      && freeIndex('front') >= 0;
    return freeIndex('player') >= 0 || canFront;
  });
}
// 玩家是否还有任何可执行操作：能出牌，或场上单位还能移动 / 攻击
function hasPlayerAction() {
  if (!S || S.over) return false;
  if (canPlayAnyCard(S.p.player)) return true;
  return allUnits('player').some(u => canMove(u) || canAttack(u));
}
function scheduleAutoEnd() {
  if (S.autoEndScheduled || S.over) return;
  S.autoEndScheduled = true;
  const gen = S.gen;
  const text = S.p.player.kredit <= 0
    ? '指挥点耗尽 · 自动结束回合'
    : '无牌可出 / 无可用行动 · 自动结束回合';
  log(text, 'sys');
  showHint(text, true);
  S.autoEndTimer = setTimeout(() => {
    if (!S || S.gen !== gen) return;
    S.autoEndTimer = null;
    S.autoEndScheduled = false;
    if (S.over || S.current !== 'player' || S.phase === 'ai' || S.phase === 'target' || S.pending) return;
    if (hasPlayerAction()) return;   // 等待期间又变得可行动则取消
    endTurn();
  }, 700);
}
function checkAutoEnd() {
  if (!S || S.over || S.current !== 'player' || S.phase === 'ai' || S.phase === 'target' || S.pending) return;
  if (hasPlayerAction()) { cancelAutoEnd(); return; }
  scheduleAutoEnd();
}
/* 每次花掉指挥点后调用：只有玩家侧需要自动结束，AI 侧由 runAI 自行收尾 */
function afterKreditSpent(side) {
  if (!S || S.over || side !== 'player') return;
  checkAutoEnd();
}

function draw(side, n, silent) {
  const p = S.p[side];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      p.fatigue++;
      p.hp -= p.fatigue;
      log(`${sideName(side)}牌库耗尽，疲劳伤害 ${p.fatigue}`, 'foe');
      checkGameOver();
      if (S.over) return;
      continue;
    }
    const id = p.deck.pop();
    if (p.hand.length >= HAND_LIMIT) {
      log(`${sideName(side)}手牌已满，弃掉 1 张`, 'foe');
    } else {
      p.hand.push({ uid:newUid(), id, isNew:true });
    }
  }
  if (!silent) render();
}

function resetActions(side) {
  for (const row of Object.keys(S.board))
    S.board[row].forEach(u => { if (u && u.owner === side) { u.moved = false; u.attacked = false; } });
}

const sideName = s => s === 'player' ? '我方' : '敌方';
const other    = s => s === 'player' ? 'foe' : 'player';
const ownRow   = s => s === 'player' ? 'player' : 'foe';
const enemyRow = s => s === 'player' ? 'foe' : 'player';

/* ---------------- 通用工具 ---------------- */
function findUnit(uid) {
  for (const row of Object.keys(S.board)) {
    const i = S.board[row].findIndex(u => u && u.uid === uid);
    if (i >= 0) return { unit:S.board[row][i], row, index:i };
  }
  return null;
}
function cardOf(u) { return CARD_INDEX[u.id]; }
function unitCard(u) { return CARD_INDEX[u.id]; }
function frontOwner() {
  const u = S.board.front.find(x => x);
  return u ? u.owner : 'none';
}
function freeIndex(row) { return S.board[row].findIndex(x => !x); }
function allUnits(side) {
  const out = [];
  for (const row of Object.keys(S.board))
    S.board[row].forEach(u => { if (u && (!side || u.owner === side)) out.push(u); });
  return out;
}
function canAttackAir(attacker, target) {
  if (!isAir(cardOf(target))) return true;
  const f = findUnit(target.uid);
  // 推进到前线的飞机会进入地面火力范围（避免被单机永久锁死前线）
  if (f && f.row === 'front') return true;
  const c = cardOf(attacker);
  return isAir(c) || hasEffect(c,'antiAir') || hasEffect(c,'bonusVsAir');
}
function hasGuard(u) { return hasEffect(cardOf(u), 'guard'); }

function legalTargets(side, attacker) {
  const found = findUnit(attacker.uid);
  if (!found) return [];
  const foe = other(side);
  const longRange = isLongRange(cardOf(attacker));
  let list = [];
  // 敌方前线单位：任意位置都可攻击
  S.board.front.forEach(u => { if (u && u.owner === foe) list.push(u); });
  // 位于前线，或本身就是远程单位（火炮 / 战斗机 / 轰炸机）时，
  // 可从己方支援线直接攻击敌方支援线与敌方总部，无需先推进到前线
  if (found.row === 'front' || longRange) {
    S.board[enemyRow(side)].forEach(u => { if (u) list.push(u); });
    if (longRange || S.board.front.every(u => !u || u.owner === side)) list.push('hq');
  }
  list = list.filter(t => t === 'hq' || canAttackAir(attacker, t));
  // 守护：有可达守护单位时必须优先攻击它们
  const guards = list.filter(t => t !== 'hq' && hasGuard(t));
  if (guards.length) list = guards;
  return list;
}

function attackPower(attacker, target) {
  const c = cardOf(attacker);
  let v = attacker.atk;
  if (target && target !== 'hq') {
    const tc = cardOf(target);
    if (tc.type === 'tank') v += effectValue(c, 'bonusVsTank');
    if (isAir(tc)) v += effectValue(c, 'bonusVsAir');
  }
  return v;
}

function canAct(u) {
  if (S.over || u.owner !== S.current) return false;
  if (u.bornTick === S.tick && !hasEffect(cardOf(u), 'blitz')) return false;
  return true;
}
function canMove(u) {
  const f = findUnit(u.uid);
  const owner = frontOwner();
  return canAct(u) && !u.moved && f.row === ownRow(u.owner)
    && (owner === 'none' || owner === u.owner) && freeIndex('front') >= 0
    && S.p[u.owner].kredit >= cardOf(u).op;
}
function canAttack(u) {
  return canAct(u) && !u.attacked && S.p[u.owner].kredit >= cardOf(u).op
    && legalTargets(u.owner, u).length > 0;
}

// 选中我方单位后可立即执行的行动目标：推进位 + 合法攻击目标。
// 高亮渲染与点击判定共用此函数，确保「看到的高亮」与「能点的目标」完全一致。
function actionTargets(uid) {
  const out = { unit:null, move:false, attack:[] };
  if (!uid || !S || S.over || S.current !== 'player' || S.phase === 'ai') return out;
  const f = findUnit(uid);
  if (!f || f.unit.owner !== 'player') return out;
  out.unit = f.unit;
  if (canMove(f.unit)) out.move = true;
  if (canAttack(f.unit))
    out.attack = legalTargets('player', f.unit).map(t => t === 'hq' ? 'hq' : t.uid);
  return out;
}

// 点击己方单位：选中并高亮可推进 / 可攻击的目标，玩家直接点高亮处执行
function selectUnit(uid) {
  const f = findUnit(uid);
  if (!f) return;
  S.selectedUnit = uid; S.selectedHand = null;
  S.targetMode = null; S.pending = null; S.phase = 'idle';
  const t = actionTargets(uid);
  if (!t.move && !t.attack.length) {
    showHint(canAct(f.unit) ? '该单位本回合无可用行动' : '该单位刚部署，需等待下回合（闪击除外）', true);
  } else {
    const tips = [];
    if (t.move) tips.push('点高亮的前线空位推进');
    if (t.attack.length) tips.push('点高亮的敌方目标攻击');
    showHint(tips.join('，或'), true);
  }
  render();
}

/* ---------------- 部署 / 效果 ---------------- */
function playCard(side, handUid, row, index, autoTarget) {
  const p = S.p[side];
  const hi = p.hand.findIndex(h => h.uid === handUid);
  if (hi < 0) return false;
  const card = CARD_INDEX[p.hand[hi].id];
  if (card.cost > p.kredit) return false;
  if (isUnit(card) && S.board[row][index]) return false;

  p.kredit -= card.cost;
  p.hand.splice(hi, 1);
  log(`${sideName(side)}打出「${card.name}」(-${card.cost})`, side === 'player' ? 'me' : 'foe');

  let unit = null;
  if (isUnit(card)) {
    unit = {
      uid:newUid(), id:card.id, owner:side,
      atk:card.atk, def:card.def, maxDef:card.def,
      moved:false, attacked:false, bornTick:S.tick
    };
    if (hasEffect(card,'blitz')) unit.bornTick = -1;
    S.board[row][index] = unit;
    if (side === 'player') S.stats.deployed++;
  }
  // 部署：落地冲击 + 军靴踏地音；指令卡：纸张翻动。AI 延迟播放避免与玩家操作叠音。
  const delay = side === 'foe' ? 0.08 : 0;
  if (isUnit(card)) {
    SFX.play('deploy', delay);
    render();                       // 先渲染出新单位，才能定位落地特效
    FX.land(`[data-uid="${unit.uid}"]`);
  } else {
    SFX.play('draw', delay);
  }
  resolveEffects(side, card, unit, autoTarget);
  render();
  afterKreditSpent(side);
  return true;
}

function resolveEffects(side, card, unit, autoTarget) {
  const p = S.p[side];
  for (const e of (card.effects || [])) {
    switch (e.kind) {
      case 'draw':
        draw(side, e.value, true); log(`${sideName(side)}抽 ${e.value} 张牌`, side === 'player' ? 'me' : 'foe'); break;
      case 'kredit':
        p.kredit += e.value;
        cancelAutoEnd();   // 补充指挥点后取消待执行的自动结束
        log(`${sideName(side)}获得 ${e.value} 点指挥点`, side === 'player' ? 'me' : 'foe'); break;
      case 'healHQ': {
        const v = Math.min(e.value, p.maxHp - p.hp);
        p.hp += v; log(`${sideName(side)}总部回复 ${v} 点`, side === 'player' ? 'me' : 'foe'); break;
      }
      case 'damage': {
        if (side === 'player' && !autoTarget) {
          // 玩家：进入选目标模式
          S.pending = { side, kind:'damage', value:e.value, source:card.name };
          S.targetMode = 'spell';
          S.phase = 'target';
          showHint(`选择 1 个敌方单位，造成 ${e.value} 点伤害`, true);
          break;
        }
        const t = pickSpellTarget(side, autoTarget);
        if (t) { dealSpellDamage(t, e.value, card.name); }
        break;
      }
      case 'damageAllAir': {
        const airs = allUnits(other(side)).filter(u => isAir(cardOf(u)));
        airs.forEach(u => dealSpellDamage(u, e.value, card.name));
        if (!airs.length) log('场上没有敌方空军', 'sys');
        break;
      }
    }
  }
  checkGameOver();
}

function pickSpellTarget(side, provided) {
  if (provided) return provided;
  const enemies = allUnits(other(side));
  if (!enemies.length) return null;
  // 优先能被击杀的高攻单位
  const killable = enemies.filter(u => u.def <= 3);
  const pool = killable.length ? killable : enemies;
  return pool.sort((a,b) => b.atk - a.atk)[0];
}

function dealSpellDamage(target, n, source) {
  const f = target && target.uid ? findUnit(target.uid) : null;
  if (!f) return;
  const u = f.unit;
  u.def -= n;
  log(`「${source}」对「${cardOf(u).name}」造成 ${n} 点伤害`, 'foe');
  const sel = `[data-uid="${u.uid}"]`;
  floatDamage(sel, '-' + n);
  SFX.play('hit');
  FX.impact(sel, n >= 4);
  if (u.def <= 0) {
    S.board[f.row][f.index] = null;
    log(`${sideName(u.owner)}「${cardOf(u).name}」被摧毁`, 'sys');
    if (u.owner === 'foe') S.stats.kills++;
    SFX.play('explode', 0.03);
    FX.destroy(sel);
  }
  checkGameOver();
}

/* ---------------- 行动 ---------------- */
function moveUnit(uid) {
  const f = findUnit(uid); if (!f) return;
  const u = f.unit, c = cardOf(u);
  if (!canMove(u)) { showHint('无法推进：前线被占据 / 指挥点不足 / 本回合已移动', true); return; }
  S.p[u.owner].kredit -= c.op;
  const fromEl = document.querySelector(`[data-uid="${u.uid}"]`);
  S.board[f.row][f.index] = null;
  S.board.front[freeIndex('front')] = u;
  u.moved = true;
  log(`${sideName(u.owner)}「${c.name}」推进至前线`, u.owner === 'player' ? 'me' : 'foe');
  SFX.play('move');                   // 履带 / 行军声
  render();
  FX.march(fromEl, `[data-uid="${u.uid}"]`);
  FX.land(`[data-uid="${u.uid}"]`);
  afterKreditSpent(u.owner);
}

function attack(uid, target) {
  const f = findUnit(uid); if (!f || S.over) return;
  const a = f.unit, ac = cardOf(a);
  if (!canAct(a) || a.attacked || S.p[a.owner].kredit < ac.op) { showHint('该单位本回合无法攻击', true); return; }
  if (!legalTargets(a.owner, a).some(t => (t === 'hq' ? target === 'hq' : t.uid === (target && target.uid)))) {
    showHint('不是合法目标（守护 / 制空限制）', true); return;
  }
  S.p[a.owner].kredit -= ac.op;
  a.attacked = true;
  const dmg = attackPower(a, target);
  const attackerEl = document.querySelector(`[data-uid="${a.uid}"]`);
  if (attackerEl) { attackerEl.classList.add('attacking'); setTimeout(() => attackerEl.classList.remove('attacking'), 360); }

  // 攻击音效 + 拖尾：火炮/轰炸机用炮声与炮弹轨迹，其它用枪声
  const heavy = ac.type === 'artillery' || ac.type === 'bomber';
  SFX.play(heavy ? 'cannon' : 'gun');
  const targetSel = target === 'hq' ? ('#' + (other(a.owner) === 'foe' ? 'foeHQ' : 'playerHQ'))
                                   : `[data-uid="${target.uid}"]`;
  FX.tracer(attackerEl, targetSel, heavy ? 'shell' : 'bullet');

  if (target === 'hq') {
    const victim = other(a.owner);
    S.p[victim].hp -= dmg;
    if (a.owner === 'player') S.stats.dmg += dmg;
    log(`${sideName(a.owner)}「${ac.name}」轰炸${sideName(victim)}总部，造成 ${dmg} 点伤害！`, a.owner === 'player' ? 'me' : 'foe');
    floatDamage('#' + (victim === 'foe' ? 'foeHQ' : 'playerHQ'), '-' + dmg);
    const hq = $('#' + (victim === 'foe' ? 'foeHQ' : 'playerHQ'));
    hq.classList.add('hit'); setTimeout(() => hq.classList.remove('hit'), 450);
    SFX.play('hqhit', 0.06);          // 总部中弹的沉重轰鸣
    FX.hqHit(hq);
    FX.updateDanger();
  } else {
    const d = target, dc = cardOf(d);
    d.def -= dmg;
    log(`${sideName(a.owner)}「${ac.name}」攻击「${dc.name}」，造成 ${dmg} 点伤害`, a.owner === 'player' ? 'me' : 'foe');
    floatDamage(`[data-uid="${d.uid}"]`, '-' + dmg);
    SFX.play('hit', 0.05);            // 命中的金属撞击
    FX.impact(targetSel);
    // 反击：地面单位无法反击空军（除非具备防空）
    const canRetaliate = !isAir(ac) || !isAir(dc) || hasEffect(dc,'antiAir') || hasEffect(dc,'bonusVsAir');
    if (canRetaliate) {
      a.def -= d.atk;
      log(`「${dc.name}」反击 ${d.atk} 点`, 'foe');
    } else {
      log(`「${dc.name}」无法对空反击`, 'sys');
    }
    const df = findUnit(d.uid), af = findUnit(a.uid);
    let killed = false;
    if (df && d.def <= 0) {
      S.board[df.row][df.index] = null; killed = true;
      log(`${sideName(d.owner)}「${dc.name}」被摧毁`, 'sys');
      if (d.owner === 'foe') S.stats.kills++;
      const el = document.querySelector(`[data-uid="${d.uid}"]`);
      if (el) el.classList.add('flash-red');
      SFX.play('explode', 0.04);      // 单位击毁的爆炸
      FX.destroy(targetSel);
    }
    if (af && a.def <= 0) {
      S.board[af.row][af.index] = null;
      log(`${sideName(a.owner)}「${ac.name}」被摧毁`, 'sys');
      if (a.owner === 'foe') S.stats.kills++;
      SFX.play('explode', 0.04);
      FX.destroy(attackerEl);
    }
  }
  checkGameOver();
  if (!S.over) { clearSelection(); render(); afterKreditSpent(a.owner); }
}

function checkGameOver() {
  if (S.over) return;
  if (S.p.foe.hp <= 0) { S.p.foe.hp = 0; render(); gameOver(true); }
  else if (S.p.player.hp <= 0) { S.p.player.hp = 0; render(); gameOver(false); }
}

function gameOver(win) {
  S.over = true; S.phase = 'over';
  clearSelection();
  SFX.play(win ? 'victory' : 'defeat');  // 胜负演出音效
  FX.finale(win);                        // 全屏胜利 / 战败演出
  log(win ? '=== 我方胜利 ===' : '=== 我方战败 ===', 'sys');
  const o = $('#overlay');
  o.innerHTML = `<div class="modal">
    <div class="m-icon">${win ? '✦' : '✕'}</div>
    <h2 class="${win ? '' : 'lose'}">${win ? '胜 利' : '战 败'}</h2>
    <p>${win ? `敌方总部已被摧毁，${NATION_META[S.playerNation].name}赢得了这场战役。`
             : `我方总部失守，${NATION_META[S.foeNation].name}占领了战场。`}</p>
    <div class="m-stats">
      <div><b>${S.turn}</b>回合数</div><div><b>${S.stats.deployed}</b>部署单位</div>
      <div><b>${S.stats.kills}</b>击毁单位</div><div><b>${S.stats.dmg}</b>总部伤害</div>
    </div>
    <div class="modal-btns">
      <button class="mbtn primary" id="againBtn">再 战 一 局</button>
      <button class="mbtn" id="backBtn">返回主菜单</button>
    </div>
  </div>`;
  o.classList.remove('hidden');
  $('#againBtn').onclick = restartSameGame;
  $('#backBtn').onclick = () => {
    o.classList.add('hidden');
    $('#gameScreen').classList.add('hidden');
    $('#startScreen').classList.remove('hidden');
    syncNationSelection();
  };
}

/* ---------------- AI ---------------- */
async function runAI(gen) {
  const alive = () => S && !S.over && S.gen === gen && S.current === 'foe';
  if (!alive() || S.phase === 'ai') return;
  S.phase = 'ai';
  const side = 'foe';
  const cfg = S.cfg;
  await sleep(260);
  if (!alive()) return;

  // 1) 出牌
  for (let guard = 0; guard < 12 && !S.over && S.p[side].kredit > 0 && alive(); guard++) {
    const p = S.p[side];
    const rowFull = freeIndex(ownRow(side)) < 0;
    const frontFree = (frontOwner() === 'none' || frontOwner() === side) && freeIndex('front') >= 0;
    // 中 / 高难度会预留指挥点给推进与攻击，避免铺满场面却无力进攻
    const readyCount = allUnits(side).filter(u => u.bornTick < S.tick).length;
    const reserve = cfg.smart > 0.5 ? Math.min(2, readyCount) : 0;
    const budget = Math.max(0, p.kredit - reserve);
    const playable = p.hand.filter(h => {
      const c = CARD_INDEX[h.id];
      if (c.cost > budget) return false;
      if (isUnit(c) && rowFull && !(hasEffect(c,'deployFront') && frontFree)) return false;
      return true;
    });
    if (!playable.length) break;
    if (Math.random() < cfg.waste && guard > 0) break;   // 低难度会浪费指挥点

    let pick;
    if (Math.random() < cfg.smart) {
      // 优先把费用用满，单位优先于纯抽牌
      const scored = playable.map(h => {
        const c = CARD_INDEX[h.id];
        let v = c.cost * 10;
        if (isUnit(c)) v += 14 + c.atk * 2 + c.def;
        if (c.type === 'order') v += 4;
        if (c.type === 'order' && c.effects.some(e => e.kind === 'damage')) v += allUnits('player').length ? 10 : -20;
        if (c.type === 'order' && c.effects.some(e => e.kind === 'healHQ')) v += (p.hp < p.maxHp - 3 ? 8 : -20);
        return { h, v:v + Math.random() * 6 };
      }).sort((a,b) => b.v - a.v);
      pick = scored[0].h;
    } else {
      pick = playable[Math.floor(Math.random() * playable.length)];
    }
    const card = CARD_INDEX[pick.id];
    const row = (hasEffect(card,'deployFront') && frontFree && (rowFull || Math.random() < 0.5))
      ? 'front' : ownRow(side);
    const idx = freeIndex(row);
    if (isUnit(card) && idx < 0) break;
    const autoTarget = card.effects.some(e => e.kind === 'damage')
      ? pickSpellTarget(side, null) : null;
    if (!playCard(side, pick.uid, row, idx, autoTarget)) break;
    await sleep(300);
    if (!alive()) return;
  }

  // 2) 推进前线
  for (let guard = 0; guard < 6 && !S.over && S.p[side].kredit > 0 && alive(); guard++) {
    // 远程单位留在支援线就能打敌方支援线 / 总部，推进只会白占前线且暴露自己
    const movers = S.board[ownRow(side)].filter(u => u && canMove(u) && !isLongRange(cardOf(u)))
      .sort((a,b) => (cardOf(b).atk + b.def) - (cardOf(a).atk + a.def));
    if (!movers.length) break;
    // 高难度更愿意抢前线
    if (Math.random() > 0.35 + cfg.smart * 0.6) break;
    moveUnit(movers[0].uid);
    await sleep(280);
    if (!alive()) return;
  }

  // 3) 攻击
  for (let guard = 0; guard < 12 && !S.over && S.p[side].kredit > 0 && alive(); guard++) {
    const actors = allUnits(side).filter(u => canAttack(u));
    if (!actors.length) break;
    const u = actors.sort((a,b) => (attackPower(b,null)) - (attackPower(a,null)))[0];
    const targets = legalTargets(side, u);
    let target;
    if (Math.random() < cfg.smart) {
      const units = targets.filter(t => t !== 'hq');
      const lethal = units.filter(t => t.def <= attackPower(u, t));
      if (lethal.length) target = lethal.sort((a,b) => b.atk - a.atk)[0];
      else if (targets.includes('hq')) target = 'hq';
      else if (units.length) target = units.sort((a,b) => (b.atk - a.atk) || (a.def - b.def))[0];
      else break;
    } else {
      target = targets[Math.floor(Math.random() * targets.length)];
    }
    attack(u.uid, target);
    await sleep(340);
    if (!alive()) return;
  }

  if (!alive()) return;
  if (S.p[side].kredit <= 0) log('敌方指挥点耗尽，回合结束', 'sys');
  await sleep(420);
  if (alive()) nextPlayerTurn();
}

/* ---------------- 渲染 ---------------- */
function render() {
  if (!S) return;
  renderHUD(); renderHand(); renderBoard();
  applyInspectSelection();
  renderInspect();
}

function renderHUD() {
  $('#turnBanner').textContent = `回合 ${S.turn}`;
  $('#foeHand').textContent = S.p.foe.hand.length;
  $('#foeDeck').textContent = S.p.foe.deck.length;
  $('#foeKredit').textContent = S.p.foe.kredit;
  $('#playerHand').textContent = S.p.player.hand.length;
  $('#playerDeck').textContent = S.p.player.deck.length;
  $('#foeHp').innerHTML = '<span class="heart">♥</span>' + Math.max(0,S.p.foe.hp);
  $('#playerHp').innerHTML = '<span class="heart">♥</span>' + Math.max(0,S.p.player.hp);
  $('#kreditNum').innerHTML = `${S.p.player.kredit} <small>/ ${S.p.player.slots}</small>`;
  const pips = [];
  for (let i = 0; i < S.p.player.slots; i++) pips.push(`<span class="pip ${i < S.p.player.kredit ? 'full' : ''}"></span>`);
  $('#kreditPips').innerHTML = pips.join('');
  const fo = frontOwner();
  S.frontOwner = fo;
  const txt = fo === 'none' ? '前线：<b>无人控制</b>'
    : (fo === 'player' ? '前线：<b>我方控制</b>' : '前线：<b>敌方控制</b>');
  $('#frontOwner').innerHTML = txt;
  $('#endTurnBtn').classList.toggle('waiting', S.current !== 'player' || S.phase === 'ai' || S.over);
  $('#endTurnSub').textContent = S.current === 'player' ? 'END TURN' : '敌方行动中';
}

function cardHTML(card, opts) {
  opts = opts || {};
  const u = opts.unit || null;
  const meta = NATION_META[card.n];
  const rarity = RARITY_META[card.rarity] || RARITY_META.common;
  const atk = u ? u.atk : card.atk;
  const def = u ? u.def : card.def;
  const cls = ['card', card.n];
  if (!isUnit(card)) cls.push('order-card');
  if (opts.extraClass) cls.push(opts.extraClass);
  const uidAttr = u ? `data-uid="${u.uid}"` : (opts.handUid ? `data-hand="${opts.handUid}"` : '');
  const damaged = u && u.def < u.maxDef;
  return `<div class="${cls.join(' ')} ${opts.stateClass || ''}" ${uidAttr} data-card-id="${card.id}">
    <div class="card-inner">
      <div class="card-title">
        <span class="cost"><b>${card.cost}</b>${isUnit(card) ? `<span class="op">${card.op}</span>` : ''}</span>
        <span class="cname">${card.name}</span>
        <span class="gem" style="--rc:${rarity.color}"></span>
      </div>
      <div class="card-art">${cardArt(card)}</div>
      <div class="card-meta">
        <span class="nb">${nationBadge(card.n, 14)}</span>
        <span class="ti">${typeIcon(card.type)}</span>
        <span class="tn">${TYPE_META[card.type].name}</span>
        <span class="en">${card.en}</span>
      </div>
      <div class="card-text">${card.text || ''}</div>
      ${isUnit(card)
        ? `<div class="card-stats"><span class="stat atk">${ICON_ATK}${atk}</span>
             <span class="cd-name">${meta.name} · ${rarity.name}</span>
             <span class="stat def ${damaged ? 'hurt' : ''}">${def}${ICON_DEF}</span></div>`
        : `<div class="card-stats"><span class="cd-name">${meta.name} · 指令</span>
             <span class="cd-name">${rarity.name}</span></div>`}
      <div class="stripe"></div>
    </div>
  </div>`;
}

function renderHand() {
  const box = $('#handCards');
  if (!S.p.player.hand.length) { box.innerHTML = '<div class="hand-empty">— 手牌已空 —</div>'; return; }
  box.innerHTML = S.p.player.hand.map(h => {
    const c = CARD_INDEX[h.id];
    const disabled = c.cost > S.p.player.kredit || S.current !== 'player' || S.phase === 'ai';
    const sel = S.selectedHand === h.uid ? 'selected' : '';
    const fresh = h.isNew ? 'dealing' : '';
    return cardHTML(c, { handUid:h.uid, extraClass:`${fresh} ${disabled ? 'disabled' : ''} ${sel}` });
  }).join('');
  S.p.player.hand.forEach(h => { h.isNew = false; });
}

function renderBoard() {
  // 选中单位后直接高亮：可推进的前线空位 + 合法攻击目标
  const t = actionTargets(S.selectedUnit);
  const atkTargets = t.attack;
  const moveTarget = t.move;
  const spellMode = S.targetMode === 'spell' && S.pending;

  const renderRow = (row, container) => {
    const el = $(container);
    el.innerHTML = S.board[row].map((u, i) => {
      let drop = '';
      if (S.selectedHand && S.current === 'player') {
        const c = CARD_INDEX[S.p.player.hand.find(h => h.uid === S.selectedHand)?.id];
        if (c && isUnit(c) && !u) {
          const toFront = hasEffect(c,'deployFront');
          const ok = toFront ? (row === 'front' && (frontOwner() === 'none' || frontOwner() === 'player'))
                            : (row === 'player');
          if (ok) drop = 'drop-ok';
        }
      }
      // 选中可推进单位时，前线空位高亮为推进目标
      const mv = (row === 'front' && moveTarget && !u) ? 'move-target' : '';
      if (!u) return `<div class="slot ${drop} ${mv}" data-row="${row}" data-index="${i}"><span class="slot-empty">${drop ? '＋' : (mv ? '推进' : '')}</span></div>`;
      const c = cardOf(u);
      const mine = u.owner === 'player';
      let state = '';
      if (mine && S.current === 'player' && !S.over) {
        if (canAct(u) && (!u.moved || !u.attacked)) state = 'can-act';
        if (u.moved && u.attacked) state = 'exhausted';
        if (S.selectedUnit === u.uid) state = 'selected-unit';
      }
      if (atkTargets.includes(u.uid) || (spellMode && u.owner === 'foe')) state = 'targetable';
      const kw = hasEffect(c,'guard') ? '<span class="kw">守护</span>'
              : (hasEffect(c,'blitz') ? '<span class="kw">闪击</span>'
              : (hasEffect(c,'deployFront') ? '<span class="kw">空降</span>'
              : (isLongRange(c) ? '<span class="kw">远程</span>' : '')));
      return `<div class="slot" data-row="${row}" data-index="${i}">
        <div class="field-unit">${cardHTML(c, { unit:u, stateClass:state })}${kw}</div>
      </div>`;
    }).join('');
  };
  renderRow('foe', '#foeSlots');
  renderRow('front', '#frontSlots');
  renderRow('player', '#playerSlots');

  $('#foeHQ').classList.toggle('targetable', atkTargets.includes('hq'));
  $('#playerHQ').classList.remove('targetable');
}

/* ---------------- 右侧固定卡牌预览 ---------------- */
function setInspect(cardId, unitUid) {
  if (!S) return;
  const uid = unitUid || null;
  if (!cardId) {
    if (S.inspect) { S.inspect = null; renderInspect(); }
    return;
  }
  if (S.inspect && S.inspect.id === cardId && S.inspect.uid === uid) return;
  S.inspect = { id: cardId, uid };
  renderInspect();
}
// 有明确选中项时，预览优先跟随选中项；否则保留最后查看的卡
function applyInspectSelection() {
  if (!S) return;
  if (S.selectedHand) {
    const h = S.p.player.hand.find(x => x.uid === S.selectedHand);
    if (h) { S.inspect = { id: h.id, uid: null }; return; }
  }
  if (S.selectedUnit) {
    const f = findUnit(S.selectedUnit);
    if (f) { S.inspect = { id: f.unit.id, uid: f.unit.uid }; return; }
  }
}
function renderInspect() {
  const body = $('#inspectBody'), foot = $('#inspectFoot');
  if (!body || !foot) return;
  let card = S && S.inspect ? CARD_INDEX[S.inspect.id] : null;
  let unit = null;
  if (card && S.inspect.uid) {
    const f = findUnit(S.inspect.uid);
    if (f) unit = f.unit;
    else { S.inspect = null; card = null; }   // 单位已阵亡 / 离场
  }
  if (!card) {
    body.innerHTML = '<div class="inspect-empty"><span class="ie-ic">✧</span>将鼠标移到卡牌上<br>或点选卡牌，在此查看大图</div>';
    foot.textContent = '— 暂无选中卡牌 —';
    return;
  }
  body.innerHTML = cardHTML(card, { unit });
  const k = S.p.player.kredit;
  const usable = S.current === 'player'
    ? (card.cost > k ? `指挥点不足 · 需要 ${card.cost} 点` : `可打出 · 消耗 ${card.cost} 点`)
    : '敌方回合';
  foot.textContent = `${TYPE_META[card.type].name}${isLongRange(card) ? ' · 远程' : ''} ｜ 部署 ${card.cost}${isUnit(card) ? ' · 行动 ' + card.op : ''} ｜ ${usable}`;
}

/* ---------------- 交互 ---------------- */
function clearSelection() {
  if (!S) return;
  S.selectedHand = null; S.selectedUnit = null;
  S.targetMode = null; S.pending = null;
  if (S.phase !== 'ai' && !S.over) S.phase = 'idle';
  if (!S.autoEndScheduled) $('#hint').classList.add('hidden');  // 保留自动结束提示
  render();
}

function showHint(text, warn) {
  const h = $('#hint');
  h.textContent = text;
  h.classList.toggle('warn', !!warn);
  h.classList.remove('hidden');
  clearTimeout(showHint.t);
  if (S && S.phase === 'idle' && !warn) showHint.t = setTimeout(() => h.classList.add('hidden'), 1800);
}

function floatDamage(sel, text) {
  const el = document.querySelector(sel);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'float-dmg'; d.textContent = text;
  d.style.left = (r.left + r.width / 2) + 'px';
  d.style.top  = (r.top + r.height / 3) + 'px';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 950);
}

function log(text, cls) {
  const body = $('#logBody'); if (!body) return;
  const d = document.createElement('div');
  d.innerHTML = `<span class="t">${String(S ? S.turn : 0).padStart(2,'0')}:</span><span class="${cls || ''}">${text}</span>`;
  body.appendChild(d);
  while (body.children.length > 60) body.removeChild(body.firstChild);
  body.scrollTop = body.scrollHeight;
}

function bindGameEvents() {
  $('#endTurnBtn').addEventListener('click', endTurn);
  const gs = $('#gameScreen');

  gs.addEventListener('click', e => {
    if (!S || S.over || S.phase === 'ai' || S.current !== 'player') return;

    const cardEl = e.target.closest('.card');
    const slotEl = e.target.closest('.slot');
    const hqEl  = e.target.closest('.hq');

    // 指令卡选目标（法术伤害）——保留原流程；单位攻击已改为「选中即高亮，点高亮即攻击」
    if (S.phase === 'target' && S.targetMode === 'spell') {
      // 点击空白处取消；若指挥点已耗尽，取消后仍需自动结束回合
      if (!cardEl && !hqEl) { clearSelection(); afterKreditSpent('player'); return; }
      if (cardEl && cardEl.dataset.uid) {
        const f = findUnit(cardEl.dataset.uid);
        if (f && f.unit.owner === 'foe' && S.pending) {
          const v = S.pending.value, src = S.pending.source;
          S.pending = null; S.targetMode = null; S.phase = 'idle';
          dealSpellDamage(f.unit, v, src);
          clearSelection(); render();
          afterKreditSpent('player');   // 选完目标后再判断是否需要自动结束
          return;
        }
      }
      showHint('请选择 1 个敌方单位', true); return;
    }

    // 手牌
    if (cardEl && cardEl.dataset.hand) {
      const h = S.p.player.hand.find(x => x.uid === cardEl.dataset.hand);
      if (!h) return;
      const c = CARD_INDEX[h.id];
      if (c.cost > S.p.player.kredit) { showHint(`指挥点不足：需要 ${c.cost} 点`, true); return; }
      if (S.selectedHand === h.uid) { clearSelection(); return; }
      if (S.selectedUnit) clearSelection();   // 从「选中单位」态无缝切到手牌
      S.selectedHand = h.uid; S.selectedUnit = null;

      if (!isUnit(c)) {
        // 指令卡立即打出（可能进入选目标）
        S.selectedHand = null;
        playCard('player', h.uid, null, null, null);
        if (S.phase !== 'target') showHint(`已使用「${c.name}」`);
        return;
      }
      const full = freeIndex('player') < 0;
      const canFront = hasEffect(c,'deployFront') && (frontOwner() === 'none' || frontOwner() === 'player') && freeIndex('front') >= 0;
      if (full && !canFront) { S.selectedHand = null; showHint('己方支援线已满，无法部署', true); return; }
      S.phase = 'idle';
      showHint(hasEffect(c,'deployFront') ? '点击前线空位空降，或点击我方支援线部署' : '点击我方支援线空位部署', false);
      render(); return;
    }

    // 部署槽位
    if (slotEl && S.selectedHand) {
      const { row, index } = slotEl.dataset;
      const h = S.p.player.hand.find(x => x.uid === S.selectedHand);
      if (!h) { clearSelection(); return; }
      const c = CARD_INDEX[h.id];
      const ok = hasEffect(c,'deployFront')
        ? (row === 'front' ? (frontOwner() === 'none' || frontOwner() === 'player') : row === 'player')
        : row === 'player';
      if (!ok) { showHint('该卡不能部署在此处', true); return; }
      if (S.board[row][+index]) { showHint('该位置已被占据', true); return; }
      playCard('player', h.uid, row, +index, null);
      S.selectedHand = null;
      // 某些单位有「部署：造成伤害」，需要保留选目标状态
      if (S.phase === 'target') render(); else clearSelection();
      return;
    }

    // 已选中单位：点高亮处直接推进 / 攻击，无需再点任何按钮
    if (S.selectedUnit) {
      const uid = S.selectedUnit;
      const t = actionTargets(uid);
      if (!t.unit) { clearSelection(); return; }

      // 敌方总部
      if (hqEl && hqEl.id === 'foeHQ') {
        if (t.attack.includes('hq')) { attack(uid, 'hq'); return; }
        showHint('当前单位无法攻击总部：需先推进到前线，或使用远程单位', true); return;
      }
      // 场上单位
      if (cardEl && cardEl.dataset.uid) {
        const tf = findUnit(cardEl.dataset.uid);
        if (tf && tf.unit.owner === 'foe') {
          if (t.attack.includes(tf.unit.uid)) { attack(uid, tf.unit); return; }
          showHint('目标不可攻击：守护优先 / 制空限制 / 距离不足', true); return;
        }
        if (tf && tf.unit.owner === 'player') {
          if (tf.unit.uid === uid) clearSelection(); else selectUnit(tf.unit.uid);  // 再点自己取消 / 点友军切换
          return;
        }
      }
      // 高亮的前线空位 → 推进
      if (slotEl && slotEl.dataset.row === 'front' && t.move && !S.board.front[+slotEl.dataset.index]) {
        moveUnit(uid); clearSelection(); afterKreditSpent('player'); return;
      }
      // 点其它空白 → 取消选中
      clearSelection(); afterKreditSpent('player'); return;
    }

    // 未选中时：点击己方单位即选中，并高亮可推进 / 可攻击目标
    if (cardEl && cardEl.dataset.uid) {
      const f = findUnit(cardEl.dataset.uid);
      if (f && f.unit.owner === 'player') { selectUnit(f.unit.uid); return; }
      if (f && f.unit.owner === 'foe') { showHint('敌方单位：先点选我方单位，再点它攻击', true); return; }
    }

    if (hqEl && hqEl.id === 'foeHQ') { showHint('点选我方单位后，再点敌方总部攻击（需前线单位或远程单位）', true); return; }
    clearSelection();
  });

  // 右侧卡牌预览：悬停查看；移开后回落到当前选中的卡（无选中则保留最后一张）
  gs.addEventListener('mouseover', e => {
    if (e.target.closest('#inspectBody')) return;
    const c = e.target.closest('.card'); if (!c) return;
    const id = c.dataset.cardId;
    if (!id || !CARD_INDEX[id]) return;
    setInspect(id, c.dataset.uid || null);
  });
  gs.addEventListener('mouseout', e => {
    if (e.target.closest('#inspectBody')) return;
    const c = e.target.closest('.card'); if (!c) return;
    if (e.relatedTarget && c.contains(e.relatedTarget)) return;  // 仍在卡内，不闪烁
    applyInspectSelection();
    renderInspect();
  });

  // 键盘：空格结束回合 / Esc 取消
  document.addEventListener('keydown', e => {
    if (!S || $('#gameScreen').classList.contains('hidden')) return;
    if (e.code === 'Space') { e.preventDefault(); endTurn(); }
    if (e.code === 'Escape') { clearSelection(); afterKreditSpent('player'); }
  });
}

/* ---------------- 主题切换（经典 / 现代） ---------------- */
// 标签页图标 + 浏览器主题色随 UI 主题同步：经典=军绿勋章，现代=深蓝卡牌
const THEME_ICONS = {
  classic: { svg: 'favicon-alt.svg', png: 'favicon-alt.png', color: '#15261e' },
  modern:  { svg: 'favicon.svg',     png: 'favicon.png',     color: '#101a33' }
};
function syncThemeIcon(t) {
  const ico = THEME_ICONS[t] || THEME_ICONS.classic;
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', ico.color);
  const links = $$('link[rel="icon"], link[rel="apple-touch-icon"]');
  const svgLink = links.find(l => l.getAttribute('type') === 'image/svg+xml');
  // 已一致时不重建，避免首屏无谓地移除再插入
  if (svgLink && svgLink.getAttribute('href') === ico.svg && links.length === 3) return;
  links.forEach(l => l.remove());
  const add = attrs => {
    const l = document.createElement('link');
    Object.keys(attrs).forEach(k => l.setAttribute(k, attrs[k]));
    document.head.appendChild(l);
  };
  add({ rel: 'icon', type: 'image/svg+xml', href: ico.svg });
  add({ rel: 'icon', type: 'image/png', sizes: '256x256', href: ico.png });
  add({ rel: 'apple-touch-icon', href: ico.png });
}
function applyTheme(t) {
  document.body.classList.toggle('theme-modern', t === 'modern');
  const label = t === 'modern' ? '▤ 经典 UI' : '✦ 现代 UI';
  $$('[data-theme-toggle]').forEach(b => { b.textContent = label; });
  try { localStorage.setItem('kards-theme', t); } catch (e) {}
  syncThemeIcon(t);
}
/* ---------------- 隐藏阵营：连按 10 次主题切换直接进入国民党对局 ---------------- */
const SECRET_TAPS = 10;          // 触发所需点击次数
const SECRET_TAP_WINDOW = 3000;  // 两次点击间隔超过 3 秒则重新计数
let secretTaps = 0;
let secretLastTap = 0;

function onThemeToggleTap() {
  applyTheme(document.body.classList.contains('theme-modern') ? 'classic' : 'modern');

  const now = Date.now();
  if (now - secretLastTap > SECRET_TAP_WINDOW) secretTaps = 0;
  secretLastTap = now;
  secretTaps++;
  if (secretTaps < SECRET_TAPS) return;

  secretTaps = 0;
  secretLastTap = 0;
  // 只把国民党作为这一局的临时阵营，不动 chosenNation 与开始页的高亮：
  // 否则返回主界面后界面无高亮、内部却是 ktm，重开就会「选的和玩的不一致」
  secretNationOnce = SECRET_NATION;
  startNewGame();
  log('隐藏阵营解锁：国民党 · 持久抗战！', 'sys');
}

function initTheme() {
  let saved = 'classic';
  try { saved = localStorage.getItem('kards-theme') === 'modern' ? 'modern' : 'classic'; } catch (e) {}
  applyTheme(saved);
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', onThemeToggleTap));
}

/* ---------------- 启动 ---------------- */
initTheme();
initStartScreen();
bindGameEvents();
initAudioAndFx();

// 首次用户手势解锁 Web Audio（浏览器自动播放策略要求）。
// 捕获阶段监听，保证在任何按钮的业务逻辑之前解锁。
function initAudioAndFx() {
  const unlockOnce = () => {
    SFX.unlock();
    window.removeEventListener('pointerdown', unlockOnce, true);
    window.removeEventListener('keydown', unlockOnce, true);
  };
  window.addEventListener('pointerdown', unlockOnce, true);
  window.addEventListener('keydown', unlockOnce, true);

  const btn = $('#soundBtn');
  const paint = () => {
    if (!btn) return;
    const m = SFX.isMuted();
    btn.classList.toggle('muted', m);
    btn.textContent = m ? '✕' : '♪';
    btn.title = m ? '开启音效' : '静音';
  };
  paint();
  if (btn) btn.addEventListener('click', () => {
    SFX.toggle(); paint();
    if (!SFX.isMuted()) SFX.play('click');
  });
}
