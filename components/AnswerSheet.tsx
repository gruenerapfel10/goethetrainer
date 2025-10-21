'use client';

import React, { useState } from 'react';
import { MarkingGuide } from './MarkingGuide';
import { AnswerSheetFooter } from './AnswerSheetFooter';
import { MCQCheckbox } from './questions/MultipleChoice/MCQCheckbox';

// Data Matrix style barcode component
const BarcodeDots: React.FC<{ width?: number; height?: number }> = ({ width = 200, height = 100 }) => {
  // Generate a pseudo-random 2D barcode pattern
  const generateBarcodePattern = () => {
    const pattern = [];
    const cellSize = 12;
    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);

    // Create a deterministic pattern based on a seed
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const seed = (x * 73 + y * 97 + 42) % 256;
        pattern.push({
          x: x * cellSize,
          y: y * cellSize,
          size: cellSize,
          fill: seed > 140 ? 'black' : 'white',
        });
      }
    }
    return pattern;
  };

  const pattern = generateBarcodePattern();

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="border-2 border-black">
      <rect width={width} height={height} fill="white" />
      {pattern.map((cell, idx) => (
        <rect
          key={idx}
          x={cell.x}
          y={cell.y}
          width={cell.size}
          height={cell.size}
          fill={cell.fill}
          stroke="none"
        />
      ))}
    </svg>
  );
};

interface AnswerSheetProps {
  className?: string;
}

export const AnswerSheet: React.FC<AnswerSheetProps> = ({ className = '' }) => {
  // State to track selected answers: { questionNum: selectedOption }
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleAnswerChange = (questionNum: number, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionNum]: prev[questionNum] === option ? '' : option,
    }));
  };

  // Helper to render checkbox grid
  const renderCheckboxRow = (questionNum: number, options: string[]) => (
    <div className="flex items-center gap-4 h-10">
      <div className="w-8 text-[11px] font-medium text-center flex-shrink-0">{questionNum}</div>
      {options.map((option) => (
        <MCQCheckbox
          key={option}
          letter={option}
          checked={answers[questionNum] === option}
          onChange={() => handleAnswerChange(questionNum, option)}
          size="md"
          display={false}
          className="border-black bg-white"
        />
      ))}
    </div>
  );

  return (
    <div className={`relative w-[210mm] h-[297mm] bg-white p-8 mx-auto flex flex-col ${className}`} style={{ fontSize: '10pt' }}>
      {/* Corner markers */}
      <div className="absolute top-4 left-4 w-6 h-6 bg-black z-20"></div>
      <div className="absolute top-4 right-4 w-6 h-6 bg-black z-20"></div>
      <div className="absolute bottom-4 left-4 w-6 h-6 bg-black z-20"></div>
      <div className="absolute bottom-4 right-4 w-6 h-6 bg-black z-20"></div>

      {/* Header Section */}
      <div className="relative z-10 flex items-start justify-between mb-4 flex-shrink-0">
        {/* Left - Barcode */}
        <div className="flex flex-col items-center gap-1">
          <BarcodeDots width={80} height={40} />
          <div className="text-[10px] font-bold">40001</div>
        </div>

        {/* Center - Title */}
        <div className="flex flex-col items-center">
          <div className="border-2 border-black px-6 py-1">
            <div className="text-xl font-bold text-gray-600 text-center" style={{ letterSpacing: '0.05em' }}>
              Goethe-Zertifikat <span className="font-black">C1</span>
            </div>
            <div className="text-[8px] text-right font-medium">modular</div>
          </div>
          <div className="border-2 border-black border-t-0 px-12 py-2 w-full">
            <div className="text-2xl font-black text-center">Lesen</div>
          </div>
        </div>

        {/* Right - Goethe Institut Logo */}
        <div className="flex items-center gap-2">
          <img
            src="/goethe-logo.png"
            alt="Goethe Institut"
            className="h-16 object-contain"
          />
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="relative z-10 mb-4 space-y-2">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="text-[8px] mb-1">Nachname,<br />Vorname</div>
            <div className="relative h-5">
              <div className="absolute left-0 bottom-0 w-1 h-3 border-l border-b border-black"></div>
              <div className="absolute right-0 bottom-0 w-1 h-3 border-r border-b border-black"></div>
              <div className="absolute bottom-0 left-1 right-1 border-b border-black"></div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="text-[8px] mr-1">PS</div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-5 h-5 border border-black"></div>
            ))}
            <div className="ml-2 flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 border border-black"></div>
                <span className="text-[8px]">A</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 border border-black"></div>
                <span className="text-[8px]">B</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="text-[8px] mb-1">Institution,<br />Ort</div>
            <div className="relative h-5">
              <div className="absolute left-0 bottom-0 w-1 h-3 border-l border-b border-black"></div>
              <div className="absolute right-0 bottom-0 w-1 h-3 border-r border-b border-black"></div>
              <div className="absolute bottom-0 left-1 right-1 border-b border-black"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[8px]">Geburtsdatum</div>
            <div className="flex gap-0.5">
              {[...Array(2)].map((_, i) => (
                <div key={`d${i}`} className="w-4 h-5 border border-black"></div>
              ))}
              <span className="mx-0.5 font-bold">.</span>
              {[...Array(2)].map((_, i) => (
                <div key={`m${i}`} className="w-4 h-5 border border-black"></div>
              ))}
              <span className="mx-0.5 font-bold">.</span>
              {[...Array(4)].map((_, i) => (
                <div key={`y${i}`} className="w-4 h-5 border border-black"></div>
              ))}
            </div>
            <div className="text-[8px] ml-2">PTN-Nr.</div>
            <div className="flex gap-0.5">
              {[...Array(14)].map((_, i) => (
                <div key={i} className="w-4 h-5 border border-black"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Two Rows */}
      <div className="relative z-10 flex-1 flex flex-col gap-4">
        {/* First Row */}
        <div className="flex gap-4 flex-1">
          {/* Teil 1 Placeholder - 1 part */}
          <div className="border-2 border-black p-4 bg-gray-50 flex items-center justify-center" style={{ flex: '1' }}>
            <div className="text-center text-gray-400">
              <div className="text-sm font-semibold">Teil 1</div>
            </div>
          </div>

          {/* Teil 2 Placeholder - 1 part */}
          <div className="border-2 border-black p-4 bg-gray-50 flex items-center justify-center" style={{ flex: '1' }}>
            <div className="text-center text-gray-400">
              <div className="text-sm font-semibold">Teil 2</div>
            </div>
          </div>

          {/* Marking Guide - 2 parts */}
          <div style={{ flex: '2' }} className="flex items-start justify-end">
            <MarkingGuide width="200px" />
          </div>
        </div>

        {/* Second Row */}
        <div className="flex gap-4 flex-1">
          {/* Teil 3 Placeholder */}
          <div className="border-2 border-black p-4 flex-1 bg-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-sm font-semibold">Teil 3</div>
            </div>
          </div>

          {/* Teil 4 Placeholder */}
          <div className="border-2 border-black p-4 flex-1 bg-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-sm font-semibold">Teil 4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      {/* Footer */}
      <AnswerSheetFooter className="flex-shrink-0" />
    </div>
  );
};
