// Every business detail the site displays lives here, so there's one file to
// correct. Anything marked `placeholder: true` is a stand-in that hasn't been
// confirmed yet. See PLACEHOLDERS.md before launch.

export const site = {
  // The full name is the logo. The wordmark component splits it into
  // "TheOnePercent" + a boxed "1%", but it's always read as this string.
  name: 'TheOnePercent1%',
  nameLead: 'TheOnePercent',
  nameMark: '1%',
  kind: 'Web design, branding & motion studio',
  description:
    '99% of websites blend in. TheOnePercent1% is a web design, branding and motion studio that designs brands, builds websites and creates motion graphics for businesses that want to be the one percent that stands out.',

  contact: {
    placeholder: true,
    email: 'hello@theonepercent1.com',
    // Leave empty to hide. Format the href as wa.me/<number, no + or spaces>.
    whatsapp: '',
    whatsappLabel: '',
    location: '',
  },

  social: {
    placeholder: true,
    instagram: '',
    linkedin: '',
  },
} as const;

export const nav = [
  { href: '/#work', label: 'Work' },
  { href: '/#services', label: 'Services' },
  { href: '/#process', label: 'Process' },
  { href: '/#about', label: 'About' },
] as const;
