# Working on this site

The studio's own website: TheOnePercent1%, a web design, branding and motion studio.
Astro (static). `npm run build` runs `astro check` before building; `npm test` builds and
then runs the layout checks in `tests/layout.mjs`.

## Structure

The home page (`src/pages/index.astro`) only lists its sections; each one is its own file in
`src/components/home/` (Hero, NinetyNine, Work, Services, Details, Process, About, Contact),
with its markup and scoped styles together. Every home section has the global `.section`
class (shared vertical rhythm), and the shared `.section-head`, `.section-head--split`,
`.section-title` and `.section-intro` styles live in `src/styles/global.css`. Two-digit
numbering uses `pad()` from `src/utils/text.ts`.

## Brand rules

- **Black and white, with gold as the only accent.** `--ink` and `--paper` in
  `src/styles/global.css`; greys only for secondary text and hairlines. Gold (`--gold` on
  white, `--gold-bright` on black, `--gold-text` for small text on white; `--gold-here` /
  `--gold-text-here` pick the right one automatically inside `.on-ink`) is for a few
  deliberate details only, never large areas: the hand-drawn marks on accent words, the one
  remembered dot in the 100-dot grid, the process geometry, the sun arcs in the work section,
  the construction circle on the hero "O", section numbers (`.label__num`), the "1%" badges,
  the contact email underline, the nav hover line, the logo's "1%" block, and the "Start a
  project" buttons (`.btn--gold`: header, phone menu, hero, About).
- **The name is the logo.** `Wordmark.astro` renders "TheOnePercent" plus the "1%" as a
  sharp-cornered gold slab (no radius) with a bold black "1" and a half-size "%" raised like an
  exponent (`--gold` on light sections, `--gold-bright` inside `.on-ink`); the hero/footer
  `KineticWordmark.astro`, the brand film's final logo and `public/favicon.svg` match. Always write the name as
  `TheOnePercent1%` (`site.name`) in copy, titles and alt text.
- **Square corners.** Buttons, tags, form chips, quiz toggles, the film's pause button and the
  "1%" badges are square-cornered to match the logo's slab. Don't round them; dots stay round.
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
  content must stay inside `.wrap`. The home route is drawn around specific class names
  (`HOME_ROUTE_NEEDS` in `ink.ts`); if one goes missing it logs an `[ink]` console warning
  and `npm test` fails. Rename a section's classes in both places, or update the list.
  Everything is computed from the live layout and rebuilt on resize / height change. No randomness: the same layout always draws the same.
  - **Pen line:** a designed route, not a wander. Home: down beside the hero wordmark, along
    the hero hairline, into each accent word's mark, round the one black dot, down the middle
    of the 99%/1% comparison, beside each logo panel, along the services row and the details
    grid, as the process timeline, and round the footer "1%". Other pages: through each
    `[data-mark]` word. Scroll moves the pen; sideways runs take extra scroll. On phones the
    line hugs the page edges and only crosses over just above headings.
  - **Hero blueprint:** 12-column guides plus cap-height / x-height / baseline lines measured
    from the real wordmark, drawn on load; a construction circle + square on the "O" once TOP
    finishes stretching (`kw:done` event from `KineticWordmark.astro`).
  - **Work (black):** a flowing ribbon of parallel lines and sun arcs, drawn as you scroll.
  - **Process (geometry, gold):** the pen becomes a straight timeline through a big shape on
    each step, drawn as the pen passes: circle, triangle, square, hexagon (a project gaining
    structure). When the steps stack (narrow screens) each shape sits beside its step number
    instead. A golden-ratio construction (golden rectangle, square divisions, spiral, guide
    circle and diagonal) fills the extra bottom padding of `.process` on desktop (≥900px).
  - **White space (neutral):** `whiteSpace()` maps each white section (not `.on-ink`, not the
    hero) onto a grid, marks every cell near text, media, controls, borders, backgrounds and
    other drawings (`reserved`) as used, then puts a compass-and-ruler construction in the
    biggest empty squares (up to 4 per section, 2 on phones, kept apart): compass circle,
    square with diagonals, triangle in its circle, concentric rings, hexagram, square on its
    midpoints, each with a guide line across the empty run and a small measurement label
    (desktop only). They draw in as the pen passes. Never hand-place them; they follow the
    layout at every width.
  - **Gold layer:** gold can't go through the difference blend (gold on white inverts to
    blue), so gold drawings live on a second, unblended SVG (`.ink-gold`) at the same z.
- **Brand film** (`BrandFilm.astro` + `src/scripts/brand-film.js`, in the Services section):
  a 30 s coded film drawn live in an SVG, four acts: what the 99% fail to do (pen-struck
  failures, then a blur of SAME) → one dot turns gold and charges → "WE DO THE OPPOSITE." and
  the four services, whip-panned → "Be a part of the TOP", TOP expands into TheOnePercent1%.
  It reuses the site's background drawings (blueprint grid, type lines, process shapes, golden
  spiral, ribbon, sun arcs). Every frame is a pure function of time; it plays only while on
  screen, has a pause button, uses 4:5 on phones, and shows the final frame (27 s) for reduced
  motion. Full-screen flashes stay under three per second; keep it that way. The service list
  in the film is hard-coded in `brand-film.js`, so update it if `services.ts` changes.
- **Enquiry form** (`EnquiryForm.astro`, Contact): service chips, name, email, business,
  timeline, message. Sends via Formspree when `site.formspreeId` is set; otherwise opens the
  visitor's email app with the enquiry filled in. Any element with `data-prefill="<need id>"`
  ticks that service before jumping to `#contact`. Copy lives in `src/data/enquiry.ts`.
- **"Is your site in the 99%?"** (`SiteCheck.astro`, under the 99% comparison): six yes/no
  questions; the result places "your site" in a 100-dot grid (6/6 = the gold dot) and its
  button pre-selects the 1% Audit (or Care) in the enquiry form. Nothing is sent anywhere.
- **Footer wordmark** uses `KineticWordmark` with `trigger="view"`: it waits on "TOP" and
  stretches out the first time it scrolls into view. Only the hero instance (`hero` prop,
  `[data-kw-hero]`) drives the ink's "O" construction; every instance fires `kw:done` so the
  ink redraws around the final layout.
- **About** (`home/About.astro`, copy in `src/data/about.ts`): a full-width manifesto h2 that
  fills from grey to black word by word as it scrolls up (accent word "obsess" gets the gold
  circle mark), four big honest numbers that count up once (the 1 in gold), then a closing
  line and CTA. Reduced motion / no JS: everything shows at once.
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

Run `npm test` before pushing. It builds, then loads every page at 375, 768, 1024, 1280,
1440, 1920 and 2560px and fails on sideways scroll (`scrollWidth - innerWidth` must be 0),
empty space under the footer, script or console errors, `[ink]` warnings, the header showing
the wrong nav for the width, or the brand film / quick check / enquiry form validation not
working. It doesn't judge how
things look, so still screenshot anything you change at a few of those widths.

Pair `vw` sizes with `clamp()`. In grid rows pairing a photo with text, use `align-items: start`.
The header switches from the hamburger to the full nav at 960px (logo 161px + nav 480px
measured); re-measure if links are added.
