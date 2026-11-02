// The TheOnePercent1% brand film, coded: 30 s, four acts, drawn live in the
// browser from the same palette, fonts and background drawings as the site.
// Plain JS (not TS) because it's a large, self-contained drawing routine.
// initFilms() wires up every [data-film] figure (see BrandFilm.astro).

// TheOnePercent1% brand film, 30 s, four acts:
// I   what the 99% fail to do (0–9.8): calm, then accelerating
// II  the one (9.8–12.4): tension, then silence
// III the services (12.4–21): the hit, whip-panned reveals
// IV  the announcement (21–30): soft but firm, TOP → TheOnePercent1%
// The website's background drawings run through it: blueprint grid and
// type construction lines, pen strikes, process geometry, golden spiral,
// ribbon lines and sun arcs. Every frame is a pure function of t.
const NS = 'http://www.w3.org/2000/svg';
const LOOP = 30;
const STILL = 27.0;
const C = {
  ink: '#0b0b0b',
  paper: '#ffffff',
  dot: '#e2e2e2',
  gold: [176, 141, 60],
  goldBright: [212, 176, 98],
  grey: [226, 226, 226],
  hexGold: '#b08d3c',
  hexGoldBright: '#d4b062',
};
const SANS = "'Archivo Variable', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Instrument Serif', 'Times New Roman', serif";

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;
const within = (t, a, b) => t >= a && t < b;
const f = (n) => n.toFixed(1);

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(clamp01(t));
  };
}
const settle = bezier(0.22, 1, 0.36, 1);
const stretch = bezier(0.65, 0, 0.35, 1);
const land = bezier(0.34, 1.56, 0.64, 1);
const slam = bezier(0.2, 1.45, 0.35, 1);
const snap = bezier(0.85, 0, 0.15, 1);
const fall = bezier(0.55, 0, 1, 0.45);
const whipIn = bezier(0.15, 0.85, 0.3, 1);
const whipOut = bezier(0.7, 0, 0.85, 0.3);

// Screen shake: a big jolt on the hit, small kicks as each service lands.
const IMPACTS = [
  { t: 12.44, a: 26, d: 0.55 },
  { t: 13.78, a: 7, d: 0.22 },
  { t: 15.38, a: 7, d: 0.22 },
  { t: 16.98, a: 7, d: 0.22 },
  { t: 18.58, a: 7, d: 0.22 },
];
function shake(t, U) {
  let x = 0, y = 0;
  for (const im of IMPACTS) {
    if (t < im.t || t > im.t + im.d) continue;
    const k = (t - im.t) / im.d;
    const amp = im.a * U * (1 - k) * (1 - k);
    x += amp * Math.sin(2 * Math.PI * 31 * (t - im.t));
    y += amp * Math.cos(2 * Math.PI * 23 * (t - im.t));
  }
  return { x, y };
}

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}
const show = (node, on) => node.setAttribute('display', on ? 'inline' : 'none');
const set = (node, attrs) => {
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
};

