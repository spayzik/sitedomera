import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CONTACTS } from './src/data/products.ts'

// Keep the static SEO files aligned with the site data used by the app.
function siteMetadata(): Plugin {
  const canonicalUrl = `${CONTACTS.origin}/`
  const replacements: Record<string, string> = {
    __SITE_BRAND__: CONTACTS.brand,
    __SITE_ADDRESS__: CONTACTS.address,
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
          locations.length === 0 || locations.some((url) => !url.startsWith(canonicalUrl))) {
        throw new Error('robots.txt and sitemap.xml must use the configured site origin')
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

// Подставляет Яндекс.Метрику в index.html, если задан VITE_YM_ID.
// Без ID комментарий-плейсхолдер просто удаляется.
function yandexMetrika(): Plugin {
  return {
    name: 'yandex-metrika',
    transformIndexHtml(html) {
      const id = process.env.VITE_YM_ID
      if (!id || !/^\d+$/.test(id)) {
        return html.replace('<!--YM-COUNTER-->', '')
      }
      const counter = `
    <script>
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
      ym(${id}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:false });
      ym(${id}, "hit", window.location.href);
      window.__ymId = ${id};
    </script>`
      return html.replace('<!--YM-COUNTER-->', counter)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteMetadata(), yandexMetrika()],
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
