import { motion } from 'framer-motion'
import { Ruler, Clock, Droplets, Layers, Warehouse, Truck } from 'lucide-react'

const items = [
  {
    icon: Ruler,
    title: 'Геометрия ±0,1 мм',
    text: 'Заводская калибровка панели 1220×3000 мм. Бесшовный стык с алюминиевым профилем — никаких перепадов и щелей.',
  },
  {
    icon: Clock,
    title: 'Оперативный монтаж',
    text: 'Клеевой монтаж без видимого крепежа, грязи и каркаса. Быстро, чисто и без строительной пыли.',
  },
  {
    icon: Droplets,
    title: 'Влагостойкость',
    text: 'ABA-композит и плёнка PUR-клеем выдерживают влагу и перепады температур. Подходит для кухонь и влажных зон.',
  },
  {
    icon: Layers,
    title: 'Со-экструзия слоёв',
    text: 'Пять слоёв спекаются в единый монолит плотностью 0,7 г/см³: лёгкий лист с прочностью и стабильностью.',
  },
  {
    icon: Warehouse,
    title: 'Прямой склад',
    text: 'Мы не шоурум-витрина, а склад с полным ассортиментом. Все фактуры можно посмотреть и забрать сразу — без посредников.',
  },
  {
    icon: Truck,
    title: 'Отгрузка в день заказа',
    text: 'Самовывоз или отправка через ТК в день заказа. Поможем подобрать логистику до любого города России.',
  },
]

export function WhyUs() {
  return (
    <section className="section why" id="why">
      <div className="container">
        <div className="section-head-flex">
          <div>
            <p className="eyebrow">Преимущества</p>
            <h2>Почему<br/>Домэра</h2>
          </div>
          <p className="lead">
            Шесть причин выбрать бамбуковый композит —
            от точности геометрии до скорости монтажа.
          </p>
        </div>

        <div className="why-grid">
          {items.map((it, i) => {
            const Icon = it.icon
            return (
              <motion.div
                key={it.title}
                className="why-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="why-card-top">
                  <span className="why-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="why-icon"><Icon size={20} /></span>
                </div>
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}