// The background ink layer.
//
// 1. The pen line: one continuous hand-drawn line down the whole page. It
//    follows the page's own structure (traces the hero hairline, circles the
//    one black dot, splits the 99%/1% comparison, runs down the logo panels,
//    traces the services and details dividers, becomes the process timeline,
//    loops the footer "1%") and turns into the bold mark on each heading's
//    accent word ([data-mark], InkWord.astro). Scrolling moves the pen.
// 2. Section drawings: a blueprint grid with type construction lines in the
//    hero, sun arcs in the work section, and in the
//    process section a shape on each timeline step (circle, triangle, square,
//    hexagon) plus a golden-ratio construction in the empty corner.
// 3. White space: compass and ruler constructions (circles, squares,
//    triangles, rings, hexagrams, each with a guide line) placed in the
//    empty margins and gaps of the white sections, outside the content
//    column, found from the live layout.
//
// The neutral layer is drawn white with mix-blend-mode: difference, so it
// reads black over white sections and white over black ones. Gold can't go
// through that blend (gold over white would invert to blue), so the gold
// accents (process geometry, sun arcs, the "O" construction circle) live on
// a second, unblended layer. Both sit at z 0, under all content (.wrap, z 1).

const NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Anchor = { paths: SVGPathElement[]; i0: number; i1: number; l0: number; l1: number };
/** A drawing that animates in over [a, b] of its group's 0–1 progress. */
type Item = { el: SVGElement; a: number; b: number };
/** A drawing that animates in as the pen (72% down the screen) passes y0 → y1. */
type SpaceItem = { el: SVGElement; y0: number; y1: number };
/** A drawing that animates in as the pen passes length `at`. */
type StepNode = { paths: SVGElement[]; at: number };

function make<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent.append(el);
  return el;
}

const svg = document.createElementNS(NS, 'svg');
svg.classList.add('ink-thread');
svg.setAttribute('aria-hidden', 'true');
const gGrid = make('g', { class: 'ink-grid' }, svg);
const gArt = make('g', { class: 'ink-art' }, svg);
const gSpace = make('g', { class: 'ink-space' }, svg);
const gold = document.createElementNS(NS, 'svg');
gold.classList.add('ink-gold');
gold.setAttribute('aria-hidden', 'true');
const gGeo = make('g', { class: 'ink-geo' }, gold);
const gGoldArt = make('g', { class: 'ink-gold__art' }, gold);
const thread = make('path', { class: 'ink-thread__line' }, svg);
const tip = make('circle', { class: 'ink-thread__tip', r: 3 }, svg);
document.body.prepend(svg, gold);