// A regular polygon (sides 0 = circle) as a closed path.
function shapePath(c, r, sides, rot = 0) {
  if (!sides) return `M ${f(c.x)} ${f(c.y - r)} A ${f(r)} ${f(r)} 0 0 1 ${f(c.x)} ${f(c.y + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(c.x)} ${f(c.y - r)}`;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (sides === 4 ? Math.PI / 4 : 0) + rot + (i / sides) * Math.PI * 2;
    pts.push(`${f(c.x + Math.cos(a) * r)} ${f(c.y + Math.sin(a) * r)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

let uid = 0;
function build(svg, W, H) {
  const pre = `film${++uid}-`;
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const U = H / 1080;
  const cx = W / 2, cy = H / 2;
  const diag = Math.hypot(W, H);
  const defs = el('defs', {}, svg);
  const bg = el('rect', { width: W, height: H, fill: C.paper }, svg);
  const cam = el('g', {}, svg);

  const measurer = el('g', { opacity: 0 }, svg);
  const measure = (text, style) => {
    const t = el('text', { x: 0, y: 0, 'font-size': 100, style }, measurer);
    t.textContent = text;
    const w = t.getComputedTextLength();
    t.remove();
    return w / 100;
  };
  const ST = {
    word: `font-family:${SANS};font-weight:720;font-variation-settings:'wdth' 78;letter-spacing:-0.05em`,
    mark: `font-family:${SANS};font-weight:720;font-variation-settings:'wdth' 78;letter-spacing:-0.02em`,
    head: `font-family:${SANS};font-weight:760;font-variation-settings:'wdth' 76;letter-spacing:-0.045em`,
    hype: `font-family:${SANS};font-weight:880;font-variation-settings:'wdth' 68;letter-spacing:-0.035em`,
    text: `font-family:${SANS};font-weight:640;font-variation-settings:'wdth' 82;letter-spacing:-0.035em`,
    label: `font-family:${SANS};font-weight:600;letter-spacing:0.16em`,
  };
  const T = (parent, str, style, size, x, y, extra = {}) => {
    const t = el('text', { x, y, 'font-size': size, style, ...extra }, parent);
    t.textContent = str;
    return t;
  };
  const fit = (em, maxW, maxH) => Math.min(maxH, maxW / em);
  const drawK = (node, k) => (node.style.strokeDashoffset = String(1 - clamp01(k)));
  const stroked = (parent, d, color, width, extra = {}) => {
    const p = el('path', { d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, ...extra }, parent);
    p.style.strokeDasharray = '1 1';
    return p;
  };
  const fontMetrics = (fs) => {
    const ctx = document.createElement('canvas').getContext('2d');
    let capH = fs * 0.7, xH = fs * 0.52;
    if (ctx) {
      ctx.font = `720 ${fs}px 'Archivo Variable', Arial, sans-serif`;
      capH = ctx.measureText('H').actualBoundingBoxAscent || capH;
      xH = ctx.measureText('x').actualBoundingBoxAscent || xH;
    }
    return { capH, xH };
  };

  // ---- the website's background drawings, as reusable pieces ----
  const contentW = 0.86 * W, contentX = cx - contentW / 2;
  function blueprint(parent, color, opacity) {
    const g = el('g', { opacity }, parent);
    const cols = W > H ? 12 : 6;
    const lines = Array.from({ length: cols + 1 }, (_, i) => {
      const x = contentX + (contentW / cols) * i;
      return stroked(g, `M ${f(x)} 0 L ${f(x)} ${f(H)}`, color, 1.2 * U);
    });
    return { g, draw: (k) => lines.forEach((l, i) => drawK(l, seg(k, i * 0.03, 0.6 + i * 0.03))) };
  }
  function typeLines(parent, base, fs, color, labels) {
    const { capH, xH } = fontMetrics(fs);
    const g = el('g', {}, parent);
    const ys = [[base - capH, 'CAP HEIGHT'], [base - xH, 'X-HEIGHT'], [base, 'BASELINE']];
    const items = ys.map(([y, label]) => {
      const line = stroked(g, `M 0 ${f(y)} L ${f(W)} ${f(y)}`, color, 1.2 * U, { opacity: 0.28 });
      const tx = labels ? T(g, label, ST.label, 11 * U, W - contentX * 0.5, y - 8 * U, { 'text-anchor': 'end', fill: color, opacity: 0 }) : null;
      return { line, tx };
    });
    return {
      g, capH,
      draw: (k) => items.forEach((it, i) => {
        drawK(it.line, seg(k, i * 0.12, 0.7 + i * 0.12));
        if (it.tx) set(it.tx, { opacity: 0.55 * seg(k, 0.75, 1) });
      }),
    };
  }
  function ribbon(parent, color, opacity) {
    const g = el('g', { opacity }, parent);
    const n = 9;
    const lines = Array.from({ length: n }, (_, i) => {
      const k = i - (n - 1) / 2;
      const d = `M ${f(W + 20)} ${f(H * 0.12 + k * 16 * U)} C ${f(W * (0.62 + k * 0.02))} ${f(-H * 0.05 + k * 58 * U)}, ${f(W * (0.3 - k * 0.02))} ${f(H * 1.08 - k * 46 * U)}, ${f(-20)} ${f(H * 0.9 + k * 12 * U)}`;
      return stroked(g, d, color, 1.4 * U);
    });
    return { g, draw: (k) => lines.forEach((l, i) => drawK(l, seg(k, i * 0.04, 0.6 + i * 0.04))) };
  }
  function sunArcs(parent, x, y, color, count, r0, step, up = true) {
    const g = el('g', {}, parent);
    const arcs = Array.from({ length: count }, (_, i) => {
      const r = r0 + i * step;
      return stroked(g, `M ${f(x - r)} ${f(y)} A ${f(r)} ${f(r)} 0 0 ${up ? 1 : 0} ${f(x + r)} ${f(y)}`, color, 1.6 * U, { opacity: 0.75 - i * 0.1 });
    });
    return { g, draw: (k) => arcs.forEach((a, i) => drawK(a, seg(k, i * 0.08, 0.5 + i * 0.08))) };
  }
  function goldenSpiral(parent, x, y, h, lineColor, spiralColor) {
    const g = el('g', {}, parent);
    const phi = (1 + Math.sqrt(5)) / 2;
    let box = { x, y, w: h * phi, h };
    const parts = [stroked(g, `M ${f(x)} ${f(y)} H ${f(x + box.w)} V ${f(y + h)} H ${f(x)} Z`, lineColor, 1.2 * U, { opacity: 0.5 })];
    parts.push(stroked(g, shapePath({ x: x + h / 2, y: y + h / 2 }, h / 2, 0), lineColor, 1.2 * U, { opacity: 0.3 }));
    let spiral = `M ${f(box.x)} ${f(box.y + box.h)}`;
    for (let i = 0; i < 8; i++) {
      const dir = i % 4;
      let cut;
      if (dir === 0) { const q = box.h; cut = `M ${f(box.x + q)} ${f(box.y)} V ${f(box.y + box.h)}`; spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x + q)} ${f(box.y)}`; box = { x: box.x + q, y: box.y, w: box.w - q, h: box.h }; }
      else if (dir === 1) { const q = box.w; cut = `M ${f(box.x)} ${f(box.y + q)} H ${f(box.x + box.w)}`; spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x + q)} ${f(box.y + q)}`; box = { x: box.x, y: box.y + q, w: box.w, h: box.h - q }; }
      else if (dir === 2) { const q = box.h; cut = `M ${f(box.x + box.w - q)} ${f(box.y)} V ${f(box.y + box.h)}`; spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x + box.w - q)} ${f(box.y + q)}`; box = { x: box.x, y: box.y, w: box.w - q, h: box.h }; }
      else { const q = box.w; cut = `M ${f(box.x)} ${f(box.y + box.h - q)} H ${f(box.x + box.w)}`; spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x)} ${f(box.y + box.h - q)}`; box = { x: box.x, y: box.y, w: box.w, h: box.h - q }; }
      parts.push(stroked(g, cut, lineColor, 1.2 * U, { opacity: 0.5 }));
    }
    const sp = stroked(g, spiral, spiralColor, 2.4 * U);
    return { g, draw: (k) => { parts.forEach((p, i) => drawK(p, seg(k, i * 0.04, 0.35 + i * 0.04))); drawK(sp, seg(k, 0.45, 1)); } };
  }

  // ================= ACT I: what the 99% fail to do =================
  const bp1 = blueprint(cam, C.ink, 0.08);
  const G = Math.min(0.42 * H, 0.8 * W);
  const s = G / 10;
  const r = s * 0.3;
  const gx0 = cx - G / 2, gy0 = cy - G / 2;
  const gDots = el('g', {}, cam);
  const dots = Array.from({ length: 100 }, (_, i) => {
    const x = gx0 + s * ((i % 10) + 0.5);
    const y = gy0 + s * (Math.floor(i / 10) + 0.5);
    return { x, y, row: Math.floor(i / 10), col: i % 10, node: el('circle', { cx: x, cy: y, r, fill: C.dot }, gDots) };
  });
  const g99 = dots[99];

  // "99% of websites / blend in." slams in word by word, then blends in.
  const gA = el('g', {}, cam);
  const lines = [['99%', 'of', 'websites'], ['blend', 'in.']];
  const spaceH = measure('a b', ST.head) - measure('ab', ST.head);
  const lineEm = lines.map((ws) => ws.reduce((a, w) => a + measure(w, ST.head), 0) + spaceH * (ws.length - 1));
  const fsA = fit(Math.max(...lineEm), 0.86 * W, 0.15 * H);
  const baseA = [cy - 0.14 * fsA, cy + 0.86 * fsA];
  const tlA = baseA.map((b) => typeLines(gA, b, fsA, C.ink, false));
  const aTimes = [1.5, 1.7, 1.9, 2.35, 2.55];
  const aWords = [];
  lines.forEach((ws, li) => {
    let x = cx - (lineEm[li] * fsA) / 2;
    ws.forEach((w) => {
      const node = T(gA, w, ST.head, fsA, x, baseA[li]);
      const wW = measure(w, ST.head) * fsA;
      aWords.push({ node, cx: x + wW / 2, cy: baseA[li] - 0.35 * fsA, at: aTimes[aWords.length] });
      x += wW + spaceH * fsA;
    });
  });

  // The failures, each struck through by the pen in gold, getting faster.
  const gF = el('g', {}, cam);
  const failures = ['They all look the same.', 'They load slowly.', 'They break on phones.', 'They sound like everyone else.', 'They look old in a year.', 'They get scrolled past.'];
  const durs = [0.9, 0.8, 0.7, 0.6, 0.55, 0.45];
  let fa = 4.0;
  const fCards = failures.map((txt, i) => {
    const em = measure(txt, ST.head);
    const fs = fit(em, 0.82 * W, 0.11 * H);
    const x0 = cx - (em * fs) / 2, x1 = cx + (em * fs) / 2;
    const base = cy + 0.34 * fs;
    const g = el('g', {}, gF);
    const node = T(g, txt, ST.head, fs, x0, base);
    const sy = base - 0.3 * fs;
    const strike = stroked(g, `M ${f(x0 - 0.03 * (x1 - x0))} ${f(sy + 0.05 * fs)} C ${f(lerp(x0, x1, 0.3))} ${f(sy - 0.06 * fs)}, ${f(lerp(x0, x1, 0.65))} ${f(sy + 0.08 * fs)}, ${f(x1 + 0.03 * (x1 - x0))} ${f(sy - 0.04 * fs)}`, C.hexGold, Math.max(4 * U, 0.07 * fs));
    const card = { g, node, strike, a: fa, b: fa + durs[i], fs, ccx: cx, ccy: base - 0.35 * fs };
    fa += durs[i];
    return card;
  });

  // Then the blur of FORGETTABLE / SKIPPED / SAME, and the grid of SAME.
  const gB = el('g', {}, cam);
  const flash = T(gB, '', ST.hype, 100, cx, cy, { 'text-anchor': 'middle' });
  const jit = [[0, 0], [-0.17, -0.12], [0.19, 0.1], [-0.08, 0.16], [0.14, -0.15], [-0.21, 0.04], [0.06, -0.18], [0.22, 0.14], [-0.13, -0.05], [0.02, 0.19], [0.17, -0.02], [-0.19, -0.17]];
  const opening = ['FORGETTABLE.', 'SKIPPED.', 'IGNORED.'];
  const sched = [];
  for (let tt = 8.0, k = 0; tt < 9.2 - 0.02; k++) {
    const d = Math.max(0.085, 0.32 * Math.pow(0.8, k));
    const w = k < opening.length ? opening[k] : 'SAME.';
    const em = measure(w, ST.hype);
    const size = fit(em, 0.62 * W, [0.18, 0.12, 0.15, 0.1][k % 4] * H);
    const j = jit[k % jit.length];
    sched.push({ w, a: tt, b: Math.min(9.2, tt + d), size, x: cx + j[0] * W, y: cy + 0.35 * size + j[1] * H, color: k < opening.length ? C.ink : k % 2 ? '#7d7d7d' : '#a3a3a3' });
    tt += d;
  }
  const gTiles = el('g', {}, cam);
  dots.forEach((d) => T(gTiles, 'SAME', ST.hype, s * 0.36, d.x, d.y + s * 0.13, { 'text-anchor': 'middle', fill: '#b4b4b4' }));

  // ================= ACT II: the one =================
  const iris = el('circle', { cx, cy, r: diag, fill: 'none', stroke: C.ink, 'stroke-width': 2 * diag }, cam);
  const core = el('circle', { cx: g99.x, cy: g99.y, r, fill: C.hexGold }, cam);
  // Process geometry collapses into the core as it charges.
  const PULSES = [11.05, 11.3, 11.5, 11.65, 11.76, 11.84];
  const charge = PULSES.map((p, i) => ({ p, sides: [0, 3, 4, 6, 0, 3][i], node: el('path', { fill: 'none', stroke: C.hexGoldBright, 'stroke-width': 2.5 * U, 'stroke-linejoin': 'round' }, cam) }));

  // ================= ACT III: the services =================
  const gHit = el('g', {}, cam);
  const arcsHit = sunArcs(gHit, cx, H + 4, C.hexGoldBright, 6, 0.18 * H, 0.1 * H);
  const speed = Array.from({ length: 32 }, (_, i) => ({ a: (i / 32) * Math.PI * 2 + (i % 2 ? 0.05 : -0.04), node: el('path', { stroke: C.paper, 'stroke-width': (i % 3 ? 2 : 3.5) * U, 'stroke-linecap': 'round' }, gHit) }));
  const hitEm = Math.max(measure('WE DO THE', ST.hype), measure('OPPOSITE.', ST.hype));
  const fsHit = fit(hitEm, 0.82 * W, 0.24 * H);
  const hitG = el('g', {}, gHit);
  T(hitG, 'WE DO THE', ST.hype, fsHit, cx, cy - 0.06 * fsHit, { 'text-anchor': 'middle', fill: C.paper });
  T(hitG, 'OPPOSITE.', ST.hype, fsHit, cx, cy + 0.86 * fsHit, { 'text-anchor': 'middle', fill: C.hexGoldBright });

  const SERVICES = [
    { w: 'BRAND IDENTITY.', sub: 'Logos · colour · type · brand guidelines', bg: C.paper, fg: C.ink },
    { w: 'WEBSITES.', sub: 'Designed from scratch · hand-built · every screen', bg: C.ink, fg: C.paper },
    { w: 'MOTION GRAPHICS.', sub: 'Animated logos · reels · website motion', bg: C.hexGoldBright, fg: C.ink },
    { w: 'CARE & UPDATES.', sub: 'Updates · new pages · hosting · fixes', bg: C.ink, fg: C.paper },
  ];
  const panels = SERVICES.map((p, idx) => {
    const a = 13.6 + idx * 1.6, b = a + 1.6;
    const g = el('g', {}, cam);
    el('rect', { x: -W * 0.1, y: -H * 0.1, width: W * 1.2, height: H * 1.2, fill: p.bg }, g);
    const back = el('g', {}, g);
    const em = measure(p.w, ST.hype);
    const size = fit(em, 0.86 * W, 0.22 * H);
    const x0 = cx - (em * size) / 2;
    const base = cy + 0.3 * size - 0.03 * H;
    const subEm = measure(p.sub, ST.text);
    const fsSub = fit(subEm, 0.8 * W, 0.042 * H);
    const echoes = idx === 2 ? [0.1, 0.18, 0.3].map((o) => T(g, p.w, ST.hype, size, x0, base, { fill: C.ink, opacity: o })) : [];
    T(g, p.w, ST.hype, size, x0, base, { fill: p.fg });
    const sub = T(g, p.sub, ST.text, fsSub, cx, base + 0.32 * size + fsSub * 1.3, { 'text-anchor': 'middle', fill: p.fg, opacity: 0 });
    T(g, `0${idx + 1} / 04`, ST.label, 13 * U, contentX, 0.1 * H, { fill: p.fg, opacity: 0.6 });
    const draws = [];
    if (idx === 0) {
      const tl = typeLines(back, base, size, C.ink, true);
      draws.push((k) => tl.draw(k));
      const hS = 0.26 * H;
      const gs = goldenSpiral(back, W - contentX - hS * 1.618, H - hS - 0.07 * H, hS, C.ink, C.hexGold);
      draws.push((k) => gs.draw(seg(k, 0.1, 1)));
      const ox = x0 + measure('BRAND IDENTITY', ST.hype) * size + measure('.', ST.hype) * size * 0.45;
      const ring = stroked(g, shapePath({ x: ox, y: base - 0.08 * size }, 0.2 * size, 0), C.hexGold, 5 * U);
      draws.push((k) => drawK(ring, seg(k, 0.3, 0.8)));
    }
    if (idx === 1) {
      const bp = blueprint(back, C.paper, 0.1);
      draws.push((k) => bp.draw(k));
      const pad = 0.22 * size;
      const fx = x0 - pad, fy = base - 0.72 * size - pad * 1.9, fw = em * size + 2 * pad, fh = 0.72 * size + pad * 2.9, rr = 0.06 * size;
      const frame = [
        stroked(g, `M ${fx + rr} ${fy} H ${fx + fw - rr} Q ${fx + fw} ${fy} ${fx + fw} ${fy + rr} V ${fy + fh - rr} Q ${fx + fw} ${fy + fh} ${fx + fw - rr} ${fy + fh} H ${fx + rr} Q ${fx} ${fy + fh} ${fx} ${fy + fh - rr} V ${fy + rr} Q ${fx} ${fy} ${fx + rr} ${fy}`, C.paper, 3 * U),
        stroked(g, `M ${fx} ${fy + pad * 0.8} H ${fx + fw}`, C.paper, 3 * U),
        ...[0, 1, 2].map((k) => stroked(g, shapePath({ x: fx + pad * (0.45 + k * 0.38), y: fy + pad * 0.4 }, pad * 0.11, 0), k === 0 ? C.hexGoldBright : C.paper, 3 * U)),
      ];
      draws.push((k) => frame.forEach((fr, i) => drawK(fr, seg(k, 0.05 + i * 0.05, 0.55 + i * 0.05))));
    }
    if (idx === 2) {
      const rb = ribbon(back, C.ink, 0.3);
      draws.push((k) => rb.draw(k));
    }
    if (idx === 3) {
      const ty = H - 0.16 * H;
      const xs = [0.2, 0.4, 0.6, 0.8].map((q) => contentX + contentW * q);
      const line = stroked(back, `M ${f(contentX)} ${f(ty)} L ${f(contentX + contentW)} ${f(ty)}`, C.paper, 1.4 * U, { opacity: 0.4 });
      const shapes = xs.map((x, i) => stroked(back, shapePath({ x, y: ty }, 0.035 * H, [0, 3, 4, 6][i]), C.hexGoldBright, 2.4 * U));
      draws.push((k) => { drawK(line, seg(k, 0, 0.6)); shapes.forEach((sh, i) => drawK(sh, seg(k, 0.15 + i * 0.12, 0.45 + i * 0.12))); });
    }
    return { ...p, a, b, g, sub, echoes, draws };
  });

  // The full set, listed.
  const gList = el('g', {}, cam);
  const listNames = ['Brand identity', 'Websites', 'Motion graphics', 'Care & updates'];
  const listEm = Math.max(...listNames.map((n) => measure(n, ST.head)));
  const fsList = fit(listEm, 0.6 * W, 0.075 * H);
  const listX = cx - (listEm * fsList) / 2;
  const listTop = cy - 1.6 * fsList;
  const listItems = listNames.map((n, i) => T(gList, n, ST.head, fsList, listX, listTop + i * 1.1 * fsList + 0.75 * fsList, { fill: C.paper, opacity: 0 }));
  const listRule = stroked(gList, `M ${f(listX - 0.5 * fsList)} ${f(listTop)} L ${f(listX - 0.5 * fsList)} ${f(listTop + 4.4 * fsList)}`, C.hexGoldBright, 3 * U);

  // ================= ACT IV: the announcement =================
  const gEnd = el('g', {}, cam);
  const bp4 = blueprint(gEnd, C.paper, 0.09);
  const parts = [['T', 'he'], ['O', 'ne'], ['P', 'ercent']];
  const capEm = parts.map(([c]) => measure(c, ST.word));
  const restEm = parts.map(([, rest]) => measure(rest, ST.word));
  const gapEm = 0.12;
  const blockEm = measure('1%', ST.mark) + 0.28;
  const wordEm = capEm.reduce((a, b) => a + b, 0) + restEm.reduce((a, b) => a + b, 0);
  const fsL = Math.min(0.2 * H, (0.86 * W) / (wordEm + gapEm + blockEm));
  const fsBe = fit(measure('Be a part of the', ST.text), 0.7 * W, 0.065 * H);
  const stackH = 0.72 * fsBe + 0.55 * fsL + 0.7 * fsL;
  const baseBe = cy - stackH / 2 + 0.72 * fsBe;
  const baseL = baseBe + 0.55 * fsL + 0.7 * fsL;
  const tl4 = typeLines(gEnd, baseL, fsL, C.paper, true);
  const beA = T(gEnd, 'Be a part of', ST.text, fsBe, 0, baseBe, { fill: C.paper });
  const beB = T(gEnd, 'the', ST.text, fsBe, 0, baseBe, { fill: C.paper });
  const wA = measure('Be a part of', ST.text) * fsBe, wB = measure('the', ST.text) * fsBe;
  const spT = (measure('a b', ST.text) - measure('ab', ST.text)) * fsBe;

  const word = el('g', {}, gEnd);
  const pieces = parts.map(([cap, rest], i) => {
    const capN = T(word, cap, ST.word, fsL, 0, baseL, { fill: C.paper });
    const clip = el('clipPath', { id: `${pre}rest${i}` }, defs);
    const clipR = el('rect', { y: baseL - fsL * 1.1, height: fsL * 1.4, width: 0 }, clip);
    const restN = T(word, rest, ST.word, fsL, 0, baseL, { fill: C.paper, 'clip-path': `url(#${pre}rest${i})` });
    return { capN, restN, clipR, capW: capEm[i] * fsL, restW: restEm[i] * fsL };
  });
  const oCons = stroked(gEnd, '', C.hexGoldBright, 1.8 * U);
  const oSquare = stroked(gEnd, '', C.hexGoldBright, 1.2 * U, { opacity: 0.6 });
  const swoosh = stroked(gEnd, '', C.hexGoldBright, 5 * U);
  const white = el('circle', { cx: g99.x, cy: g99.y, r: 0, fill: C.paper }, cam);
  const block = el('g', {}, cam);
  const blockR = el('rect', {}, block);
  const blockT = T(block, '1%', ST.mark, fsL, 0, baseL, { fill: C.ink });
  const bW = blockEm * fsL, bH = 1.14 * fsL;
  const { capH: capL } = fontMetrics(fsL);

  measurer.remove();

  return (t) => {
    // ---------- background + camera ----------
    let bgc = t >= 11.7 ? C.ink : C.paper;
    if (within(t, 12.4, 12.48)) bgc = C.hexGoldBright;
    set(bg, { fill: bgc });
    const sh = shake(t, U);
    let zoom = 1;
    if (t < 4.0) zoom = lerp(1, 1.035, seg(t, 0, 4.0));
    else if (within(t, 12.64, 13.6)) zoom = lerp(1, 1.03, seg(t, 12.64, 13.6));
    else if (within(t, 23.6, 28.7)) zoom = lerp(1, 1.03, seg(t, 23.6, 28.6));
    set(cam, { transform: `translate(${cx + sh.x} ${cy + sh.y}) scale(${zoom}) translate(${-cx} ${-cy})` });

    // ---------- Act I ----------
    show(bp1.g, t < 11.0);
    bp1.draw(seg(t, 0, 1.0));
    set(bp1.g, { opacity: 0.08 * (1 - seg(t, 10.2, 10.9)) });
    const dotsOn = t < 11.2 && !within(t, 9.2, 9.8);
    show(gDots, dotsOn);
    if (dotsOn) {
      const busy = within(t, 4.0, 9.2);
      dots.forEach((d, i) => {
        const delay = (d.row + d.col) * 0.04;
        const pop = settle(seg(t, delay, delay + 0.3));
        if (t < 9.8) {
          set(d.node, { r: r * pop, cy: d.y, opacity: busy ? 0.25 : 1 });
        } else {
          const dl = ((i * 37) % 11) * 0.03;
          const k = fall(seg(t, 10.2 + dl, 10.8 + dl));
          set(d.node, { r, cy: d.y + k * H, opacity: i === 99 ? 0 : 1 - seg(t, 10.55 + dl, 10.85 + dl) });
        }
      });
    }
    show(gA, t < 4.0);
    if (t < 4.0) {
      const blend = settle(seg(t, 3.15, 3.75));
      tlA.forEach((tl) => { tl.draw(seg(t, 1.35, 2.1)); set(tl.g, { opacity: 1 - blend }); });
      aWords.forEach((w) => {
        const k = seg(t, w.at, w.at + 0.16);
        const sc = lerp(1.35, 1, slam(k));
        set(w.node, { opacity: k > 0 ? 1 : 0, fill: mix([11, 11, 11], C.grey, blend), transform: `translate(${w.cx} ${w.cy}) scale(${sc}) translate(${-w.cx} ${-w.cy})` });
      });
    }
    show(gF, within(t, 4.0, 8.0));
    fCards.forEach((c) => {
      const on = within(t, c.a, c.b);
      show(c.g, on);
      if (!on) return;
      const d = c.b - c.a;
      const k = seg(t, c.a, c.a + 0.12);
      const struck = seg(t, c.a + 0.5 * d, c.a + 0.82 * d);
      set(c.node, { fill: mix([11, 11, 11], [150, 150, 150], struck) });
      set(c.g, { transform: `translate(${c.ccx} ${c.ccy}) scale(${lerp(1.18, 1, slam(k))}) translate(${-c.ccx} ${-c.ccy})` });
      drawK(c.strike, settle(struck));
    });
    show(gB, within(t, 8.0, 9.2));
    if (within(t, 8.0, 9.2)) {
      const c = sched.find((q) => t >= q.a && t < q.b) ?? sched[sched.length - 1];
      const pop = lerp(1.1, 1, settle(seg(t, c.a, c.a + 0.06)));
      flash.textContent = c.w;
      set(flash, { x: c.x, y: c.y, 'font-size': c.size, fill: c.color, transform: `translate(${c.x} ${c.y - 0.35 * c.size}) scale(${pop}) translate(${-c.x} ${-(c.y - 0.35 * c.size)})` });
    }
    show(gTiles, within(t, 9.2, 9.8));

    // ---------- Act II ----------
    const coreOn = within(t, 9.8, 12.4);
    show(core, coreOn);
    if (coreOn) {
      const pop = 1 + 0.6 * land(seg(t, 9.8, 10.1));
      const move = stretch(seg(t, 10.45, 11.0));
      let pulse = 0;
      for (const p of PULSES) {
        const x = t - p;
        if (x >= 0 && x < 0.12) pulse += 0.45 * Math.sin((Math.PI * x) / 0.12);
      }
      const calm = t >= 11.9 ? 0.85 : 1;
      set(core, { cx: lerp(g99.x, cx, move), cy: lerp(g99.y, cy, move), r: r * pop * (1 + pulse) * calm, fill: mix(C.gold, C.goldBright, seg(t, 11.0, 11.7)) });
    }
    charge.forEach((c, i) => {
      const k = seg(t, c.p - 0.3, c.p);
      const on = k > 0 && k < 1;
      show(c.node, on);
      if (on) set(c.node, { d: shapePath({ x: cx, y: cy }, lerp(0.42 * H, r * 1.8, stretch(k)), c.sides, (1 - k) * (i % 2 ? 0.6 : -0.6)), opacity: 0.3 + 0.7 * k });
    });
    const irisOn = within(t, 11.0, 11.75);
    show(iris, irisOn);
    if (irisOn) set(iris, { r: lerp(diag, r * 3, stretch(seg(t, 11.0, 11.7))) + diag });

    // ---------- Act III ----------
    show(gHit, within(t, 12.4, 13.8));
    if (within(t, 12.4, 13.8)) {
      const k = settle(seg(t, 12.42, 12.95));
      const len = 0.32 * diag * (1 - seg(t, 12.65, 13.0));
      speed.forEach((sp) => {
        const r1 = lerp(0.04 * H, 0.75 * diag, k), r2 = r1 + len;
        set(sp.node, { d: `M ${f(cx + Math.cos(sp.a) * r1)} ${f(cy + Math.sin(sp.a) * r1)} L ${f(cx + Math.cos(sp.a) * r2)} ${f(cy + Math.sin(sp.a) * r2)}`, opacity: 1 - seg(t, 12.75, 13.02) });
      });
      arcsHit.draw(seg(t, 12.6, 13.3));
      const hk = slam(seg(t, 12.44, 12.64));
      set(hitG, { opacity: seg(t, 12.4, 12.45), transform: `translate(${cx} ${cy}) scale(${lerp(2.4, 1, hk)}) translate(${-cx} ${-cy})` });
    }
    panels.forEach((p) => {
      const on = within(t, p.a, p.b + 0.18);
      show(p.g, on);
      if (!on) return;
      let dx = 0, vel = 0;
      if (t < p.a + 0.18) { const k = seg(t, p.a, p.a + 0.18); dx = W * (1 - whipIn(k)); vel = 1 - k; }
      else if (t > p.b) { const k = seg(t, p.b, p.b + 0.18); dx = -W * whipOut(k); vel = k; }
      set(p.g, { transform: `translate(${dx} 0) skewX(${-14 * vel})` });
      const k = seg(t, p.a + 0.12, p.a + 1.2);
      p.draws.forEach((d) => d(k));
      set(p.sub, { opacity: settle(seg(t, p.a + 0.35, p.a + 0.6)) * 0.8 });
      p.echoes.forEach((e, i) => {
        const ek = settle(seg(t, p.a + 0.1, p.a + 0.75));
        set(e, { transform: `translate(${-(3 - i) * 0.07 * W * (1 - ek)} 0)`, opacity: [0.12, 0.22, 0.35][i] * (1 - ek * 0.7) });
      });
    });
    show(gList, within(t, 20.0, 21.15));
    if (within(t, 20.0, 21.15)) {
      const out = 1 - settle(seg(t, 20.85, 21.1));
      listItems.forEach((it, i) => {
        const k = settle(seg(t, 20.12 + i * 0.08, 20.4 + i * 0.08));
        set(it, { opacity: k * out, transform: `translate(${(1 - k) * 0.04 * W} 0)` });
      });
      drawK(listRule, settle(seg(t, 20.1, 20.5)));
      set(listRule, { opacity: out });
    }

    // ---------- Act IV ----------
    const endOn = t >= 21.0;
    show(gEnd, endOn);
    show(block, t >= 24.9);
    show(white, t >= 29.0);
    if (!endOn) return;
    const fade = 1 - settle(seg(t, 28.6, 28.9));
    bp4.draw(seg(t, 21.0, 21.9));
    set(bp4.g, { opacity: 0.09 * fade });
    const beIn = settle(seg(t, 21.25, 21.65));
    const theOut = settle(seg(t, 23.6, 24.1));
    const lineW = wA + (spT + wB) * (1 - theOut);
    const lx = cx - lineW / 2;
    set(beA, { x: lx, opacity: beIn * fade, transform: `translate(0 ${(1 - beIn) * fsBe * 0.5})` });
    set(beB, { x: lx + wA + spT, opacity: beIn * (1 - theOut) * fade, transform: `translate(0 ${(1 - beIn) * fsBe * 0.5})` });

    const appear = settle(seg(t, 21.85, 22.4));
    const prog = parts.map((_, i) => stretch(seg(t, 23.8 + i * 0.15, 24.9 + i * 0.15)));
    const slot = stretch(seg(t, 24.7, 25.3));
    const wordW = pieces.reduce((sum, pc, i) => sum + pc.capW + pc.restW * prog[i], 0);
    let x = cx - (wordW + slot * (gapEm * fsL + bW)) / 2;
    const left = x;
    const capX = [];
    pieces.forEach((pc, i) => {
      capX.push(x);
      set(pc.capN, { x });
      x += pc.capW;
      set(pc.restN, { x, opacity: prog[i] });
      set(pc.clipR, { x, width: pc.restW * prog[i] + 1 });
      x += pc.restW * prog[i];
    });
    const ws = lerp(1.05, 1, appear);
    set(word, { opacity: appear * fade, transform: `translate(${cx} ${baseL - 0.35 * fsL}) scale(${ws}) translate(${-cx} ${-(baseL - 0.35 * fsL)})` });
    tl4.draw(seg(t, 22.3, 23.1));
    set(tl4.g, { opacity: fade });

    // Construction circle + square on the "O", like the website's hero.
    const ocx = capX[1] + pieces[1].capW / 2, ocy = baseL - capL / 2, orr = capL * 0.56;
    set(oCons, { d: shapePath({ x: ocx, y: ocy }, orr, 0), opacity: fade });
    set(oSquare, { d: `M ${f(ocx - orr)} ${f(ocy - orr)} H ${f(ocx + orr)} V ${f(ocy + orr)} H ${f(ocx - orr)} Z`, opacity: 0.6 * fade });
    drawK(oCons, settle(seg(t, 25.4, 26.1)));
    drawK(oSquare, settle(seg(t, 25.6, 26.3)));

    // The 1% settles in softly, then becomes the dot again at the end.
    const bx = x + gapEm * fsL, by = baseL - 0.914 * fsL;
    const settleK = settle(seg(t, 25.0, 25.7));
    const m = stretch(seg(t, 28.7, 29.25));
    const tr = r * 1.25;
    set(blockR, {
      x: lerp(bx, g99.x - tr, m), y: lerp(by, g99.y - tr, m),
      width: lerp(bW, 2 * tr, m), height: lerp(bH, 2 * tr, m),
      rx: lerp(0.12 * fsL, tr, m), fill: mix(C.goldBright, C.gold, m),
    });
    set(blockT, { x: bx + 0.14 * fsL, opacity: 1 - seg(m, 0, 0.3) });
    const bcx = bx + bW / 2, bcy = by + bH / 2, bs = lerp(0.92, 1, settleK);
    set(block, {
      opacity: settleK * (1 - seg(t, 29.55, 29.95)),
      transform: m > 0 ? '' : `translate(${bcx} ${bcy}) scale(${bs}) translate(${-bcx} ${-bcy})`,
    });

    const y = baseL + 0.36 * fsL, R = bx + bW;
    set(swoosh, { d: `M ${f(left)} ${f(y + 8 * U)} C ${f(lerp(left, R, 0.3))} ${f(y - 6 * U)}, ${f(lerp(left, R, 0.7))} ${f(y - 10 * U)}, ${f(R)} ${f(y + 2 * U)}`, opacity: fade });
    drawK(swoosh, settle(seg(t, 25.9, 26.6)));

    if (t >= 29.0) set(white, { r: (diag + 10) * stretch(seg(t, 29.0, 29.5)) });
  };
}

