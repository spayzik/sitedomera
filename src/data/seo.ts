import { CONTACTS } from './products.ts'

export const SEO = {
  home: {
    title: `Бамбуковые стеновые панели и декоративные рейки — ${CONTACTS.brand}`,
    description: `Бамбуковые стеновые панели и декоративные рейки ${CONTACTS.brand}. Каталог фактур, склад и шоурум в Москве по адресу ${CONTACTS.streetAddress}.`,
  },
  catalog: {
    title: `Каталог бамбуковых стеновых панелей — ${CONTACTS.brand}`,
    description: `Каталог стеновых панелей и декоративных реек ${CONTACTS.brand}: фактуры дерева, ткани, металла и другие материалы. Шоурум в Москве.`,
  },
  privacy: {
    title: `Политика конфиденциальности — ${CONTACTS.brand}`,
    description: `Как работает сайт ${CONTACTS.brand}: данные браузера, аналитика и сторонние сервисы.`,
  },
  offer: {
    title: `Условия приобретения — ${CONTACTS.brand}`,
    description: `Информация об условиях приобретения стеновых панелей и декоративных материалов ${CONTACTS.brand}.`,
  },
} as const

export function metadataForRoute(route: string) {
  switch (route) {
    case '/catalog': return SEO.catalog
    case '/privacy': return SEO.privacy
    case '/offer': return SEO.offer
    default: return SEO.home
  }
}
