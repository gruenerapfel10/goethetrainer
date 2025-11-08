'use client';

import React from 'react';
import { useTheme } from 'next-themes';

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

interface AnswerSheetHeaderProps {
  className?: string;
}

export const AnswerSheetHeader: React.FC<AnswerSheetHeaderProps> = ({ className = '' }) => {
  const { theme } = useTheme();
  return (
    <div className={`relative z-10 flex items-center justify-center gap-8 mb-4 flex-shrink-0 ${className}`}>
      {/* Left - Barcode */}
      <div className="flex flex-col items-center gap-1">
        <BarcodeDots width={80} height={40} />
        <div className="text-[10px] font-bold">40001</div>
      </div>

      {/* Center - Title */}
      <div className="flex flex-col items-center">
        <div className="border-2 border-foreground px-4 pt-1 pb-2 relative">
          <div className="text-xl font-bold text-muted-foreground text-center" style={{ letterSpacing: '0.05em' }}>
            Goethe-Zertifikat <span className="font-black text-primary relative">C1
              <div className="absolute text-[10px] font-black text-primary leading-none" style={{ right: '0', bottom: '-5px', letterSpacing: '-0.05em' }}>modular</div>
            </span>
          </div>
        </div>
        <div className="border-2 border-foreground border-t-0 px-8 py-1 w-full">
          <div className="text-lg font-black text-center">Lesen</div>
        </div>
      </div>

      {/* Right - Goethe Institut Logo */}
      <div className="flex items-center gap-2">
        <img
          src={theme === 'dark' ? '/logo_dark.png' : '/logo.png'}
          alt="Goethe Institut"
          className="h-16 object-contain"
        />
      </div>
    </div>
  );
};
