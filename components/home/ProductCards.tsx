'use client';

import Image from 'next/image';
import Link from 'next/link';

const products = [
  {
    title: 'K Pro',
    description: 'The Agentic AI decision-making tool for biopharma',
    badge: 'NEW',
    features: ['Explore data', 'Advance discoveries', 'Optimize clinical trials'],
    image: '/6842b42788f1e465aabd1e4b_Featured-K-Screenshots-NEW2.jpg',
    logo: '/6842ad09d2d41eb8e266fd4c_K-Pro.png',
    cta: 'Book a demo',
    href: '/k-os/k-pro',
  },
  {
    title: 'K Pro FREE',
    description: 'The agentic playground',
    badge: 'BETA',
    features: ['Explore K Pro', 'No credit card required', 'Try agentic reasoning'],
    image: '/67ffd2a3187550499d8dc65e_Featured-K-Screenshots-NEW4.jpg',
    logo: '/68f0db87fa38f1edd4841da0_K Pro Idents_K Pro Free.svg',
    cta: 'Try now',
    href: '/k-os/k-pro-free',
  },
];

export default function ProductCards() {
  return (
    <section className="py-20 md:py-32 bg-white" data-section="product-cards">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section title */}
          <div className="mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Choose your learning path
            </h2>
            <p className="text-lg text-black/70">
              From beginner to advanced, Faust has a learning plan tailored to your goals and timeline.
            </p>
          </div>

          {/* Product cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {products.map((product, index) => (
              <Link
                key={index}
                href={product.href}
                className="group relative overflow-hidden rounded-2xl bg-white border-2 border-black/10 shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                {/* Background image */}
                <div className="absolute inset-0">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
                </div>

                {/* Content */}
                <div className="relative p-8 md:p-12 min-h-96 flex flex-col justify-between">
                  {/* Top */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Image
                        src={product.logo}
                        alt={product.title}
                        width={120}
                        height={40}
                        className="h-6 w-auto"
                      />
                      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold uppercase rounded-full">
                        {product.badge}
                      </span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold text-black mb-2">
                      {product.title}
                    </h3>
                    <p className="text-lg text-black/70 mb-6">
                      {product.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div>
                    <ul className="space-y-2 mb-8">
                      {product.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-black">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button className="px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-black/90 transition-colors inline-block group-hover:translate-y-1 transition-transform">
                      {product.cta}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
