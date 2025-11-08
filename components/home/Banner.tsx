'use client';

import Link from 'next/link';

export default function Banner() {
  return (
    <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-3 border-b border-gray-200">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/k-os/k-pro"
            className="flex items-center justify-center gap-3 group cursor-pointer"
          >
            {/* Desktop message */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900">
                <strong>Launching K Pro</strong>: The Agentic AI decision-making tool for biopharma
              </span>
              <div className="px-4 py-1.5 bg-white rounded-full text-xs font-semibold whitespace-nowrap group-hover:bg-gray-100 transition-colors">
                Book a demo
              </div>
            </div>

            {/* Mobile message */}
            <div className="md:hidden flex items-center gap-3 w-full justify-center">
              <span className="text-sm font-semibold text-gray-900">
                <strong>Launching K Pro</strong>
              </span>
              <div className="px-4 py-1.5 bg-white rounded-full text-xs font-semibold whitespace-nowrap group-hover:bg-gray-100 transition-colors">
                Book a demo
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