// Layout position, ignoring transforms (the scroll reveals shift elements).
function pagePos(el: HTMLElement): Pt {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

function rect(el: HTMLElement): Rect {
  const p = pagePos(el);
  return { x: p.x, y: p.y, w: el.offsetWidth, h: el.offsetHeight };
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const f = (n: number) => n.toFixed(1);

// Smooth curve through every point (Catmull-Rom as cubic Béziers).
function segment(p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
  const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
  const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
  return `C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(p2.x)} ${f(p2.y)}`;
}

/** A path drawn with pathLength=1 so its progress is a plain 0–1 dash. */
function stroke(d: string, parent: Element, cls?: string) {
  const p = make('path', { d, pathLength: 1 }, parent);
  if (cls) p.setAttribute('class', cls);
  return p;
}

function setProgress(el: SVGElement, t: number) {
  if (el instanceof SVGTextElement) el.style.opacity = String(t);
  else el.style.strokeDashoffset = String(1 - t);
}

// A regular polygon (or circle, sides = 0) centred on c, as a closed path.
function shape(c: Pt, r: number, sides: number) {
  // Two half arcs: a single full-circle arc collapses to nothing once rounded.
  if (!sides) return `M ${f(c.x)} ${f(c.y - r)} A ${f(r)} ${f(r)} 0 0 1 ${f(c.x)} ${f(c.y + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(c.x)} ${f(c.y - r)}`;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    // Squares sit upright; everything else points up.
    const a = -Math.PI / 2 + (sides === 4 ? Math.PI / 4 : 0) + (i / sides) * Math.PI * 2;
    pts.push(`${f(c.x + Math.cos(a) * r)} ${f(c.y + Math.sin(a) * r)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

const loadedAt = performance.now();
let kwDoneAt = 0;

let total = 0;
let keys: { y: number; len: number }[] = [];
let anchors: Anchor[] = [];
let gridItems: Item[] = [];
let oItems: Item[] = [];
let artItems: Item[] = [];
let art = { top: 0, span: 1 };
let geoItems: Item[] = [];
let geo = { top: 0, span: 1 };
let nodes: StepNode[] = [];
let spaceItems: SpaceItem[] = [];
let introTarget = 0;
let intro = reduce ? Infinity : 0;

function build() {
  const W = document.documentElement.clientWidth;
  // Measure the page without these layers: they're sized to the page, so if
  // they counted they'd hold it at its old height whenever the content gets
  // shorter (fonts or images finishing loading), leaving white under the footer.
  for (const layer of [svg, gold]) layer.setAttribute('height', '0');
  const H = document.documentElement.scrollHeight;
  const narrow = W < 700;
  for (const layer of [svg, gold]) {
    layer.setAttribute('width', String(W));
    layer.setAttribute('height', String(H));
    layer.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }
  gGrid.replaceChildren();
  gArt.replaceChildren();
  gSpace.replaceChildren();
  gGeo.replaceChildren();
  gGoldArt.replaceChildren();
  gridItems = [];
  oItems = [];
  artItems = [];
  geoItems = [];
  nodes = [];
  spaceItems = [];
  // Areas other drawings already use, kept clear of white-space drawings.
  const reserved: Rect[] = [];

  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push({ x, y });
  const last = () => pts[pts.length - 1];
  const found: Omit<Anchor, 'l0' | 'l1'>[] = [];
  // The process timeline: where it starts, and which way it runs.
  let timeline: { i: number; x: number; y: number; across: boolean } | null = null;

  // A deliberate S-curve from the last point to Q, bowing towards sideFrac
  // of the page width. No randomness: the same page always draws the same.
  const travel = (Q: Pt, sideFrac: number) => {
    const S = last();
    const dy = Q.y - S.y;
    if (dy < 160) return;
    // On phones there's no spare width: run straight down the nearest edge
    // and only cross over in the gap just above where it's heading.
    if (narrow) {
      const edge = S.x > W / 2 ? W - 7 : 7;
      P(edge, S.y + Math.min(60, dy * 0.2));
      P(edge, Q.y - Math.min(70, dy * 0.25));
      return;
    }
    const sideX = W * sideFrac;
    for (const t of [0.34, 0.67]) {
      const base = S.x + (Q.x - S.x) * t;
      P(base + Math.sin(t * Math.PI) * (sideX - base) * 0.9, S.y + dy * t);
    }
  };

  // Down the left gutter beside a heading, then along under its accent word.
  const markInto = (el: HTMLElement | null, sideFrac: number) => {
    if (!el) return;
    const r = rect(el);
    const y = r.y + r.h * (el.dataset.mark === 'strike' ? 0.6 : 0.95);
    const heading = el.closest<HTMLElement>('h1, h2, h3') ?? el;
    const hr = rect(heading);
    const gx = Math.max(6, hr.x - Math.min(30, hr.x / 2));
    travel({ x: gx, y: hr.y - 28 }, sideFrac);
    P(gx, hr.y - 28);
    if (y - hr.y > r.h * 1.2) P(gx, y - r.h * 0.45);
    P(r.x - 4, y + 4);
    const i0 = pts.length - 1;
    P(r.x + r.w / 2, y + 1);
    P(r.x + r.w + 4, y - 1);
    const i1 = pts.length - 1;
    P(Math.min(W - 12, r.x + r.w + (narrow ? 28 : 64)), y + 34);
    found.push({ paths: [...el.querySelectorAll<SVGPathElement>('.ink-mark path')], i0, i1 });
  };

  // A loop around a box (ellipse), entering from the upper left.
  const loopAround = (r: Rect, padX: number, padY: number, exit: Pt) => {
    const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const rx = r.w / 2 + padX;
    const ry = r.h / 2 + padY;
    // Down the quiet left side (past the contact form, not through it).
    travel({ x: c.x - rx * 1.2, y: c.y - ry * 1.3 }, 0.03);
    const steps = 12;
    for (let s = 0; s <= steps; s++) {
      const a = Math.PI * 1.2 + (s / steps) * Math.PI * 2.15;
      P(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry);
    }
    P(exit.x, exit.y);
  };

  const markIn = (sel: string) => $(sel)?.querySelector<HTMLElement>('[data-mark]') ?? null;
  const kw = $('[data-kw-hero]');
  const heroFoot = $('.hero__foot');
  const header = $('.site-header')?.offsetHeight ?? 72;

  if (kw && heroFoot) {
    // ---------- Home page: a designed route ----------
    const K = rect(kw);
    const foot = rect(heroFoot);
    const cl = foot.x;
    const right = W - Math.max(12, cl / 2);
    const hairY = foot.y;

    // Hero: in at the top right, down beside the wordmark, along the hairline.
    P(W + 40, K.y - 30);
    P(right, K.y + K.h * 0.55);
    P(right - 6, hairY - 30);
    P(right - 46, hairY - 9);
    P(cl + 80, hairY - 9);
    markInto(markIn('.hero'), 0.1);

    // The other 99%: cross out "forgettable", circle the one black dot, then
    // split the comparison down the middle.
    markInto(markIn('.ninety-nine'), 0.6);
    const dot = $('.dots__dot--one');
    if (dot) {
      const d = rect(dot);
      const c = { x: d.x + d.w / 2, y: d.y + d.h / 2 };
      const r = Math.max(14, d.w * 1.3);
      P(c.x - r * 2.2, c.y - r * 0.6);
      for (let s = 0; s <= 10; s++) {
        const a = Math.PI + (s / 10) * Math.PI * 2.1;
        P(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
      }
    }
    const us = $('.compare__us');
    const cmp = $('.compare');
    const row = $('.compare__row');
    if (us && cmp && row) {
      const gap = parseFloat(getComputedStyle(row).columnGap) || 32;
      const split = rect(us).x - gap / 2;
      const C = rect(cmp);
      P(split, C.y - 36);
      P(split, C.y + C.h + 28);
    }

    // Work: circle "proud", then run down beside each logo panel.
    markInto(markIn('#work'), 0.85);
    $$('.work-item__media').forEach((m) => {
      const M = rect(m);
      const o = Math.min(20, Math.max(6, (W - (M.x + M.w)) / 2));
      const x = M.x + M.w / 2 < W / 2 ? Math.min(W - 6, M.x + M.w + o) : M.x - o;
      P(x, M.y - o);
      P(x, M.y + M.h + o);
    });

    // Services: double-underline "make", then trace the top of the first row.
    markInto(markIn('#services'), 0.88);
    const svc = $$('.service').map(rect);
    if (svc.length) {
      const s0 = svc[0];
      const rowEnd = svc.filter((r) => Math.abs(r.y - s0.y) < 4).reduce((a, b) => (b.x > a.x ? b : a));
      P(s0.x - 12, s0.y - 9);
      P(rowEnd.x + rowEnd.w, s0.y - 9);
    }

    // The one percent: zigzag "skip", then rule a line along the top of the grid.
    markInto(markIn('.details'), 0.12);
    const grid = $('.details__grid');
    if (grid) {
      const G = rect(grid);
      P(G.x - 14, G.y - 14);
      P(G.x + G.w + 4, G.y - 14);
    }

    // Process: swoosh "runs", then the line becomes a straight timeline
    // through a shape on each step.
    markInto(markIn('#process'), 0.9);
    const steps = $$('.step').map(rect);
    if (steps.length) {
      const across = steps.every((s) => Math.abs(s.y - steps[0].y) < 4);
      const lastStep = steps[steps.length - 1];
      if (across) {
        const ty = steps[0].y - (narrow ? 18 : 46);
        P(steps[0].x - 12, ty);
        timeline = { i: pts.length - 1, x: steps[0].x - 12, y: ty, across };
        steps.forEach((s) => P(s.x + s.w * 0.5, ty));
        P(lastStep.x + lastStep.w, ty);
      } else {
        const gx = Math.max(6, steps[0].x - Math.min(30, steps[0].x / 2));
        P(gx, steps[0].y - 10);
        timeline = { i: pts.length - 1, x: gx, y: steps[0].y - 10, across };
        steps.forEach((s) => P(gx, s.y + s.h * 0.5));
        P(gx, lastStep.y + lastStep.h);
      }
    }

    // About and contact.
    markInto(markIn('#about'), 0.9);
    markInto(markIn('#contact'), 0.85);
  } else {
    // ---------- Other pages: in at the top right, through every mark ----------
    P(W + 40, header + 40);
    P(W * 0.9, header + 90);
    $$('[data-mark]').forEach((el, k) => markInto(el, k % 2 ? 0.15 : 0.88));
  }

  // Footer: loop the "1%" block in the big wordmark and leave to the right.
  const fm = $('.site-footer__mark .kw__mark, .site-footer__mark .wordmark__mark');
  if (fm) {
    const F = rect(fm);
    loopAround(F, narrow ? 10 : 24, narrow ? 8 : 18, { x: W + 40, y: F.y + F.h + 60 });
  } else {
    P(W + 40, H - 80);
  }

  // ---------- Build the line ----------
  const scratch = document.createElementNS(NS, 'path');
  svg.append(scratch);
  const lens: number[] = [0];
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = segment(pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]);
    d += ' ' + seg;
    scratch.setAttribute('d', `M ${pts[i].x} ${pts[i].y} ${seg}`);
    lens.push(lens[i] + scratch.getTotalLength());
  }
  scratch.remove();
  thread.setAttribute('d', d);
  total = lens[lens.length - 1];
  thread.style.strokeDasharray = `${total} ${total}`;
  anchors = found.map((a) => ({ ...a, l0: lens[a.i0], l1: lens[a.i1] }));
  introTarget = anchors[0]?.l1 ?? 0;

  // Scroll → pen length. The pen follows the page downwards; sideways runs
  // (underlines, traced dividers) take extra scroll so you see them drawn.
  keys = [];
  let prev = -Infinity;
  pts.forEach((p, i) => {
    const dx = i ? Math.abs(p.x - pts[i - 1].x) : 0;
    const y = Math.max(p.y, prev + dx * 0.2 + 1);
    keys.push({ y, len: lens[i] });
    prev = y;
  });

  // ---------- Hero: blueprint grid and type construction lines ----------
  if (kw && heroFoot) {
    const hero = rect($('.hero')!);
    const foot = rect(heroFoot);
    const cols = W >= 900 ? 12 : 6;
    for (let i = 0; i <= cols; i++) {
      const x = foot.x + (foot.w / cols) * i;
      const el = stroke(`M ${f(x)} ${f(hero.y)} L ${f(x)} ${f(hero.y + hero.h)}`, gGrid, 'ink-grid__col');
      gridItems.push({ el, a: i * 0.025, b: 0.45 + i * 0.025 });
    }

    // Measure the wordmark's real baseline, cap height and x-height.
    const fs = parseFloat(getComputedStyle(kw).fontSize);
    const cap = kw.querySelector<HTMLElement>('.kw__cap');
    if (cap) {
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      cap.append(probe);
      const base = pagePos(probe).y;
      probe.remove();
      const ctx = document.createElement('canvas').getContext('2d');
      let capH = fs * 0.7;
      let xH = fs * 0.52;
      if (ctx) {
        ctx.font = `720 ${fs}px "Archivo Variable", Arial, sans-serif`;
        capH = ctx.measureText('H').actualBoundingBoxAscent || capH;
        xH = ctx.measureText('x').actualBoundingBoxAscent || xH;
      }
      const lines: [number, string][] = [
        [base - capH, 'CAP HEIGHT'],
        [base - xH, 'X-HEIGHT'],
        [base, 'BASELINE'],
      ];
      lines.forEach(([y, label], i) => {
        const el = stroke(`M 0 ${f(y)} L ${W} ${f(y)}`, gGrid, 'ink-grid__type');
        gridItems.push({ el, a: 0.3 + i * 0.08, b: 0.85 + i * 0.05 });
        if (!narrow) {
          const t = make('text', { x: f(W - foot.x / 2 - 4), y: f(y - 6), 'text-anchor': 'end' }, gGrid);
          t.textContent = label;
          gridItems.push({ el: t, a: 0.85, b: 1 });
        }
      });

      // Crosshairs where the grid meets the baseline.
      for (let i = 0; i <= cols; i += cols / 4) {
        const x = foot.x + (foot.w / cols) * i;
        const el = stroke(
          `M ${f(x - 6)} ${f(base)} L ${f(x + 6)} ${f(base)} M ${f(x)} ${f(base - 6)} L ${f(x)} ${f(base + 6)}`,
          gGrid,
          'ink-grid__cross',
        );
        gridItems.push({ el, a: 0.75, b: 1 });
      }

      // Once TOP has stretched out: construction circle and square on the "O".
      const o = kw.querySelectorAll<HTMLElement>('.kw__cap')[1];
      if (o && kwDoneAt) {
        const O = rect(o);
        const cx = O.x + O.w / 2;
        const cy = base - capH / 2;
        const r = capH * 0.56;
        oItems.push({ el: stroke(shape({ x: cx, y: cy }, r, 0), gGoldArt, 'ink-grid__o'), a: 0, b: 0.7 });
        const sq = `M ${f(cx - r)} ${f(cy - r)} H ${f(cx + r)} V ${f(cy + r)} H ${f(cx - r)} Z`;
        oItems.push({ el: stroke(sq, gGrid, 'ink-grid__type'), a: 0.2, b: 0.9 });
        const cross = `M ${f(cx - r * 1.5)} ${f(cy)} H ${f(cx + r * 1.5)} M ${f(cx)} ${f(cy - r * 1.5)} V ${f(cy + r * 1.5)}`;
        oItems.push({ el: stroke(cross, gGrid, 'ink-grid__type'), a: 0.4, b: 1 });
      }
    }
  }

  // ---------- Work: sun arcs ----------
  const work = $('#work');
  if (work) {
    const S = rect(work);
    art = { top: S.y - window.innerHeight * 0.1, span: S.h * 0.85 };
    const scale = Math.min(1, W / 1200);
    const sx = W * 0.8;
    for (let i = 0; i < 5; i++) {
      const r = (90 + i * 46) * scale;
      const el = stroke(`M ${f(sx - r)} ${f(S.y)} A ${f(r)} ${f(r)} 0 0 0 ${f(sx + r)} ${f(S.y)}`, gGoldArt, 'ink-art__arc');
      artItems.push({ el, a: i * 0.04, b: 0.25 + i * 0.04 });
    }
  }

  // ---------- Process: a shape on each step, and a golden-ratio construction ----------
  if (timeline) {
    // Circle, triangle, square, hexagon: the project gaining structure.
    const sides = [0, 3, 4, 6];
    const tl = timeline;
    // On the desktop timeline the shapes sit on the line. When the steps
    // stack (phones, narrow laptops) the gutter is too thin, so each shape
    // sits beside its big step number instead, in the empty space on the right.
    const r = tl.across ? 28 : narrow ? 20 : 24;
    const l0 = lens[tl.i];
    $$('.step').forEach((el, i) => {
      const s = rect(el);
      const num = el.querySelector<HTMLElement>('.step__num');
      const nr = num ? rect(num) : { x: s.x, y: s.y + 28, w: 0, h: 2 * r };
      const c = tl.across ? { x: s.x + r, y: tl.y } : { x: s.x + s.w - r - 2, y: nr.y + nr.h / 2 };
      const at = l0 + (tl.across ? c.x - tl.x : c.y - tl.y) - r;
      reserved.push({ x: c.x - r, y: c.y - r, w: r * 2, h: r * 2 });
      const paths: SVGElement[] = [stroke(shape(c, r, sides[i % sides.length]), gGeo, 'ink-geo__node')];
      // A small centre point, like a compass mark.
      paths.push(stroke(shape(c, Math.max(1.6, r * 0.09), 0), gGeo, 'ink-geo__node'));
      nodes.push({ paths, at });
    });

    // Golden-ratio construction in the empty space under the steps (desktop).
    const proc = $('#process');
    const procWrap = $('#process .wrap');
    if (proc && procWrap && W >= 900) {
      const R = rect(proc);
      geo = { top: R.y, span: R.h * 0.95 };
      const stepsBottom = Math.max(...$$('.step').map((el) => { const s = rect(el); return s.y + s.h; }));
      const h = Math.max(110, Math.min(300, R.y + R.h - stepsBottom - 60));
      const phi = (1 + Math.sqrt(5)) / 2;
      const w = h * phi;
      const right = W - Math.max(40, (W - procWrap.offsetWidth) / 2 + 30);
      let box = { x: right - w, y: R.y + R.h - 24 - h, w, h };
      const outer = { ...box };
      reserved.push(outer);

      const frame = `M ${f(box.x)} ${f(box.y)} H ${f(box.x + w)} V ${f(box.y + h)} H ${f(box.x)} Z`;
      geoItems.push({ el: stroke(frame, gGeo, 'ink-geo__frame'), a: 0, b: 0.3 });
      const diag = `M ${f(box.x)} ${f(box.y + h)} L ${f(box.x + w)} ${f(box.y)}`;
      geoItems.push({ el: stroke(diag, gGeo, 'ink-geo__guide'), a: 0.15, b: 0.4 });

      // Cut squares off left, top, right, bottom in turn; a quarter arc in
      // each square makes the spiral.
      let spiral = `M ${f(box.x)} ${f(box.y + box.h)}`;
      for (let i = 0; i < 8; i++) {
        const dir = i % 4;
        let cut = '';
        if (dir === 0) {
          const q = box.h;
          cut = `M ${f(box.x + q)} ${f(box.y)} V ${f(box.y + box.h)}`;
          spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x + q)} ${f(box.y)}`;
          box = { x: box.x + q, y: box.y, w: box.w - q, h: box.h };
        } else if (dir === 1) {
          const q = box.w;
          cut = `M ${f(box.x)} ${f(box.y + q)} H ${f(box.x + box.w)}`;
          spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x + q)} ${f(box.y + q)}`;
          box = { x: box.x, y: box.y + q, w: box.w, h: box.h - q };
        } else if (dir === 2) {
          const q = box.h;
          cut = `M ${f(box.x + box.w - q)} ${f(box.y)} V ${f(box.y + box.h)}`;
          spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x + box.w - q)} ${f(box.y + q)}`;
          box = { x: box.x, y: box.y, w: box.w - q, h: box.h };
        } else {
          const q = box.w;
          cut = `M ${f(box.x)} ${f(box.y + box.h - q)} H ${f(box.x + box.w)}`;
          spiral += ` A ${f(q)} ${f(q)} 0 0 1 ${f(box.x)} ${f(box.y + box.h - q)}`;
          box = { x: box.x, y: box.y, w: box.w, h: box.h - q };
        }
        geoItems.push({ el: stroke(cut, gGeo, 'ink-geo__frame'), a: 0.25 + i * 0.05, b: 0.4 + i * 0.05 });
      }
      geoItems.push({ el: stroke(spiral, gGeo, 'ink-geo__spiral'), a: 0.55, b: 0.95 });

      // A guide circle inscribed in the first square.
      const c0 = { x: outer.x + outer.h / 2, y: outer.y + outer.h / 2 };
      geoItems.push({ el: stroke(shape(c0, outer.h / 2, 0), gGeo, 'ink-geo__guide'), a: 0.35, b: 0.7 });
    }
  }

  whiteSpace(W, narrow, reserved);
}

