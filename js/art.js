/* ============================================================
 *  程序化矢量插画：二战宣传画风格的卡面美术
 *  同一张卡永远得到同一幅画（由 id 决定），不同卡构图/色调各异
 * ============================================================ */

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const SKY = {
  ger: [['#5d6660','#a8a28a','#d6b27a'], ['#414c52','#7d8a86','#c2ad86'], ['#4a4b42','#8c8567','#c9a06a']],
  usa: [['#4c5b46','#9aa066','#e0c284'], ['#3d5250','#839a78','#dcc189'], ['#54503c','#a09359','#e6c88a']],
  uk:  [['#6b5a43','#b09568','#e3c48d'], ['#4b4a42','#9c8a68','#d9b984'], ['#5c5140','#a58c60','#e0bd82']],
  sov: [['#4d5560','#8a95a0','#d6bd9e'], ['#3c4a4a','#7c8a82','#cbb89a'], ['#524a48','#9a8770','#d9b89a']],
  jpn: [['#3f5a5a','#86a39a','#e0c79a'], ['#4a4e6a','#8a8fb0','#dcc6a0'], ['#5a4a44','#a08770','#e3c79a']],
  ktm: [['#354a68','#7b90ac','#d8e2ee'], ['#3a4656','#8898a8','#d4dce4'], ['#2e4058','#748aa4','#dbe4ec']]
};

