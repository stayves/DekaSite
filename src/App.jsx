import { useEffect } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import LogoStrip from './components/LogoStrip.jsx'
import Coworker from './components/Coworker.jsx'
import Features from './components/Features.jsx'
import Showcase from './components/Showcase.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import CTA from './components/CTA.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className="backdrop" />
      <Nav />
      <main>
        <Hero />
        <LogoStrip />
        <Coworker />
        <Features />
        <Showcase />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
