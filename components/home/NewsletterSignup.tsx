'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewsletterSignup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    interests: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);

  const interests = [
    'Faust news',
    'Data Science',
    'Biopharma',
    'Diagnostics',
    'Academic Partnerships',
    'PortAlt',
    'MOSAIC',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInterestChange = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to HubSpot or your backend
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ firstName: '', lastName: '', email: '', interests: [] });
    }, 3000);
  };

  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Sign up to our newsletter
            </h2>
            <p className="text-lg text-black/70">
              Get the latest updates on agentic AI, biomedical innovation, and Faust's breakthroughs.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 md:p-12 rounded-xl shadow-lg">
            {/* Name fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email field */}
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Interests */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-4">I'm interested in:</p>
              <div className="grid grid-cols-2 gap-3">
                {interests.map((interest) => (
                  <label key={interest} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.interests.includes(interest)}
                      onChange={() => handleInterestChange(interest)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{interest}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Privacy notice */}
            <p className="text-xs text-gray-500">
              By subscribing, you agree to our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              . We'll send you updates about Faust and our work. You can unsubscribe anytime.
            </p>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitted}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                submitted
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {submitted ? '✓ Subscribed!' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