// ---------- White space: compass and ruler drawings in the margins ----------
// Each white section is mapped onto a coarse grid. The content column (each
// .wrap, minus its side padding) is off limits, and so is every cell near
// text, an image, a control, a border or a background, plus anything in
// `reserved`. The biggest empty squares left (the side margins on wide
// screens, the gaps between sections) get a construction drawing, at most two
// per section, kept apart. Same layout, same drawings.
function whiteSpace(W: number, narrow: boolean, reserved: Rect[]) {
  const sy = window.scrollY;
  const CELL = narrow ? 12 : 20;
  const pad = narrow ? 14 : 28; // clearance around content
  const minS = narrow ? 92 : 112; // smallest square worth drawing in
  const maxS = narrow ? 150 : 280; // biggest drawing
  const perSection = narrow ? 1 : 2;
  const sections = $$('main section, main article > header').filter(
    (s) => !s.closest('.on-ink') && !s.classList.contains('hero') && !s.parentElement?.closest('main section'),
  );
  const range = document.createRange();
  let k = 0; // drawing number down the page, so the designs vary

  for (const sec of sections) {
    const b = sec.getBoundingClientRect();
    const top = b.top + sy;
    const cols = Math.floor(W / CELL);
    const rows = Math.floor(b.height / CELL);
    if (rows < 6) continue;
    const used = new Uint8Array(cols * rows);
    const block = (x0: number, y0: number, x1: number, y1: number) => {
      const c0 = Math.max(0, Math.floor(x0 / CELL));
      const c1 = Math.min(cols - 1, Math.floor(x1 / CELL));
      const r0 = Math.max(0, Math.floor((y0 - top) / CELL));
      const r1 = Math.min(rows - 1, Math.floor((y1 - top) / CELL));
      for (let r = r0; r <= r1; r++) used.fill(1, r * cols + c0, r * cols + c1 + 1);
    };
    const blockRect = (r: { left: number; top: number; right: number; bottom: number }, m = pad) =>
      block(r.left - m, r.top + sy - m, r.right + m, r.bottom + sy + m);

    // Keep off the section's top and bottom edges (the next section may be black).
    block(0, top, W, top + pad);
    block(0, top + b.height - pad, W, top + b.height);
    for (const r of reserved) block(r.x - pad, r.y - pad, r.x + r.w + pad, r.y + r.h + pad);
    // Never inside the content column: drawings stay in the margins.
    for (const wrap of sec.querySelectorAll<HTMLElement>('.wrap')) {
      const wr = wrap.getBoundingClientRect();
      const ws = getComputedStyle(wrap);
      block(wr.left + parseFloat(ws.paddingLeft) - pad, wr.top + sy, wr.right - parseFloat(ws.paddingRight) + pad, wr.bottom + sy);
    }

    // Text, line by line (a short heading leaves room beside it).
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) blockRect(r);
    }
    // Everything else that shows: media, controls, borders, backgrounds.
    for (const el of sec.querySelectorAll('*')) {
      const tag = el.tagName.toLowerCase();
      if (el.closest('svg') && tag !== 'svg') continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (/^(img|svg|video|canvas|picture|iframe|input|textarea|select|button|hr)$/.test(tag)) {
        blockRect(r);
        continue;
      }
      const cs = getComputedStyle(el);
      if (cs.position === 'sticky' && el.parentElement) {
        // A sticky panel slides down its whole column.
        const p = el.parentElement.getBoundingClientRect();
        blockRect({ left: r.left, right: r.right, top: p.top, bottom: p.bottom });
        continue;
      }
      if ((cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none') {
        blockRect(r);
        continue;
      }
      const bw = (side: string) => (cs.getPropertyValue(`border-${side}-style`) === 'none' ? 0 : parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0);
      if (bw('top')) blockRect({ left: r.left, right: r.right, top: r.top, bottom: r.top });
      if (bw('bottom')) blockRect({ left: r.left, right: r.right, top: r.bottom, bottom: r.bottom });
      if (bw('left')) blockRect({ left: r.left, right: r.left, top: r.top, bottom: r.bottom });
      if (bw('right')) blockRect({ left: r.right, right: r.right, top: r.top, bottom: r.bottom });
      if (r.height < 200 && (getComputedStyle(el, '::before').content !== 'none' || getComputedStyle(el, '::after').content !== 'none')) blockRect(r);
    }
    // And the page edges.
    block(0, top, 10, top + b.height);
    block(W - 10, top, W, top + b.height);

    // The biggest empty squares, one at a time.
    const dp = new Uint16Array(cols * rows);
    for (let n = 0; n < perSection; n++) {
      let best = 0;
      let bi = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          dp[i] = used[i] ? 0 : r && c ? 1 + Math.min(dp[i - 1], dp[i - cols], dp[i - cols - 1]) : 1;
          if (dp[i] > best) {
            best = dp[i];
            bi = i;
          }
        }
      }
      const size = best * CELL;
      if (size < minS) break;
      const br = Math.floor(bi / cols);
      const bc = bi % cols;
      const c = { x: (bc + 1) * CELL - size / 2, y: top + (br + 1) * CELL - size / 2 };
      const s = Math.min(size, maxS);

      // A guide line through the drawing, as far as the empty space runs:
      // across for even drawings, down for odd ones.
      const cc = Math.floor(c.x / CELL);
      const rr = Math.floor((c.y - top) / CELL);
      let guide = '';
      if (k % 2 === 0) {
        let c0 = cc;
        let c1 = cc;
        while (c0 > 0 && !used[rr * cols + c0 - 1]) c0--;
        while (c1 < cols - 1 && !used[rr * cols + c1 + 1]) c1++;
        const x0 = c0 * CELL + 6;
        const x1 = (c1 + 1) * CELL - 6;
        if (x1 - x0 > s * 1.3) guide = `M ${f(x0)} ${f(c.y)} H ${f(x1)} M ${f(x0)} ${f(c.y - 5)} V ${f(c.y + 5)} M ${f(x1)} ${f(c.y - 5)} V ${f(c.y + 5)}`;
      } else {
        let r0 = rr;
        let r1 = rr;
        while (r0 > 0 && !used[(r0 - 1) * cols + cc]) r0--;
        while (r1 < rows - 1 && !used[(r1 + 1) * cols + cc]) r1++;
        const y0 = top + r0 * CELL + 6;
        const y1 = top + (r1 + 1) * CELL - 6;
        if (y1 - y0 > s * 1.3) guide = `M ${f(c.x)} ${f(y0)} V ${f(y1)} M ${f(c.x - 5)} ${f(y0)} H ${f(c.x + 5)} M ${f(c.x - 5)} ${f(y1)} H ${f(c.x + 5)}`;
      }

      construction(c, s * 0.4, k, guide, narrow);
      k++;
      // Keep the next drawing well away from this one.
      const gap = s * 0.45;
      block(c.x - s / 2 - gap, c.y - s / 2 - gap, c.x + s / 2 + gap, c.y + s / 2 + gap);
    }
  }
}

