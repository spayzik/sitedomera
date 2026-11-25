import { ArrowUpRight, Calculator } from 'lucide-react'
import { useId, useState } from 'react'
import type { Product } from '../data/products'
import { calculatorQuery, calculateProjectPanels } from '../lib/calculator'

export function ProductEstimate({ product, calculatorBase = import.meta.env.BASE_URL, expanded = false }: { product: Product; calculatorBase?: string; expanded?: boolean }) {
  const id = useId()
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const result = calculateProjectPanels([{ length, height }], '0', '10', product)
  return (
    <details className="product-estimate" open={expanded || undefined}>
      <summary><Calculator size={16} aria-hidden="true" /> Рассчитать для одной стены</summary>
      <div className="product-estimate-fields">
        <label htmlFor={id + '-width'}>Ширина, м
          <input id={id + '-width'} inputMode="decimal" value={length} onChange={event => setLength(event.target.value)} maxLength={16} />
        </label>
        <label htmlFor={id + '-height'}>Высота, м
          <input id={id + '-height'} inputMode="decimal" value={height} onChange={event => setHeight(event.target.value)} maxLength={16} />
        </label>
      </div>
      <div className="product-estimate-result">
        <output aria-live="polite">
          {result.valid && result.sheets > 0
            ? result.sheets.toLocaleString('ru-RU') + ' лист. с запасом 10% · ' + (result.sheets * product.priceRub).toLocaleString('ru-RU') + ' ₽'
            : 'Введите ширину и высоту стены'}
        </output>
        <a className="secondary-action" href={calculatorBase + 'kalkulyator/?' + calculatorQuery(product.id, { length, height })}>
          Проёмы и другие стены <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </details>
  )
}