/* 主插画：viewBox 0 0 200 150 */
function cardArt(card) {
  const r = rng(hashSeed(card.id));
  const pal = SKY[card.n][Math.floor(r() * 3)];
  const uid = card.id;
  const sunX = 30 + r() * 140, sunY = 30 + r() * 45;
  const hill = 88 + r() * 14;
  const glow = r() > .45;
  const smokeCount = 2 + Math.floor(r() * 3);
  let smoke = '';
  for (let i = 0; i < smokeCount; i++) {
    const x = 10 + r() * 180, y = 55 + r() * 55, s = 12 + r() * 26;
    smoke += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="#1b1a16" opacity="${(0.05 + r() * 0.09).toFixed(2)}"/>`;
  }
  let rays = '';
  for (let i = 0; i < 5; i++) {
    const x = 20 + r() * 160;
    rays += `<path d="M${x.toFixed(0)},0 L${(sunX).toFixed(0)},${sunY.toFixed(0)}" stroke="#fff3d0" stroke-width="${(1 + r() * 2).toFixed(1)}" opacity="0.05"/>`;
  }
  let birds = '';
  for (let i = 0; i < 3; i++) {
    const x = 20 + r() * 160, y = 18 + r() * 35, s = 2 + r() * 2;
    birds += `<path d="M${x.toFixed(0)},${y.toFixed(0)} q${s},-${s} ${s * 2},0 q${s},-${s} ${s * 2},0" fill="none" stroke="#2a2822" stroke-width="1" opacity=".35"/>`;
  }

  return `<svg class="art-svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pal[0]}"/><stop offset="58%" stop-color="${pal[1]}"/><stop offset="100%" stop-color="${pal[2]}"/>
    </linearGradient>
    <radialGradient id="sun-${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff2c8" stop-opacity=".85"/><stop offset="100%" stop-color="#fff2c8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="vig-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d0c0a" stop-opacity=".38"/><stop offset="35%" stop-color="#0d0c0a" stop-opacity="0"/><stop offset="100%" stop-color="#0d0c0a" stop-opacity=".5"/>
    </linearGradient>
  </defs>
  <rect width="200" height="150" fill="url(#sky-${uid})"/>
  ${glow ? `<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="52" fill="url(#sun-${uid})"/>` : ''}
  ${rays}
  <!-- 远景山脊 / 城市 -->
  <path d="M0,${(hill - 6).toFixed(0)} L22,${(hill - 24).toFixed(0)} L38,${(hill - 12).toFixed(0)} L62,${(hill - 30).toFixed(0)} L88,${(hill - 8).toFixed(0)} L112,${(hill - 22).toFixed(0)} L140,${(hill - 6).toFixed(0)} L166,${(hill - 26).toFixed(0)} L200,${(hill - 10).toFixed(0)} L200,150 L0,150 Z" fill="#3a3a30" opacity=".28"/>
  <path d="M0,${hill.toFixed(0)} Q40,${(hill - 10).toFixed(0)} 80,${(hill + 2).toFixed(0)} T160,${(hill - 4).toFixed(0)} T200,${hill.toFixed(0)} L200,150 L0,150 Z" fill="#2f3027" opacity=".42"/>
  <!-- 废墟剪影 -->
  <g fill="#24251f" opacity=".55">
    <rect x="${(8 + r() * 20).toFixed(0)}" y="${(hill - 16).toFixed(0)}" width="9" height="24"/>
    <rect x="${(150 + r() * 30).toFixed(0)}" y="${(hill - 22).toFixed(0)}" width="12" height="30"/>
    <rect x="${(170 + r() * 20).toFixed(0)}" y="${(hill - 12).toFixed(0)}" width="7" height="20"/>
  </g>
  ${smoke}${birds}
  <!-- 地面 -->
  <path d="M0,${(hill + 22).toFixed(0)} Q60,${(hill + 12).toFixed(0)} 120,${(hill + 26).toFixed(0)} T200,${(hill + 18).toFixed(0)} L200,150 L0,150 Z" fill="#22231c" opacity=".72"/>
  <!-- 主体 -->
  <g transform="translate(${(6 + r() * 8 - 4).toFixed(1)}, ${(-2 + r() * 6).toFixed(1)})">
    ${unitSilhouette(card.type)}
  </g>
  <!-- 前景火光与尘土 -->
  <ellipse cx="${(20 + r() * 160).toFixed(0)}" cy="${(128 + r() * 16).toFixed(0)}" rx="34" ry="9" fill="#c9823c" opacity=".14"/>
  <rect width="200" height="150" fill="url(#vig-${uid})"/>
  </svg>`;
}

function unitSilhouette(type) {
  const S = '#151713';
  const H = '#4a4638';
  switch (type) {
    case 'tank': return `
      <g fill="${S}">
        <rect x="34" y="104" width="132" height="20" rx="10"/>
        <path d="M40,104 L52,88 L146,88 L160,104 Z"/>
        <path d="M78,88 L84,72 L124,72 L130,88 Z"/>
        <rect x="126" y="77" width="62" height="6" rx="2"/>
        <rect x="150" y="75" width="8" height="10" rx="2"/>
      </g>
      <g fill="#8d8266" opacity=".55">
        <circle cx="54" cy="114" r="6"/><circle cx="76" cy="114" r="6"/><circle cx="98" cy="114" r="6"/><circle cx="120" cy="114" r="6"/><circle cx="142" cy="114" r="6"/>
      </g>
      <path d="M34,104 L52,88 L146,88 L160,104" fill="none" stroke="${H}" stroke-width="1.5" opacity=".7"/>
      <path d="M186,72 l10,-4 M190,80 l12,-1" stroke="#e8b45c" stroke-width="2" opacity=".8"/>`;
    case 'infantry': return `
      <g fill="${S}">
        <g transform="translate(52,66)">
          <path d="M0,14 Q8,4 16,14 L16,18 L0,18 Z"/><circle cx="8" cy="11" r="6"/>
          <path d="M2,18 L14,18 L17,52 L11,52 L8,34 L5,52 L-1,52 Z"/>
          <path d="M12,22 L34,30" stroke="${S}" stroke-width="3"/>
          <path d="M20,24 L20,44" stroke="${S}" stroke-width="2"/>
        </g>
        <g transform="translate(96,58) scale(1.15)">
          <path d="M0,14 Q8,4 16,14 L16,18 L0,18 Z"/><circle cx="8" cy="11" r="6"/>
          <path d="M2,18 L14,18 L17,52 L11,52 L8,34 L5,52 L-1,52 Z"/>
          <path d="M13,24 L38,18" stroke="${S}" stroke-width="3"/>
        </g>
        <g transform="translate(148,70) scale(.86)">
          <path d="M0,14 Q8,4 16,14 L16,18 L0,18 Z"/><circle cx="8" cy="11" r="6"/>
          <path d="M2,18 L14,18 L17,52 L11,52 L8,34 L5,52 L-1,52 Z"/>
        </g>
      </g>
      <path d="M0,124 L200,120" stroke="#191a14" stroke-width="12" opacity=".6"/>
      <g stroke="#a89b74" stroke-width="1" opacity=".5"><path d="M56,72 q4,-4 8,0"/><path d="M100,64 q4,-4 8,0"/></g>`;
    case 'artillery': return `
      <g fill="${S}">
        <path d="M52,112 L60,92 L128,92 L136,112 Z"/>
        <circle cx="74" cy="112" r="17"/><circle cx="74" cy="112" r="9" fill="#6d654b"/>
        <path d="M78,96 L162,52 L166,60 L84,104 Z"/>
        <path d="M40,112 L150,112" stroke="${S}" stroke-width="7"/>
      </g>
      <path d="M162,48 l16,-12 l-2,10 l14,-4 l-10,14 l-12,2 z" fill="#e8a849" opacity=".9"/>
      <path d="M164,52 l22,-8 M168,58 l20,2" stroke="#f5d18a" stroke-width="2" opacity=".7"/>`;
    case 'fighter': return `
      <g fill="${S}">
        <path d="M22,92 L92,70 L178,80 L188,86 L110,90 L100,112 L88,112 L84,92 Z"/>
        <path d="M92,70 L110,50 L122,52 L118,74 Z"/>
        <path d="M40,92 L58,112 L72,112 L66,90 Z"/>
        <path d="M172,78 L186,62 L192,64 L186,84 Z"/>
      </g>
      <circle cx="98" cy="80" r="7" fill="#7e856f" opacity=".8"/>
      <path d="M22,92 L100,78" stroke="#9a8d68" stroke-width="1.2" opacity=".7"/>
      <path d="M8,86 q14,-3 22,0" fill="none" stroke="#e6d8ae" stroke-width="1.4" opacity=".45"/>`;
    case 'bomber': return `
      <g fill="${S}">
        <path d="M14,74 Q96,58 184,74 L190,80 Q100,72 14,82 Z"/>
        <path d="M56,70 L96,60 L122,62 L120,72 L64,78 Z"/>
        <path d="M166,72 L184,58 L190,60 L186,78 Z"/>
        <rect x="62" y="74" width="18" height="9" rx="4"/><rect x="132" y="74" width="18" height="9" rx="4"/>
        <rect x="92" y="80" width="34" height="10" rx="4"/>
      </g>
      <g fill="#26271f"><ellipse cx="100" cy="104" rx="4" ry="9"/><ellipse cx="116" cy="110" rx="4" ry="9"/><ellipse cx="132" cy="100" rx="4" ry="9"/></g>
      <circle cx="70" cy="78" r="4" fill="#b2a67d" opacity=".7"/><circle cx="140" cy="78" r="4" fill="#b2a67d" opacity=".7"/>
      <path d="M0,92 q30,-6 52,-2 M150,90 q30,-4 50,2" fill="none" stroke="#eee0b8" stroke-width="1.4" opacity=".35"/>`;
    default: return `
      <g fill="${S}">
        <path d="M0,124 L200,118 L200,150 L0,150 Z" opacity=".6"/>
        <rect x="88" y="52" width="6" height="76"/>
        <path d="M94,56 L156,66 L94,88 Z" fill="#3a3126"/>
        <path d="M94,56 L156,66 L94,88 Z" fill="none" stroke="#b93f31" stroke-width="2" opacity=".8"/>
        <circle cx="100" cy="48" r="6"/>
      </g>
      <g fill="#2a2a21"><rect x="20" y="104" width="26" height="22"/><rect x="52" y="96" width="18" height="30"/><rect x="150" y="100" width="30" height="26"/></g>
      <path d="M156,44 l8,-14 l2,10 l14,-8 l-8,16 z" fill="#e8a849" opacity=".85"/>`;
  }
}

/* 国家徽记 */
function nationBadge(n, size) {
  const s = size || 26;
  const inner = {
    ger: `<rect x="4" y="4" width="24" height="24" rx="3" fill="#252a26"/>
          <path d="M13,7 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 z" fill="#e9e6d8"/>
          <path d="M14.5,8.5 h3 v6 h6 v3 h-6 v6 h-3 v-6 h-6 v-3 h6 z" fill="#1c1f1c"/>`,
    usa: `<rect x="4" y="4" width="24" height="24" rx="3" fill="#3d4a2e"/>
          <circle cx="16" cy="16" r="11" fill="#2f3b26" stroke="#ded7b6" stroke-width="1"/>
          <path d="M16,7 l2.6,5.6 6.1,.7 -4.5,4.1 1.2,6 -5.4,-3 -5.4,3 1.2,-6 -4.5,-4.1 6.1,-7 z" fill="#f2eee0"/>`,
    uk:  `<rect x="4" y="4" width="24" height="24" rx="3" fill="#283b5c"/>
          <path d="M4,4 L28,28 M28,4 L4,28" stroke="#f0ece0" stroke-width="6"/>
          <path d="M4,4 L28,28 M28,4 L4,28" stroke="#bd4136" stroke-width="2.4"/>
          <path d="M16,4 V28 M4,16 H28" stroke="#f0ece0" stroke-width="7"/>
          <path d="M16,4 V28 M4,16 H28" stroke="#bd4136" stroke-width="3.6"/>`,
    sov: `<rect x="4" y="4" width="24" height="24" rx="3" fill="#4a1518"/>
          <path d="M16,7.5 L18,13.3 L24.1,13.4 L19.2,17 L21,22.9 L16,19.4 L11,22.9 L12.8,17 L7.9,13.4 L14,13.3 Z" fill="#e23b2e" stroke="#e8c34a" stroke-width="1"/>`,
    jpn: `<rect x="4" y="4" width="24" height="24" rx="3" fill="#2c3340"/>
          <g transform="translate(16,16)" fill="#e23b2e">
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(30)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(60)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(90)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(120)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(150)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(180)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(210)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(240)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(270)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(300)"/>
            <path d="M-1.3,-13 L1.3,-13 L0.6,-8 Z" transform="rotate(330)"/>
            <circle cx="0" cy="0" r="5"/>
          </g>`,
    ktm: `<rect x="4" y="4" width="24" height="24" rx="3" fill="#203454"/>
          <path d="M16,6.5 l1.5,3.2 3.5,.5 -2.5,2.5 .6,3.5 -3.1,-1.7 -3.1,1.7 .6,-3.5 -2.5,-2.5 3.5,-5 z" fill="#eef3fa"/>
          <path d="M6,24 l3,-5 3,2 4,-6 4,4 6,-3 v8 z" fill="#c8d8ee"/>
          <g stroke="#203454" stroke-width="1"><path d="M8.5,21.5 v2.5 M13.5,20.5 v3.5 M18.5,18 v6 M23,18 v6"/></g>`
  };
  return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">${inner[n] || ''}</svg>`;
}

/* 单位类型图标 */
function typeIcon(type, color) {
  const c = color || '#e8e0c8';
  const p = {
    infantry: `<path d="M4,15 h16 M9,15 v4 M4,11 l4,-3 h8 l4,3 M6,15 l-2,5 M18,15 l2,5" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="12" cy="6" r="2.2" fill="${c}"/>`,
    tank:     `<rect x="3" y="10" width="18" height="7" rx="2" fill="${c}"/><path d="M8,10 l1,-3 h7 l1,3 M14,8 h9" stroke="${c}" stroke-width="1.6" fill="none"/><circle cx="6" cy="18" r="1.6" fill="${c}"/><circle cx="12" cy="18" r="1.6" fill="${c}"/><circle cx="18" cy="18" r="1.6" fill="${c}"/>`,
    artillery:`<circle cx="8" cy="17" r="4" fill="${c}"/><path d="M8,14 L20,5 M4,17 h12 M12,17 l6,3" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    fighter:  `<path d="M2,13 L11,9 L21,11 L22,13 L12,14 L11,18 L9,18 L9,14 Z" fill="${c}"/><path d="M11,9 l3,-4 h2 l0,5" fill="${c}"/>`,
    bomber:   `<path d="M1,10 Q12,6 23,10 L23,12 Q12,9 1,13 Z" fill="${c}"/><circle cx="12" cy="16" r="1.6" fill="${c}"/><circle cx="17" cy="17" r="1.6" fill="${c}"/>`,
    order:    `<rect x="4" y="3" width="16" height="18" rx="1.5" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M7,8 h10 M7,12 h10 M7,16 h6" stroke="${c}" stroke-width="1.4"/>`
  };
  return `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${p[type] || p.order}</svg>`;
}

/* 攻 / 防 小徽记 */
const ICON_ATK = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M4,20 L14,10 M12,4 l8,2 -2,8 -4,-4 -4,4 2,-8 z" fill="currentColor" opacity=".9"/></svg>`;
const ICON_DEF = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,2 L21,5 V12 C21,17 17,21 12,22 C7,21 3,17 3,12 V5 Z" fill="currentColor" opacity=".9"/></svg>`;
