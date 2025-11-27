'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<string>('hero');
  const session = null;

  useEffect(() => {
    const sections = [
      { id: 'hero', name: 'hero' },
      { id: 'language-mastery', name: 'language-mastery' },
      { id: 'product-cards', name: 'product-cards' },
      { id: 'auto-tabs', name: 'auto-tabs' },
      { id: 'expanding-cards', name: 'expanding-cards' },
      { id: 'featured-news', name: 'featured-news' },
      { id: 'footer', name: 'footer' },
    ];

    const intersectingMap = new Map<string, boolean>();
    sections.forEach(section => {
      intersectingMap.set(section.name, false);
    });

    const observers: IntersectionObserver[] = [];

    sections.forEach((section) => {
      const element = document.querySelector(`[data-section="${section.id}"]`);
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            intersectingMap.set(section.name, entry.isIntersecting);

            // Find the last intersecting section in order
            let activeSection = 'hero';
            for (const sec of sections) {
              if (intersectingMap.get(sec.name)) {
                activeSection = sec.name;
              }
            }
            setCurrentSection(activeSection);
          },
          {
            root: null,
            rootMargin: '0px 0px -92% 0px', // Trigger when top of section reaches bottom of navbar
            threshold: 0,
          }
        );

        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  const getSectionStyle = () => {
    const styles: { [key: string]: { bg: string; text: string } } = {
      'hero': { bg: 'bg-white', text: 'text-gray-900' },
      'language-mastery': { bg: 'bg-black', text: 'text-white' },
      'product-cards': { bg: 'bg-white', text: 'text-gray-900' },
      'auto-tabs': { bg: 'bg-black', text: 'text-white' },
      'expanding-cards': { bg: 'bg-white', text: 'text-gray-900' },
      'featured-news': { bg: 'bg-black', text: 'text-white' },
      'footer': { bg: 'bg-black', text: 'text-white' },
    };
    return styles[currentSection] || styles.hero;
  };

  const sectionStyle = getSectionStyle();

  const dropdownMenus = {
    aboutUs: {
      title: 'About us',
      columns: {
        about: {
          title: 'About',
          items: [
            { label: 'About us', href: '/about-us' },
            { label: 'Careers', href: '/careers' },
            { label: 'Team', href: '/people' },
            { label: 'AI Ethics', href: '/ai-ethics' },
            { label: 'Contact', href: '/contact' },
          ],
        },
        news: {
          title: 'News',
          items: [
            { label: 'News Center', href: '/news' },
            { label: 'Blog', href: '/blog-case-studies?tab=blog' },
            { label: 'Events', href: '/events' },
            { label: 'Press Kit', href: '/press-kit' },
          ],
        },
        research: {
          title: 'AI Research',
          items: [
            { label: 'Scientific Publications', href: '/publications' },
            { label: 'Open AI & Science', href: '/open-science' },
            { label: 'Videos', href: '/videos' },
            { label: 'Case Studies', href: '/blog-case-studies?tab=case-studies' },
          ],
        },
        books: {
          title: 'Books & Films',
          items: [
            { label: 'Je Suis Elodie', href: '/connect/je-suis-elodie', description: 'Documentary short film' },
            { label: 'A-Z of AI in Healthcare', href: '/a-z-of-ai-in-healthcare', description: 'Handbook' },
            { label: 'From Slide to Device', href: '/connect/slide-to-device', description: 'Handbook' },
            { label: 'Humanity book', href: '/humanity', description: 'People at the heart of AI in healthcare' },
          ],
        },
      },
    },
    patientData: {
      title: 'Patient Data',
      columns: {
        academic: {
          title: 'For Academic Partners',
          items: [
            { label: 'Patient data network', href: '/federated-research-network' },
            { label: 'Federated learning', href: '/federated-learning' },
          ],
        },
        pharma: {
          title: 'For Pharma',
          items: [
            { label: 'MOSAIC', href: '/connect/mosaic', description: 'Spatial omics' },
            { label: 'MOSAIC Window', href: 'https://www.mosaic-research.com/mosaic-window', external: true },
            { label: 'Pipeline', href: '/pipeline/pipeline' },
          ],
        },
        patients: {
          title: 'For Patients',
          items: [{ label: 'Patient information', href: '/patient-information' }],
        },
      },
    },
    owkinK: {
      title: 'Faust AI',
      columns: {
        agentic: {
          title: 'Agentic AI',
          items: [{ label: 'What is Agentic AI?', href: '/k-os/what-is-agentic-ai' }],
        },
        technology: {
          title: 'Technology',
          items: [{ label: 'OwkinZero', href: '/k-os/owkinzero' }],
        },
        kPharma: {
          title: 'K for Biopharma',
          items: [
            { label: 'K Pro', href: '/k-os/k-pro', badge: 'NEW' },
            { label: 'K Pro FAQ', href: '/k-os/k-pro-faq' },
          ],
        },
      },
    },
    diagnostics: {
      title: 'Diagnostics',
      columns: {
        products: {
          title: 'AI Diagnostics',
          items: [
            { label: 'About our products', href: '/diagnostics/our-products' },
            { label: 'MSIntuit® CRC', href: '/diagnostics/msintuit-crc', description: 'Optimise MSI testing for colorectal cancer' },
            { label: 'RlapsRisk® BC', href: '/diagnostics/rlapsrisk-bc', description: 'Assess relapse risk of early breast cancer' },
            { label: 'TLS Detect', href: '/diagnostics/tls-detect', description: 'Determine the presence of TLS' },
            { label: 'Destra®', href: '/diagnostics/destra', description: 'AI digital pathology platform' },
          ],
        },
        forPharma: {
          title: 'For Pharma',
          items: [{ label: 'Next gen AI Dx', href: '/diagnostics/next-gen-ai-dx', description: 'Dx for clinical trials & clinical routine' }],
        },
        forClinicians: {
          title: 'For Clinicians & Labs',
          items: [
            { label: 'Precision pathology', href: '/diagnostics/powering-precision-pathology', description: 'Digital pathology for oncology' },
            { label: 'From Slide to Device', href: '/connect/slide-to-device', description: 'White paper' },
            { label: 'State of the Nation', href: '/connect/state-of-the-nation', description: 'Report' },
            { label: 'Instructions for use', href: '/ifu' },
          ],
        },
      },
    },
  };

  return (
    <nav className={`sticky top-0 z-50 ${sectionStyle.bg} border-b transition-colors duration-300 ${currentSection === 'language-mastery' || currentSection === 'auto-tabs' || currentSection === 'featured-news' || currentSection === 'footer' ? 'border-white/10' : 'border-gray-200'}`}>
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-24">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Faust"
              width={32}
              height={32}
              className={`h-8 w-auto ${currentSection === 'language-mastery' || currentSection === 'auto-tabs' || currentSection === 'featured-news' || currentSection === 'footer' ? 'hidden' : 'block'}`}
            />
            <Image
              src="/logo_dark.png"
              alt="Faust"
              width={32}
              height={32}
              className={`h-8 w-auto ${currentSection === 'language-mastery' || currentSection === 'auto-tabs' || currentSection === 'featured-news' || currentSection === 'footer' ? 'block' : 'hidden'}`}
            />
            <span className={`text-4xl font-bold ${sectionStyle.text}`}>Faust</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center justify-center flex-1 mx-8 space-x-8">
            {/* About us Dropdown */}
            <div className="group relative">
              <button className={`py-4 text-sm font-medium ${sectionStyle.text} hover:opacity-70`}>
                About us
              </button>
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-0 w-screen hidden group-hover:block bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-8">
                  {/* Coming soon */}
                </div>
              </div>
            </div>

            {/* Faust AI Dropdown */}
            <div className="group relative">
              <button className={`py-4 text-sm font-medium ${sectionStyle.text} hover:opacity-70`}>
                Faust AI
              </button>
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-0 w-screen hidden group-hover:block bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-8">
                  {/* Coming soon */}
                </div>
              </div>
            </div>

          </div>

          {/* Right side actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                currentSection === 'language-mastery' || currentSection === 'auto-tabs' || currentSection === 'featured-news' || currentSection === 'footer'
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {session ? 'Dashboard' : 'Sign in'}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              currentSection === 'language-mastery' || currentSection === 'auto-tabs' || currentSection === 'featured-news' || currentSection === 'footer'
                ? 'hover:bg-white/10 text-white'
                : 'hover:bg-gray-100 text-gray-900'
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 space-y-3">
            <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 rounded">
              {session ? 'Dashboard' : 'Sign in'}
            </Link>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 rounded">
              About us
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 rounded">
              Faust AI
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 rounded">
              Diagnostics
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
