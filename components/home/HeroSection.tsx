'use client';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white" data-section="hero">
      {/* Main Hero Content */}
      <div className="w-full px-4 md:px-6 lg:px-8 py-12 md:py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          {/* Hero Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight tracking-tight text-center mb-8 md:mb-12 lg:mb-16">
            Grind language exams like games
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl lg:text-2xl text-center text-black/70 max-w-3xl mx-auto mb-12">
            Master German language proficiency with AI-powered learning and real exam preparation.
          </p>
        </div>
      </div>
    </section>
  );
}
