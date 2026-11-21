import { useState } from 'react'
import { CONTACTS } from '../data/products'

export function MapEmbed({ src, title, height }: { src: string; title: string; height?: number }) {
  const [opened, setOpened] = useState(import.meta.env.VITE_DEKORAY_PREVIEW !== '1')
  if (!opened) return <div className="map-preview-placeholder" data-embed={src}>
    <button className="btn btn-outline interactive" type="button" onClick={() => setOpened(true)}>Загрузить виджет Яндекса</button>
    <a href={CONTACTS.mapOrganization}>Открыть на Яндекс Картах</a>
  </div>
  return <iframe src={src} title={title} height={height} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
}
