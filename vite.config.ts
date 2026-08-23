import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react(), yandexMetrika()],
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
