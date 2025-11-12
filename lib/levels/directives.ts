import type { LevelProfile } from './types';

type SkillKey = keyof Pick<LevelProfile, 'reading' | 'listening' | 'writing' | 'speaking'>;

function formatRange(range?: { min: number; max: number; unit: 'words' | 'seconds' }) {
  if (!range) return null;
  return `${range.min}-${range.max} ${range.unit === 'words' ? 'Wörter' : 'Sekunden'}`;
}

function joinList(values?: string[]) {
  if (!values || !values.length) {
    return null;
  }
  return values.join('; ');
}

export function buildLevelDirective(
  levelProfile: LevelProfile | undefined,
  skill: SkillKey
): string {
  if (!levelProfile) {
    return '';
  }

  const band = levelProfile[skill];
  if (!band) {
    return '';
  }

  const lines: string[] = [];
  const range = formatRange(band.textLength);
  if (range) {
    lines.push(`- Länge: ${range}`);
  }
  if (band.speed) {
    const speedMap: Record<string, string> = {
      slow: 'langsamer Vortrag mit deutlich markierten Pausen',
      moderate: 'normale Standardsprache',
      native: 'authentische Sprechgeschwindigkeit auf Muttersprachlerniveau',
    };
    lines.push(`- Sprechtempo: ${speedMap[band.speed] ?? band.speed}`);
  }
  if (band.lexicalRange) {
    lines.push(`- Lexik: ${band.lexicalRange}`);
  }
  if (band.grammarFocus && band.grammarFocus.length) {
    lines.push(`- Grammatik: ${band.grammarFocus.join('; ')}`);
  }
  if (band.taskDescriptors && band.taskDescriptors.length) {
    lines.push(`- Text-/Aufgabentypen: ${band.taskDescriptors.join('; ')}`);
  }
  if (band.register) {
    lines.push(`- Register: ${band.register}`);
  }
  if ('targetWords' in band && typeof band.targetWords === 'number') {
    lines.push(`- Zielwortzahl: ca. ${band.targetWords} Wörter`);
  }
  if ('cohesionExpectations' in band) {
    const details = joinList(band.cohesionExpectations);
    if (details) {
      lines.push(`- Kohäsion: ${details}`);
    }
  }
  if ('discourseMoves' in band) {
    const details = joinList(band.discourseMoves);
    if (details) {
      lines.push(`- Diskurszüge: ${details}`);
    }
  }
  if (band.speakerConfig) {
    lines.push(`- Sprecher-Setup: ${band.speakerConfig}`);
  }

  if (!lines.length) {
    return '';
  }

  return `Niveausteuerung (${levelProfile.label} – ${skill.toUpperCase()}):\n${lines.join('\n')}`;
}
