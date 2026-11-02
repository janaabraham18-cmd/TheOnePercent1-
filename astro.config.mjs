// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // TODO: swap for the real domain once it's registered (see PLACEHOLDERS.md).
  site: 'https://theonepercent1.com',
  integrations: [sitemap()],
});
