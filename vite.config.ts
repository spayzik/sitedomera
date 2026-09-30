import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CONTACTS } from './src/data/products.ts'
import { SEO } from './src/data/seo.ts'

// Keep the static SEO files aligned with the site data used by the app.
function siteMetadata(): Plugin {
  const canonicalUrl = `${CONTACTS.origin}/`
  const replacements: Record<string, string> = {
    __SITE_BRAND__: CONTACTS.brand,
    __SITE_HOME_TITLE__: SEO.home.title,
    __SITE_HOME_DESCRIPTION__: SEO.home.description,
    __SITE_CANONICAL_URL__: canonicalUrl,
    __SITE_OG_IMAGE_URL__: `${CONTACTS.origin}/catalog/og-cover.jpg`,
    __SITE_PHONE__: CONTACTS.phone,
    __SITE_CITY__: CONTACTS.city,
    __SITE_STREET_ADDRESS__: CONTACTS.streetAddress,
    __SITE_OPENING_HOURS__: CONTACTS.openingHours,
    __SITE_TELEGRAM__: CONTACTS.telegram,
    __SITE_TELEGRAM_CHANNEL__: CONTACTS.telegramChannel,
  }

  return {
    name: 'site-metadata',
    configResolved(config) {
      const robots = readFileSync(resolve(config.root, 'public/robots.txt'), 'utf8')
      const sitemap = readFileSync(resolve(config.root, 'public/sitemap.xml'), 'utf8')
      const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
      if (!robots.includes(`Sitemap: ${CONTACTS.origin}/sitemap.xml`) ||
          locations.length !== 1 || locations[0] !== canonicalUrl) {
        throw new Error('robots.txt and sitemap.xml must name only the served canonical document')
      }
    },
    transformIndexHtml(html) {
      for (const [marker, value] of Object.entries(replacements)) {
        html = html.replaceAll(marker, value)
      }
      if (/__SITE_[A-Z_]+__/.test(html)) {
        throw new Error('Unresolved site metadata marker in index.html')
      }
      return html
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteMetadata()],
  base: './',
  build: {
    target: 'es2018',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          }
        },
      },
    },
  },
})
