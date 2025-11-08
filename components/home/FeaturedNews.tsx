'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const newsItems = [
  {
    id: 1,
    title: 'Faust Launches K Pro: Agentic AI for Biopharma',
    category: 'Press Release',
    date: '2024-11-04',
    image: '/6846da3abb1bef83bcbc29c3_Open-Graph-Owkin-Home.jpg',
    excerpt: 'Introducing K Pro, the decision-making tool powered by agentic AI...',
    href: '/press/k-pro-launch',
  },
  {
    id: 2,
    title: 'The Future of Agentic AI in Healthcare',
    category: 'Blog',
    date: '2024-10-28',
    image: '/648c6f98ee1a29906b609491_v2-orb-rings-1.png',
    excerpt: 'Exploring how agentic reasoning is transforming biomedical research...',
    href: '/blog/agentic-ai-healthcare',
  },
  {
    id: 3,
    title: 'AI Summit 2024 - San Francisco',
    category: 'Event',
    date: '2024-12-10',
    image: '/6734e0595d3ea39698c02e1d_san-fran-hero.jpg',
    excerpt: 'Join us at the AI Summit to explore the latest breakthroughs in biological AI...',
    href: '/events/ai-summit-2024',
  },
];

export default function FeaturedNews() {
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Press Release', 'Blog', 'Event', 'Case Study'];

  return (
    <section className="py-20 md:py-32 bg-black" data-section="featured-news">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What's new at Faust?
            </h2>
            <p className="text-lg text-white/70">
              Latest news, insights, and updates from our team
            </p>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-3 mb-12 md:mb-16">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-white text-black'
                    : 'bg-black text-white border-2 border-white/20 hover:border-white/40'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* News grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex flex-col overflow-hidden rounded-lg bg-white/10 border border-white/20 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-white/10">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                      {item.category}
                    </span>
                    <span className="text-xs text-white/60">{new Date(item.date).toLocaleDateString()}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-sm text-white/70 mb-4 flex-1 line-clamp-2">
                    {item.excerpt}
                  </p>

                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm group-hover:gap-3 transition-all">
                    Read more
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* View all link */}
          <div className="text-center mt-12 md:mt-16">
            <Link
              href="/news"
              className="inline-block px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-white/90 transition-colors"
            >
              View all news
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
