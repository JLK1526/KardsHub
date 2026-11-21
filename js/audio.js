/* ==================================================================
 *  军事写实音效 · Web Audio 实时合成
 *  无任何外部音频文件，离线可用。首次用户交互时自动解锁 AudioContext。
 * ================================================================== */
'use strict';

const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let muted = false, volume = 0.55;
  let unlocked = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    // 预生成 2 秒白噪声，供枪炮 / 履带 / 纸张复用
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  // 浏览器策略：必须在用户手势中解锁。开始按钮 / 任意点击都会调用。
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    unlocked = true;
  }

  function env(g, t0, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  // 噪声脉冲：枪声、爆炸、纸张、履带的基石
  function noise(t0, dur, type, freq, q, peak, attack) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    const g = ctx.createGain();
    env(g, t0, peak, attack || 0.004, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.03);
    return { f, g };
  }

  // 振荡器：低频轰鸣、金属撞击、号角、提示音
  function tone(t0, dur, type, f0, f1, peak, attack) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = ctx.createGain();
    env(g, t0, peak, attack || 0.005, dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
    return { o, g };
  }

  const LIB = {
    // 纸卡抽出 / 发牌
    draw(t) {
      noise(t, 0.10, 'bandpass', 2800, 0.7, 0.20, 0.003);
      noise(t + 0.05, 0.07, 'highpass', 4200, 0.6, 0.10, 0.002);
    },
    // 单位落地：纸张拍击 + 沉闷踏地
    deploy(t) {
      noise(t, 0.09, 'bandpass', 1600, 0.8, 0.26, 0.002);
      tone(t + 0.02, 0.22, 'sine', 120, 52, 0.30, 0.006);
      noise(t + 0.02, 0.18, 'lowpass', 480, 0.7, 0.22, 0.004);
    },
    // 推进：履带 / 靴子行进
    move(t) {
      const n = noise(t, 0.34, 'bandpass', 210, 0.9, 0.26, 0.03);
      // 缓慢起伏，模拟履带滚动
      n.f.frequency.setValueAtTime(170, t);
      n.f.frequency.linearRampToValueAtTime(260, t + 0.17);
      n.f.frequency.linearRampToValueAtTime(180, t + 0.34);
      tone(t, 0.30, 'sine', 70, 55, 0.16, 0.03);
    },
    // 步枪 / 机枪：短促爆裂
    gun(t) {
      noise(t, 0.075, 'highpass', 1900, 0.7, 0.42, 0.001);
      tone(t, 0.09, 'square', 190, 70, 0.20, 0.001);
      noise(t + 0.015, 0.16, 'lowpass', 700, 0.6, 0.16, 0.004);
    },
    // 火炮轰鸣：低频冲击 + 长尾
    cannon(t) {
      tone(t, 0.62, 'sine', 135, 34, 0.62, 0.004);
      const n = noise(t, 0.58, 'lowpass', 1300, 0.7, 0.52, 0.003);
      n.f.frequency.exponentialRampToValueAtTime(220, t + 0.55);
      tone(t + 0.02, 0.42, 'triangle', 62, 30, 0.24, 0.006);
    },
    // 爆炸：命中单位 / 击毁
    explode(t) {
      const n = noise(t, 0.55, 'lowpass', 1800, 0.6, 0.50, 0.002);
      n.f.frequency.exponentialRampToValueAtTime(260, t + 0.5);
      tone(t, 0.48, 'sine', 95, 28, 0.46, 0.004);
      noise(t, 0.10, 'highpass', 3000, 0.6, 0.22, 0.001);
    },
    // 命中反馈：金属撞击
    hit(t) {
      noise(t, 0.11, 'bandpass', 1500, 1.4, 0.28, 0.002);
      tone(t, 0.13, 'triangle', 340, 130, 0.22, 0.002);
    },
    // 总部受击：沉重打击
    hqhit(t) {
      tone(t, 0.55, 'sine', 105, 32, 0.52, 0.004);
      noise(t, 0.42, 'lowpass', 900, 0.7, 0.40, 0.003);
    },
    // 无线电回合提示
    radio(t) {
      tone(t, 0.10, 'sine', 880, 880, 0.16, 0.008);
      tone(t + 0.13, 0.10, 'sine', 1170, 1170, 0.14, 0.008);
      noise(t, 0.22, 'bandpass', 3400, 0.8, 0.05, 0.02);
    },
    // 胜利：军号上行
    victory(t) {
      const notes = [392, 523.25, 659.25, 783.99]; // G4 C5 E5 G5
      notes.forEach((hz, i) => {
        const s = t + i * 0.15;
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(hz, s);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.setValueAtTime(1500, s);
        const g = ctx.createGain();
        env(g, s, 0.20, 0.02, i === notes.length - 1 ? 0.9 : 0.34);
        o.connect(f); f.connect(g); g.connect(master);
        o.start(s); o.stop(s + (i === notes.length - 1 ? 0.95 : 0.4));
      });
      tone(t + 0.6, 1.0, 'sine', 130.81, 130.81, 0.14, 0.05);
    },
    // 战败：低沉下行
    defeat(t) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(311.13, t);
      o.frequency.exponentialRampToValueAtTime(64, t + 1.3);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(180, t + 1.3);
      const g = ctx.createGain();
      env(g, t, 0.24, 0.05, 1.5);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); o.stop(t + 1.55);
    },
    // 界面点击
    click(t) {
      tone(t, 0.06, 'sine', 620, 380, 0.12, 0.002);
    }
  };

  function play(name, delay) {
    if (muted) return;
    if (!ensure() || !LIB[name]) return;
    if (!unlocked) return;   // 未解锁时不发声，但已初始化，待交互后解锁
    try { LIB[name](ctx.currentTime + (delay || 0)); } catch (e) {}
  }

  function setMuted(v) {
    muted = !!v;
    if (master) master.gain.value = muted ? 0 : volume;
    try { localStorage.setItem('kards-muted', muted ? '1' : '0'); } catch (e) {}
  }
  function isMuted() { return muted; }
  function toggle() { setMuted(!muted); return muted; }

  try { muted = localStorage.getItem('kards-muted') === '1'; } catch (e) {}

  return { play, unlock, setMuted, isMuted, toggle };
})();
