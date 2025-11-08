'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Play } from 'lucide-react';

export default function VideoSection() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Video */}
            <div className="relative group">
              <div className="relative h-96 md:h-[500px] rounded-lg overflow-hidden bg-gray-900">
                <Image
                  src="/dj-heylove_1400.jpg"
                  alt="We are hiring"
                  fill
                  className="object-cover"
                />

                {/* Play button overlay */}
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors"
                >
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Play size={40} className="text-white fill-white ml-1" />
                  </div>
                </button>

                {/* Video embed (shown when play is clicked) */}
                {showVideo && (
                  <div className="absolute inset-0">
                    <iframe
                      src="https://player.vimeo.com/video/998208801"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <p className="text-xs uppercase tracking-widest text-black/60 mb-3">Join our team</p>
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
                We are hiring
              </h2>
              <p className="text-lg text-black/70 mb-6 leading-relaxed">
                Join a world-class team building biological superintelligence. We're looking for talented scientists, engineers, and product visionaries to shape the future of biomedical AI.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  'Competitive compensation and equity',
                  'Health and wellness benefits',
                  'Professional development opportunities',
                  'Collaborative and innovative culture',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    {benefit}
                  </li>
                ))}
              </ul>

              <Link
                href="/careers"
                className="inline-block px-8 py-3 bg-white text-primary rounded-full font-semibold hover:bg-gray-200 transition-colors"
              >
                Careers at Faust
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
