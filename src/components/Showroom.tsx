import { ArrowUpRight, Phone } from 'lucide-react'
import { CONTACTS } from '../data/products'
import { avitoProfile } from '../lib/avitoProfile'
import { inquiryTelegramLink } from '../lib/contactLinks'
import { useLeadService } from '../lib/leadState'
import { LeadAction } from './LeadProvider'

const mapOrganizationId = '55177309503'
const mapSrc = `https://yandex.ru/map-widget/v1/?ol=biz&oid=${mapOrganizationId}`
const mapOrganizationUrl = `https://yandex.ru/maps/org/${mapOrganizationId}/`

export function Showroom() {
  const consultationAvailable = useLeadService()?.terms?.intents.includes('consultation')

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
            <a className="btn btn-white interactive" href={mapOrganizationUrl} target="_blank" rel="noreferrer">
              Открыть в Яндекс Картах <ArrowUpRight size={16} aria-hidden="true" />
            </a>
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
            <a className="showroom-commerce-phone interactive" href={`tel:${CONTACTS.phoneRaw}`}>
              <Phone size={17} aria-hidden="true" /> {CONTACTS.phone}
            </a>
            <div className="showroom-commerce-sources">
              {avitoProfile && <a href={avitoProfile} target="_blank" rel="noreferrer">Магазин на Авито</a>}
              <a href={CONTACTS.telegramChannel} target="_blank" rel="noreferrer">Канал ДЕКОРАЙ в Telegram</a>
            </div>
          </div>
        </div>

        <div className="showroom-commerce-map">
          <iframe
            src={mapSrc}
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
