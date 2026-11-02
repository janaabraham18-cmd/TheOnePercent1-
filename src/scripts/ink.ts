// The background pen line: one continuous hand-drawn thread that runs down
// the whole page, curls into swirls between sections, and turns into the
// bold mark under each heading's accent word ([data-mark], InkWord.astro)
// as it reaches it. Scrolling moves the pen: down draws, up rewinds.
//
// Colour: the thread is drawn in white with mix-blend-mode: difference, so
// it reads black over white sections and white over black ones, switching
// exactly at each section edge. It sits under all content (.wrap is z 1).

const NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Pt = { x: number; y: number };
type Anchor = { paths: SVGPathElement[]; i0: number; i1: number; l0: number; l1: number; y: number };

const svg = document.createElementNS(NS, 'svg');
svg.classList.add('ink-thread');
svg.setAttribute('aria-hidden', 'true');
const thread = document.createElementNS(NS, 'path');
thread.classList.add('ink-thread__line');
const tip = document.createElementNS(NS, 'circle');
tip.classList.add('ink-thread__tip');
tip.setAttribute('r', '3');
svg.append(thread, tip);
document.body.prepend(svg);

// Seeded so the hand-drawn wobble is the same on every visit.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Layout position ignoring transforms (the scroll reveals shift headings).
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

