import { ArrowRight } from 'lucide-react'
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

function ArticleCard({ article, base, featured = false }: { article: SeoPage; base: string; featured?: boolean }) {
  const slug = article.path.split('/')[2]
  const [topic, image, small] = covers[slug] ?? ['Отделка', 'catalog/hero/hero-catalog.webp']
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
        <p className="journal-summary">{article.description}</p>
        <span className="journal-read" aria-hidden="true">Читать статью <ArrowRight size={15} /></span>
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
