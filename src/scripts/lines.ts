// Headings rise into place line by line, each line sliding up out of a
// hidden edge. The heading is split into its real lines (as wrapped at the
// current width) only for the length of the animation, then put back exactly
// as it was, so resizing, the ink layer and the accent-word marks
// (InkWord.astro) never see the split. Element children such as InkWord are
// moved, not copied, so anything holding a reference to them keeps it.

const STAGGER = 0.09; // seconds between lines

/** Split `root` into lines and return a function that puts it back. */
function split(root: HTMLElement) {
  // The hero title is already two block lines; split inside each one.
  const blocks = root.querySelectorAll<HTMLElement>(':scope > .hero__line');
  const containers = blocks.length ? [...blocks] : [root];
  const lineEls: HTMLElement[] = [];

  for (const c of containers) {
    // 1. Wrap each word (and each element child) in a span we can measure.
    const words: HTMLElement[] = [];
    let prev: HTMLElement | null = null; // the word the next text touches, if no space between
    for (const node of [...c.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of (node.textContent ?? '').split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(part);
            prev = null;
          } else if (prev) {
            prev.append(part); // e.g. the full stop after an accent word
          } else {
            const w = document.createElement('span');
            w.className = 'lw';
            w.textContent = part;
            frag.append(w);
            words.push(w);
            prev = w;
          }
        }
        node.replaceWith(frag);
      } else if (node instanceof Element) {
        const w = document.createElement('span');
        w.className = 'lw';
        node.replaceWith(w);
        w.append(node);
        words.push(w);
        prev = w;
      }
    }

    // 2. Group the words by the line they landed on.
    const lines: HTMLElement[][] = [];
    let top: number | null = null;
    for (const w of words) {
      const t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 4) {
        lines.push([]);
        top = t;
      }
      lines[lines.length - 1].push(w);
    }

    // 3. Move each line's nodes into a clipping wrapper.
    for (const ws of lines) {
      const line = document.createElement('span');
      line.className = 'ln';
      const inner = document.createElement('span');
      inner.className = 'ln__in';
      inner.style.transitionDelay = `${lineEls.length * STAGGER}s`;
      line.append(inner);
      ws[0].before(line);
      const end = ws[ws.length - 1];
      let n: ChildNode | null = ws[0];
      while (n) {
        const next: ChildNode | null = n.nextSibling;
        inner.append(n);
        if (n === end) break;
        n = next;
      }
      lineEls.push(line);
    }
  }

  const restore = () => {
    for (const line of root.querySelectorAll('.ln')) line.replaceWith(...line.firstElementChild!.childNodes);
    for (const w of root.querySelectorAll('.lw')) w.replaceWith(...w.childNodes);
    root.normalize();
  };
  return { count: lineEls.length, restore };
}

/** Reveal a heading line by line. Call when it scrolls into view. */
export function revealLines(el: HTMLElement) {
  const { count, restore } = split(el);
  el.classList.add('is-split');
  // Two frames so the starting position is painted before it moves.
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-reveal')) * 1000 || 1100;
  window.setTimeout(restore, ms + count * STAGGER * 1000 + 150);
}
