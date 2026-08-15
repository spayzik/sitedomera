export type CollectionId =
  | 'wood'
  | 'fabric'
  | 'solid'
  | 'metal'
  | 'soft'
  | 'plaster'
  | 'decor3d'
  | 'slats'
  | 'profiles'

export interface Product {
  id: string
  sku: string
  name: string
  collection: CollectionId
  price: number
  size: string
  thickness: string
  weight: string
  image: string
  swatch: string
  description?: string
  unit?: string
}

export interface Collection {
  id: CollectionId
  name: string
  nameEn: string
  description: string
  banner: string
  count: number
}

export const SPECS = {
  size: '1220 × 3000 мм',
  thickness: '5 мм',
  weight: '13 кг',
  density: '0,7 г/см³',
  material: 'Древесно-бамбуковый композит',
  mount: 'На клей, без видимого крепежа',
  glue: 'PUR, горячего нанесения',
  surface: 'ПВХ / ПП плёнка',
  applications: ['Гостиная', 'Спальня', 'Прихожая', 'Офис', 'Отель', 'Ресторан'],
}

export const CONTACTS = {
  brand: 'Домэра',
  phone: '+7 977 476-08-88',
  phoneRaw: '+79774760888',
  avito: 'https://www.avito.ru/brands/i344978249',
  site: 'domera.ru',
  telegramBot: '', // set VITE_TELEGRAM_BOT_TOKEN in .env
  telegramChat: '', // set VITE_TELEGRAM_CHAT_ID in .env
  telegram: 'https://t.me/domeraru',
  telegramChannel: 'https://t.me/domerarf',
  address: 'Москва, Алтуфьевское ш., 37с1',
  hours: 'Ежедневно 11:00–20:00 (без записи)',
  delivery: 'Самовывоз или отправка в день заказа',
}

export const collections: Collection[] = [
  {
    id: 'wood',
    name: 'Дерево',
    nameEn: 'Wood Series',
    description:
      'Натуральная фактура дерева: тёплые тона и выразительный классический «шёлк».',
    banner: 'catalog/hero/banner-wood.jpg',
    count: 10,
  },
  {
    id: 'fabric',
    name: 'Ткань',
    nameEn: 'Fabric Series',
    description:
      'Тканевая фактура: переплетение нитей и мягкий матовый блеск. Уют текстиля в прочной панели.',
    banner: 'catalog/hero/banner-fabric.jpg',
    count: 4,
  },
  {
    id: 'solid',
    name: 'Однотон',
    nameEn: 'Solid Series',
    description: 'Глубокие однотонные поверхности для минималистичных интерьеров.',
    banner: 'catalog/hero/banner-solid.jpg',
    count: 2,
  },
  {
    id: 'metal',
    name: 'Металл',
    nameEn: 'Metal Series',
    description:
      'Металлический эффект: шлифованная сталь и серебристый рельеф. Холодный блеск, глубокий характер.',
    banner: 'catalog/hero/banner-metal.jpg',
    count: 2,
  },
  {
    id: 'soft',
    name: 'Софт-тач',
    nameEn: 'Soft Touch Series',
    description:
      'Бархатная матовая поверхность Soft-touch: глубокий цвет и приятная на ощупь фактура.',
    banner: 'catalog/hero/banner-soft.jpg',
    count: 2,
  },
  {
    id: 'plaster',
    name: 'Штукатурка',
    nameEn: 'Plaster Series',
    description:
      'Эффект венецианской декоративной штукатурки: мягкие переливы и благородная глубина.',
    banner: 'catalog/hero/banner-plaster.jpg',
    count: 2,
  },
  {
    id: 'decor3d',
    name: 'Декор 3D «Рябь»',
    nameEn: 'Decor 3D',
    description: 'Объёмный 3D-декор «Рябь» с перламутровым свечением.',
    banner: 'catalog/hero/banner-decor3d.jpg',
    count: 1,
  },
  {
    id: 'slats',
    name: 'Декоративные рейки',
    nameEn: 'Decorative Slats',
    description:
      'Реечные панели шириной 15,5 см и высотой 3 м для объёмных акцентных стен.',
    banner: 'catalog/hero/banner-slats.jpg',
    count: 3,
  },
]

