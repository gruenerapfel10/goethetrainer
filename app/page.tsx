import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { FeaturesShowcase } from "@/components/landing/features-showcase"
import { Posters } from "@/components/landing/posters"
import { Testimonials } from "@/components/landing/testimonials"
import { Footer } from "@/components/landing/footer"
import { AnimatedSection } from "@/components/landing/animated-section"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-black text-white">
        <Header />
        <main className="flex-1">
          <Hero />
          <div className="relative z-10 bg-black">
            <AnimatedSection>
              <FeaturesShowcase />
            </AnimatedSection>
            <AnimatedSection>
              <Posters />
            </AnimatedSection>
            <AnimatedSection>
              <Testimonials />
            </AnimatedSection>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}