// OACE — 20s reel. Deterministic: everything is a pure function of t (seconds).
// Usage: index.html?w=1080&h=1920  → window.renderFrame(t)
const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1080), H = +(Q.get('h') || 1920);
const P = H / W > 1.3, L = W / H > 1.3, SQ = !P && !L;
const DUR = 20;
const A = '../assets/', PC = A + 'pieces/';
const RED = '#CE243B', STAR = '#F7DF7D';

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const E = {
  lin: u => u,
  outExpo: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  inExpo: u => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  inOutExpo: u => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2),
  outCubic: u => 1 - Math.pow(1 - u, 3),
  inCubic: u => u * u * u,
  inOutCubic: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outQuint: u => 1 - Math.pow(1 - u, 5),
  inQuart: u => u * u * u * u,
  outBack: u => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// keyframe track: kfs = [[t, {props}, ease?], ...]
function track(t, kfs) {
  if (t <= kfs[0][0]) return { ...kfs[0][1] };
  for (let i = 1; i < kfs.length; i++) {
    const [t1, v1, e] = kfs[i];
    if (t <= t1) {
      const [t0, v0] = kfs[i - 1];
      const u = (E[e || 'outExpo'])(seg(t, t0, t1));
      const o = {};
      for (const k in v1) o[k] = typeof v1[k] === 'number' ? lerp(v0[k] ?? v1[k], v1[k], u) : v1[k];
      for (const k in v0) if (!(k in o)) o[k] = v0[k];
      return o;
    }
  }
  return { ...kfs[kfs.length - 1][1] };
}

// ---------- dom ----------
const stage = document.getElementById('stage');
stage.style.width = W + 'px'; stage.style.height = H + 'px';
function el(tag, cls, parent, css) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (css) Object.assign(d.style, css);
  (parent || stage).appendChild(d);
  return d;
}
const world = el('div', 'layer', stage, { zIndex: 0 });
let PIECES = {}, COLORS = [], LOGO_SVG = '';

function piece(name, parent) {
  const info = PIECES[name];
  const d = el('div', 'pc', parent, { width: info.w + 'px', height: info.h + 'px' });
  const img = el('img', '', d); img.src = PC + name + '.png';
  d._w = info.w; d._h = info.h; d._info = info;
  return d;
}
// a crop window (x,y,w,h in piece CSS px) of a piece image
function subpiece(name, x, y, w, h, parent) {
  const info = PIECES[name];
  const d = el('div', 'pc', parent, { width: w + 'px', height: h + 'px' });
  const img = el('img', '', d, { position: 'absolute', left: -x + 'px', top: -y + 'px', width: info.w + 'px', height: info.h + 'px' });
  img.src = PC + name + '.png';
  d._w = w; d._h = h; d._img = img;
  return d;
}
function place(e, p) {
  const o = p.o ?? 1;
  if (o <= 0.002 || p.hide) { e.style.display = 'none'; return; }
  e.style.display = '';
  const s = p.s ?? 1, sx = (p.sx ?? 1) * s, sy = (p.sy ?? 1) * s;
  e.style.transform = `translate(${p.x - e._w / 2}px,${p.y - e._h / 2}px) rotate(${p.r || 0}deg) scale(${sx},${sy})`;
  e.style.opacity = o;
  e.style.filter = p.blur > 0.2 ? `blur(${p.blur / Math.max(0.05, s)}px)` : 'none';
  if (p.clip) e.style.clipPath = `inset(${p.clip[0]}% ${p.clip[1]}% ${p.clip[2]}% ${p.clip[3]}% round ${p.rad || 0}px)`;
  else e.style.clipPath = p.rad ? `inset(0 round ${p.rad}px)` : 'none';
}
// text block (letter spans for kinetic stagger)
function kin(str, cls, size, parent, color, opts = {}) {
  const d = el('div', 't ' + cls, parent, { fontSize: size + 'px', color: color || '#000', transformOrigin: '50% 50%', overflow: opts.noclip ? 'visible' : 'hidden', lineHeight: opts.lh || 1.0, padding: opts.noclip ? '0' : '0.06em 0.02em' });
  d._sp = [];
  for (const ch of str) {
    const s = el('span', '', d, { display: 'inline-block', whiteSpace: 'pre' });
    s.textContent = ch === ' ' ? ' ' : ch;
    d._sp.push(s);
  }
  d._fs = size; d._w = d.offsetWidth; d._h = d.offsetHeight;
  return d;
}
function kinRender(d, t, t0, o = {}) {
  const st = o.st ?? 0.028, du = o.du ?? 0.4, dy = o.dy ?? 1.05;
  const n = d._sp.length;
  d._sp.forEach((s, i) => {
    const k = o.rev ? n - 1 - i : i;
    const u = (E[o.e || 'outExpo'])(seg(t, t0 + k * st, t0 + k * st + du));
    const out = o.out != null ? E.inExpo(seg(t, o.out + k * (o.ost ?? 0.015), o.out + k * (o.ost ?? 0.015) + (o.odu ?? 0.25))) : 0;
    const y = (1 - u) * dy * d._fs - out * dy * d._fs;
    s.style.transform = `translateY(${y}px)${o.rot ? ` rotate(${(1 - u) * o.rot}deg)` : ''}`;
  });
}
const measure = (str, cls, size) => {
  const d = el('div', 't ' + cls, stage, { fontSize: size + 'px', visibility: 'hidden' });
  d.textContent = str; const w = d.offsetWidth, h = d.offsetHeight; d.remove(); return { w, h };
};
const fit = (str, cls, targetW) => 100 * targetW / measure(str, cls, 100).w;

// ---------- global FX ----------
const SHAKES = [[0, 10], [0.5, 10], [1.0, 22], [1.5, 10], [2.0, 26], [3.0, 30], [6.5, 6], [7.0, 6], [7.5, 6], [9.0, 8], [11.5, 10], [13.5, 18], [14.7, 14], [16.5, 18], [17.0, 34], [19.5, 12]];
function shake(t) {
  let x = 0, y = 0, r = 0;
  for (const [h, a] of SHAKES) {
    if (t < h) continue;
    const d = t - h, k = a * Math.exp(-d * 16);
    x += k * Math.sin(d * 95 + h * 7); y += k * Math.cos(d * 83 + h * 3); r += k * 0.02 * Math.sin(d * 60 + h);
  }
  return { x, y, r };
}
const FLASHES = [[1.0, RED, 0.07, 0.9], [2.0, '#fff', 0.1, 1], [3.0, '#fff', 0.16, 1], [6.0, '#fff', 0.08, 0.7], [11.0, '#000', 0.06, 0.5], [13.5, '#fff', 0.1, 0.9], [16.5, '#fff', 0.08, 1], [17.0, '#fff', 0.14, 1], [19.5, '#fff', 0.1, 0.6]];
let flashEl, grainEl, hud = {}, cursorEl, rings = [];

// ---------- cursor ----------
const CUR = [];   // [t, x, y, ease]
const CLICKS = []; // [t, x, y, color]
const CUR_VIS = []; // [a, b]
const CS = P ? 1.9 : 1.6;
function cursorAt(t) {
  if (!CUR.length) return null;
  const vis = CUR_VIS.some(([a, b]) => t >= a && t <= b);
  if (!vis) return null;
  const v = track(t, CUR.map(([tt, x, y, e]) => [tt, { x, y }, e || 'inOutCubic']));
  let press = 0;
  for (const [ct] of CLICKS) if (t >= ct - 0.02 && t < ct + 0.12) press = Math.max(press, 1 - Math.abs(t - ct - 0.02) / 0.1);
  return { ...v, press };
}
function addClick(t, x, y, color) { CLICKS.push([t, x, y, color || '#000']); }