const panel = (p: Omit<Product, 'price' | 'size' | 'thickness' | 'weight' | 'image' | 'swatch'> & { price?: number; size?: string }) =>
  ({
    price: p.price ?? 6000,
    size: p.size ?? SPECS.size,
    thickness: SPECS.thickness,
    weight: SPECS.weight,
    image: `catalog/products/${p.id}.jpg`,
    swatch: `catalog/swatches/${p.id}.jpg`,
    unit: 'шт',
    ...p,
  }) as Product

export const products: Product[] = [
  // Wood
  panel({ id: '919-4', sku: '919-4', name: 'Дуб натуральный', collection: 'wood', description: 'Тёплый натуральный дуб с живой текстурой.' }),
  panel({ id: '8548', sku: '8548', name: 'Дуб выбеленный', collection: 'wood', description: 'Светлый выбеленный дуб для воздушных интерьеров.' }),
  panel({ id: '2312-309', sku: '2312-309', name: 'Дуб дымчатый', collection: 'wood', description: 'Мягкий дымчатый оттенок дуба.' }),
  panel({ id: '8891-5', sku: '8891-5', name: 'Орех диагональ', collection: 'wood', description: 'Выразительный орех с диагональным рисунком.' }),
  panel({ id: '8163-11Y73', sku: '8163-11Y73', name: 'Орех американский', collection: 'wood', description: 'Насыщенный американский орех.' }),
  panel({ id: '8892-2', sku: '8892-2', name: 'Дуб тёмный', collection: 'wood', description: 'Глубокий тёмный дуб.' }),
  panel({ id: '921-1', sku: '921-1', name: 'Дуб мокко', collection: 'wood', description: 'Благородный оттенок мокко.' }),
  panel({ id: 'elka-seraya', sku: 'ELKA-S', name: 'Ёлка серая', collection: 'wood', description: 'Ёлочный рисунок в серых тонах.' }),
  panel({ id: 'elka-temnaya', sku: 'ELKA-T', name: 'Ёлка тёмная', collection: 'wood', description: 'Тёмная ёлка для акцентных стен.' }),
  panel({ id: 'C807601-36', sku: 'C807601-36', name: 'Ясень песочный', collection: 'wood', description: 'Светлый ясень с песочным теплом.' }),

  // Fabric
  panel({ id: '671-A227', sku: '671-A227', name: 'Рогожка белая', collection: 'fabric', description: 'Мягкая белая рогожка.' }),
  panel({ id: '8225-6-B1', sku: '8225-6-B1', name: 'Лён кремовый', collection: 'fabric', description: 'Кремовый лён с живым переплетением.' }),
  panel({ id: '8305-W', sku: '8305-W', name: 'Лён светло-серый', collection: 'fabric', description: 'Светло-серый текстильный лён.' }),
  panel({ id: '962-1', sku: '962-1', name: 'Букле серое', collection: 'fabric', description: 'Тактильное серое букле.' }),

  // Solid
  panel({ id: '002-A229', sku: '002-A229', name: 'Бронзовый', collection: 'solid', description: 'Глубокий бронзовый однотон.' }),
  panel({ id: '013-A229', sku: '013-A229', name: 'Графит', collection: 'solid', description: 'Строгий графитовый однотон.' }),

  // Metal
  panel({ id: '006-2', sku: '006-2', name: 'Сталь шлифованная', collection: 'metal', description: 'Холодный блеск шлифованной стали.' }),
  panel({ id: '001-A261', sku: '001-A261', name: 'Серебристый рубчик', collection: 'metal', description: 'Серебристый рельефный рубчик.' }),

  // Soft touch
  panel({ id: 'JGFG-022', sku: 'JGFG-022', name: 'Песочный soft-touch', collection: 'soft', description: 'Бархатный песочный soft-touch.' }),
  panel({ id: '6011-2', sku: '6011-2', name: 'Карамель soft-touch', collection: 'soft', description: 'Тёплая карамель с матовой бархатистостью.' }),

  // Plaster
  panel({ id: '002-A235', sku: '002-A235', name: 'Венецианская, золото', collection: 'plaster', description: 'Венецианская штукатурка с золотым отливом.' }),
  panel({ id: 'M3201-254', sku: 'M3201-254', name: 'Венецианская, жемчуг', collection: 'plaster', description: 'Жемчужная венецианская штукатурка.' }),

  // Decor 3D
  panel({ id: 'ryab-3d', sku: 'RYAB-3D', name: 'Рябь 3D, перламутр', collection: 'decor3d', description: 'Объёмная рябь с перламутровым свечением.' }),

  // Slats
  panel({
    id: '6652-71',
    sku: '6652-71',
    name: 'Рейка, фактура ткань',
    collection: 'slats',
    price: 1500,
    size: '155 × 3000 мм',
    description: 'Декоративная рейка с тканевой фактурой.',
  }),
  panel({
    id: '009-A229',
    sku: '009-A229',
    name: 'Рейка, металлик',
    collection: 'slats',
    price: 1500,
    size: '155 × 3000 мм',
    description: 'Декоративная рейка с металлическим эффектом.',
  }),
  panel({
    id: 'slat-plaster',
    sku: 'SLAT-PL',
    name: 'Рейка, штукатурка золото',
    collection: 'slats',
    price: 1500,
    size: '155 × 3000 мм',
    description: 'Рейка с эффектом венецианской штукатурки.',
  }),
]

