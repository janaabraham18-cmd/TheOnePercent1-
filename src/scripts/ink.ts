// The background ink layer.
//
// 1. The pen line: one continuous hand-drawn line down the whole page. It
//    follows the page's own structure (traces the hero hairline, circles the
//    one black dot, splits the 99%/1% comparison, runs down the logo panels,
//    traces the services and details dividers, becomes the process timeline,
//    loops the footer "1%") and turns into the bold mark on each heading's
//    accent word ([data-mark], InkWord.astro). Scrolling moves the pen.
// 2. Section drawings: a blueprint grid with type construction lines in the
//    hero, flowing ribbon lines and sun arcs in the work section, and leaves
//    sprouting off the line (plus a leafy branch) in the process section.
//
// Everything is drawn white with mix-blend-mode: difference, so it reads
// black over white sections and white over black ones. The layer sits at
// z 0, under all content (.wrap is z 1).

const NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Anchor = { paths: SVGPathElement[]; i0: number; i1: number; l0: number; l1: number };
/** A drawing that animates in over [a, b] of its group's 0–1 progress. */
type Item = { el: SVGElement; a: number; b: number };
type Leaf = { paths: SVGElement[]; at: number };

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
const gLeaves = make('g', { class: 'ink-leaves' }, svg);
const thread = make('path', { class: 'ink-thread__line' }, svg);
const tip = make('circle', { class: 'ink-thread__tip', r: 3 }, svg);
document.body.prepend(svg);

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

