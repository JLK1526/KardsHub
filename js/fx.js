/* ==================================================================
 *  战斗特效 · 动态 DOM + CSS 动画
 *  攻击伤害 / 部署移动 / 回合结算 三类，自动挂到 body 并在结束时自清理。
 * ================================================================== */
'use strict';

const FX = (() => {
  const layer = () => {
    let el = document.getElementById('fxLayer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fxLayer';
      el.className = 'fx-layer';
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  };
  const center = sel => {
    const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
  };
  function put(node, life) {
    layer().appendChild(node);
    setTimeout(() => node.remove(), life);
    return node;
  }

  /* ---------- 攻击与伤害 ---------- */

  // 枪弹 / 炮弹拖尾：从攻击者射向目标
  function tracer(fromSel, toSel, kind) {
    const a = center(fromSel), b = center(toSel);
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const t = document.createElement('div');
    t.className = 'fx-tracer' + (kind === 'shell' ? ' shell' : '');
    t.style.cssText = `left:${a.x}px;top:${a.y}px;width:${len}px;transform:rotate(${ang}deg);`;
    layer().appendChild(t);
    setTimeout(() => t.remove(), 460);
  }

  // 命中爆炸：冲击波圆环 + 火星粒子
  function impact(sel, big) {
    const c = center(sel);
    if (!c) return;
    const wrap = document.createElement('div');
    wrap.className = 'fx-impact' + (big ? ' big' : '');
    wrap.style.cssText = `left:${c.x}px;top:${c.y}px;`;
    wrap.innerHTML = '<i class="ring"></i><i class="ring r2"></i>' +
      Array.from({ length: big ? 12 : 7 }, (_, i) => {
        const a = (Math.PI * 2 * i) / (big ? 12 : 7) + Math.random() * 0.4;
        const d = (big ? 60 : 38) + Math.random() * (big ? 46 : 26);
        return `<i class="spark" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--dl:${(Math.random() * .1).toFixed(2)}s"></i>`;
      }).join('');
    put(wrap, big ? 900 : 650);
    if (big) { wrap.classList.add('boom'); }
  }

  // 单位被摧毁：更大的爆炸 + 碎片 + 黑色弹坑烟
  function destroy(sel) {
    const c = center(sel);
    if (!c) return;
    impact(sel, true);
    const w = document.createElement('div');
    w.className = 'fx-destroy';
    w.style.cssText = `left:${c.x}px;top:${c.y}px;`;
    w.innerHTML = Array.from({ length: 9 }, (_, i) => {
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 70;
      return `<i class="debris" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--rot:${(Math.random() * 720 - 360).toFixed(0)}deg"></i>`;
    }).join('') + '<i class="puff"></i><i class="puff p2"></i>';
    put(w, 1100);
  }

  // 总部中弹：吞没式爆炸 + 屏幕边缘震动闪光
  function hqHit(sel) {
    impact(sel, true);
    const c = center(sel);
    if (c) {
      const w = document.createElement('div');
      w.className = 'fx-hqhit';
      w.style.cssText = `left:${c.x}px;top:${c.y}px;`;
      w.innerHTML = '<i class="blast"></i>' + Array.from({ length: 14 }, (_, i) => {
        const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90;
        return `<i class="spark" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px"></i>`;
      }).join('');
      put(w, 1000);
    }
    document.body.classList.add('fx-shake');
    setTimeout(() => document.body.classList.remove('fx-shake'), 420);
  }

  /* ---------- 部署与移动 ---------- */

  // 落地冲击：地面椭圆尘环 + 向上飘散的烟尘
  function land(sel) {
    const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!e) return;
    const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.bottom - Math.min(14, r.height * .2);
    const w = document.createElement('div');
    w.className = 'fx-land';
    w.style.cssText = `left:${x}px;top:${y}px;`;
    w.innerHTML = '<i class="dustring"></i>' + Array.from({ length: 8 }, (_, i) => {
      const dx = (Math.random() - .5) * r.width * 1.1;
      return `<i class="dust" style="--dx:${dx}px;--dy:${-18 - Math.random() * 30}px;--s:${.6 + Math.random() * .7};--dl:${(Math.random() * .12).toFixed(2)}s"></i>`;
    }).join('');
    put(w, 800);
  }

  // 推进轨迹：从起点到前线的一条履带/行军痕迹
  function march(fromSel, toSel) {
    const a = center(fromSel), b = center(toSel);
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const w = document.createElement('div');
    w.className = 'fx-march';
    w.style.cssText = `left:${a.x}px;top:${a.y}px;width:${len}px;transform:rotate(${ang}deg);`;
    w.innerHTML = '<i class="track"></i><i class="dustline"></i>';
    put(w, 900);
  }

  /* ---------- 回合与结算 ---------- */

  // 回合横幅：屏幕中央的军报条幅
  function banner(main, sub, tone) {
    const w = document.createElement('div');
    w.className = 'fx-banner' + (tone === 'foe' ? ' foe' : '');
    w.innerHTML = `<i class="ln l"></i><div class="txt"><b>${main}</b><small>${sub}</small></div><i class="ln r"></i>`;
    put(w, 1700);
  }

  // 胜负全屏演出
  function finale(win) {
    const w = document.createElement('div');
    w.className = 'fx-finale ' + (win ? 'win' : 'lose');
    w.innerHTML = '<i class="sweep"></i><i class="rays"></i><div class="word">' + (win ? 'VICTORY' : 'DEFEAT') + '</div>';
    put(w, 2300);
  }

  // 总部濒危：红色呼吸警示边框
  function danger(sel, on) {
    const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (e) e.classList.toggle('critical', !!on);
  }
  function updateDanger() {
    if (typeof S === 'undefined' || !S || !S.p) return;
    danger('#playerHQ', S.p.player.hp > 0 && S.p.player.hp <= 5);
    danger('#foeHQ', S.p.foe.hp > 0 && S.p.foe.hp <= 5);
  }

  function clear() {
    const el = document.getElementById('fxLayer');
    if (el) el.innerHTML = '';
    document.body.classList.remove('fx-shake');
  }

  return { tracer, impact, destroy, hqHit, land, march, banner, finale, danger, updateDanger, clear };
})();
