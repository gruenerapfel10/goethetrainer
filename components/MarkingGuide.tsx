'use client';

import React from 'react';
import { MCQCheckbox } from '@/components/questions/MultipleChoice/MCQCheckbox';

interface MarkingGuideProps {
  className?: string;
  width?: string;
}

export const MarkingGuide: React.FC<MarkingGuideProps> = ({ className = '', width = '200px' }) => {
  // Correct marking X icon
  const CorrectMark = () => (
    <div className="w-3 h-3 border border-black flex items-center justify-center bg-white flex-shrink-0 text-[5px]">
      <svg className="w-2 h-2" viewBox="0 0 24 24">
        <path d="M3 3 L21 21 M21 3 L3 21" stroke="black" strokeWidth="2.5" fill="none" />
      </svg>
    </div>
  );

  // Incorrect marking examples
  const IncorrectExamples = () => (
    <div className="flex items-center gap-0.5 flex-wrap">
      {/* X with strikethrough */}
      <div className="w-3 h-3 border border-black flex items-center justify-center bg-white relative text-[5px]">
        <svg className="w-1.5 h-1.5" viewBox="0 0 24 24">
          <path d="M3 3 L21 21 M21 3 L3 21" stroke="black" strokeWidth="2" fill="none" />
        </svg>
        <svg className="absolute w-3.5 h-3.5" viewBox="0 0 32 32">
          <path d="M2 16 L30 16" stroke="black" strokeWidth="3" fill="none" />
          <path d="M16 2 L16 30" stroke="black" strokeWidth="3" fill="none" />
        </svg>
      </div>
      {/* Corner mark with X */}
      <div className="w-3 h-3 border border-black flex items-center justify-center bg-white relative">
        <svg className="absolute bottom-0 right-0 w-1 h-1" viewBox="0 0 16 16">
          <path d="M2 2 L14 14 M14 2 L2 14" stroke="black" strokeWidth="2.5" fill="none" />
        </svg>
      </div>
      {/* Small x */}
      <div className="w-3 h-3 border border-black flex items-center justify-center bg-white text-[5px] font-bold leading-none">
        ×
      </div>
      {/* Dot */}
      <div className="w-3 h-3 border border-black flex items-center justify-center bg-white">
        <div className="w-0.5 h-0.5 rounded-full bg-black"></div>
      </div>
      {/* Checkmark */}
      <div className="w-3 h-3 border border-black flex items-center justify-center bg-white">
        <svg className="w-1.5 h-1.5" viewBox="0 0 24 24">
          <path d="M4 12 L9 17 L20 6" stroke="black" strokeWidth="2.5" fill="none" />
        </svg>
      </div>
      {/* Circle around box */}
      <div className="relative w-3 h-3">
        <div className="w-3 h-3 border border-black bg-white"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4.5 h-4.5 rounded-full border border-black"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`border-2 border-black p-1.5 ${className}`} style={{ width }}>
      <div className="space-y-1 text-[7px] leading-tight">
        {/* Correct marking */}
        <div className="flex items-center gap-1.5">
          <span className="flex-1">Markieren Sie so:</span>
          <CorrectMark />
        </div>

        {/* Incorrect markings */}
        <div className="flex items-center gap-2">
          <div className="whitespace-nowrap"><span className="font-bold underline">NICHT</span> so:</div>
          <IncorrectExamples />
        </div>

        {/* Correction instruction */}
        <div className="flex items-center gap-1.5">
          <span className="flex-1">Füllen Sie zur Korrektur das Feld aus:</span>
          <MCQCheckbox
            display={true}
            size="sm"
            checked={true}
            showContent={false}
            className="bg-black border-black"
          />
        </div>

        {/* Remark instruction */}
        <div className="flex items-center gap-1.5">
          <span className="flex-1">Markieren Sie das richtige Feld neu:</span>
          <CorrectMark />
        </div>
      </div>
    </div>
  );
};
