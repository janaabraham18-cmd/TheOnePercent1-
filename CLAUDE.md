# Working on this site

The studio's own website: TheOnePercent1%, a web design and branding studio.
Astro (static). `npm run build` runs `astro check` before building.

## Brand rules

- **Black and white only.** `--ink` and `--paper` in `src/styles/global.css`; greys only
  for secondary text and hairlines. No accent colours.
- **The name is the logo.** `Wordmark.astro` renders "TheOnePercent" plus a solid "1%" block
  (ink block on light sections, inverted inside `.on-ink`). Always write the name as
  `TheOnePercent1%` (`site.name`) in copy, titles and alt text.
- **One serif word per heading.** Headings are Archivo (condensed via the `wdth` axis); one
  word per heading is set in Instrument Serif italic with `.serif`, via `hl(text, word)` from
  `src/utils/text.ts` for data-driven headings. Pick the most distinctive word, never a filler.
- Portfolio photos are greyscale (`.mono`) until hovered on the home page; case-study pages
  show them in colour.

## Content

All copy lives in `src/data/`. `PLACEHOLDERS.md` lists what's unconfirmed; tick items off
as they're confirmed.

## Test the full device range

Check 375, 768, 1024, 1280, 1440, 1920 and 2560px with Playwright, and confirm
`document.documentElement.scrollWidth - innerWidth` is 0 on every page. Pair `vw` sizes with
`clamp()`. In grid rows pairing a photo with text, use `align-items: start`.
The header switches from the hamburger to the full nav at 960px (logo 161px + nav 480px
measured); re-measure if links are added.
