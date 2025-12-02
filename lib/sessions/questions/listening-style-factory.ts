import { generateObject } from 'ai';
import { z } from 'zod';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';

export type ListeningStyleId = 'podcast' | 'interview' | 'monologue' | 'discussion';

export interface ListeningStyleConfig {
  id: ListeningStyleId;
  label: string;
  defaultSpeakerCount: number;
  description: string;
}

export interface ListeningStyleParams {
  style: ListeningStyleId;
  theme?: string;
  headline?: string | null;
  summary?: string | null;
  speakerCount?: number | null;
  segmentCount?: number | null;
  levelId?: string | null;
  baseContext: string;
}

export interface GeneratedListeningScript {
  title: string;
  subtitle: string;
  speakers: Array<{ id: string; name: string; role?: string }>;
  segments: Array<{ speakerId: string; text: string }>;
}

const STYLE_REGISTRY: Record<ListeningStyleId, ListeningStyleConfig> = {
  podcast: {
    id: 'podcast',
    label: 'Podcast',
    defaultSpeakerCount: 2,
    description: 'Locker, erzählend, klar getrennte Sprecher:innen (Host + Gast).',
  },
  interview: {
    id: 'interview',
    label: 'Interview',
    defaultSpeakerCount: 2,
    description: 'Frage-Antwort, Moderator:in + Expert:in, prägnante Antworten.',
  },
  monologue: {
    id: 'monologue',
    label: 'Monolog',
    defaultSpeakerCount: 1,
    description: 'Ein:e Sprecher:in, linearer Vortrag, klare Abschnitte.',
  },
  discussion: {
    id: 'discussion',
    label: 'Diskussion',
    defaultSpeakerCount: 2,
    description: 'Kurze Wortwechsel zwischen mehreren Personen, deutliche Sprecherwechsel.',
  },
};

const ScriptSchema = z.object({
  title: z.string().min(5),
  subtitle: z.string().min(10),
  speakers: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(2),
        role: z.string().optional(),
      })
    )
    .min(1),
  segments: z
    .array(
      z.object({
        speakerId: z.string().min(1),
        text: z.string().min(6),
      })
    )
    .min(4),
});

export async function generateListeningScript(params: ListeningStyleParams): Promise<GeneratedListeningScript> {
  const style = STYLE_REGISTRY[params.style] ?? STYLE_REGISTRY.monologue;
  const speakerCount = Math.max(1, params.speakerCount ?? style.defaultSpeakerCount);
  const segmentCount = Math.max(4, params.segmentCount ?? 8);

  const systemPrompt = `Du schreibst ein Hörskript (${style.label}) als Prüfungsquelle. Immer Fakten aus Vorlage beibehalten, nichts erfinden. Spreche klar, ohne Metakommentare.`;
  const userPrompt = `
Basistext (behalte Fakten, Daten, Kernaussagen bei):
${params.baseContext}

Vorgaben:
- Stil: ${style.label} (${style.description})
- Sprecher:innen: ${speakerCount} Personen, klar unterscheidbar (Name + Rolle).
- Abschnitte: ${segmentCount} kurze Segmente, insgesamt kompakt.
- Level: ${params.levelId ?? 'unspecified'}
- Thema: ${params.theme ?? 'allgemein'}${params.headline ? ` | Headline: ${params.headline}` : ''}
- Keine künstlichen Rahmen ("Willkommen im Podcast"), direkt ins Thema.
- Jede Sprecher:in redet in normaler Sprache, keine Listen.

Rückgabe als JSON (keine Zusätze):
{
  "title": "Titel",
  "subtitle": "Untertitel",
  "speakers": [
    { "id": "spk_1", "name": "Name 1", "role": "Rolle" },
    ...
  ],
  "segments": [
    { "speakerId": "spk_1", "text": "Gesprochener Satz..." },
    ...
  ]
}
`;

  const result = await generateObject({
    model: customModel(ModelId.GPT_5),
    schema: ScriptSchema,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.35,
  });

  return result.object;
}

export function listListeningStyles(): ListeningStyleConfig[] {
  return Object.values(STYLE_REGISTRY);
}