// ================= SCENES =================
const scenes = [];
function scene(a, b, init, render) { const s = { a, b, init, render }; scenes.push(s); return s; }

// ---------- 1. HOOK ----------
scene(0, 3.02, function () {
  const lay = this.layer = el('div', 'layer', world);
  this.bg = el('div', 'layer', lay);
  const stack = this.stack = el('div', 'abs', lay, { transformOrigin: '0 0' });
  const words = ['YOUR', 'LEGGINGS', 'QUIT', 'BEFORE', 'YOU.'];
  const Wt = 1000, gap = 26;
  let y = 0;
  this.words = words.map((txt, i) => {
    const m = measure(txt, 'word', 100);
    const fs = Wt / m.w * 100;
    const lh = fs * 0.74;
    const copies = i === 2 ? 3 : 1; // QUIT gets glitch bands
    const els = [];
    for (let c = 0; c < copies; c++) {
      const d = el('div', 'word', stack, { fontSize: fs + 'px', left: '0px', top: y + 'px', width: Wt + 'px', textAlign: 'center', transformOrigin: `${Wt / 2}px ${lh / 2}px` });
      if (i === 4) d.innerHTML = txt.split('').map(c => `<span>${c}</span>`).join('');
      else d.textContent = txt;
      if (copies > 1) d.style.clipPath = `inset(${c * 33.4}% 0 ${100 - (c + 1) * 33.4}% 0)`;
      els.push(d);
    }
    const w = { txt, fs, y, h: lh, els, t0: i * 0.5 };
    y += lh + gap;
    return w;
  });
  this.Wt = Wt; this.Ht = y - gap;
  // counter centre of the "O" in YOU.
  const last = this.words[4], oSpan = last.els[0].children[1];
  const cv = document.createElement('canvas').getContext('2d');
  cv.font = `700 ${last.fs}px OH`;
  const m = cv.measureText('O');
  const base = (last.h - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  this.O = { x: oSpan.offsetLeft + oSpan.offsetWidth / 2, y: last.y + base - m.actualBoundingBoxAscent / 2 };
}, function (t) {
  const inv = t >= 2.0;
  this.bg.style.background = inv ? '#fff' : '#000';
  const cur = Math.min(4, Math.floor(t / 0.5));
  this.words.forEach((w, j) => {
    const u = E.outExpo(seg(t, w.t0, w.t0 + 0.22));
    const vis = t >= w.t0;
    w.els.forEach((d, c) => {
      if (!vis) { d.style.display = 'none'; return; }
      d.style.display = '';
      let col = inv ? '#000' : (j === cur ? '#fff' : 'rgba(255,255,255,0.16)');
      if (j === 2) col = (t >= 1.0 && t < 1.07) ? '#fff' : (inv || j === cur ? RED : 'rgba(206,36,59,0.35)');
      d.style.color = col;
      let dx = 0;
      if (j === 2 && t >= 1.0 && t < 1.42) {
        const g = 1 - seg(t, 1.0, 1.42), f = Math.floor(t * 60);
        dx = (hash(f * 3 + c) - 0.5) * 120 * g;
        if (hash(f + 9) > 0.6) dx *= 2.2;
      }
      const s = lerp(1.9, 1, u);
      d.style.transform = `translateX(${dx}px) scale(${s})`;
      d.style.opacity = clamp(u * 3);
      d.style.filter = u < 0.97 ? `blur(${(1 - u) * 16}px)` : 'none';
    });
  });
  // camera
  const Wt = this.Wt, Ht = this.Ht;
  const foc = j => { const w = this.words[j]; return { cx: Wt / 2, cy: w.y + w.h / 2, s: Math.min(W * 0.88 / Wt, H * 0.36 / w.h) }; };
  const full = { cx: Wt / 2, cy: Ht / 2, s: Math.min(W * 0.86 / Wt, H * 0.8 / Ht) };
  const kf = [[0, foc(0)], [0.5, foc(0)], [0.8, foc(1)], [1.0, foc(1)], [1.3, foc(2)], [1.5, foc(2)], [1.8, foc(3)], [2.0, foc(3)], [2.38, full], [2.55, full]];
  let cam = track(t, kf), r = 0;
  if (t > 2.55) {
    const u = seg(t, 2.55, 3.0);
    const z = Math.exp(Math.log(90) * E.inCubic(u));
    const cu = E.outCubic(seg(u, 0, 0.55));
    cam = { cx: lerp(full.cx, this.O.x, cu), cy: lerp(full.cy, this.O.y, cu), s: full.s * z };
    r = 14 * E.inCubic(u);
  }
  // subtle drift between hits
  const drift = (t < 2.0) ? 1 + 0.035 * ((t % 0.5) / 0.5) : 1;
  const sh = shake(t);
  this.stack.style.transform = `translate(${W / 2 + sh.x}px,${H / 2 + sh.y}px) rotate(${r + sh.r}deg) scale(${cam.s * drift}) translate(${-cam.cx}px,${-cam.cy}px)`;
});

// ---------- 2. PRODUCT ASSEMBLES ----------
scene(2.98, 6.02, function () {
  const lay = this.layer = el('div', 'layer', world, { background: '#EFEFEF' });
  // giant marquee type
  const mfs = P ? 300 : 260;
  this.mq = [0, 1].map(i => {
    const d = el('div', 't b', lay, { fontSize: mfs + 'px', color: 'rgba(0,0,0,0.06)', transformOrigin: '0 0' });
    d.textContent = 'SCRUNCH PRO  SCRUNCH PRO  SCRUNCH PRO  SCRUNCH PRO  ';
    d._w = d.offsetWidth; d._h = d.offsetHeight; return d;
  });
  // card
  const K = this.K = P ? 1.75 : 1.12;
  const m = P ? 150 : 60;
  this.cw = 390 * K; this.ch = H - 2 * m; this.visH = this.ch / K;
  this.cx = P ? W / 2 : (L ? W * 0.6 : W * 0.66); this.cy = H / 2;
  const card = this.card = el('div', 'pc', lay, { width: this.cw + 'px', height: this.ch + 'px', background: '#fff', borderRadius: 34 + 'px', boxShadow: '0 50px 140px rgba(0,0,0,0.22), 0 8px 30px rgba(0,0,0,0.08)' });
  card._w = this.cw; card._h = this.ch;
  const pcs = [
    ['announce', 3.08, 'drop'], ['header', 3.16, 'drop'], ['cw_img_00', 3.24, 'zoom'], ['cw_thumbs_00', 3.5, 'wipe'],
    ['title', 3.64, 'slide'], ['rating', 3.76, 'wipe'], ['badges', 3.86, 'pop'], ['price', 3.95, 'up'],
    ['outlet', 4.62, 'up'], ['size_xs', 4.72, 'up'], ['model', 4.8, 'up'], ['qty', 4.88, 'up'],
  ];
  this.pcs = pcs.map(([n, t0, kind]) => {
    const d = piece(n, card);
    const info = PIECES[n.startsWith('cw_img') ? 'cw_img_XX' : n.startsWith('cw_thumbs') ? 'thumbs' : n];
    return { d, t0, kind, x: info.x, y: info.y, w: d._w, h: d._h };
  });
  // colour grid: label + 23 tiles, each a real crop
  const gy = 930;
  this.glabel = { d: subpiece('cw_grid_00', 0, 0, 390, 32, card), x: 0, y: gy, w: 390, h: 32, t0: 4.06, kind: 'slide' };
  this.tiles = [];
  for (let i = 0; i < 23; i++) {
    const r = Math.floor(i / 5), c = i % 5;
    const tx = 20 + 68 * c - 1, ty = 34.77 + 68 * r - 1;
    const d = subpiece('cw_grid_00', tx, ty, 62, 62, card);
    this.tiles.push({ d, x: tx, y: gy + ty, w: 62, h: 62, t0: 4.1 + (r + c) * 0.045, kind: 'tile' });
  }
  // callouts / side type
  const tags = ['SCRUNCH', 'HIGH WAIST', 'SEAMLESS'];
  this.tags = tags.map((s, i) => {
    const d = el('div', 't r', lay, { fontSize: (P ? 34 : 26) + 'px', color: '#fff', background: '#000', borderRadius: '999px', padding: '0.55em 1.1em', letterSpacing: '0.04em', transformOrigin: '50% 50%' });
    d.textContent = s; d._w = d.offsetWidth; d._h = d.offsetHeight; return d;
  });
  if (!P) {
    const fs = SQ ? 92 : 150, x0 = SQ ? 60 : 110;
    this.side = ['SCRUNCH', 'PRO', 'LEGGINGS'].map((s, i) => kin(s, 'b', fs, lay, '#000'));
    this.sideX = x0;
    this.sub = kin('Fashionable Sportswear', 'l', SQ ? 30 : 40, lay, '#000');
    if (L) this.feat = piece('features', lay);
  }
}, function (t) {
  const K = this.K;
  this.mq.forEach((d, i) => {
    const sp = (t - 3) * 260 * (i ? -1 : 1);
    const per = d._w / 4;
    const x = (i ? -per : 0) + ((sp % per) + per) % per - per;
    d.style.transform = `translate(${x}px,${(i ? 0.74 : 0.12) * H}px)`;
  });
  // card entrance + whip exit
  const ent = E.outExpo(seg(t, 3.0, 3.5));
  const ex = E.inExpo(seg(t, 5.62, 6.0));
  const sh = shake(t);
  place(this.card, { x: this.cx + sh.x - ex * W * 1.25, y: this.cy + (1 - ent) * 260 + sh.y, s: lerp(0.72, 1, ent) * (1 + 0.02 * Math.sin(t * 2)), r: lerp(-9, 0, ent) - ex * 6, o: clamp(ent * 3) });
  // scroll (like a thumb scrolling the page)
  const S1 = 1702 - this.visH;
  const scroll = S1 * E.inOutCubic(seg(t, 4.2, 5.05));
  const pos = (p) => ({ x: (p.x + p.w / 2) * K, y: (p.y + p.h / 2 - scroll) * K });
  const anim = (p, extra = {}) => {
    const u = E.outExpo(seg(t, p.t0, p.t0 + 0.42));
    const b = pos(p);
    const v = { x: b.x, y: b.y, s: K, o: u > 0 ? 1 : 0 };
    if (p.kind === 'drop') { v.y -= (1 - u) * 80 * K; v.o = clamp(u * 2); }
    if (p.kind === 'zoom') { v.s = K * lerp(1.35, 1, u); v.clip = [0, 0, (1 - u) * 100, 0]; }
    if (p.kind === 'wipe') { v.clip = [0, (1 - u) * 100, 0, 0]; }
    if (p.kind === 'slide') { v.x -= (1 - u) * 120 * K; v.o = clamp(u * 2); v.blur = (1 - u) * 10; }
    if (p.kind === 'pop') { const ub = E.outBack(seg(t, p.t0, p.t0 + 0.35)); v.s = K * lerp(0.3, 1, ub); v.o = clamp(u * 3); }
    if (p.kind === 'up') { v.y += (1 - u) * 90 * K; v.o = clamp(u * 2); }
    if (p.kind === 'tile') { const ub = E.outBack(seg(t, p.t0, p.t0 + 0.32)); v.s = K * lerp(0.0, 1, ub); v.r = (1 - u) * -25; v.o = clamp(u * 4); }
    // keep things that are off the card window hidden for speed
    if (b.y < -200 * K || b.y > this.ch + 200 * K) v.o = 0;
    place(p.d, { ...v, ...extra });
  };
  this.pcs.forEach(p => anim(p));
  anim(this.glabel);
  this.tiles.forEach(p => anim(p));
  // tag callouts pop with the beat
  const tagPos = P
    ? [[this.cx - this.cw / 2 + 40, H * 0.36], [this.cx + this.cw / 2 - 30, H * 0.5], [this.cx - this.cw / 2 + 60, H * 0.66]]
    : L ? [[W * 0.86, H * 0.3], [W * 0.88, H * 0.42], [W * 0.85, H * 0.54]] : [[W * 0.3, H * 0.66], [W * 0.27, H * 0.75], [W * 0.31, H * 0.84]];
  this.tags.forEach((d, i) => {
    const t0 = 4.0 + i * 0.25;
    const u = E.outBack(seg(t, t0, t0 + 0.35));
    const out = E.inExpo(seg(t, 5.55 + i * 0.03, 5.85));
    place(d, { x: tagPos[i][0] - out * W, y: tagPos[i][1] + Math.sin(t * 3 + i) * 6, s: lerp(0, 1, u), r: (i % 2 ? 4 : -4) * (1 - u) + (i % 2 ? 2 : -2), o: u > 0 ? 1 : 0 });
  });
  if (!P) {
    let y = SQ ? 150 : 210;
    this.side.forEach((d, i) => {
      kinRender(d, t, 3.25 + i * 0.12, { out: 5.6 + i * 0.04 });
      place(d, { x: this.sideX + d._w / 2, y: y + d._h / 2 });
      y += d._h * 0.92;
    });
    kinRender(this.sub, t, 3.9, { st: 0.015, out: 5.6 });
    place(this.sub, { x: this.sideX + this.sub._w / 2 + 6, y: y + 30 });
    if (this.feat) {
      const u = E.outExpo(seg(t, 4.35, 4.8)), o = E.inExpo(seg(t, 5.6, 5.9));
      place(this.feat, { x: W * 0.87 - o * W, y: H * 0.74 + (1 - u) * 200, s: 1.15, r: (1 - u) * 8, o: clamp(u * 3), rad: 10 });
    }
  }
});

// ---------- 3. FEATURE 1 — 23 COLORWAYS ----------
const F1_SEQ = [[6.5, 6], [7.0, 7], [7.5, 1], [7.75, 12], [7.875, 17], [8.0, 20], [8.125, 13], [8.25, 19]];
scene(5.9, 8.62, function () {
  const lay = this.layer = el('div', 'layer', world, { background: '#EFEFEF' });
  this.floodLay = el('div', 'layer', lay);
  // layout
  if (P) { this.gi = { x: W / 2, y: 90 + 488 * 1.7 / 2, s: 1.7 }; this.gg = { x: W / 2, y: 90 + 488 * 1.7 + 22 + 372 * 1.7 / 2, s: 1.7 }; }
  else if (SQ) { this.gi = { x: 285, y: 400, s: 1.22 }; this.gg = { x: 790, y: 380, s: 1.3 }; }
  else { this.gi = { x: 885, y: 540, s: 1.68 }; this.gg = { x: 1515, y: 470, s: 1.55 }; }
  const used = [0, ...F1_SEQ.map(s => s[1])];
  this.imgs = {}; this.grids = {};
  for (const i of used) { this.imgs[i] = piece('cw_img_' + String(i).padStart(2, '0'), lay); }
  for (const i of used) { this.grids[i] = piece('cw_grid_' + String(i).padStart(2, '0'), lay); }
  for (const k in this.imgs) this.imgs[k].style.borderRadius = '0px';
  this.floods = F1_SEQ.map(([tt, i]) => ({ tt, i, d: el('div', 'abs', this.floodLay, { borderRadius: '50%', background: COLORS[i].hex }) }));
  // text
  if (P) { this.big = kin('23 COLORWAYS.', 'b', fit('23 COLORWAYS.', 'b', W - 110), lay, '#000'); this.small = kin('SCRUNCH PRO LEGGINGS', 'l', 30, lay, '#000'); }
  else if (SQ) { this.big = kin('23 COLORWAYS.', 'b', fit('23 COLORWAYS.', 'b', W - 100), lay, '#000'); this.small = kin('SCRUNCH PRO LEGGINGS', 'l', 24, lay, '#000'); }
  else { this.big = kin('23', 'b', 340, lay, '#000'); this.big2 = kin('COLORWAYS.', 'b', fit('COLORWAYS.', 'b', 400), lay, '#000'); this.small = kin('SCRUNCH PRO LEGGINGS', 'l', 26, lay, '#000'); }
  // name tag that follows the selected colour
  this.nameTag = el('div', 't r', lay, { fontSize: (P ? 34 : 28) + 'px', background: '#000', color: '#fff', borderRadius: '999px', padding: '0.5em 1em', transformOrigin: '50% 50%' });
  // cursor path
  const tile = (i, g = this.gg) => { const r = Math.floor(i / 5), c = i % 5; return { x: g.x + (20 + 68 * c + 30 - 195) * g.s, y: g.y + (34.77 + 68 * r + 30 - 186) * g.s }; };
  this.tile = tile;
  CUR_VIS.push([6.02, 8.42]);
  CUR.push([6.02, W + 80, H * 0.9]);
  let prev = 6.02;
  F1_SEQ.forEach(([tt, i], k) => {
    const p = tile(i);
    const mv = k < 3 ? 0.36 : 0.09;
    CUR.push([Math.max(prev + 0.01, tt - mv), CUR[CUR.length - 1][1], CUR[CUR.length - 1][2]]);
    CUR.push([tt - 0.03, p.x + 8, p.y + 10, k < 3 ? 'inOutCubic' : 'outExpo']);
    addClick(tt, p.x + 8, p.y + 10, '#000');
    prev = tt;
  });
  CUR.push([8.6, CUR[CUR.length - 1][1], CUR[CUR.length - 1][2] - H * 1.1, 'inExpo']);
}, function (t) {
  // which colourway is active
  let act = 0, actT = 0;
  for (const [tt, i] of F1_SEQ) if (t >= tt) { act = i; actT = tt; }
  const enter = E.outExpo(seg(t, 6.0, 6.45));
  const exitU = E.inExpo(seg(t, 8.36, 8.6));
  const dy = -exitU * H * 1.15;
  const sh = shake(t);
  // floods
  const R = Math.hypot(W, H) * 1.05;
  this.floods.forEach(f => {
    if (t < f.tt) { f.d.style.display = 'none'; return; }
    f.d.style.display = '';
    const u = E.outExpo(seg(t, f.tt, f.tt + 0.45));
    const p = this.tile(f.i);
    const r = R * u;
    f.d.style.width = f.d.style.height = 2 * r + 'px';
    f.d.style.transform = `translate(${p.x - r}px,${p.y - r + dy}px)`;
  });
  // gallery image (real photo of the selected colourway)
  for (const k in this.imgs) {
    const d = this.imgs[k];
    if (+k !== act) {
      // previous image stays underneath while the new one wipes in
      const prevAct = (() => { let pa = 0; for (const [tt, i] of F1_SEQ) if (tt < actT) pa = i; return pa; })();
      if (+k === prevAct && t < actT + 0.16) place(d, { ...this.gi, x: this.gi.x + sh.x + (1 - enter) * W, y: this.gi.y + dy, rad: 18 });
      else d.style.display = 'none';
      continue;
    }
    const u = E.outExpo(seg(t, actT, actT + 0.16));
    const punch = actT ? 1 + 0.05 * Math.exp(-(t - actT) * 14) : 1;
    d.style.zIndex = 2;
    place(d, { x: this.gi.x + sh.x + (1 - enter) * W * 1.1, y: this.gi.y + dy, s: this.gi.s * punch, r: (1 - enter) * 8, clip: actT ? [(1 - u) * 100, 0, 0, 0] : null, rad: 18 });
  }
  for (const k in this.grids) {
    const d = this.grids[k];
    if (+k !== act) { d.style.display = 'none'; continue; }
    const e2 = E.outExpo(seg(t, 6.08, 6.55));
    place(d, { x: this.gg.x + sh.x + (1 - e2) * W * 1.2, y: this.gg.y + dy, s: this.gg.s, r: (1 - e2) * 6, rad: 14 });
    d.style.background = '#fff';
  }
  // text colour flips with flood luminance
  const hex = actT ? COLORS[act].hex : '#EFEFEF';
  const lum = (() => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; })();
  const tc = lum < 0.55 ? '#fff' : '#000';
  [this.big, this.big2, this.small].forEach(d => d && (d.style.color = tc));
  if (P) {
    kinRender(this.big, t, 6.2, { st: 0.03 });
    place(this.big, { x: W / 2, y: H - 175 + dy });
    kinRender(this.small, t, 6.3, { st: 0.012 });
    place(this.small, { x: W / 2, y: H - 290 + dy });
  } else if (SQ) {
    kinRender(this.big, t, 6.2, { st: 0.03 });
    place(this.big, { x: W / 2, y: H - 120 + dy });
    this.small.style.display = 'none';
  } else {
    kinRender(this.big, t, 6.15, { st: 0.06 });
    place(this.big, { x: 90 + this.big._w / 2, y: 380 + dy });
    kinRender(this.big2, t, 6.3, { st: 0.025 });
    place(this.big2, { x: 90 + this.big2._w / 2, y: 380 + this.big._h / 2 + this.big2._h / 2 - 30 + dy });
    kinRender(this.small, t, 6.35, { st: 0.012 });
    place(this.small, { x: 96 + this.small._w / 2, y: 150 + dy });
  }
  // name tag
  if (actT) {
    this.nameTag.textContent = COLORS[act].name;
    this.nameTag._w = this.nameTag.offsetWidth; this.nameTag._h = this.nameTag.offsetHeight;
    const u = E.outBack(seg(t, actT, actT + 0.25));
    const gi = this.gi;
    place(this.nameTag, { x: gi.x + (P ? 0 : 0), y: gi.y + 488 * gi.s / 2 - this.nameTag._h - 10 + dy, s: lerp(0.6, 1, u), o: 1 });
    this.nameTag.style.zIndex = 3;
  } else this.nameTag.style.display = 'none';
});

