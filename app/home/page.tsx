'use client';
import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import ProductCards from '@/components/home/ProductCards';
import AutoTabs from '@/components/home/AutoTabs';
import ExpandingCards from '@/components/home/ExpandingCards';
import FeaturedNews from '@/components/home/FeaturedNews';
import Footer from '@/components/home/Footer';
import LanguageMastery from '@/components/home/LanguageMastery';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <Navbar />

      {/* Main content */}
      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Language Mastery Section */}
        <LanguageMastery />

        {/* Product Cards */}
        <ProductCards />

        {/* Auto Tabs */}
        <AutoTabs />

        {/* Expanding Cards */}
        <ExpandingCards />

        {/* Featured News */}
        <FeaturedNews />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
