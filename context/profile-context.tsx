'use client';

import React, { createContext, useContext, useState } from 'react';

interface ProfileContextType {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ 
  children,
  activeSection,
  setActiveSection
}: { 
  children: React.ReactNode;
  activeSection: string;
  setActiveSection: (section: string) => void;
}) {
  return (
    <ProfileContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}