export const structureLayers = [
  {
    n: '01',
    title: 'Декоративная плёнка',
    text: 'ПВХ / ПП, износостойкая поверхность с точной имитацией фактур.',
  },
  {
    n: '02',
    title: 'Клей PUR',
    text: 'Горячего нанесения — надёжно, без расслоения и без запаха.',
  },
  {
    n: '03',
    title: 'Со-экструзионный слой',
    text: 'Ровная основа и прочное сцепление слоёв в процессе экструзии.',
  },
  {
    n: '04',
    title: 'Бамбук-полимерный сердечник',
    text: 'ABA-структура, плотность 0,7 г/см³ — лёгкость и прочность.',
  },
]

export const faq = [
  {
    q: 'Какой размер панелей и что есть в наличии?',
    a: 'Стандартный формат стеновых панелей — 1220 × 3000 мм, толщина 5 мм. Декоративные рейки — 155 × 3000 мм. На нашем складе в Москве всегда в наличии панели, завершающие и LED-профили, а также жидкие гвозди для монтажа.',
  },
  {
    q: 'Как осуществляется доставка?',
    a: 'Самовывоз со склада (Алтуфьевское ш., 37с1) или отправка в день заказа. Доставка осуществляется силами покупателей, но мы можем предоставить контакты проверенной транспортной компании.',
  },
  {
    q: 'Сколько стоит панель?',
    a: 'Стеновые панели коллекции 2026 — 6 000 ₽/шт. Декоративные рейки — от 1 500 ₽/шт. Профили комплектуются отдельно.',
  },
  {
    q: 'Как монтируются панели?',
    a: 'Быстрый монтаж на клей (жидкие гвозди) без видимого крепежа и грязных работ. Подходят для квартир, коммерческих помещений, кафе и салонов.',
  },
  {
    q: 'Где можно применять?',
    a: 'Гостиные, спальни, прихожие, ТВ-зоны, офисы, магазины, рестораны и ресепшн-зоны. Влагостойки и устойчивы к ежедневной эксплуатации.',
  },
  {
    q: 'Нужно ли записываться в шоурум?',
    a: 'Нет, приезжайте без записи. У нас не просто шоурум, а большой склад — панели можно посмотреть вживую и сразу забрать. Ежедневно 11:00–20:00.',
  },
]
