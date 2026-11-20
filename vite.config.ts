import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { CONTACTS, products } from './src/data/products.ts'
import { optionalPublicReleaseFiles, publicReleaseFiles } from './src/data/publicReleaseFiles.ts'
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
      if (!robots.includes(`Sitemap: ${CONTACTS.origin}/sitemap.xml`)) {
        throw new Error('robots.txt must name the production sitemap')
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

function publicCatalog(): Plugin {
  // Node keeps the full source for audit and warehouse matching.
  // The browser gets only the 45 display records and their public fields.
  const catalog = products.map(({
    id, sku, name, categoryId, kind, priceRub, unit, dimensions, thicknessMm, weightKg, material, description, image,
  }) => ({
    id, sku, name, categoryId, kind, priceRub, unit, dimensions, thicknessMm, weightKg, material, description, image,
    status: 'verified',
  }))
  return {
    name: 'public-catalog',
    enforce: 'pre',
    transform(_source, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/data/catalog2026.ts')) return
      return 'export const sourceInventory = ' + JSON.stringify(catalog) + ';\nexport const catalogSource = null;'
    },
  }
}

function publicReleaseAssets(): Plugin {
  let publicDir: string
  return {
    name: 'public-release-assets',
    apply: 'build',
    configResolved(config) { publicDir = config.publicDir },
    writeBundle(output) {
      if (!output.dir) throw new Error('A release directory is required for public assets')
      const required = [...publicReleaseFiles]
      const optional = [...optionalPublicReleaseFiles].filter(file => existsSync(resolve(publicDir, file)))
      for (const file of [...required, ...optional]) {
        const target = resolve(output.dir, file)
        mkdirSync(dirname(target), { recursive: true })
        copyFileSync(resolve(publicDir, file), target)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteMetadata(), publicCatalog(), publicReleaseAssets()],
  base: './',
  build: {
    copyPublicDir: false,
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
