'use client';

interface GoetheHeaderProps {
  sectionLabel?: string;
}

export function GoetheHeader({ sectionLabel = 'LESEN' }: GoetheHeaderProps) {
  const sectionText = sectionLabel.toUpperCase();
  return (
    <div className="w-96 mx-auto">
      {/* Exam Header */}
      <div className="border border-border flex">
        <div className="flex-[2] bg-secondary py-1 px-3 flex items-center justify-start">
          <h1 className="text-xs font-bold text-secondary-foreground">GOETHE-ZERTIFIKAT C1</h1>
        </div>
        <div className="flex-1 bg-background py-1 px-3 flex items-center justify-start border-l border-border">
          <h1 className="text-xs font-bold text-foreground">{sectionText}</h1>
        </div>
      </div>

      {/* Subheader */}
      <div className="border border-border border-t-0 flex">
        <div className="flex-1 bg-background py-1 px-3 flex items-center justify-start">
          <p className="text-xs font-medium text-foreground">MODELLSATZ LESEN</p>
        </div>
        <div className="flex-1 bg-background py-1 px-3 flex items-center justify-start border-l border-border">
          <p className="text-xs font-medium text-foreground">KANDIDATENBLÄTTER</p>
        </div>
      </div>
    </div>
  );
}