// One construction drawing of radius r at c. Six designs, in turn.
function construction(c: Pt, r: number, k: number, guide: string, narrow: boolean) {
  const parts: [string, string][] = [];
  const add = (d: string, cls = 'ink-space__shape') => parts.push([d, cls]);
  const sq = (h: number) => `M ${f(c.x - h)} ${f(c.y - h)} H ${f(c.x + h)} V ${f(c.y + h)} H ${f(c.x - h)} Z`;
  const pt = (a: number, rr: number) => ({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr });
  const tri = (rot: number) => {
    const p = [0, 1, 2].map((i) => pt(rot + (i / 3) * Math.PI * 2, r));
    return `M ${p.map((q) => `${f(q.x)} ${f(q.y)}`).join(' L ')} Z`;
  };
  let label = '';
  let labelAt = { x: c.x + r * 0.08, y: c.y + r + 16 };
  if (guide) add(guide, 'ink-space__guide');

  switch (k % 6) {
    case 0: {
      // Compass circle with a crosshair and centre point.
      const e = r * 1.25;
      add(`M ${f(c.x - e)} ${f(c.y)} H ${f(c.x + e)} M ${f(c.x)} ${f(c.y - e)} V ${f(c.y + e)}`, 'ink-space__guide');
      add(shape(c, r, 0));
      add(shape(c, 2, 0));
      label = `Ø ${Math.round(r * 2)}`;
      break;
    }
    case 1: {
      // Square, its diagonals and the inscribed circle.
      const h = r * 0.86;
      add(sq(h));
      add(`M ${f(c.x - h)} ${f(c.y - h)} L ${f(c.x + h)} ${f(c.y + h)} M ${f(c.x + h)} ${f(c.y - h)} L ${f(c.x - h)} ${f(c.y + h)}`, 'ink-space__guide');
      add(shape(c, h, 0));
      label = `${Math.round(h * 2)} × ${Math.round(h * 2)}`;
      labelAt = { x: c.x - h, y: c.y + h + 16 };
      break;
    }
    case 2: {
      // Equilateral triangle in its circumcircle, with the angle marked.
      add(shape(c, r, 0), 'ink-space__guide');
      add(tri(-Math.PI / 2));
      const v = pt(-Math.PI / 2 + (2 / 3) * Math.PI * 2, r); // lower left
      const ar = r * 0.22;
      const a0 = { x: v.x + ar, y: v.y };
      const a1 = { x: v.x + ar * Math.cos(-Math.PI / 3), y: v.y + ar * Math.sin(-Math.PI / 3) };
      add(`M ${f(a0.x)} ${f(a0.y)} A ${f(ar)} ${f(ar)} 0 0 0 ${f(a1.x)} ${f(a1.y)}`);
      label = '60°';
      labelAt = { x: v.x + ar + 6, y: v.y - 4 };
      break;
    }
    case 3: {
      // Concentric rings with a measured radius.
      [1, 0.66, 0.33].forEach((m, i) => add(shape(c, r * m, 0), i ? 'ink-space__guide' : 'ink-space__shape'));
      const p = pt(-Math.PI / 6, r);
      add(`M ${f(c.x)} ${f(c.y)} L ${f(p.x)} ${f(p.y)}`);
      add(shape(p, 2, 0));
      label = `r ${Math.round(r)}`;
      labelAt = { x: p.x + 8, y: p.y - 6 };
      break;
    }
    case 4: {
      // Hexagon with a hexagram inside.
      add(shape(c, r, 6));
      add(tri(-Math.PI / 2), 'ink-space__guide');
      add(tri(Math.PI / 2), 'ink-space__guide');
      add(shape(c, 2, 0));
      label = '6 × 60°';
      break;
    }
    default: {
      // A square, the square on its midpoints, and the circle between them.
      const h = r * 0.86;
      add(sq(h));
      add(`M ${f(c.x)} ${f(c.y - h)} L ${f(c.x + h)} ${f(c.y)} L ${f(c.x)} ${f(c.y + h)} L ${f(c.x - h)} ${f(c.y)} Z`);
      add(shape(c, h / Math.SQRT2, 0), 'ink-space__guide');
      label = '1 : √2';
      labelAt = { x: c.x - h, y: c.y + h + 16 };
    }
  }

  // Drawn as the pen passes: guides first, then the shapes, then the label.
  const y0 = c.y - r * 1.6;
  const span = r * 2.4;
  parts.forEach(([d, cls], i) => {
    const a = (i / parts.length) * 0.6;
    spaceItems.push({ el: stroke(d, gSpace, cls), y0: y0 + a * span, y1: y0 + (a + 0.4) * span });
  });
  if (label && !narrow) {
    const t = make('text', { x: f(labelAt.x), y: f(labelAt.y) }, gSpace);
    t.textContent = label;
    spaceItems.push({ el: t, y0: y0 + span * 0.85, y1: y0 + span * 1.05 });
  }
}

