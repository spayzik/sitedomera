const copyAddress = document.querySelector<HTMLButtonElement>('[data-copy-address]')
const copyStatus = document.querySelector<HTMLElement>('[data-copy-address-status]')

if (copyAddress && copyStatus && navigator.clipboard?.writeText) {
  copyAddress.hidden = false
  copyAddress.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyAddress.dataset.copyAddress ?? '')
      copyStatus.textContent = 'Адрес скопирован'
    } catch {
      copyStatus.textContent = 'Выделите и скопируйте адрес вручную'
    }
  })
}
