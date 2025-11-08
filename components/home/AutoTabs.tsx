'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const tabs = [
  {
    id: 'interactive-lessons',
    title: 'Interactive Lessons',
    subtitle: 'Grammar & Vocabulary',
    description: 'Master German grammar and expand your vocabulary with interactive lessons that make learning feel like playing games.',
    color: 'from-gray-600 to-gray-800',
    icon: '📚',
  },
  {
    id: 'speaking-practice',
    title: 'Speaking Practice',
    subtitle: 'Conversation Skills',
    description: 'Practice real conversations with AI that responds naturally and gives you feedback on pronunciation and fluency.',
    color: 'from-gray-700 to-gray-900',
    icon: '🎤',
  },
  {
    id: 'exam-prep',
    title: 'Exam Preparation',
    subtitle: 'Goethe Certified',
    description: 'Prepare for the official Goethe exam with authentic practice tests, detailed explanations, and certified content.',
    color: 'from-gray-500 to-gray-700',
    icon: '✓',
  },
  {
    id: 'progress-tracking',
    title: 'Progress Tracking',
    subtitle: 'Smart Analytics',
    description: 'Track your progress with detailed analytics that show your strengths, weaknesses, and personalized recommendations.',
    color: 'from-gray-600 to-gray-900',
    icon: '📊',
  },
];

export default function AutoTabs() {
  const [activeTab, setActiveTab] = useState(0);

  // Auto-rotate tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 md:py-32 bg-black" data-section="auto-tabs">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section title */}
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16 md:mb-20">
            Features designed for success
          </h2>

          {/* Tabs container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-stretch">
            {/* Tab menu */}
            <div className="space-y-2 lg:col-span-1 flex flex-col">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(index)}
                  className={`p-6 rounded-lg border-2 transition-all duration-300 text-left ${
                    activeTab === index
                      ? 'border-white bg-white text-black shadow-lg'
                      : 'border-white/20 bg-black text-white hover:border-white/40'
                  }`}
                >
                  <div className="text-sm font-semibold uppercase tracking-wider mb-1">
                    {tab.title}
                  </div>
                  <div className={`text-xs transition-opacity ${activeTab === index ? 'opacity-100' : 'opacity-60'}`}>
                    {tab.subtitle}
                  </div>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="lg:col-span-2 flex flex-col">
              {tabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className={`transition-all duration-300 ${
                    activeTab === index ? 'opacity-100 block' : 'opacity-0 hidden'
                  }`}
                >
                  {/* Animated orbit circle */}
                  <div className="mb-8">
                    <div className={`w-full h-80 rounded-2xl bg-gradient-to-br ${tab.color} relative overflow-hidden flex items-center justify-center`}>
                      <div className="text-6xl opacity-20">{tab.icon}</div>
                      {/* Animated orbits */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 border-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
                        <div className="absolute w-24 h-24 border-2 border-white/30 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
                        <div className="absolute w-16 h-16 border-2 border-white/40 rounded-full animate-spin" style={{ animationDuration: '10s' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3">{tab.title}</h3>
                    <p className="text-white/70 text-lg leading-relaxed">
                      {tab.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
