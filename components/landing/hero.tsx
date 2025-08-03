import { Button } from "@/components/ui/button"
import { MatrixRainBackground } from "./matrix-rain-background"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden py-20 text-center md:py-32">
      <MatrixRainBackground />
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <h1 className="text-5xl font-bold tracking-tighter text-white sm:text-6xl md:text-7xl lg:text-8xl">
          One Application.
          <br />A World of Universities.
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
      </div>
    </section>
  )
}
