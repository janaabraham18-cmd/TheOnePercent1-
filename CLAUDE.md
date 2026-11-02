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
- **The pen line** (`src/scripts/ink.ts`): one faint hand-drawn line runs down every page,
  curling into spirals between sections. Scroll position moves the pen (down draws, up
  rewinds). It's white with `mix-blend-mode: difference`, so it reads black on white sections
  and white on black ones; it sits at z 0 under `.wrap` (z 1), so section backgrounds must
  stay non-positioned and content must stay inside `.wrap`. The route is computed from the
  live layout: it comes down the right edge beside the hero wordmark, then for each
  `[data-mark]` word runs down the left gutter beside the heading and turns into the word's
  bold mark. Rebuilt on resize and when the page height changes.
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
