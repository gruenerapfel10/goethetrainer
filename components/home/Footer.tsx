'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp } from 'lucide-react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerSections = {
    explore: {
      title: 'Explore',
      links: [
        { label: 'About Faust', href: '/about-us' },
        { label: 'Careers', href: '/careers' },
        { label: 'News', href: '/news' },
        { label: 'Pipeline', href: '/pipeline/pipeline' },
        { label: 'Publications', href: '/publications' },
        { label: 'MOSAIC', href: '/connect/mosaic' },
        { label: 'PortAlt', href: '/portalt' },
        { label: 'Epkin', href: '/epkin' },
      ],
    },
    company: {
      title: 'Company',
      links: [
        { label: 'Press kit', href: '/press-kit' },
        { label: 'Contact', href: '/contact' },
        { label: 'Blog', href: '/blog' },
        { label: 'Events', href: '/events' },
        { label: 'Trust Center', href: '/trust' },
      ],
    },
    legal: {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of use', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'Transparency reports', href: '/transparency' },
        { label: 'Credits', href: '/credits' },
      ],
    },
  };

  const socialLinks = [
    {
      name: 'LinkedIn',
      href: 'https://www.linkedin.com/company/owkin/',
      icon: '🔗',
    },
    { name: 'X', href: 'https://x.com/OWKINscience', icon: '𝕏' },
    {
      name: 'GitHub',
      href: 'https://github.com/owkin',
      icon: '🐙',
    },
    {
      name: 'YouTube',
      href: 'https://www.youtube.com/@OwkinScience',
      icon: '▶️',
    },
  ];

  const offices = [
    {
      location: 'Paris',
      country: 'France',
      address: 'Owkin, Paris, France',
      hours: 'UTC +1',
    },
    {
      location: 'London',
      country: 'United Kingdom',
      address: 'Owkin, London, UK',
      hours: 'UTC',
    },
    {
      location: 'New York',
      country: 'United States',
      address: 'Owkin, New York, USA',
      hours: 'UTC -5',
    },
    {
      location: 'Boston',
      country: 'United States',
      address: 'Owkin, Boston, USA',
      hours: 'UTC -5',
    },
  ];

  return (
    <footer className="bg-black text-white" data-section="footer">
      {/* Top CTA Bar */}
      <div className="border-t border-black">
        <div className="px-4 md:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">Ready to grind language exams?</h3>
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-opacity-90 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-16 md:py-20 border-t border-black">
        <div className="max-w-7xl mx-auto">
          {/* Logo */}
          <div className="mb-16 flex items-center gap-2">
            <Image
              src="/logo_dark.png"
              alt="Faust"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold text-white">Faust</span>
          </div>

          {/* Footer grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {/* Explore */}
            <div>
              <h4 className="font-semibold text-white mb-4 uppercase text-xs tracking-wider">
                {footerSections.explore.title}
              </h4>
              <ul className="space-y-2">
                {footerSections.explore.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/70 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4 uppercase text-xs tracking-wider">
                {footerSections.company.title}
              </h4>
              <ul className="space-y-2">
                {footerSections.company.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/70 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Social */}
            <div>
              <h4 className="font-semibold text-white mb-4 uppercase text-xs tracking-wider">
                {footerSections.legal.title}
              </h4>
              <ul className="space-y-2 mb-8">
                {footerSections.legal.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/70 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Social links */}
              <h4 className="font-semibold text-white mb-4 uppercase text-xs tracking-wider">
                Follow us
              </h4>
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:border-white text-lg transition-colors"
                    title={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Offices */}
            <div>
              <h4 className="font-semibold text-white mb-4 uppercase text-xs tracking-wider">
                Our offices
              </h4>
              <ul className="space-y-3">
                {offices.map((office) => (
                  <li key={office.location} className="text-sm">
                    <p className="text-white font-semibold">{office.location}</p>
                    <p className="text-white/70 text-xs">{office.address}</p>
                    <p className="text-white/50 text-xs">{office.hours}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex items-center justify-between">
            <p className="text-sm text-white/70">
              © {new Date().getFullYear()} Owkin. All rights reserved.
            </p>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Back to top
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
