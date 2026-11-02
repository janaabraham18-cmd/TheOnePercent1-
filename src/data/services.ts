// Draft service list. The wording is a starting point to edit, not a promise
// already made to a client. Prices are deliberately left off: every project
// is quoted on scope (see PLACEHOLDERS.md if you want "from" prices shown).

export type Service = {
  id: string;
  title: string;
  /** Exactly-matching word in `title` set in the serif italic. */
  accent: string;
  summary: string;
  includes: string[];
};

export const services: Service[] = [
  {
    id: 'identity',
    title: 'Brand identity',
    accent: 'identity',
    summary:
      'A look and a voice that belong to you: the name in a wordmark or logo, the colours, the type, and the rules that hold it together.',
    includes: [
      'Logo or wordmark, with variations for every size',
      'Colour palette and type system',
      'Brand guidelines you can hand to anyone',
      'Social media templates and profile assets',
      'Business cards, signage and print files',
    ],
  },
  {
    id: 'website',
    title: 'Website design & build',
    accent: 'website',
    summary:
      'A custom website, designed from scratch for your business and built by hand. No page-builder templates, nothing bloated.',
    includes: [
      'Custom design for every page',
      'Hand-built, fast-loading code',
      'Checked on phones, tablets, laptops and big screens',
      'Enquiry and booking forms',
      'Search-ready structure, metadata and sitemap',
      'Domain, hosting and launch handled for you',
    ],
  },
  {
    id: 'both',
    title: 'Brand + website',
    accent: 'website',
    summary:
      'The full package. We build the identity first and then design the website around it, so everything matches from day one.',
    includes: [
      'Everything in Brand identity',
      'Everything in Website design & build',
      'Copywriting help for every page',
      'Photo direction and image selection',
    ],
  },
  {
    id: 'care',
    title: 'Care & updates',
    accent: 'Care',
    summary:
      'Your site keeps working after launch. New pages, price changes, seasonal updates and fixes, done for you when you need them.',
    includes: [
      'Content and price updates',
      'New pages and sections',
      'Hosting and domain looked after',
      'Fixes and small improvements',
    ],
  },
];

// The "one percent": the details that give the business its name. Each line
// should be something we actually do on every project.
export const details: { title: string; body: string }[] = [
  {
    title: 'Tested on every screen',
    body: 'Phones, tablets, laptops and the TV in the meeting room. Layouts break in the in-between sizes, so we check those too.',
  },
  {
    title: 'Words that sound like you',
    body: 'We write and edit the copy with you. Your site launches with real words, not placeholder text.',
  },
  {
    title: 'Fast by default',
    body: 'Hand-built sites with no heavy page builder underneath, so pages load quickly even on a weak mobile signal.',
  },
  {
    title: 'Easy to find',
    body: 'Clean structure, page titles, descriptions and a sitemap, so search engines and AI assistants can read your site properly.',
  },
  {
    title: 'Easy to change',
    body: 'Prices, hours and contact details live in one place, so updating them never means hunting through every page.',
  },
  {
    title: 'Nothing generic',
    body: 'No stock templates and no design trends just for the sake of it. Every choice has to fit your business.',
  },
];

export const process: { title: string; body: string }[] = [
  {
    title: 'Talk',
    body: 'A conversation about your business, your customers and what the brand or site has to do. We come back with a clear scope and a fixed quote.',
  },
  {
    title: 'Direction',
    body: 'Before any pages are designed, we agree on the look and feel: references, colours, type and the structure of the site.',
  },
  {
    title: 'Design & build',
    body: 'We design and build in rounds you can click through on a real link, on your own phone and laptop, not on static mock-ups.',
  },
  {
    title: 'Launch & after',
    body: 'We handle the domain, hosting and launch, then stay on hand for updates as your business changes.',
  },
];