// ---------- 4. FEATURE 2 — FIND YOUR FIT ----------
scene(8.4, 11.08, function () {
  const lay = this.layer = el('div', 'layer', world, { background: '#fff' });
  this.xs = piece('size_xs', lay); this.sz = piece('size_s', lay);
  if (P) this.ps = { x: W / 2, y: 690, s: 2.5 };
  else if (SQ) this.ps = { x: W / 2, y: 360, s: 2.15 };
  else this.ps = { x: 1300, y: 300, s: 2.05 };
  // headline
  if (P) { this.h1 = kin('FIND YOUR', 'b', fit('FIND YOUR', 'b', W - 110), lay); this.h2 = kin('FIT.', 'b', fit('FIND YOUR', 'b', W - 110), lay); }
  else if (SQ) { this.h1 = kin('FIND YOUR FIT.', 'b', fit('FIND YOUR FIT.', 'b', W - 100), lay); }
  else { this.h1 = kin('FIND', 'b', 230, lay); this.h2 = kin('YOUR', 'b', 230, lay); this.h3 = kin('FIT.', 'b', 230, lay); }
  // highlight ring around "Genau passend"
  this.hl = el('div', 'pc', lay, { border: '4px solid ' + RED, borderRadius: '999px' });
  this.hl._w = 120; this.hl._h = 34;
  this.hl.style.width = '120px'; this.hl.style.height = '34px';
  // leggings guide tiles (real)
  const cols = P ? 3 : SQ ? 6 : 6, ts = P ? 2.15 : SQ ? 1.22 : 1.5, gap = P ? 18 : 10;
  const ids = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) ids.push('guide_' + r + c);
  const tw = 110 * ts;
  const totalW = cols * tw + (cols - 1) * gap;
  const x0 = (P ? W / 2 : SQ ? W / 2 : 1300) - totalW / 2;
  const y0 = P ? 960 : SQ ? 610 : 545;
  const rowH = []; ids.forEach((id, k) => { const r = Math.floor(k / cols); rowH[r] = Math.max(rowH[r] || 0, PIECES[id].h * ts); });
  this.tiles = ids.map((id, k) => {
    const r = Math.floor(k / cols), c = k % cols;
    let y = y0; for (let i = 0; i < r; i++) y += rowH[i] + gap;
    const d = piece(id, lay); d.style.background = '#fff';
    return { d, x: x0 + c * (tw + gap) + tw / 2, y: y + PIECES[id].h * ts / 2, s: ts, t0: 9.5 + (r + c) * 0.045 };
  });
  this.gt = kin('LEGGINGS GUIDE — 12 STYLES', 'l', P ? 28 : 22, lay, '#000');
  this.gtY = y0 - (P ? 46 : 34);
  // cursor: click "S", then hover the Scrunch Pro tile
  const ps = this.ps, S = { x: ps.x + (111.7 - 195) * ps.s, y: ps.y + (60 - 72.5) * ps.s };
  CUR_VIS.push([8.62, 10.9]);
  CUR.push([8.62, W * 0.8, H + 60], [8.95, S.x + 6, S.y + 10, 'outExpo']);
  addClick(9.0, S.x + 6, S.y + 10, '#000');
  const t0 = this.tiles[0];
  CUR.push([9.6, S.x + 6, S.y + 10], [10.15, t0.x + 20, t0.y + 10, 'inOutCubic'], [10.7, t0.x + 26, t0.y + 4, 'inOutCubic'], [11.0, W + 200, t0.y - 100, 'inExpo']);
}, function (t) {
  const ent = E.outExpo(seg(t, 8.5, 8.9));
  const ex = E.inExpo(seg(t, 10.82, 11.05));
  const dy = (1 - ent) * H * 1.1, dx = ex * W * 1.2;
  const sh = shake(t);
  const clicked = t >= 9.0;
  const press = (t >= 8.98 && t < 9.12) ? 0.97 : 1;
  const ps = this.ps;
  const sizeY = ps.y + dy;
  place(this.xs, { x: ps.x - dx + sh.x, y: sizeY + sh.y, s: ps.s * press, o: clicked ? 0 : 1 });
  place(this.sz, { x: ps.x - dx + sh.x, y: sizeY + sh.y, s: ps.s * (clicked ? 1 + 0.03 * Math.exp(-(t - 9) * 12) : 1), o: clicked ? 1 : 0 });
  // highlight "Genau passend" segment (fit bar centre at x≈182, y≈118 in piece px)
  const hu = E.outBack(seg(t, 9.2, 9.5));
  place(this.hl, { x: ps.x + (182 - 195) * ps.s - dx, y: sizeY + (122 - 72.5) * ps.s, s: ps.s * lerp(0.2, 1, hu), o: t >= 9.2 ? 1 - E.inExpo(seg(t, 10.8, 11)) : 0 });
  // headline
  const hx = (d) => P || SQ ? W / 2 : 100 + d._w / 2;
  if (P) {
    kinRender(this.h1, t, 8.58, { st: 0.03 }); kinRender(this.h2, t, 8.7, { st: 0.05 });
    place(this.h1, { x: W / 2 - dx, y: 150 + dy * 0.6 });
    place(this.h2, { x: W / 2 - dx, y: 150 + this.h1._h * 0.86 + dy * 0.6 });
  } else if (SQ) {
    kinRender(this.h1, t, 8.58, { st: 0.03 });
    place(this.h1, { x: W / 2 - dx, y: 120 + dy * 0.6 });
  } else {
    [this.h1, this.h2, this.h3].forEach((d, i) => { kinRender(d, t, 8.58 + i * 0.1, { st: 0.04 }); place(d, { x: hx(d) - dx, y: 300 + i * d._h * 0.84 + dy * 0.6 }); });
  }
  kinRender(this.gt, t, 9.45, { st: 0.01 });
  place(this.gt, { x: (P || SQ ? W / 2 : 1300) - dx, y: this.gtY + dy });
  // guide tiles pop in, Scrunch Pro tile gets hovered
  this.tiles.forEach((p, k) => {
    const u = E.outBack(seg(t, p.t0, p.t0 + 0.3));
    const hov = k === 0 ? E.outBack(seg(t, 10.12, 10.35)) : 0;
    p.d.style.zIndex = k === 0 ? 2 : 1;
    p.d.style.boxShadow = k === 0 && hov > 0 ? `0 ${20 * hov}px ${50 * hov}px rgba(0,0,0,${0.25 * hov})` : 'none';
    place(p.d, { x: p.x - dx + sh.x, y: p.y + dy + sh.y, s: p.s * lerp(0, 1, u) * (1 + 0.12 * hov), r: (1 - clamp(u)) * 20, o: t >= p.t0 ? 1 : 0, rad: 10 });
  });
});

