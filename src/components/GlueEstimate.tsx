import { useId, useState } from 'react'
import { calculateGluePackages } from '../lib/calculator'

const fields = [
  ['area', 'Площадь нанесения, м²'],
  ['rate', 'Расход по техкарте, г/м²'],
  ['pack', 'Масса упаковки, г'],
  ['price', 'Цена упаковки, ₽ (необязательно)'],
] as const

export function GlueEstimate() {
  const id = useId()
  const [values, setValues] = useState({ area: '', rate: '', pack: '', price: '' })
  const result = calculateGluePackages(values.area, values.rate, values.pack, values.price)
  return <details className="calc-project-total glue-estimate">
    <summary>Оценить расход клея по техкарте</summary>
    <p>Введите расход из инструкции к выбранному клею для вашего основания. Если производитель задаёт расход по длине полос, сначала сверяйте его схему нанесения.</p>
    <div className="glue-estimate-fields">
      {fields.map(([field, label]) => <label key={field} htmlFor={id + '-' + field}>{label}
        <input id={id + '-' + field} inputMode="decimal" maxLength={15} value={values[field]}
          onChange={event => setValues(previous => ({ ...previous, [field]: event.target.value }))} />
      </label>)}
    </div>
    {result && <output aria-live="polite">Расход: {result.grams.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} г · Упаковок: {result.packages}
      {result.costRub !== null && ' · ' + result.costRub.toLocaleString('ru-RU') + ' ₽ по введённой цене'}</output>}
    <p>Эта оценка остаётся отдельной строкой. Она не меняет цены каталога и итог подборки.</p>
  </details>
}
