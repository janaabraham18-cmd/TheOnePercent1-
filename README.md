# TheOnePercent1%

The website for TheOnePercent1%, a web design, branding and motion studio. Built with
[Astro](https://astro.build) as a static site.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # type-check + static build into dist/
npm test         # build, then check every page from phone to TV width
```

The checks use Playwright's Chromium; install it once per machine with
`npx playwright install chromium`.

The home page is split into one file per section in `src/components/home/`.

Content lives in `src/data/`:

- `site.ts`: name, contact details, socials, nav
- `services.ts`: services, "the one percent" details, process steps
- `work.ts`: portfolio case studies (each one gets its own `/work/<slug>` page)
- `enquiry.ts`: enquiry form options and the "Is your site in the 99%?" questions
- `about.ts`: the About section's manifesto, numbers and closing line

See `PLACEHOLDERS.md` for what still needs real information before launch.