// ---------- 5. FEATURE 3 — ONE TAP. IN THE CART. ----------
const DRAWER_STRIPS = [[0, 62], [62, 160], [160, 300], [300, 440], [440, 520], [520, 600], [600, 672], [672, 742], [742, 828]];
scene(10.85, 13.58, function () {
  const lay = this.layer = el('div', 'layer', world, { background: '#EFEFEF' });
  this.atc = piece('atc', lay); this.atc.style.background = '#fff';
  this.pay = piece('payments', lay); this.pay.style.background = '#fff';
  if (P) this.pa = { x: W / 2, y: 900, s: 2.55 };
  else if (SQ) this.pa = { x: W / 2, y: 640, s: 2.15 };
  else this.pa = { x: 1390, y: 560, s: 2.2 };
  this.tBefore = el('div', 'layer', lay);
  this.dim = el('div', 'layer', lay, { background: '#000' });
  // drawer (real, split into strips that slide in one after another)
  this.dk = P ? 2.12 : 1.27;
  const dw = 374 * this.dk;
  this.dx = P ? W - 26 - dw / 2 : W - (L ? 70 : 40) - dw / 2;
  this.dy0 = H / 2 - 828 * this.dk / 2;
  this.strips = DRAWER_STRIPS.map(([a, b], i) => {
    const d = subpiece('drawer', 0, a, 374, b - a, lay); d.style.background = '#fff';
    return { d, a, b, t0: 11.6 + i * 0.03 };
  });
  // free-shipping progress fill (covers the real green bar, then uncovers it)
  const ship = this.strips[1];
  this.barCover = el('div', '', ship.d, { position: 'absolute', top: (127 - 62) + 'px', height: '5px', background: '#fff' });
  // text
  if (P) {
    this.t1 = kin('ONE TAP.', 'b', fit('ONE TAP.', 'b', W - 110), this.tBefore);
    this.t2 = kin('IN THE CART.', 'b', 150, lay, '#fff');
  } else {
    const fs = SQ ? 104 : 170;
    this.t1 = kin('ONE TAP.', 'b', fs, lay); this.t2 = kin('IN THE', 'b', fs, lay, '#fff'); this.t3 = kin('CART.', 'b', fs, lay, '#fff');
  }
  const pa = this.pa;
  const B = { x: pa.x + (162 - 195) * pa.s, y: pa.y + (39.5 - 40) * pa.s };
  const K = { x: this.dx + (187 - 187) * this.dk, y: this.dy0 + 705 * this.dk };
  CUR_VIS.push([11.05, 13.45]);
  const park = { x: (this.dx - 374 * this.dk / 2) * 0.5, y: H * 0.62 };
  CUR.push([11.05, -80, H * 0.75], [11.44, B.x + 10, B.y + 12, 'inOutCubic'], [11.6, B.x + 10, B.y + 12], [12.0, park.x, park.y, 'inOutCubic'], [12.55, park.x, park.y], [13.12, K.x + 30, K.y + 8, 'inOutCubic'], [13.5, K.x + 30, K.y + 8]);
  addClick(11.5, B.x + 10, B.y + 12, '#fff');
  addClick(13.2, K.x + 30, K.y + 8, '#fff');
}, function (t) {
  const ent = E.outExpo(seg(t, 10.98, 11.35));
  const sh = shake(t);
  const exit = E.inExpo(seg(t, 13.28, 13.52));
  const pa = this.pa;
  const press = (t >= 11.48 && t < 11.62) ? 0.94 : 1;
  const clr = E.inExpo(seg(t, 11.62, 11.9));
  place(this.atc, { x: pa.x + (1 - ent) * W * 1.1 - clr * W * 0.3 + sh.x, y: pa.y + sh.y + clr * 60, s: pa.s * press * (1 - clr * 0.15), rad: 10, o: 1 - clr });
  place(this.pay, { x: pa.x + (1 - ent) * W * 1.3 - clr * W * 0.3 + sh.x, y: pa.y + (40 + 18 + 14) * pa.s + sh.y + clr * 60, s: pa.s * (1 - clr * 0.15), rad: 10, o: 1 - clr });
  const dimU = E.outCubic(seg(t, 11.55, 11.8));
  this.dim.style.opacity = 0.55 * dimU;
  this.dim.style.display = dimU > 0 ? '' : 'none';
  const dk = this.dk;
  this.strips.forEach((s, i) => {
    const u = E.outExpo(seg(t, s.t0, s.t0 + 0.42));
    const press2 = (i === 7 && t >= 13.18 && t < 13.3) ? 0.97 : 1;
    place(s.d, { x: this.dx + (1 - u) * W * 0.9 + sh.x, y: this.dy0 + ((s.a + s.b) / 2) * dk + sh.y, s: dk * press2 * (1 - exit * 0.08), o: t >= s.t0 ? 1 - exit : 0 });
  });
  // progress bar fills to its real value
  const fu = E.outCubic(seg(t, 11.95, 12.45));
  const gx0 = 36, gx1 = 112.7;
  this.barCover.style.left = (gx0 + (gx1 - gx0) * fu) + 'px';
  this.barCover.style.width = Math.max(0, (gx1 - gx0) * (1 - fu)) + 'px';
  // copy
  if (P) {
    kinRender(this.t1, t, 11.05, { st: 0.035, out: 11.62, ost: 0.02 });
    place(this.t1, { x: W / 2, y: 470 });
    kinRender(this.t2, t, 11.85, { st: 0.03 });
    const x = (this.dx - 374 * dk / 2) / 2;
    place(this.t2, { x, y: H / 2, r: -90, o: 1 - exit });
  } else {
    const x0 = SQ ? 60 : 100;
    kinRender(this.t1, t, 11.05, { st: 0.035 });
    const ty = L ? H / 2 - this.t1._h * 0.9 : 200;
    place(this.t1, { x: (L ? x0 + this.t1._w / 2 : W / 2 - (W / 2 - x0 - this.t1._w / 2) * E.inOutCubic(seg(t, 11.6, 11.9))), y: lerp(ty, H / 2 - this.t1._h * 0.9, SQ ? E.inOutCubic(seg(t, 11.6, 11.9)) : 0) });
    this.t1.style.color = t >= 11.6 ? '#fff' : '#000';
    kinRender(this.t2, t, 11.85, { st: 0.03 }); kinRender(this.t3, t, 11.95, { st: 0.03 });
    place(this.t2, { x: x0 + this.t2._w / 2, y: H / 2, o: 1 - exit });
    place(this.t3, { x: x0 + this.t3._w / 2, y: H / 2 + this.t2._h * 0.9, o: 1 - exit });
  }
});

