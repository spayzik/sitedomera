import { useState } from 'react'
import { SocialContacts } from './SocialContacts'
import { MapEmbed } from './MapEmbed'
import { ArrowUpRight, Calculator, Copy, Layers } from 'lucide-react'
import { CONTACTS } from '../data/products'
import { avitoProfile } from '../lib/avitoProfile'
import { useLeadService } from '../lib/leadState'
import { LeadAction } from './LeadProvider'

export function Showroom({ base = "./" }: { base?: string } = {}) {
  const consultationAvailable = useLeadService()?.terms?.intents.includes('consultation')
  const [copyStatus, setCopyStatus] = useState('')

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
            <h3>Связаться с менеджером</h3>
            <p>Расскажите о проекте. Поможем выбрать фактуру, уточнить наличие и рассчитать материалы.</p>
            {consultationAvailable && (
              <LeadAction intent="consultation" className="btn btn-primary interactive">
                Оставить заявку
              </LeadAction>
            )}
            <SocialContacts base={base} placement="cards" />
            <div className="showroom-commerce-actions">
              <LeadAction intent="samples" className="secondary-action"><Layers size={16} aria-hidden="true" /> Запросить образцы</LeadAction>
              <a className="secondary-action" href={base + 'kalkulyator/'}><Calculator size={16} aria-hidden="true" /> Рассчитать материалы</a>
            </div>
            <div className="showroom-commerce-sources">
              <a className="secondary-action" href={CONTACTS.telegramChannel} target="_blank" rel="noreferrer">Канал в Telegram <ArrowUpRight size={14} aria-hidden="true" /></a>
              <a className="secondary-action" href={avitoProfile} target="_blank" rel="noreferrer">Магазин на Авито <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
          </div>
        </div>

        <div className="showroom-commerce-map">
          <MapEmbed src={CONTACTS.mapWidget} title="Склад и шоурум ДЕКОРАЙ на карте" />
        </div>
      </div>
    </section>
  )
}
