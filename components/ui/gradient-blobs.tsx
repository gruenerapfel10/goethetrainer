'use client';

import { cn } from "@/lib/utils";

export function GradientBlobs({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden -z-10", className)}>
      {/* First blob */}
      <div 
        className="absolute w-[500px] h-[500px] blur-3xl opacity-15"
        style={{
          background: 'linear-gradient(45deg, #2792DC 0%, #9CE6E6 100%)',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          animation: 'blob-move-1 20s infinite linear',
          top: '20%',
          left: '0%'
        }}
      />
      
      {/* Second blob */}
      <div 
        className="absolute w-[500px] h-[500px] blur-3xl opacity-10"
        style={{
          background: 'linear-gradient(225deg, #9CE6E6 0%, #2792DC 100%)',
          borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
          animation: 'blob-move-2 25s infinite linear',
          top: '10%',
          right: '10%'
        }}
      />

      <style jsx global>{`
        @keyframes blob-move-1 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25% { transform: translate(10%, 10%) rotate(90deg) scale(1.1); }
          50% { transform: translate(5%, -5%) rotate(180deg) scale(0.9); }
          75% { transform: translate(-10%, 5%) rotate(270deg) scale(1.1); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }

        @keyframes blob-move-2 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-10%, -5%) rotate(120deg) scale(0.9); }
          66% { transform: translate(5%, 10%) rotate(240deg) scale(1.1); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  );
} 