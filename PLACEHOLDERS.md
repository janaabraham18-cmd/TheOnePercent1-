# Still to confirm before launch

- [ ] **Email**: `hello@theonepercent1.com` in `src/data/site.ts` is a stand-in. Swap in the real inbox.
- [ ] **Enquiry form inbox**: the Contact form opens the visitor's email app until a form
      service is connected. Create a free form at formspree.io with your inbox, then paste its
      id into `formspreeId` in `src/data/site.ts`; after that, enquiries arrive straight in
      your inbox and visitors see a thank-you on the page.
- [ ] **Domain**: `https://theonepercent1.com` in `astro.config.mjs` and `public/robots.txt` is a guess.
- [ ] **WhatsApp / phone** (optional): fill `contact.whatsapp` + `whatsappLabel` in `site.ts` to show it.
- [ ] **Instagram / LinkedIn** (optional): fill `social` in `site.ts`; empty links are hidden.
- [ ] **Location** (optional): `contact.location` in `site.ts`; not shown anywhere yet.
- [ ] **About**: the manifesto and the four numbers live in `src/data/about.ts`. They're
      written in a studio "we" voice; check each number is true for how you work (0 templates,
      7 screen sizes tested, 1 point of contact, 100% hand-built) and swap to "I" if you'd
      rather present as a solo designer. A photo of you could sit beside the closing line.
- [ ] **Motion graphics & add-ons**: the Motion graphics service and the five add-ons (1% Audit,
      Website refresh & move, Booking & enquiry systems, Local search setup, Social launch kit)
      in `src/data/services.ts` are drafts. Check the wording and lists match what you'll deliver.
- [ ] **Services**: `src/data/services.ts` is a draft. Check each service and its list matches what you
      actually offer. Prices are deliberately not shown ("quoted on scope"); add "from" prices if you prefer.
- [ ] **Springtide case study**: there's no live link yet. Add `url`/`urlLabel` in `src/data/work.ts` once
      the site is public, and confirm the client is happy to be featured.
- [ ] **Portfolio images**: the case studies use the clients' own photos. Screenshots of the finished
      websites (desktop + phone) would show the design work better; drop them in `src/assets/work/`.