function lengthAt(penY: number) {
  if (!keys.length || penY <= keys[0].y) return 0;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (penY <= b.y) return a.len + ((penY - a.y) / Math.max(1, b.y - a.y)) * (b.len - a.len);
  }
  return total;
}

function drawItems(items: Item[], t: number) {
  for (const it of items) setProgress(it.el, clamp01((t - it.a) / (it.b - it.a)));
}

function render() {
  const now = performance.now();
  const penY = window.scrollY + window.innerHeight * 0.72;
  const drawn = Math.min(total, Math.max(lengthAt(penY), intro === Infinity ? total : intro));
  thread.style.strokeDashoffset = String(total - drawn);

  if (drawn > 0 && drawn < total) {
    const p = thread.getPointAtLength(drawn);
    tip.setAttribute('cx', f(p.x));
    tip.setAttribute('cy', f(p.y));
    tip.style.opacity = '';
  } else {
    tip.style.opacity = '0';
  }

  for (const a of anchors) {
    const t = clamp01((drawn - a.l0) / Math.max(1, a.l1 - a.l0));
    const n = a.paths.length;
    a.paths.forEach((p, i) => (p.style.strokeDashoffset = String(1 - clamp01(t * n - i))));
  }

  // The hero blueprint builds itself on load, then stays.
  drawItems(gridItems, reduce ? 1 : (now - loadedAt - 150) / 1700);
  drawItems(oItems, reduce ? 1 : kwDoneAt ? (now - kwDoneAt) / 900 : 0);
  drawItems(artItems, reduce ? 1 : (penY - art.top) / art.span);
  drawItems(geoItems, reduce ? 1 : (penY - geo.top) / geo.span);
  for (const it of spaceItems) setProgress(it.el, reduce ? 1 : clamp01((penY - it.y0) / (it.y1 - it.y0)));
  for (const node of nodes) {
    const t = reduce ? 1 : clamp01((drawn - node.at) / 110);
    const n = node.paths.length;
    node.paths.forEach((p, i) => setProgress(p, clamp01(t * n - i)));
  }
}

