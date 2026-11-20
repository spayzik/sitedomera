export function startStock(parseInventory, availabilityFor) {
  const state = document.querySelector('#stock-catalog')
  const catalog = JSON.parse(state.textContent)
  const labels = document.querySelectorAll('[data-stock-id]')
  const amount = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 21 })
  const plural = new Intl.PluralRules('ru-RU')
  let inventory = null
  let loading = false
  let expiration

  function render() {
    for (const label of labels) {
      const stock = availabilityFor(inventory, label.dataset.stockId)
      label.dataset.stock = stock.status
      if (stock.status === 'in_stock') {
        const suffix = stock.unit === 'шт' ? 'шт.' : ({ one: 'лист', few: 'листа', many: 'листов', other: 'листа' })[plural.select(stock.quantity)]
        label.textContent = 'В наличии на складе в Москве · ' + amount.format(stock.quantity) + ' ' + suffix
      } else label.textContent = stock.status === 'out_of_stock' ? 'Нет в наличии' : 'Наличие уточняется'
    }
  }

  async function refresh() {
    if (loading || document.hidden) return
    loading = true
    const request = new AbortController()
    const timeout = window.setTimeout(() => request.abort(), 10000)
    try {
      const response = await fetch(new URL(state.dataset.url, document.baseURI),
        { cache: 'no-store', redirect: 'error', signal: request.signal })
      if (!response.ok) return
      const next = parseInventory(await response.json(), catalog)
      if (!inventory || next.updatedAt > inventory.updatedAt) {
        inventory = next
        window.clearTimeout(expiration)
        expiration = window.setTimeout(render, Math.max(0, next.expiresAt - Date.now()))
      }
    } catch { /* A previous verified snapshot stays visible until expiry. */ }
    finally {
      window.clearTimeout(timeout)
      loading = false
      render()
    }
  }

  void refresh()
  window.setInterval(refresh, 120000)
  document.addEventListener('visibilitychange', () => { render(); void refresh() })
}
