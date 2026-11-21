import { useState } from 'react'
import { ArrowUpRight, Copy, Phone } from 'lucide-react'
import { CONTACTS } from '../data/products'
import { avitoProfile } from '../lib/avitoProfile'
import { contactLinks, inquiryTelegramLink, inquiryWhatsAppLink } from '../lib/contactLinks'
import { useLeadService } from '../lib/leadState'
import { LeadAction } from './LeadProvider'

export function Showroom() {
  const consultationAvailable = useLeadService()?.terms?.intents.includes('consultation')
  const [copyStatus, setCopyStatus] = useState('')
  const whatsapp = inquiryWhatsAppLink('consultation')

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTACTS.address)
      setCopyStatus('Адрес скопирован')
    } catch {
      setCopyStatus('Выделите адрес и скопируйте его вручную')
    }
  }

  return (
    <section className="section showroom showroom-commerce" id="showroom" aria-labelledby="showroom-heading">
      <div className="container">
        <div className="showroom-commerce-grid">
          <div className="showroom-commerce-visit">
            <h2 id="showroom-heading">Шоурум ДЕКОРАЙ<br />в Москве</h2>
            <p className="lead">
              Посмотрите образцы вживую и сравните фактуры. Наличие нужного образца уточните перед поездкой.
            </p>
            <address className="showroom-commerce-address">
              <strong>{CONTACTS.address}</strong>
              <span>{CONTACTS.hours}</span>
            </address>
            <div className="showroom-commerce-directions">
              <a className="btn btn-white interactive" href={CONTACTS.mapOrganization} target="_blank" rel="noreferrer">
                Маршрут в Яндекс Картах <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <button type="button" className="showroom-commerce-copy interactive" onClick={copyAddress}>
                <Copy size={16} aria-hidden="true" /> Скопировать адрес
              </button>
            </div>
            <p className="showroom-commerce-copy-status" role="status">{copyStatus}</p>
          </div>

          <div className="showroom-commerce-manager">
            <h3>Подберём материалы</h3>
            <p>Расскажите о проекте. Поможем выбрать фактуру, уточнить наличие и рассчитать материалы.</p>
            {consultationAvailable ? (
              <LeadAction intent="consultation" className="btn btn-primary interactive">
                Связаться с менеджером
              </LeadAction>
            ) : (
              <a className="btn btn-primary interactive" href={inquiryTelegramLink('consultation')}
                target="_blank" rel="noreferrer">
                Написать в Telegram <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
            <a className="showroom-commerce-phone interactive" href={contactLinks.phone}>
              <Phone size={17} aria-hidden="true" /> {contactLinks.phoneLabel}
            </a>
            <div className="showroom-commerce-sources">
              <a href={inquiryTelegramLink('samples')} target="_blank" rel="noreferrer">Запросить образцы</a>
              <a href={import.meta.env.BASE_URL + 'kalkulyator/'}>Рассчитать материалы</a>
            </div>
            <div className="showroom-commerce-sources">
              <a href={avitoProfile} target="_blank" rel="noreferrer">Магазин на Авито</a>
              <a href={contactLinks.telegramChannel} target="_blank" rel="noreferrer">Канал в Telegram</a>
              {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
              {contactLinks.max && <a href={contactLinks.max} target="_blank" rel="noreferrer">MAX</a>}
              {contactLinks.instagram && <a href={contactLinks.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            </div>
          </div>
        </div>

        <div className="showroom-commerce-map">
          <iframe
            src={CONTACTS.mapWidget}
            title="Склад и шоурум ДЕКОРАЙ на карте"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