let queued = false;
const schedule = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    render();
  });
};

let rebuildTimer = 0;
const rebuild = () => {
  clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => {
    build();
    render();
  }, 120);
};

// The "O" construction waits for TOP to finish stretching (or shows at once
// when there's no animation).
const kwEl = $('[data-kw-hero]');

// The home route is drawn around these elements. If one gets renamed, the
// line silently skips that part of the page, so say so in the console.
// (The layout checks in tests/ fail on any "[ink]" warning.)
const HOME_ROUTE_NEEDS = [
  '.site-header', '.hero', '.hero__foot', '.hero [data-mark]',
  '.ninety-nine [data-mark]', '.dots__dot--one', '.compare', '.compare__row', '.compare__us',
  '#work [data-mark]', '.work-item__media', '#services [data-mark]', '.service',
  '.details [data-mark]', '.details__grid',
  '#process [data-mark]', '#process .wrap', '.step', '.step__num',
  '#about [data-mark]', '#contact [data-mark]',
  '.site-footer__mark .kw__mark',
];
if (kwEl) {
  for (const sel of HOME_ROUTE_NEEDS) {
    if (!document.querySelector(sel)) console.warn(`[ink] The pen line can't find "${sel}" on this page, so it skips that part of the route. Was it renamed? (src/scripts/ink.ts)`);
  }
}

if (!kwEl || !kwEl.classList.contains('is-ready') || kwEl.dataset.done !== undefined) kwDoneAt = loadedAt - 1000;
window.addEventListener('kw:done', (e) => {
  // Any wordmark finishing changes the layout the line is drawn around; only
  // the hero's starts the construction circle on its "O".
  if ((e as CustomEvent).detail?.hero) kwDoneAt = performance.now();
  build();
  render();
});

build();
render();
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', rebuild);
new ResizeObserver(rebuild).observe(document.body);
document.fonts?.ready.then(rebuild);

// Animate the time-based parts: hero blueprint, "O" construction, intro stroke.
if (!reduce) {
  const introStart = loadedAt + 2300;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const tick = (now: number) => {
    intro = ease(clamp01((now - introStart) / 1800)) * introTarget;
    render();
    const busy = kwDoneAt === 0 || now < introStart + 1900 || now < kwDoneAt + 1000;
    if (busy) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
