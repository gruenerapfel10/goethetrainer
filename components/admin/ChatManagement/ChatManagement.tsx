'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import LogoManagementSection from './LogoManagementSection';
import SuggestionsManagementSection from '../SuggestionsManagement/SuggestionsManagementSection';

export default function ChatManagement() {
  const t = useTranslations('chatManagement');
  const [activeTab, setActiveTab] = useState('logo');

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col xs:flex-col sm:flex-row gap-2">
          <button
            onClick={() => setActiveTab('logo')}
            className={`flex-1 px-4 py-2 rounded-md text-center ${
              activeTab === 'logo'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t('logoManagement')}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 px-4 py-2 rounded-md text-center ${
              activeTab === 'suggestions'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t('suggestionsManagement')}
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'logo' && <LogoManagementSection />}
        {activeTab === 'suggestions' && <SuggestionsManagementSection />}
      </div>
    </div>
  );
}
