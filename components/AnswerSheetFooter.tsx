'use client';

import React from 'react';
import { MCQCheckbox } from './questions/MultipleChoice/MCQCheckbox';
import { ProcessingArea } from './ProcessingArea';

// Data Matrix style barcode component
const BarcodeDots: React.FC<{ width?: number; height?: number }> = ({ width = 200, height = 100 }) => {
  const generateBarcodePattern = () => {
    const pattern = [];
    const cellSize = 12;
    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);

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

interface AnswerSheetFooterProps {
  className?: string;
}

export const AnswerSheetFooter: React.FC<AnswerSheetFooterProps> = ({ className = '' }) => {
  return (
    <div className={`relative z-10 space-y-8 ${className}`}>
      {/* First Row - Signatures and Points/Date */}
      <div className="flex items-end">
        {/* Signature 1 */}
        <div className="flex-1">
          <div className="border-b border-foreground h-6"></div>
          <div className="text-[10px] mt-1">Unterschrift Bewertende/r 1</div>
        </div>

        {/* Signature 2 */}
        <div className="flex-1">
          <div className="border-b border-foreground h-6"></div>
          <div className="text-[10px] mt-1">Unterschrift Bewertende/r 2</div>
        </div>

        {/* Points and Date Section - Right Aligned */}
        <div className="flex-1 space-y-2 flex flex-col items-end">
          {/* Points Lesen Container */}
          <div className="flex flex-col gap-2 text-[11px]">
            <span className="font-bold">Punkte Lesen</span>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="w-7 h-9 border-2 border-foreground"></div>
                ))}
              </div>
              <span className="text-xl">/</span>
              <div className="flex items-center justify-center gap-1">
                <div className="w-7 h-9 border-2 border-foreground flex items-center justify-center font-bold text-lg">3</div>
                <div className="w-7 h-9 border-2 border-foreground flex items-center justify-center font-bold text-lg">0</div>
              </div>
            </div>
          </div>

          {/* Datum Container */}
          <div className="flex flex-col gap-2 text-[11px]">
            <div className="flex gap-1">
              {[...Array(2)].map((_, i) => (
                <div key={`bd${i}`} className="w-6 h-8 border border-foreground"></div>
              ))}
              <span className="mx-1 font-bold">.</span>
              {[...Array(2)].map((_, i) => (
                <div key={`bm${i}`} className="w-6 h-8 border border-foreground"></div>
              ))}
              <span className="mx-1 font-bold">.</span>
              {[...Array(4)].map((_, i) => (
                <div key={`by${i}`} className="w-6 h-8 border border-foreground"></div>
              ))}
            </div>
            <span>Datum</span>
          </div>
        </div>
      </div>

      {/* Second Row - Barcode and Processing Area */}
      <div className="flex items-start gap-4 px-8">
        {/* Data Matrix Barcode - 40% */}
        <div style={{ width: '40%' }} className="flex justify-center">
          <img
            src="https://barcode.tec-it.com/barcode.ashx?data=40001-AntBo-LV&code=Code128&dpi=96"
            alt="Barcode"
            height={60}
            className="w-auto dark:invert"
          />
        </div>

        {/* Version Text - 10% */}
        <div style={{ width: '10%' }} className="flex items-center justify-center">
          <div className="text-[7px] text-center leading-tight">
            Version R04V01.01<br />
            40001-AntBo-LV - 07/2020
          </div>
        </div>

        {/* Processing Area - 40% */}
        <div style={{ width: '40%' }} className="flex justify-center">
          <ProcessingArea />
        </div>

        {/* Seite 1 - 10% */}
        <div style={{ width: '10%' }} className="flex items-center justify-center">
          <div className="text-[10px] font-medium whitespace-nowrap">Seite 1</div>
        </div>
      </div>
    </div>
  );
};
