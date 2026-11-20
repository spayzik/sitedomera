import { useId, useState } from 'react'
import type { Product } from '../data/products'
import { calculateProjectPanels } from '../lib/calculator'

export function ProductEstimate({ product }: { product: Product }) {
  const id = useId()
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const result = calculateProjectPanels([{ length, height }], '0', '10', product)
  return (
    <details className="product-estimate">
      <summary>Рассчитать для одной стены</summary>
      <div className="product-estimate-fields">
        <label htmlFor={id + '-width'}>Ширина, м
          <input id={id + '-width'} inputMode="decimal" value={length} onChange={event => setLength(event.target.value)} maxLength={16} />
        </label>
        <label htmlFor={id + '-height'}>Высота, м
          <input id={id + '-height'} inputMode="decimal" value={height} onChange={event => setHeight(event.target.value)} maxLength={16} />
        </label>
      </div>
      <output aria-live="polite">
        {result.valid && result.sheets > 0
          ? result.sheets.toLocaleString('ru-RU') + ' лист. с запасом 10% · ' + (result.sheets * product.priceRub).toLocaleString('ru-RU') + ' ₽'
          : 'Введите ширину и высоту стены'}
      </output>
      <a href={'/?material=' + encodeURIComponent(product.id) + '#calculator'}>Учесть проёмы и другие стены</a>
    </details>
  )
}
