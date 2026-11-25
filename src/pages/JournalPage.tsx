import { ArrowLeft, ArrowRight, Check, Clock3, Lightbulb } from 'lucide-react'
import { seoPages, type SeoPage } from '../data/seoRoutes'
import { storefrontImageSize } from '../data/storefrontImageSizes'

const covers: Record<string, readonly [string, string, string?]> = {
  'kak-vybrat-fakturu': ['Выбор материала', 'catalog/rooms/interior-living.webp', 'catalog/rooms/interior-living-480.webp'],
  'kak-sravnit-stoimost-otdelki': ['Бюджет', 'catalog/rooms/concept-wood.webp'],
  'kak-rasschitat-paneli': ['Расчёт', 'catalog/hero/hero-catalog.webp'],
  'paneli-ili-gibkiy-kamen': ['Выбор материала', 'catalog/rooms/interior-fabric.webp', 'catalog/rooms/interior-fabric-480.webp'],
  'bambukovye-paneli-plyusy-i-ogranicheniya': ['Выбор материала', 'catalog/rooms/interior-dining.webp', 'catalog/rooms/interior-dining-480.webp'],
  'tv-zona-paneli-i-reyki': ['Интерьер', 'catalog/rooms/interior-bedroom.webp', 'catalog/rooms/interior-bedroom-480.webp'],
  'stenovye-paneli-dlya-kommercheskih-pomescheniy': ['Коммерческие пространства', 'catalog/rooms/interior-metal.webp', 'catalog/rooms/interior-metal-480.webp'],
}

const featuredPath = '/news/kak-vybrat-fakturu/'
const articles = seoPages.filter(page => page.kind === 'article')

function articleCover(path: string) {
  return covers[path.split('/')[2]] ?? ['Отделка', 'catalog/hero/hero-catalog.webp'] as const
}

function ArticleCard({ article, base, featured = false, compact = false }: {
  article: SeoPage & { lastmod: string }; base: string; featured?: boolean; compact?: boolean
}) {
  const [topic, image, small] = articleCover(article.path)
  return <article className={featured ? 'journal-card journal-featured' : 'journal-card'}>
    <a href={base + article.path.slice(1)}>
      <div className="journal-cover">
        <img src={base + image} {...storefrontImageSize(image)} alt="" decoding="async" loading={featured ? 'eager' : 'lazy'} fetchPriority={featured ? 'high' : undefined}
          srcSet={small ? base + small + ' 480w, ' + base + image + ' ' + storefrontImageSize(image).width + 'w' : undefined}
          sizes={featured ? '(max-width: 760px) 100vw, 58vw' : '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw'} />
      </div>
      <div className="journal-card-body">
        <p className="eyebrow journal-topic">{topic}</p>
        {featured ? <h2>{article.heading}</h2> : <h3>{article.heading}</h3>}
        {!compact && <p className="journal-summary">{article.description}</p>}
        {compact
          ? <span className="journal-read"><time dateTime={article.lastmod}>{dateLabel.format(new Date(article.lastmod))}</time><ArrowRight size={15} aria-hidden="true" /></span>
          : <span className="journal-read" aria-hidden="true">Читать статью <ArrowRight size={15} /></span>}
      </div>
    </a>
  </article>
}

export function JournalPage({ page, base }: { page: SeoPage; base: string }) {
  const featured = articles.find(article => article.path === featuredPath)
  return <section className="container page-section journal">
    <nav className="page-crumbs" aria-label="Хлебные крошки">
      <a href={base}>ДЕКОРАЙ</a><span aria-current="page">Статьи</span>
    </nav>
    <header className="page-intro">
      <h1>{page.heading}</h1>
      <p className="lead">{page.description}</p>
    </header>
    {featured && <ArticleCard article={featured} base={base} featured />}
    <section className="journal-list" aria-labelledby="journal-articles">
      <h2 id="journal-articles">Все материалы</h2>
      <div className="journal-grid">
        {articles.filter(article => article !== featured).map(article => <ArticleCard key={article.path} article={article} base={base} />)}
      </div>
    </section>
  </section>
}

