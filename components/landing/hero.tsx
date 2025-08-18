import { Button } from "@/components/ui/button"
import { MatrixRainBackground } from "./matrix-rain-background"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden py-20 text-center md:py-32">
      <MatrixRainBackground />
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <h1 className="text-5xl font-bold tracking-tighter text-white sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="inline-block bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">One</span>{" "}
          <span className="font-light italic text-blue-100/80">Application</span>.
          <br />
          <span className="font-light text-white/60">A</span>{" "}
          <span className="inline-block bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-clip-text text-transparent font-black">World</span>{" "}
          <span className="font-light text-white/80">of</span>{" "}
          <span className="underline decoration-blue-400 decoration-2 underline-offset-8">Universities</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100/90">
          MUA is the single platform for applying to universities across the globe. Simplify your journey to higher
          education, from discovery to decision.
        </p>
        <div className="mt-8">
          <Link href="/login">
            <Button
              size="lg"
              className="border-2 border-white bg-white text-blue-600 shadow-2xl transition-all hover:scale-105 hover:bg-transparent hover:text-white"
            >
              Start Your Free Application
            </Button>
          </Link>
        </div>

        {/* Trusted by section */}
        <div className="mt-16">
          <p className="text-sm text-blue-100/50 mb-8">Trusted by students at top universities</p>
          <div className="flex items-center justify-center gap-8 lg:gap-12 flex-wrap">
            <div className="text-white/30 font-bold text-xl tracking-wide">HARVARD</div>
            <div className="text-white/30 font-bold text-xl tracking-wide">MIT</div>
            <div className="text-white/30 font-bold text-xl tracking-wide">OXFORD</div>
            <div className="text-white/30 font-bold text-xl tracking-wide">CAMBRIDGE</div>
            <div className="text-white/30 font-bold text-xl tracking-wide">STANFORD</div>
            <div className="text-white/30 font-bold text-xl tracking-wide">YALE</div>
            <div className="text-white/30 font-bold text-xl tracking-wide">PRINCETON</div>
            <div className="text-white/30 font-bold text-xl tracking-wide">CALTECH</div>
          </div>
        </div>
      </div>
    </section>
  )
}
