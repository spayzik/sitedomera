import { motion } from 'framer-motion'

const rows = [
  { param: 'Цена за м²', domera: 'от 1 640 ₽', wall: 'от 300 ₽', mdf: 'от 1 200 ₽', pvc: 'от 800 ₽' },
  { param: 'Влагостойкость', domera: 'Да', wall: 'Нет', mdf: 'Ограниченно', pvc: 'Да' },
  { param: 'Геометрия и стыки', domera: 'Идеальная, ±0,1 мм', wall: 'Зависит от стен', mdf: 'Хорошая', pvc: 'Средняя' },
  { param: 'Монтаж', domera: 'На клей, без пыли', wall: 'Требует ровных стен', mdf: 'Каркас или клей', pvc: 'Замки / клей' },
  { param: 'Уход', domera: 'Влажная протирка', wall: 'Сложный', mdf: 'Осторожный', pvc: 'Простой' },
  { param: 'Срок службы', domera: '15+ лет', wall: '5–7 лет', mdf: '8–10 лет', pvc: '8–12 лет' },
]

const cols = [
  { key: 'domera' as const, title: 'Домэра' },
  { key: 'wall' as const, title: 'Обои' },
  { key: 'mdf' as const, title: 'МДФ' },
  { key: 'pvc' as const, title: 'ПВХ' },
]

export function Compare() {
  return (
    <section className="section compare" id="compare">
      <div className="container">
        <div className="catalog-header" style={{ marginBottom: '3rem' }}>
          <div>
            <p className="eyebrow">Сравнение</p>
            <h2>Домэра против<br/>привычных отделок</h2>
          </div>
          <p className="lead">
            Почему бамбуковый композит выигрывает по совокупности
            параметров — честно и по фактам.
          </p>
        </div>

        <motion.div
          className="compare-scroll"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-param">Параметр</th>
                {cols.map((c) => (
                  <th key={c.key} className={c.key === 'domera' ? 'col-domera' : ''}>
                    {c.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.param}>
                  <td className="compare-param">{r.param}</td>
                  <td className="col-domera">{r.domera}</td>
                  <td>{r.wall}</td>
                  <td>{r.mdf}</td>
                  <td>{r.pvc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <p className="compare-note">
          Ориентировочные данные. Точная цена зависит от коллекции и площади — рассчитайте в калькуляторе или спросите менеджера.
        </p>
      </div>
    </section>
  )
}