import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { MatrixRainBackground } from "@/components/landing/matrix-rain-background"
import { PlanToggle } from "@/components/offer/plan-toggle"
import { PlanCard } from "@/components/offer/plan-card"
import { FeatureMatrix } from "@/components/offer/feature-matrix"
import { Faq } from "@/components/offer/faq"
import { AnimatedSection } from "@/components/landing/animated-section"
import { Compass, Rocket } from "lucide-react"

const explorerFeatures = [
  "Search 500+ Universities",
  "Manage up to 3 Applications",
  "Basic AI Recommendations",
  "Community Forum Access",
]

const navigatorFeatures = [
  "Everything in Explorer, plus:",
  "Unlimited Applications",
  "Advanced AI Matching & Essay Analysis",
  "Deadline & Document Tracking",
  "Priority Email Support",
]

export default function OfferPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      <main className="flex-1">
        <div className="relative overflow-hidden py-20 text-center md:py-28">
          <MatrixRainBackground />
          <div className="relative z-10 container mx-auto px-4 md:px-6">
            <AnimatedSection>
              <h1 className="text-5xl font-bold tracking-tighter text-white sm:text-6xl md:text-7xl">
                Unlock Your Global Potential.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100/90">
                One platform, two distinct paths. Choose the access level that matches your ambition.
              </p>
              <div className="mt-8 flex justify-center">
                <PlanToggle />
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="relative z-10 bg-black py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <AnimatedSection className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
              <PlanCard
                icon={<Compass className="h-8 w-8" />}
                title="Explorer"
                price="$0"
                period="/LIFETIME"
                description="Chart the course. Discover universities and track your core applications."
                features={explorerFeatures}
                ctaText="Start Exploring"
                ctaVariant="outline"
              />
              <PlanCard
                icon={<Rocket className="h-8 w-8" />}
                title="Navigator"
                price="$99"
                period="/PER YEAR"
                description="Master the journey. Unlock the full power of MUA for unlimited applications and elite insights."
                features={navigatorFeatures}
                ctaText="Become a Navigator"
                ctaVariant="primary"
                isRecommended
              />
            </AnimatedSection>

            <AnimatedSection className="mt-24 md:mt-32">
              <FeatureMatrix />
            </AnimatedSection>

            <AnimatedSection className="mt-24 md:mt-32">
              <Faq />
            </AnimatedSection>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
