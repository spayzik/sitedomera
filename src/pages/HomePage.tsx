import { useEffect } from 'react'
import { useRoute } from '../router'
import { Hero } from '../components/Hero'
import { Specs } from '../components/Specs'
import { Catalog } from '../components/Catalog'
import { CategoriesTeaser } from '../components/CategoriesTeaser'
import { Manifest } from '../components/Manifest'
import { WhyUs } from '../components/WhyUs'
import { GradientLine } from '../components/GradientLine'
import { Quiz } from '../components/Quiz'
import { Installation } from '../components/Installation'
import { Interiors } from '../components/Interiors'
import { Reviews } from '../components/Reviews'
import { Showroom } from '../components/Showroom'
import { Calculator } from '../components/Calculator'
import { FAQ } from '../components/FAQ'

const firstLazySectionIds = ['installation', 'interiors', 'calculator', 'reviews']
const contactSectionIds = ['showroom']

function SectionAnchor({ route, ids }: { route: string; ids: string[] }) {
  useEffect(() => {
    const id = route.replace('/', '')
    if (!ids.includes(id)) return
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [route, ids])

  return null
}

export function HomePage() {
  const route = useRoute()
  useEffect(() => {
    const id = route.replace('/', '')
    if (!['top', 'specs', 'why', 'catalog'].includes(id)) return
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }))
    return () => cancelAnimationFrame(frame)
  }, [route])

  return (
    <>
      <Hero />
      <GradientLine />
      <Manifest />
      <Specs />
      <WhyUs />
      <CategoriesTeaser />
      <Catalog />
      <GradientLine />
      <Quiz />
      <Installation />
      <Interiors />
      <Reviews />
      <Calculator />
      <SectionAnchor route={route} ids={firstLazySectionIds} />
      <GradientLine />
      <Showroom />
      <FAQ />
      <SectionAnchor route={route} ids={contactSectionIds} />
    </>
  )
}
