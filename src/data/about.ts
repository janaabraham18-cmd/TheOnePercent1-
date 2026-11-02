// About section copy. The manifesto is split around its one accent word,
// which gets the hand-drawn gold circle.

export const manifesto = {
  before:
    'Most of a brand is the same as everyone else’s. The difference lives in the last one percent: the details people feel before they notice them. That’s the part we',
  accent: 'obsess',
  after: 'over.',
};

// Four honest numbers about how we work. `gold` marks the one.
export const aboutStats: { value: number; suffix?: string; label: string; gold?: boolean }[] = [
  { value: 0, label: 'templates. Every site starts from a blank page.' },
  { value: 7, label: 'screen sizes every page is tested at, from phone to TV.' },
  { value: 1, label: 'point of contact, from the first call to launch day.', gold: true },
  { value: 100, suffix: '%', label: 'hand-built. No page builder underneath.' },
];

export const aboutClose =
  'We work directly with owners, so nothing gets lost between you and the person doing the work.';