// ---------- 6. METRIC — 1,515 REVIEWS ----------
scene(13.45, 16.62, function () {
  const lay = this.layer = el('div', 'layer', world, { background: '#000' });
  // conveyor of real colourway photos
  this.conv = [];
  const cols = P ? 4 : L ? 7 : 5, cw = W / cols, ch = cw * 488 / 390;
  for (let c = 0; c < cols; c++) for (let r = 0; r < Math.ceil(H / ch) + 2; r++) {
    const i = (c * 5 + r * 3) % 23;
    const d = piece('cw_img_' + String(i).padStart(2, '0'), lay);
    this.conv.push({ d, c, r, s: cw / 390, ch, speed: (c % 2 ? 1 : -1) * (120 + 40 * (c % 3)) });
  }
  this.convH = (Math.ceil(H / ch) + 2) * ch; this.cwid = cw;
  this.shade = el('div', 'layer', lay, { background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.55), rgba(0,0,0,0.92) 75%)' });
  const nw = P ? W - 110 : L ? 860 : 760;
  this.nfs = fit('1,515', 'b', nw);
  this.num = el('div', 't b', lay, { fontSize: this.nfs + 'px', color: '#fff', fontVariantNumeric: 'tabular-nums', transformOrigin: '50% 50%', lineHeight: 0.8 });
  this.num.textContent = '1,515'; this.numW = this.num.offsetWidth; this.numH = this.num.offsetHeight;
  this.rv = kin('REVIEWS.', 'b', fit('REVIEWS.', 'b', nw), lay, '#fff');
  this.cap = kin('on one pair of leggings — Scrunch Pro', 'l', P ? 38 : L ? 34 : 30, lay, '#fff');
  // real review widget on a white card
  this.card = el('div', 'pc', lay, { background: '#fff', borderRadius: '22px', boxShadow: '0 40px 120px rgba(0,0,0,.5)' });
  const ck = this.ck = P ? 2.3 : L ? 1.72 : 1.18;
  const pad = 22;
  this.card.style.width = (350 + 2 * pad) + 'px'; this.card.style.height = (215 + 2 * pad) + 'px';
  this.card._w = 350 + 2 * pad; this.card._h = 215 + 2 * pad;
  const rs = subpiece('review_summary', 0, 0, 350, 215, this.card);
  rs.style.left = pad + 'px'; rs.style.top = pad + 'px';
  if (P) { this.nPos = { x: W / 2, y: 700 }; this.cPos = { x: W / 2, y: 1500 }; }
  else if (SQ) { this.nPos = { x: W / 2, y: 225 }; this.cPos = { x: W / 2, y: 880 }; }
  else { this.nPos = { x: 540, y: 420 }; this.cPos = { x: 1500, y: 560 }; }
}, function (t) {
  const sh = shake(t);
  const out = E.inExpo(seg(t, 16.25, 16.5));
  this.conv.forEach(p => {
    const yy = (((p.r * p.ch + (t - 13.5) * p.speed) % this.convH) + this.convH) % this.convH - p.ch;
    place(p.d, { x: p.c * this.cwid + this.cwid / 2, y: yy + p.ch / 2, s: p.s * 0.985, o: 0.55 * E.outCubic(seg(t, 13.5, 14.2)) });
  });
  // counter
  const cu = E.outExpo(seg(t, 13.55, 14.7));
  const n = Math.round(1515 * cu);
  this.num.textContent = n >= 1000 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, '0')}` : String(n);
  const nw = this.num.offsetWidth;
  const land = t >= 14.7 ? 1 + 0.08 * Math.exp(-(t - 14.7) * 10) : 1;
  const ent = E.outExpo(seg(t, 13.5, 13.9));
  const grow = 1 + 0.06 * seg(t, 14.7, 16.25);
  this.num._w = nw; this.num._h = this.numH;
  const np = this.nPos;
  place(this.num, { x: np.x + sh.x, y: np.y + sh.y, s: lerp(0.6, 1, ent) * land * grow * (1 + out * 3), o: 1 - out, blur: (1 - ent) * 20 });
  kinRender(this.rv, t, 14.0, { st: 0.035 });
  place(this.rv, { x: np.x + sh.x, y: np.y + this.numH * 0.5 + this.rv._h * 0.55 + sh.y, s: grow, o: 1 - out });
  kinRender(this.cap, t, 14.35, { st: 0.008, du: 0.3 });
  place(this.cap, { x: np.x, y: np.y + this.numH * 0.5 + this.rv._h * 1.1 + 40, o: 1 - out });
  const cu2 = E.outExpo(seg(t, 14.75, 15.25));
  const cp = this.cPos;
  place(this.card, { x: cp.x + sh.x, y: cp.y + (1 - cu2) * H * 0.7 + sh.y, s: this.ck * (1 - out * 0.3), r: lerp(10, -1.5, cu2) + 1.5 * seg(t, 15.25, 16.3), o: t >= 14.75 ? 1 - out : 0 });
});

// ---------- 7. LOGO + CTA ----------
const STROBE = [6, 17, 12, 1];
scene(16.45, 20.0, function () {
  const lay = this.layer = el('div', 'layer', world, { background: '#fff' });
  this.strobe = STROBE.map(i => piece('cw_img_' + String(i).padStart(2, '0'), lay));
  this.strobeS = Math.max(W / 390, H / 488);
  const lw = P ? 880 : SQ ? 740 : 920;
  const logo = this.logo = el('div', 'pc', lay, { width: lw + 'px' });
  logo.innerHTML = LOGO_SVG;
  const svg = logo.querySelector('svg'); svg.setAttribute('width', lw); svg.removeAttribute('height'); svg.style.display = 'block';
  logo._w = lw; logo._h = lw * 952.5 / 3200; logo.style.height = logo._h + 'px';
  this.ly = P ? 780 : SQ ? 400 : 400;
  this.tag = kin('FASHIONABLE SPORTSWEAR', 'l', P ? 40 : 34, lay, '#000');
  this.tag.style.letterSpacing = '0.32em';
  this.tag._w = this.tag.offsetWidth;
  // CTA in the site's own primary button style (black pill, white text, Helvetica LT Pro)
  const cta = this.cta = el('div', 't r', lay, { fontSize: (P ? 50 : 42) + 'px', background: '#000', color: '#fff', borderRadius: '3.125rem', padding: '0.62em 1.6em', transformOrigin: '50% 50%', letterSpacing: '0.01em' });
  cta.textContent = 'Shop now'; cta._w = cta.offsetWidth; cta._h = cta.offsetHeight;
  this.url = kin('oace.de', 'r', P ? 44 : 36, lay, '#000');
  this.cy = P ? 1250 : SQ ? 700 : 720;
  this.ann = piece('announce', lay);
  this.annS = W / 390;
  const c = { x: W / 2, y: this.cy };
  CUR_VIS.push([18.45, 19.62]);
  CUR.push([18.45, W * 0.85, H + 60], [18.92, c.x + cta._w * 0.18, c.y + 8, 'outExpo'], [19.3, c.x + cta._w * 0.2, c.y + 14], [19.62, c.x + cta._w * 0.2 + 40, H + 100, 'inExpo']);
  addClick(19.0, c.x + cta._w * 0.18, c.y + 8, '#000');
}, function (t) {
  const sh = shake(t);
  // strobe of real colourways on 16ths
  this.strobe.forEach((d, k) => {
    const a = 16.5 + k * 0.125;
    const on = t >= a && t < a + 0.125 && t < 17.0;
    place(d, { x: W / 2 + sh.x, y: H / 2 + sh.y, s: this.strobeS * (1.08 - 0.06 * seg(t, a, a + 0.125)), o: on ? 1 : 0 });
  });
  const slam = E.outExpo(seg(t, 17.0, 17.32));
  const pre = t < 17.0;
  const logo = this.logo;
  logo.style.color = pre ? '#fff' : '#000';
  logo.style.mixBlendMode = pre ? 'difference' : 'normal';
  const fin = t >= 19.5 ? 1 + 0.04 * Math.exp(-(t - 19.5) * 10) : 1;
  const ls = pre ? lerp(1.3, 1.18, seg(t, 16.5, 17.0)) : lerp(1.6, 1, slam) * fin;
  place(logo, { x: W / 2 + sh.x, y: this.ly + sh.y, s: ls, clip: pre ? null : [0, 0, 0, 0], blur: pre ? 0 : (1 - slam) * 12 });
  kinRender(this.tag, t, 17.35, { st: 0.018 });
  place(this.tag, { x: W / 2 + 0.16 * (P ? 40 : 34), y: this.ly + logo._h / 2 + (P ? 110 : 80), o: t >= 17.3 ? 1 : 0 });
  const cu = E.outBack(seg(t, 17.85, 18.25));
  const pressed = t >= 18.98 && t < 19.12;
  this.cta.style.background = t >= 19.0 && t < 19.4 ? '#333' : '#000';
  place(this.cta, { x: W / 2 + sh.x, y: this.cy + sh.y, s: lerp(0, 1, cu) * (pressed ? 0.94 : 1) * fin, o: t >= 17.85 ? 1 : 0 });
  kinRender(this.url, t, 18.15, { st: 0.03 });
  place(this.url, { x: W / 2, y: this.cy + this.cta._h / 2 + (P ? 80 : 64), o: t >= 18.1 ? 1 : 0 });
  const au = E.outExpo(seg(t, 19.08, 19.4));
  place(this.ann, { x: W / 2, y: H - 31 * this.annS + (1 - au) * 80 * this.annS, s: this.annS, o: t >= 19.08 ? 1 : 0 });
});

// ---------- HUD + overlays ----------
const SECTIONS = [[0, '01', 'THE PROBLEM'], [3, '02', 'SCRUNCH PRO'], [6, '03', 'COLORWAYS'], [8.5, '04', 'FIT'], [11, '05', 'CART'], [13.5, '06', 'PROOF'], [16.5, '07', 'OACE']];
function initGlobal() {
  const ring = (c) => { const d = el('div', 'ring', world); d.style.borderColor = c; d._w = d._h = 100; d.style.width = d.style.height = '100px'; return d; };
  rings = CLICKS.map(([tt, x, y, c]) => ({ tt, x, y, d: ring(c) }));
  cursorEl = el('div', 'pc', world, { width: 30 * CS + 'px', height: 44 * CS + 'px', transformOrigin: '0 0', zIndex: 50 });
  cursorEl._w = 30 * CS; cursorEl._h = 44 * CS;
  cursorEl.innerHTML = `<svg width="${30 * CS}" height="${44 * CS}" viewBox="-2 -2 30 44"><path d="M0 0 L0 30 L7.2 23.2 L12 34.5 L17 32.4 L12.3 21.4 L22 21.4 Z" fill="#000" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
  cursorEl.style.filter = 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))';
  const hudEl = el('div', '', stage, { position: 'absolute', inset: 0, mixBlendMode: 'difference', color: '#fff', pointerEvents: 'none', zIndex: 10 });
  const fs = P ? 24 : 20, m = P ? 56 : 40;
  hud.label = el('div', 't l', hudEl, { fontSize: fs + 'px', letterSpacing: '0.18em', left: m + 'px', top: (H - m - fs) + 'px' });
  hud.tc = el('div', 't l', hudEl, { fontSize: fs + 'px', letterSpacing: '0.18em', fontVariantNumeric: 'tabular-nums', top: m + 'px', right: m + 'px', left: 'auto' });
  hud.url = el('div', 't l', hudEl, { fontSize: fs + 'px', letterSpacing: '0.18em', top: (H - m - fs) + 'px', right: m + 'px', left: 'auto' });
  hud.url.textContent = 'OACE.DE';
  hud.mark = el('div', 't b', hudEl, { fontSize: fs + 'px', letterSpacing: '0.05em', left: m + 'px', top: m + 'px' });
  hud.mark.textContent = 'OACE — SHOWREEL';
  hud.bar = el('div', '', hudEl, { position: 'absolute', left: 0, bottom: 0, height: (P ? 6 : 5) + 'px', background: '#fff' });
  hud.root = hudEl;
  flashEl = el('div', 'layer', stage, { pointerEvents: 'none', zIndex: 11 });
  // film grain
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), id = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const v = Math.floor(hash(i * 1.37) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0);
  grainEl = el('div', 'layer', stage, { backgroundImage: `url(${c.toDataURL()})`, opacity: 0.045, mixBlendMode: 'overlay', pointerEvents: 'none', inset: '-256px', zIndex: 12 });
}
function renderGlobal(t) {
  // cursor
  const c = cursorAt(t);
  if (c) {
    cursorEl.style.display = '';
    cursorEl.style.transform = `translate(${c.x}px,${c.y}px) scale(${1 - 0.18 * c.press})`;
  } else cursorEl.style.display = 'none';
  rings.forEach(r => {
    const u = seg(t, r.tt, r.tt + 0.4);
    if (t < r.tt || u >= 1) { r.d.style.display = 'none'; return; }
    r.d.style.display = '';
    const s = lerp(0.2, P ? 1.9 : 1.5, E.outExpo(u));
    r.d.style.transform = `translate(${r.x - 50}px,${r.y - 50}px) scale(${s})`;
    r.d.style.opacity = 1 - u;
    r.d.style.borderWidth = lerp(8, 1.5, u) + 'px';
  });
  // flashes
  let fo = 0, fc = '#fff';
  for (const [ft, col, d, a] of FLASHES) if (t >= ft && t < ft + d) { const o = a * (1 - (t - ft) / d); if (o > fo) { fo = o; fc = col; } }
  flashEl.style.background = fc; flashEl.style.opacity = fo; flashEl.style.display = fo > 0.001 ? '' : 'none';
  // hud
  let sec = SECTIONS[0]; for (const s of SECTIONS) if (t >= s[0]) sec = s;
  const su = seg(t, sec[0], sec[0] + 0.25);
  const txt = `${sec[1]} / ${sec[2]}`;
  const shown = Math.floor(txt.length * su);
  hud.label.textContent = txt.slice(0, shown) + (su < 1 ? '▌' : '');
  const fr = Math.floor(t * 30) % 30;
  hud.tc.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
  hud.bar.style.width = (W * t / DUR) + 'px';
  hud.tc.style.opacity = (t > 11.6 && t < 13.5) ? 0 : 1;
  hud.root.style.opacity = t > 19.3 ? 1 - seg(t, 19.3, 19.6) : 1;
  const f = Math.floor(t * 24);
  grainEl.style.transform = `translate(${Math.floor(hash(f) * 256)}px,${Math.floor(hash(f + 0.5) * 256)}px)`;
}