// Smooth curve through every point (Catmull-Rom as cubic Béziers).
function segment(p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
  const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
  const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
  return `C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

let total = 0;
let anchors: Anchor[] = [];
let keys: { y: number; len: number }[] = [];
let intro = reduce ? Infinity : 0;
let introTarget = 0;

function build() {
  const W = document.documentElement.clientWidth;
  const H = document.documentElement.scrollHeight;
  const rand = rng(11);
  const j = (n: number) => (rand() - 0.5) * 2 * n;
  const narrow = W < 700;

  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const pts: Pt[] = [];
  const marks = [...document.querySelectorAll<HTMLElement>('[data-mark]')];
  const header = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 72;

  // Enter at the top right and come down the right edge beside the hero
  // wordmark (never through it).
  const kw = document.querySelector<HTMLElement>('.kw');
  if (kw) {
    const kp = pagePos(kw);
    const right = Math.max(kp.x + kw.offsetWidth + 24, W * 0.965);
    pts.push({ x: W + 40, y: kp.y - 30 });
    pts.push({ x: Math.min(right, W - 8), y: kp.y + kw.offsetHeight * 0.5 });
    pts.push({ x: Math.min(right, W - 8) - 6, y: kp.y + kw.offsetHeight + 30 });
  } else {
    pts.push({ x: W + 40, y: header + 40 });
    pts.push({ x: W * 0.86, y: header + 70 + j(10) });
  }

  // Flowing S-curves between two points: the line bows out towards one side
  // of the page and back, with a loose spiral doodle on longer stretches.
  const sides = [0.9, 0.64, 0.95, 0.76];
  const fill = (P: Pt, Q: Pt, k: number) => {
    const dy = Q.y - P.y;
    if (dy <= 0) return;
    const n = Math.max(1, Math.round(dy / 240));
    const sideX = W * sides[k % sides.length];
    const curlAt = dy > 600 ? Math.max(1, Math.floor(n / 2)) : -1;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const base = P.x + (Q.x - P.x) * t;
      const x = base + Math.sin(t * Math.PI) * (sideX - base) + j(24);
      const y = P.y + dy * t + j(16);
      if (i !== curlAt) {
        pts.push({ x, y });
        continue;
      }
      const r = (narrow ? 20 : 32) + rand() * 16;
      const turns = 1.1 + rand() * 0.35;
      const dir = rand() > 0.5 ? 1 : -1;
      const steps = 10;
      for (let s = 0; s <= steps; s++) {
        const a = Math.PI / 2 + dir * (s / steps) * turns * Math.PI * 2;
        const rr = r * (0.7 + 0.5 * (s / steps));
        pts.push({ x: x + Math.cos(a) * rr, y: y - r + Math.sin(a) * rr + (s / steps) * 28 });
      }
    }
  };

  const found: Omit<Anchor, 'l0' | 'l1'>[] = [];
  marks.forEach((el, k) => {
    const p = pagePos(el);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const y = p.y + h * (el.dataset.mark === 'strike' ? 0.6 : 0.95);
    const x0 = p.x;
    const x1 = p.x + w;

    // Arrive above the heading, run down the left gutter beside it (not
    // through its other lines), then turn in to underline the word.
    const heading = el.closest<HTMLElement>('h1, h2, h3') ?? el;
    const hp = pagePos(heading);
    const gx = Math.max(6, hp.x - Math.min(30, hp.x / 2));
    const top = { x: gx + j(6), y: hp.y - 28 };
    fill(pts[pts.length - 1], top, k);
    pts.push(top);
    if (y - top.y > h * 1.2) pts.push({ x: gx + j(4), y: y - h * 0.45 });
    const i0 = pts.length;
    pts.push({ x: x0 - 4, y: y + 4 });
    pts.push({ x: (x0 + x1) / 2, y: y + 1 + j(3) });
    const i1 = pts.length;
    pts.push({ x: x1 + 4, y: y - 1 });
    pts.push({ x: Math.min(W - 12, x1 + (narrow ? 28 : 64)), y: y + 34 });

    found.push({ paths: [...el.querySelectorAll<SVGPathElement>('.ink-mark path')], i0, i1, y });
  });

  // Out through the footer and off the right edge.
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const fy = footer ? pagePos(footer).y : H - 300;
  const end = { x: W * 0.3, y: fy + (H - fy) * 0.45 };
  fill(pts[pts.length - 1], end, marks.length);
  pts.push(end);
  pts.push({ x: W * 0.72, y: H - 70 });
  pts.push({ x: W + 40, y: H - 110 });

  // Build the path and the length at every point.
  const scratch = document.createElementNS(NS, 'path');
  svg.append(scratch);
  const lens: number[] = [0];
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
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

  // Scroll → pen length. Between words the pen moves steadily; across a word
  // it slows to draw the mark over ~90px of scroll.
  keys = [{ y: 0, len: 0 }];
  anchors.forEach((a) => {
    keys.push({ y: a.y - 60, len: a.l0 }, { y: a.y + 30, len: a.l1 });
  });
  keys.push({ y: H, len: total });
  keys.sort((a, b) => a.y - b.y);
  for (let i = 1; i < keys.length; i++) keys[i].len = Math.max(keys[i].len, keys[i - 1].len);

  introTarget = anchors[0]?.l1 ?? 0;
}

function lengthAt(penY: number) {
  if (penY <= keys[0].y) return 0;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (penY <= b.y) return a.len + ((penY - a.y) / Math.max(1, b.y - a.y)) * (b.len - a.len);
  }
  return total;
}

function render() {
  const penY = window.scrollY + window.innerHeight * 0.72;
  const drawn = Math.min(total, Math.max(lengthAt(penY), intro === Infinity ? total : intro));
  thread.style.strokeDashoffset = String(total - drawn);

  if (drawn > 0 && drawn < total) {
    const p = thread.getPointAtLength(drawn);
    tip.setAttribute('cx', p.x.toFixed(1));
    tip.setAttribute('cy', p.y.toFixed(1));
    tip.style.opacity = '';
  } else {
    tip.style.opacity = '0';
  }

  for (const a of anchors) {
    const t = Math.min(1, Math.max(0, (drawn - a.l0) / Math.max(1, a.l1 - a.l0)));
    const n = a.paths.length;
    a.paths.forEach((p, i) => {
      const local = Math.min(1, Math.max(0, t * n - i));
      p.style.strokeDashoffset = String(1 - local);
    });
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

build();
render();
document.documentElement.classList.add('ink-ready');
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', rebuild);
new ResizeObserver(rebuild).observe(document.body);
document.fonts?.ready.then(rebuild);

// First visit: once the TOP wordmark has stretched out, the pen draws in
// from the corner and underlines the hero's accent word.
if (!reduce) {
  const start = performance.now() + 2300;
  const dur = 1800;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    intro = ease(t) * introTarget;
    render();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