const practicalGuides: Record<string, { example: string; checks: [string, string, string] }> = {
  'kak-vybrat-fakturu': { example: 'Если пол уже с заметным рисунком, приложите к нему два образца: спокойную тканевую фактуру и дерево. Посмотрите с места входа в комнату, а вечером повторите сравнение при основном свете.', checks: ['Возьмите образец пола или обивки', 'Сравните два образца на вертикальной поверхности', 'Запишите артикул и направление рисунка'] },
  'kak-sravnit-stoimost-otdelki': { example: 'Лист 1220 × 3000 мм имеет площадь 3,66 м². При цене 7 000 ₽ это около 1 913 ₽ за м² материала. Смету считайте по целым листам и добавляйте профили, доставку и монтаж отдельными строками.', checks: ['Проверьте, указана цена за лист или за м²', 'Сравните число целых листов по раскладкам', 'Запросите сметы с одинаковым составом работ'] },
  'kak-rasschitat-paneli': { example: 'Стена 3 × 2,5 м — это 7,5 м². С запасом 10% получится 8,25 м². Для листа 1220 × 3000 мм оценка по площади даст 3 листа. Перед заказом проверьте раскладку по фактическим размерам стены.', checks: ['Запишите ширину и высоту каждой стены', 'Отметьте проёмы на эскизе', 'Сверьте количество с раскладкой, особенно возле углов'] },
  'paneli-ili-gibkiy-kamen': { example: 'Для стены с нишей сравнивайте два участка отдельно. На плоскости важны рисунок и стыки. Для откоса или изгиба попросите подтвердить, подходит ли конкретный артикул и какое основание ему нужно.', checks: ['Приложите оба образца к полу и мебели', 'Отметьте ниши, края и места сгиба', 'Уточните условия крепления выбранного артикула'] },
  'bambukovye-paneli-plyusy-i-ogranicheniya': { example: 'Для стены высотой 2,7 м лист длиной 3 м оставляет 30 см на подрезку по длине. Вертикальные стыки всё равно нужно отметить на эскизе, а возможность использовать остаток зависит от рисунка и раскроя.', checks: ['Проверьте формат панели по карточке', 'Нанесите стыки и вырезы на эскиз', 'Запросите документы, если помещение предъявляет особые требования'] },
  'tv-zona-paneli-i-reyki': { example: 'На схеме ТВ-зоны отметьте край экрана, тумбу и место вывода проводов. Сначала выберите границу фоновой панели, затем проверьте, сколько места остаётся для ряда реек и оформления открытого края.', checks: ['Нанесите технику и точки подключения на эскиз', 'Определите границы фона и акцента', 'Уточните доступ к проводам и крепление кронштейна'] },
  'stenovye-paneli-dlya-kommercheskih-pomescheniy': { example: 'Для стойки и зоны ожидания составьте две строки ведомости. В каждой укажите артикул, единицу, количество и дату потребности. Документы по материалу запросите отдельно для каждой зоны.', checks: ['Сверьте назначение и условия уборки зоны', 'Согласуйте требования с проектировщиком', 'Проверьте партии, объём и график поставки'] },
}

const readerNotes: Record<string, string> = {
  "kak-vybrat-fakturu": "Начните со среды, которую менять не будете: пола, дверей и основной мебели. Затем решите, какой должна быть стена — нейтральным фоном или акцентом. Подберите два образца с близким тоном, но разным рисунком. Так при сравнении будет понятно, что меняет впечатление: цвет или сама фактура.",
  "kak-sravnit-stoimost-otdelki": "Сделайте две колонки в смете: материал и всё, что нужно для готовой стены. В первой укажите цену за лист, количество и остатки после раскроя. Во второй запишите расходники, доставку, подготовку основания и монтаж. Если какая-то позиция пока не посчитана, оставьте её отдельной строкой для уточнения.",
  "kak-rasschitat-paneli": "Проёмы уменьшают площадь, но не всегда уменьшают число листов. Например, дверной проём может разделить лист на две детали, которые нужно вырезать из нового листа из-за направления рисунка. Поэтому сначала посчитайте оценку по площади, а затем разложите целые листы на эскизе вокруг проёмов.",
  "paneli-ili-gibkiy-kamen": "Сравнивайте материалы на конкретном фрагменте помещения. Для прямой стены решите, где будут видны стыки. Для сложной геометрии отметьте изгиб или откос, сфотографируйте основание и запросите подтверждение, что выбранный материал подходит для этого участка.",
  "bambukovye-paneli-plyusy-i-ogranicheniya": "У крупного листа есть практическое преимущество: при подходящей высоте стены можно заранее спланировать раскрой без горизонтального стыка. Но длинное изделие ещё нужно занести на объект. Измерьте дверные проёмы, повороты в коридоре и доступный проход до заказа доставки.",
  "tv-zona-paneli-i-reyki": "Сначала проведите на эскизе ось телевизора и тумбы, затем отметьте границы панелей и реек. После этого проверьте, что схема оставляет доступ к розеткам и кабелям. Финишную раскладку согласуйте вместе со способом крепления техники к основанию.",
  "stenovye-paneli-dlya-kommercheskih-pomescheniy": "У входа, в проходах и в зоне ожидания стены используются по-разному. Соберите по каждой зоне отдельные требования к отделке и условиям уборки. Сверьте их с проектной документацией и запросите подтверждения для выбранного артикула до согласования поставки."
}

const dateLabel = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'UTC' })

const textureLinks = [
  ['Под дерево', 'derevo', 'wood'], ['Под камень', 'bambuk-pod-kamen', 'bamboo_stone'],
  ['Под ткань', 'tkan', 'fabric'], ['Софт-тач', 'soft-tach', 'soft'],
] as const