// ---------- boot ----------
window.renderFrame = function (t) {
  for (const s of scenes) {
    const on = t >= s.a && t < s.b;
    s.layer.style.display = on ? '' : 'none';
    if (on) s.render(t);
  }
  // later scenes on top during overlaps
  renderGlobal(t);
};
window.ready = (async () => {
  await Promise.all([300, 400, 700].map(w => document.fonts.load(`${w} 100px OH`)));
  PIECES = Object.fromEntries((await (await fetch(PC + 'pieces.json')).json()).map(p => [p.name, p]));
  const pj = PIECES;
  for (let i = 0; i < 23; i++) { const n = String(i).padStart(2, '0'); pj['cw_img_' + n] = { ...pj.cw_img_XX, name: 'cw_img_' + n }; pj['cw_grid_' + n] = { ...pj.cw_grid_XX, name: 'cw_grid_' + n }; pj['cw_thumbs_' + n] = { ...pj.thumbs, name: 'cw_thumbs_' + n }; }
  pj.features = { name: 'features', w: 350, h: 172, x: 0, y: 0 };
  pj.drawer = { name: 'drawer', w: 374, h: 828, x: 8, y: 8 };
  COLORS = await (await fetch(PC + 'colors.json')).json();
  LOGO_SVG = (await (await fetch(A + 'logo_traced.svg')).text()).replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>/g, '').replace(/fill="#000000"/g, 'fill="currentColor"');
  scenes.forEach((s, i) => { s.init(); s.layer.style.zIndex = i; s.layer.style.display = 'none'; });
  initGlobal();
  await Promise.all([...document.images].map(im => im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r; })));
  await Promise.all([...document.images].map(im => im.decode().catch(() => 0)));
  window.renderFrame(+(Q.get('t') || 0));
  return true;
})();
