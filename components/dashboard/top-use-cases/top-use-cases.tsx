'use client';

import React from 'react';
import { useUseCaseSearch } from '@/lib/use-cases/hooks/useUseCaseSearch';
import { useTotalTimeSavedPerCategory } from '@/lib/use-cases/hooks/useTotalTimeSavedPerCategory';
import { UseCaseTable } from './table/use-case-table';
import { UseCaseGenerateModal } from './modal/use-case-generate-modal';
import { Header } from './common/header';
import { useTranslations } from 'next-intl';

export function TopUseCases() {
  const t = useTranslations('dashboard.topUseCases');
  const {
    categories,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    totalCategories,
    totalPages,
    currentPage,
    setCurrentPage,
    refreshData: refreshCategoriesData, // Renamed for clarity
  } = useUseCaseSearch();

  const totalTimeSavedHook = useTotalTimeSavedPerCategory();

  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);

  // Combined refresh function that refreshes both data sources
  const refreshAllData = React.useCallback(async () => {
    // Refresh categories data
    await refreshCategoriesData();
    // Refresh time saved data
    totalTimeSavedHook.refreshData();
  }, [refreshCategoriesData, totalTimeSavedHook]);

  return (
    <div className="rounded-lg border bg-background p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <Header
        onGenerate={() => setIsGenerateModalOpen(true)}
        isLoading={isLoading}
      />

      <UseCaseTable
        categories={categories}
        totalTimeSavedMap={totalTimeSavedHook.data}
        isTimeSavedLoading={totalTimeSavedHook.isLoading}
        isCategoriesLoading={isLoading}
        categoriesError={error}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <UseCaseGenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
        }}
        onGenerationComplete={() => {
          refreshAllData();
        }}
      />
    </div>
  );
}
