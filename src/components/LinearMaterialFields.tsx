import { X } from 'lucide-react'
import { formatDimensions, linearProducts } from '../data/products'
import { calculateLinearPieces } from '../lib/calculator'
import { MAX_QTY } from '../lib/cart'
import { StoreSelect } from './StoreSelect'

export type LinearPlan = { id: number; productId: string; length: string; runs: string }


export function LinearMaterialFields({ plan, index, onChange, onRemove }: {
  plan: LinearPlan
  index: number
  onChange: (value: Partial<LinearPlan>) => void
  onRemove: () => void
}) {
  const selector = 'calculator-linear-' + plan.id
  const chosen = linearProducts.find(item => item.id === plan.productId)
  const estimate = calculateLinearPieces(chosen ?? null, plan.length, plan.runs)
  return <div className="calc-walls">
    <div className="form-group">
      <label htmlFor={selector}>Рейка или профиль {index}</label>
      <StoreSelect id={selector} label={'Рейка или профиль ' + index}
        value={plan.productId} onChange={productId => onChange({ productId })}>
        <option value="">Выберите рейку или профиль</option>
        {linearProducts.map(product => <option key={product.id} value={product.id}>
          {product.name} — {product.priceRub.toLocaleString('ru-RU')} ₽/шт.
        </option>)}
      </StoreSelect>
      {chosen && <span>{formatDimensions(chosen)}</span>}
    </div>
    <fieldset className="calc-wall">
      <legend>Одинаковые отрезки {index}</legend>
      <div className="form-group">
        <label htmlFor={selector + '-length'}>Длина отрезка, м</label>
        <input id={selector + '-length'} type="text" inputMode="decimal" value={plan.length}
          maxLength={16} onChange={event => onChange({ length: event.target.value })} />
      </div>
      <div className="form-group">
        <label htmlFor={selector + '-runs'}>Количество отрезков</label>
        <input id={selector + '-runs'} type="text" inputMode="numeric" value={plan.runs}
          maxLength={4} onChange={event => onChange({ runs: event.target.value })} />
      </div>
      <button type="button" className="secondary-action calc-remove-wall" onClick={onRemove}>
        <X size={14} aria-hidden="true" /> Убрать рейку или профиль {index}
      </button>
    </fieldset>
    {chosen && plan.length && plan.runs && !estimate && <p role="status">
      Укажите длину отрезка до {chosen.dimensions.lengthMm.toLocaleString('ru-RU')} мм
      и целое количество от 1 до {MAX_QTY.toLocaleString('ru-RU')}. Длинные линии разделите по своему плану стыков.
    </p>}
  </div>
}
