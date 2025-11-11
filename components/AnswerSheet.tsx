'use client';

import React from 'react';
import { MarkingGuide } from './MarkingGuide';
import { AnswerSheetFooter } from './AnswerSheetFooter';
import { AnswerSheetHeader } from './AnswerSheetHeader';
import { MCQCheckbox } from './questions/MultipleChoice/MCQCheckbox';
import { TeilAnswerGrid } from './TeilAnswerGrid';

interface AnswerSheetProps {
  className?: string;
}

export const AnswerSheet: React.FC<AnswerSheetProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-[210mm] h-[297mm] bg-background px-6 py-4 mx-auto flex flex-col ${className}`} style={{ fontSize: '10pt' }}>
      {/* Corner markers */}
      <div className="absolute top-4 left-4 w-6 h-6 bg-foreground z-20" />
      <div className="absolute top-4 right-4 w-6 h-6 bg-foreground z-20" />
      <div className="absolute bottom-4 left-4 w-6 h-6 bg-foreground z-20" />
      <div className="absolute bottom-4 right-4 w-6 h-6 bg-foreground z-20" />

      {/* Header Section */}
      <AnswerSheetHeader />

      {/* Personal Information Section */}
      <div className="relative z-10 mb-4 space-y-2">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="text-[10px] mb-1">Nachname,<br />Vorname</div>
            <div className="relative h-5">
              <div className="absolute left-0 bottom-0 w-1 h-3 border-l border-b border-foreground" />
              <div className="absolute right-0 bottom-0 w-1 h-3 border-r border-b border-foreground" />
              <div className="absolute bottom-0 left-1 right-1 border-b border-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="text-[10px] mr-1">PS</div>
            {[...Array(4)].map((_, i) => (
              <MCQCheckbox key={i} size="msm" display showContent={false} />
            ))}
            <div className="ml-2 flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <MCQCheckbox size="msm" display showContent={false} />
                <span className="text-[10px]">A</span>
              </div>
              <div className="flex items-center gap-1">
                <MCQCheckbox size="msm" display showContent={false} />
                <span className="text-[10px]">B</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="text-[10px] mb-1">Institution,<br />Ort</div>
            <div className="relative h-5">
              <div className="absolute left-0 bottom-0 w-1 h-3 border-l border-b border-foreground" />
              <div className="absolute right-0 bottom-0 w-1 h-3 border-r border-b border-foreground" />
              <div className="absolute bottom-0 left-1 right-1 border-b border-foreground" />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[10px]">Geburtsdatum</div>
              <div className="flex gap-0.5">
                {[...Array(2)].map((_, i) => (
                  <div key={`d${i}`} className="w-6 h-7 border border-foreground" />
                ))}
                <span className="mx-0.5 font-bold">.</span>
                {[...Array(2)].map((_, i) => (
                  <div key={`m${i}`} className="w-6 h-7 border border-foreground" />
                ))}
                <span className="mx-0.5 font-bold">.</span>
                {[...Array(4)].map((_, i) => (
                  <div key={`y${i}`} className="w-6 h-7 border border-foreground" />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[10px]">PTN-Nr.</div>
              <div className="flex gap-0.5">
                {[...Array(14)].map((_, i) => (
                  <div key={i} className="w-6 h-7 border border-foreground" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Two Rows */}
      <div className="relative z-10 flex-1 flex flex-col gap-4">
        {/* First Row */}
        <div className="flex gap-4 flex-1">
          {/* Teil 1 - 1 part */}
          <div style={{ flex: '1' }}>
            <TeilAnswerGrid teilNumber={1} questionCount={10} optionsPerQuestion={4} />
          </div>

          {/* Teil 2 - 1 part */}
          <div style={{ flex: '1' }}>
            <TeilAnswerGrid teilNumber={2} questionCount={10} optionsPerQuestion={3} />
          </div>

          {/* Marking Guide - 2 parts */}
          <div style={{ flex: '2' }} className="flex items-start justify-end px-0">
            <MarkingGuide width="220px" />
          </div>
        </div>

        {/* Second Row */}
        <div className="flex gap-4 flex-1">
          {/* Teil 3 */}
          <div style={{ flex: '2' }}>
            <TeilAnswerGrid teilNumber={3} questionCount={10} optionsPerQuestion={10} />
          </div>

          {/* Teil 4 */}
          <div style={{ flex: '1' }}>
            <TeilAnswerGrid teilNumber={4} questionCount={10} optionsPerQuestion={4} />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      {/* Footer */}
      <AnswerSheetFooter className="flex-shrink-0" />
    </div>
  );
};
