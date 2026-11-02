# Working on this site

The studio's own website: TheOnePercent1%, a web design and branding studio.
Astro (static). `npm run build` runs `astro check` before building.

## Brand rules

- **Black and white only.** `--ink` and `--paper` in `src/styles/global.css`; greys only
  for secondary text and hairlines. No accent colours.
- **The name is the logo.** `Wordmark.astro` renders "TheOnePercent" plus a solid "1%" block
  (ink block on light sections, inverted inside `.on-ink`). Always write the name as
  `TheOnePercent1%` (`site.name`) in copy, titles and alt text.
- **Hero "TOP" animation.** `KineticWordmark.astro` starts on "TOP" and stretches out into
  "TheOnePercent", then the "1%" block lands (replays on mouse hover). With no JS or with
  reduced motion it shows the full name. Keep its size cap in step with the footer wordmark
  (`11.25rem`), which is what fits the 1440px content width.
- **Positioning:** "99% of websites blend in. Be the one percent that stands out." The
  "other 99%" comparison section sits right under the hero.
- **Client logos are the only colour on the site.** Portfolio items show the client's logo
  (`ClientLogo.astro`) in its own colours on a light panel, not photos.
- **The ink layer** (`src/scripts/ink.ts`): one SVG under all content, drawn white with
  `mix-blend-mode: difference` so it reads black on white sections and white on black ones.
  It sits at z 0 under `.wrap` (z 1), so section backgrounds must stay non-positioned and
  content must stay inside `.wrap`. Everything is computed from the live layout and rebuilt
  on resize / height change. No randomness: the same layout always draws the same.
  - **Pen line:** a designed route, not a wander. Home: down beside the hero wordmark, along
    the hero hairline, into each accent word's mark, round the one black dot, down the middle
    of the 99%/1% comparison, beside each logo panel, along the services row and the details
    grid, as the process timeline (vine), and round the footer "1%". Other pages: through each
    `[data-mark]` word. Scroll moves the pen; sideways runs take extra scroll. On phones the
    line hugs the page edges and only crosses over just above headings.
  - **Hero blueprint:** 12-column guides plus cap-height / x-height / baseline lines measured
    from the real wordmark, drawn on load; a construction circle + square on the "O" once TOP
    finishes stretching (`kw:done` event from `KineticWordmark.astro`).
  - **Work (black):** a flowing ribbon of parallel lines and sun arcs, drawn as you scroll.
  - **Process:** leaves sprout off the vine as the pen passes, a tendril curls at its end, and
    a leafy branch fills the empty space bottom right (desktop).
- **Marks on accent words.** h1/h2 accent words use `<InkWord mark="...">` (swoosh, double,
  zigzag, circle, strike) instead of a plain `.serif` span; the pen draws the mark when it
  reaches the word. Negative words get `strike` ("forgettable"). h3s stay plain `.serif`.
- **One serif word per heading.** Headings are Archivo (condensed via the `wdth` axis); one
  word per heading is set in Instrument Serif italic with `.serif`, via `hl(text, word)` from
  `src/utils/text.ts` for data-driven headings. Pick the most distinctive word, never a filler.

## Content

All copy lives in `src/data/`. `PLACEHOLDERS.md` lists what's unconfirmed; tick items off
as they're confirmed.

## Test the full device range

Check 375, 768, 1024, 1280, 1440, 1920 and 2560px with Playwright, and confirm
`document.documentElement.scrollWidth - innerWidth` is 0 on every page. Pair `vw` sizes with
`clamp()`. In grid rows pairing a photo with text, use `align-items: start`.
The header switches from the hamburger to the full nav at 960px (logo 161px + nav 480px
measured); re-measure if links are added.