export function ArticlePage({ page, base }: { page: Extract<SeoPage, { copy: unknown }> & { lastmod: string }; base: string }) {
  const [topic, image, small] = articleCover(page.path)
  const slug = page.path.split('/')[2]
  const guide = practicalGuides[slug]
  const note = readerNotes[slug]
  const ownsTextures = slug === 'kak-vybrat-fakturu'
  const comparesStone = slug === 'paneli-ili-gibkiy-kamen'
  const candidates = articles.filter(article => article.path !== page.path)
  const related = [...candidates.filter(article => articleCover(article.path)[0] === topic),
    ...candidates.filter(article => articleCover(article.path)[0] !== topic)].slice(0, 3)
  const words = [page.description, note, ...page.copy.blocks.map(({ text }) => text), guide?.example,
    ...(guide?.checks ?? [])].filter(Boolean).join(' ').trim().split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(words / 180))
  return <article className="container page-section reading-page">
    <nav className="page-crumbs" aria-label="Хлебные крошки">
      <a href={base}>ДЕКОРАЙ</a><a href={base + 'news/'}>Статьи</a><span aria-current="page">{page.heading}</span>
    </nav>
    <header className="page-intro reading-intro">
      <div className="reading-meta">
        <span className="reading-topic">{topic}</span>
        <time dateTime={page.lastmod}>Обновлено {dateLabel.format(new Date(page.lastmod))}</time>
        <span><Clock3 size={14} aria-hidden="true" /> {readTime} мин чтения</span>
      </div>
      <h1>{page.heading}</h1>
      <p className="lead">{page.description}</p>
    </header>
    <div className="reading-cover">
      <img src={base + image} {...storefrontImageSize(image)} alt="" decoding="async"
        srcSet={small ? base + small + ' 480w, ' + base + image + ' ' + storefrontImageSize(image).width + 'w' : undefined}
        sizes="(max-width: 760px) 100vw, 72rem" fetchPriority="high" />
    </div>
    <div className="reading-layout">
      <nav className="reading-toc" aria-labelledby="reading-contents">
        <h2 id="reading-contents">Содержание статьи</h2>
        <ol>
          {ownsTextures && <li><a href="#textures">Фактуры в каталоге</a></li>}
          {page.copy.blocks.map(({ heading }, index) =>
            <li key={heading}><a href={'#part-' + (index + 1)}>{heading}</a></li>)}
          {comparesStone && <li><a href="#comparison">Сравнение материалов</a></li>}
          {guide && <><li><a href="#practice">Практический пример</a></li><li><a href="#checklist">Перед покупкой</a></li></>}
        </ol>
      </nav>
      <div className="reading-body">
        {note && <p className="reading-opening">{note}</p>}
        {ownsTextures && <section id="textures">
          <h2>Фактуры в каталоге</h2>
          <div className="reading-textures">{textureLinks.map(([label, route, collection]) => {
            const texture = 'catalog/hero/collection-' + collection + '.webp'
            return <a key={route} href={base + 'catalog/' + route + '/'}>
              <img src={base + texture} {...storefrontImageSize(texture)} alt="" loading="lazy" decoding="async" />
              <span>{label} <ArrowRight size={14} aria-hidden="true" /></span>
            </a>
          })}</div>
        </section>}
        {page.copy.blocks.map(({ heading, text }, index) =>
          <section id={'part-' + (index + 1)} key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
        {comparesStone && <section id="comparison">
          <h2>Сравнение материалов</h2>
          <table className="reading-comparison">
            <thead><tr><th scope="col">Материал</th><th scope="col">Что проверить на образце</th></tr></thead>
            <tbody>
              <tr><th scope="row">Панели под камень</th><td>Масштаб рисунка и вид стыка на плоской стене.</td></tr>
              <tr><th scope="row">Гибкий камень</th><td>Пригодность к изгибу, допустимый радиус и требования к основанию для выбранного артикула.</td></tr>
            </tbody>
          </table>
        </section>}
        {guide && <>
          <section id="practice" className="reading-practice">
            <Lightbulb size={22} aria-hidden="true" />
            <div><h2>Практический пример</h2><p>{guide.example}</p></div>
          </section>
          <section id="checklist" className="reading-checklist">
            <h2>Перед покупкой</h2>
            <ul>{guide.checks.map(check => <li key={check}><Check size={17} aria-hidden="true" />{check}</li>)}</ul>
          </section>
        </>}
        <nav className="reading-actions" aria-label="По теме статьи">
          {page.copy.links?.map(link => <a key={link.path} className="secondary-action"
            href={link.path.startsWith('/') ? base + link.path.slice(1) : link.path}>{link.label}<ArrowRight size={14} aria-hidden="true" /></a>)}
        </nav>
      </div>
    </div>
    <section className="journal-list reading-related" aria-labelledby="related-articles">
      <div><h2 id="related-articles">Похожие статьи</h2>
        <a className="secondary-action" href={base + 'news/'}><ArrowLeft size={15} aria-hidden="true" /> Все статьи</a></div>
      <div className="journal-grid">{related.map(article => <ArticleCard key={article.path} article={article} base={base} compact />)}</div>
    </section>
  </article>
}