// A single leaf in line drawing: stalk, blade, midrib and two veins.
function leaf(at: Pt, angleDeg: number, L: number, parent: Element) {
  const g = make('g', { transform: `translate(${f(at.x)} ${f(at.y)}) rotate(${f(angleDeg)})` }, parent);
  const s = 7;
  const w = L * 0.3;
  return [
    stroke(`M 0 0 L ${s} 0`, g),
    stroke(
      `M ${s} 0 C ${f(s + L * 0.25)} ${f(-w)}, ${f(s + L * 0.75)} ${f(-w)}, ${f(s + L)} 0 C ${f(s + L * 0.75)} ${f(w)}, ${f(s + L * 0.25)} ${f(w)}, ${s} 0`,
      g,
    ),
    stroke(`M ${s} 0 L ${f(s + L * 0.86)} 0`, g),
    stroke(`M ${f(s + L * 0.34)} 0 L ${f(s + L * 0.5)} ${f(-w * 0.62)} M ${f(s + L * 0.56)} 0 L ${f(s + L * 0.7)} ${f(w * 0.55)}`, g),
  ];
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
let branchItems: Item[] = [];
let branch = { top: 0, span: 1 };
let leaves: Leaf[] = [];
let introTarget = 0;
let intro = reduce ? Infinity : 0;

function build() {
  const W = document.documentElement.clientWidth;
  const H = document.documentElement.scrollHeight;
  const narrow = W < 700;
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  gGrid.replaceChildren();
  gArt.replaceChildren();
  gLeaves.replaceChildren();
  gridItems = [];
  oItems = [];
  artItems = [];
  branchItems = [];
  leaves = [];

  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push({ x, y });
  const last = () => pts[pts.length - 1];
  const found: Omit<Anchor, 'l0' | 'l1'>[] = [];
  let vine: [number, number] | null = null;

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
    travel({ x: c.x - rx * 1.2, y: c.y - ry * 1.3 }, 0.5);
    const steps = 12;
    for (let s = 0; s <= steps; s++) {
      const a = Math.PI * 1.2 + (s / steps) * Math.PI * 2.15;
      P(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry);
    }
    P(exit.x, exit.y);
  };

  const markIn = (sel: string) => $(sel)?.querySelector<HTMLElement>('[data-mark]') ?? null;
  const kw = $('.kw');
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

    // Process: swoosh "runs", then the line becomes the timeline, as a vine.
    markInto(markIn('#process'), 0.9);
    const steps = $$('.step').map(rect);
    if (steps.length) {
      const oneRow = steps.every((s) => Math.abs(s.y - steps[0].y) < 4);
      const vStart = pts.length;
      if (oneRow) {
        const vy = steps[0].y - 14;
        P(steps[0].x - 10, vy);
        steps.forEach((s, i) => P(s.x + s.w * (i === steps.length - 1 ? 1 : 0.5), vy + (i % 2 ? 3 : -3)));
      } else {
        const gx = Math.max(6, steps[0].x - Math.min(30, steps[0].x / 2));
        P(gx, steps[0].y - 10);
        P(gx, steps[steps.length - 1].y + steps[steps.length - 1].h);
      }
      vine = [vStart, pts.length - 1];
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
  const fm = $('.site-footer__mark .wordmark__mark');
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
        const circle = `M ${f(cx)} ${f(cy - r)} A ${f(r)} ${f(r)} 0 1 1 ${f(cx - 0.01)} ${f(cy - r)}`;
        oItems.push({ el: stroke(circle, gGrid, 'ink-grid__o'), a: 0, b: 0.7 });
        const sq = `M ${f(cx - r)} ${f(cy - r)} H ${f(cx + r)} V ${f(cy + r)} H ${f(cx - r)} Z`;
        oItems.push({ el: stroke(sq, gGrid, 'ink-grid__type'), a: 0.2, b: 0.9 });
        const cross = `M ${f(cx - r * 1.5)} ${f(cy)} H ${f(cx + r * 1.5)} M ${f(cx)} ${f(cy - r * 1.5)} V ${f(cy + r * 1.5)}`;
        oItems.push({ el: stroke(cross, gGrid, 'ink-grid__type'), a: 0.4, b: 1 });
      }
    }
  }

  // ---------- Work: flowing ribbon and sun arcs ----------
  const work = $('#work');
  if (work) {
    const S = rect(work);
    art = { top: S.y - window.innerHeight * 0.1, span: S.h * 0.85 };
    const scale = Math.min(1, W / 1200);
    const sx = W * 0.8;
    for (let i = 0; i < 5; i++) {
      const r = (90 + i * 46) * scale;
      const el = stroke(`M ${f(sx - r)} ${f(S.y)} A ${f(r)} ${f(r)} 0 0 0 ${f(sx + r)} ${f(S.y)}`, gArt, 'ink-art__arc');
      artItems.push({ el, a: i * 0.04, b: 0.25 + i * 0.04 });
    }
    const n = 9;
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const y0 = S.y + S.h * 0.18 + k * 12;
      const y3 = S.y + S.h * 0.92 + k * 9;
      const c1 = { x: W * 0.6, y: S.y + S.h * 0.02 + k * 30 };
      const c2 = { x: W * 0.32, y: S.y + S.h * 1.02 - k * 22 };
      const el = stroke(
        `M ${f(W + 20)} ${f(y0)} C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(-20)} ${f(y3)}`,
        gArt,
        'ink-art__ribbon',
      );
      artItems.push({ el, a: 0.12 + i * 0.03, b: 0.7 + i * 0.03 });
    }
  }

  // ---------- Process: leaves off the vine, and a leafy branch ----------
  if (vine) {
    const l0 = lens[vine[0]];
    const l1 = lens[vine[1]];
    const gap = narrow ? 64 : 92;
    const count = Math.floor((l1 - l0) / gap);
    const sizes = [38, 30, 44, 34];
    for (let k = 1; k <= count; k++) {
      const at = l0 + k * gap - gap / 2;
      const p = thread.getPointAtLength(at);
      const q = thread.getPointAtLength(Math.min(total, at + 2));
      const side = k % 2 ? -1 : 1;
      const ang = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI + side * 50;
      leaves.push({ paths: leaf(p, ang, sizes[k % 4] * (narrow ? 0.8 : 1), gLeaves), at });
    }
    // A curling tendril where the vine ends.
    const end = thread.getPointAtLength(l1);
    const tendril: string[] = [`M ${f(end.x)} ${f(end.y)}`];
    for (let s = 1; s <= 24; s++) {
      const t = s / 24;
      const ang = -Math.PI / 2 + t * Math.PI * 3.2;
      const r = 26 * (1 - t * 0.8);
      tendril.push(`L ${f(end.x + 16 + Math.cos(ang) * r)} ${f(end.y - 22 + Math.sin(ang) * r + 10 * (1 - t))}`);
    }
    leaves.push({ paths: [stroke(tendril.join(' '), gLeaves)], at: l1 - 30 });

    // A larger leafy branch in the bottom-right corner of the section.
    const proc = $('#process');
    const procWrap = $('#process .wrap');
    if (proc && procWrap && W >= 900) {
      const R = rect(proc);
      branch = { top: R.y, span: R.h * 0.9 };
      // Fit it in the empty space under the steps, at the right edge.
      const below = R.y + R.h - Math.max(...$$('.step').map((el) => { const s = rect(el); return s.y + s.h; }));
      const h = Math.max(110, Math.min(240, below - 10));
      const k = h / 250;
      const bx = W - Math.max(40, (W - procWrap.offsetWidth) / 2 + 30);
      const by = R.y + R.h - 16;
      const stem = `M ${f(bx)} ${f(by)} C ${f(bx - 30 * k)} ${f(by - 80 * k)}, ${f(bx - 10 * k)} ${f(by - 170 * k)}, ${f(bx - 70 * k)} ${f(by - 250 * k)}`;
      branchItems.push({ el: stroke(stem, gLeaves), a: 0, b: 0.5 });
      const stemPath = make('path', { d: stem }, gLeaves);
      const sl = stemPath.getTotalLength();
      [0.18, 0.34, 0.5, 0.66, 0.82].forEach((t, i) => {
        const p = stemPath.getPointAtLength(sl * t);
        const q = stemPath.getPointAtLength(sl * t + 2);
        const base = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
        [-1, 1].forEach((side, j) => {
          leaf(p, base + side * 48, (46 - i * 5) * Math.max(0.7, k), gLeaves).forEach((el, m) => {
            const a = 0.12 + t * 0.55 + j * 0.04 + m * 0.02;
            branchItems.push({ el, a, b: a + 0.18 });
          });
        });
      });
      stemPath.remove();
    }
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
  drawItems(branchItems, reduce ? 1 : (penY - branch.top) / branch.span);
  for (const l of leaves) {
    const t = reduce ? 1 : clamp01((drawn - l.at) / 140);
    const n = l.paths.length;
    l.paths.forEach((p, i) => setProgress(p, clamp01(t * n - i)));
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
const kwEl = $('.kw');
if (!kwEl || !kwEl.classList.contains('is-ready') || kwEl.dataset.done !== undefined) kwDoneAt = loadedAt - 1000;
window.addEventListener('kw:done', () => {
  kwDoneAt = performance.now();
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