export function initFilms() {
  for (const fig of document.querySelectorAll('[data-film]')) {
    const stage = fig.querySelector('[data-film-stage]');
    const svg = fig.querySelector('[data-film-svg]');
    const toggle = fig.querySelector('[data-film-toggle]');
    const bar = fig.querySelector('[data-film-progress]');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let render = null;
    let size = '';
    let t = reduce ? STILL : 0;
    let playing = !reduce;
    let inView = false;
    let last = 0;
    let raf = 0;

    const draw = () => {
      if (render) render(t);
      bar.style.transform = `scaleX(${t / LOOP})`;
    };
    const setUp = (force) => {
      const tall = stage.clientHeight > stage.clientWidth;
      const next = tall ? 'tall' : 'wide';
      if (!force && next === size) return;
      size = next;
      render = tall ? build(svg, 1080, 1350) : build(svg, 1920, 1080);
      draw();
    };
    const frame = (now) => {
      t = (t + Math.min(0.1, (now - last) / 1000)) % LOOP;
      last = now;
      draw();
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (playing && inView) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const setPlaying = (on) => {
      playing = on;
      fig.classList.toggle('is-paused', !on);
      toggle.setAttribute('aria-label', on ? 'Pause animation' : 'Play animation');
      run();
    };
    toggle.addEventListener('click', () => setPlaying(!playing));
    setPlaying(playing);

    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        run();
      },
      { threshold: 0.35 },
    ).observe(stage);
    new ResizeObserver(() => setUp(false)).observe(stage);
    setUp(true);
    // Rebuild once the fonts are in, so text is measured with the real faces.
    document.fonts.ready.then(() => setUp(true));
  }
}
