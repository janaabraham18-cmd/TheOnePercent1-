// Copy for the enquiry form (Contact) and the "Is your site in the 99%?"
// quick check (under the 99% comparison). Edit the words here.

export const needs = [
  { id: 'brand', label: 'Brand identity' },
  { id: 'website', label: 'Website' },
  { id: 'motion', label: 'Motion graphics' },
  { id: 'care', label: 'Care & updates' },
  { id: 'audit', label: 'The 1% Audit' },
  { id: 'unsure', label: 'Not sure yet' },
] as const;

export const timelines = [
  { id: 'asap', label: 'As soon as possible' },
  { id: 'soon', label: 'In 1–3 months' },
  { id: 'exploring', label: 'Just exploring' },
] as const;

export type NeedId = (typeof needs)[number]['id'];

// Six yes/no questions. "Yes" is always the 1% answer.
export const checkQuestions = [
  'Does it load in under 3 seconds on a phone?',
  'Does it look right on phones, laptops and big screens?',
  'Was it designed for your business, not from a template?',
  'Does it use your own photos, not stock images?',
  'Does the writing sound like you, not like everyone else?',
  'Has it been updated in the last year?',
];

// Results by score (number of "yes" answers). `cta` pre-selects a service in
// the enquiry form.
export const checkResults: { min: number; title: string; body: string; cta: string; prefill: NeedId }[] = [
  {
    min: 6,
    title: 'You’re in the 1%.',
    body: 'Nicely done. If you want to keep it that way, we look after sites too.',
    cta: 'Talk to us about care',
    prefill: 'care',
  },
  {
    min: 4,
    title: 'Close to the 1%.',
    body: 'The foundations are there. A handful of details stand between you and standing out.',
    cta: 'Get a 1% Audit',
    prefill: 'audit',
  },
  {
    min: 2,
    title: 'It’s blending in.',
    body: 'A few basics are holding it back. An audit shows which fixes matter most.',
    cta: 'Get a 1% Audit',
    prefill: 'audit',
  },
  {
    min: 0,
    title: 'It’s in the 99%.',
    body: 'Right now it looks like everyone else’s. The good news: every one of these is fixable.',
    cta: 'Get a 1% Audit',
    prefill: 'audit',
  },
];
