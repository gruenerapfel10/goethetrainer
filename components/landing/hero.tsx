import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden py-20 text-center md:py-32">
      <div className="relative z-20 container mx-auto px-4 md:px-6">
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
          Kingfisher is the single platform for applying to universities across the globe. Simplify your journey to higher
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
        <div className="mt-12">
          <p className="text-sm text-blue-100/50 mb-6">Trusted by students at top universities</p>
          <div className="flex items-center justify-center gap-6 lg:gap-10 overflow-x-auto">
            <Image
              src="/university-images/harvard_university/emblem_harvard_university.svg"
              alt="Harvard University"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
            <Image
              src="/university-images/massachusetts_institute_of_technology/emblem_massachusetts_institute_of_technology.svg"
              alt="MIT"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
            <Image
              src="/university-images/university_of_oxford/emblem_university_of_oxford.svg"
              alt="Oxford University"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
            <Image
              src="/university-images/university_of_cambridge/emblem_university_of_cambridge.svg"
              alt="Cambridge University"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
            <Image
              src="/university-images/stanford_university/emblem_stanford_university.svg"
              alt="Stanford University"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
            <Image
              src="/university-images/imperial_college_london/emblem_imperial_college_london.svg"
              alt="Imperial College London"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
            <Image
              src="/university-images/california_tech_caltech/emblem_california_tech_caltech.svg"
              alt="Caltech"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
            <Image
              src="/university-images/eth_zurich_swiss_federal_tech/emblem_eth_zurich_swiss_federal_tech.svg"
              alt="ETH Zurich"
              width={64}
              height={64}
              className="opacity-30 hover:opacity-50 transition-opacity h-12 w-12 lg:h-16 lg:w-16 object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
