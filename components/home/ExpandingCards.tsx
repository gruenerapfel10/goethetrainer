'use client';

import { useState } from 'react';
import Link from 'next/link';

const cards = [
  {
    id: 'adaptive-learning',
    title: 'Adaptive Learning',
    subtitle: 'AI that learns how you learn',
    description: 'Our machine learning algorithms analyze your learning patterns and adjust difficulty, content, and pacing to keep you in the optimal learning zone.',
    keyPoints: [
      'Personalized difficulty levels',
      'Smart content recommendations',
      'Real-time progress adjustments',
      'Spaced repetition scheduling',
    ],
    color: 'from-gray-600 to-gray-700',
  },
  {
    id: 'immersive-content',
    title: 'Immersive Content',
    subtitle: 'Learn from native speakers',
    description: 'Practice with authentic German media—movies, podcasts, news, and conversations—to develop real-world listening and comprehension skills.',
    keyPoints: [
      'Native speaker audio',
      'Authentic video content',
      'Real-world dialogue',
      'Cultural context learning',
    ],
    color: 'from-gray-700 to-gray-800',
  },
  {
    id: 'gamification',
    title: 'Gamification',
    subtitle: 'Learning that feels like playing',
    description: 'Earn streaks, unlock achievements, compete on leaderboards, and climb levels while mastering German grammar, vocabulary, and conversation.',
    keyPoints: [
      'Daily streaks & rewards',
      'Achievement badges',
      'Leaderboards & challenges',
      'Level progression system',
    ],
    color: 'from-gray-500 to-gray-600',
  },
];

export default function ExpandingCards() {
  const [expandedCard, setExpandedCard] = useState(0);

  return (
    <section className="py-20 md:py-32 bg-white" data-section="expanding-cards">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section title */}
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4 md:mb-6">
            Why Faust works
          </h2>
          <p className="text-lg text-black/70 mb-16">
            Three powerful technologies that accelerate your learning
          </p>

          {/* Expanding cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-96 md:h-[500px]">
            {cards.map((card, index) => (
              <div
                key={card.id}
                onMouseEnter={() => setExpandedCard(index)}
                onMouseLeave={() => setExpandedCard(0)}
                className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform flex flex-col justify-end ${
                  expandedCard === index ? 'md:col-span-2' : 'md:col-span-1'
                }`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} transition-all duration-300`} />

                {/* Content */}
                <div className="relative z-10 p-6 md:p-8 text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">{card.title}</h3>
                  <p className="text-sm md:text-base font-semibold mb-4 opacity-90">{card.subtitle}</p>

                  {/* Expanded content */}
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      expandedCard === index ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 md:hidden'
                    }`}
                  >
                    <p className="text-sm mb-6 leading-relaxed opacity-90">{card.description}</p>
                    <ul className="space-y-2 mb-6">
                      {card.keyPoints.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 flex-shrink-0" />
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="#"
                      className="inline-flex items-center gap-2 text-white hover:gap-3 transition-all"
                    >
                      Learn more
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
