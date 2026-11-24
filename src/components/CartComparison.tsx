import { useId, useState } from 'react'
import { formatDimensions } from '../data/products'
import { sheetPricePerSquareMeter } from '../lib/calculator'
import type { CartItem } from '../lib/cart'
import { StockAvailability } from './StockAvailability'
import { StoreSelect } from './StoreSelect'
import './CartComparison.css'

const money = (value: number) => value.toLocaleString('ru-RU') + ' ₽'

export function CartComparison({ items }: { items: readonly CartItem[] }) {
  const id = useId()
  const [firstId, setFirstId] = useState('')
  const [secondId, setSecondId] = useState('')
  const first = items.find(item => item.product.id === firstId) ?? items[0]
  const otherItems = items.filter(item => item !== first)
  const second = otherItems.find(item => item.product.id === secondId) ?? otherItems[0]
  const selection = [first, second]
  return <details className="cart-compare">
    <summary>Сравнить позиции</summary>
    <div className="cart-compare-controls">
      {([
        ['Первый товар', first.product.id, items, setFirstId],
        ['Второй товар', second.product.id, otherItems, setSecondId],
      ] as const).map(([label, value, options, change], index) => <div key={label}>
        <label htmlFor={id + index}>{label}</label>
        <StoreSelect id={id + index} label={label} value={value} onChange={change}>
          {options.map(({ product }) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </StoreSelect>
      </div>)}
    </div>
    <table>
      <caption className="visually-hidden">Характеристики выбранных товаров</caption>
      <thead><tr><td />{selection.map(({ product }) => <th scope="col" key={product.id}>{product.name}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">Артикул</th>
          {selection.map(({ product }) => <td key={product.id}>{product.sku || '—'}</td>)}</tr>
        <tr><th scope="row">Формат</th>
          {selection.map(({ product }) => <td key={product.id}>{formatDimensions(product)}</td>)}</tr>
        <tr><th scope="row">Цена</th>
          {selection.map(({ product }) => <td key={product.id}>{money(product.priceRub)}/{product.unit}</td>)}</tr>
        <tr><th scope="row">Цена за м²</th>
          {selection.map(({ product }) => {
            const price = sheetPricePerSquareMeter(product)
            return <td key={product.id}>{price === null ? '—' : money(price)}</td>
          })}</tr>
        <tr><th scope="row">Наличие</th>
          {selection.map(({ product }) => <td key={product.id}><StockAvailability productId={product.id} /></td>)}</tr>
      </tbody>
    </table>
  </details>
}
