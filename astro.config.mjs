// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
    site: 'https://zchunter.github.io',
    integrations: [tailwind()],
    // SmartAudit is separated into smart-audit/ directory and excluded from site builds
    // (The page is no longer in src/pages, so it won't be included automatically)
});
