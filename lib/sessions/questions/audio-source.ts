import { generateObject } from 'ai';
import { z } from 'zod';
import { QuestionDifficulty } from './question-types';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';
import { getNewsTopicFromPool, type NewsTopic } from '@/lib/news/news-topic-pool';
import type { ModelUsageRecord } from '@/lib/questions/modules/types';

function recordModelUsage(
  recordUsage: ((record: ModelUsageRecord) => void) | undefined,
  modelId: string,
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    outputTokens?: number;
    inputTokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null
): void {
  if (!recordUsage || !usage) {
    return;
  }
  const inputTokens =
    usage.promptTokens ??
    usage.inputTokens ??
    usage.prompt_tokens ??
    0;
  const outputTokens =
    usage.completionTokens ??
    usage.outputTokens ??
    usage.completion_tokens ??
    0;
  if (!inputTokens && !outputTokens) {
    return;
  }
  recordUsage({
    modelId,
    inputTokens,
    outputTokens,
  });
}

export interface AudioTranscriptSegment {
  speakerId: string;
  speakerName: string;
  role?: string;
  text: string;
}

export interface AudioTranscriptResult {
  title: string;
  description: string;
  summary: string;
  theme: string;
  scenario: string;
  speakingStyle: string;
  durationSeconds: number;
  transcript: string;
  segments: AudioTranscriptSegment[];
  newsTopic: NewsTopic | null;
}

export interface AudioTranscriptOptions {
  conversationStyle?: 'podcast' | 'interview' | 'dialogue' | 'discussion' | 'monologue';
  speakerCount?: number;
  segmentCount?: number;
  listeningMode?: string;
  scenario?: string;
  prompts?: {
    transcript?: string;
  };
  teilLabel?: string;
}

const DEFAULT_AUDIO_MODEL = customModel(ModelId.CLAUDE_HAIKU_4_5);

const AudioOutlineSchema = z.object({
  title: z.string(),
  description: z.string(),
  scenario: z.string(),
  speakingStyle: z.string(),
  durationSeconds: z.number().min(180).max(480),
  participants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        motivation: z.string(),
      })
    )
    .min(1)
    .max(4),
  talkingPoints: z.array(z.string()).min(4).max(8),
  summary: z.string(),
});

const TranscriptSchema = z.object({
  title: z.string(),
  description: z.string(),
  durationSeconds: z.number().min(120).max(600),
  segments: z
    .array(
      z.object({
        speakerId: z.string(),
        speakerName: z.string(),
        role: z.string().optional(),
        text: z.string(),
      })
    )
    .min(4)
    .max(24),
});

function buildTranscriptString(segments: AudioTranscriptSegment[]): string {
  return segments
    .map(segment => `${segment.speakerName}: ${segment.text}`)
    .join('\n\n');
}

export async function generateNewsBackedAudioTranscript(
  difficulty: QuestionDifficulty,
  options: AudioTranscriptOptions = {},
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<AudioTranscriptResult> {
  const newsTopic = await getNewsTopicFromPool(userId);
  const conversationStyle = options.conversationStyle ?? 'podcast';
  const speakerCount =
    options.speakerCount ??
    (conversationStyle === 'monologue' || conversationStyle === 'podcast' ? 1 : 2);
  const segmentCount = Math.max(
    4,
    Math.min(options.segmentCount ?? speakerCount * 4, 20)
  );

  const styleLabel = (() => {
    switch (conversationStyle) {
      case 'podcast':
        return 'Podcast-Monolog';
      case 'interview':
        return 'Radiointerview';
      case 'dialogue':
        return 'Dialog';
      case 'discussion':
        return 'Diskussion';
      case 'monologue':
      default:
        return 'Vortrag';
    }
  })();

  const outlinePrompt = `
Du entwickelst einen Hörtext für das Goethe-Zertifikat C1 (Teil ${options.teilLabel ?? '?'}) im Format ${styleLabel}.

Nachrichtenimpuls:
Headline: ${newsTopic?.headline ?? 'Unbekannt'}
Quelle: ${newsTopic?.source ?? 'n/a'}
Zusammenfassung: ${newsTopic?.summary ?? 'n/a'}

Vorgaben:
- Schwierigkeitsgrad: ${difficulty}
- Zuhörscenario: ${options.scenario ?? 'Aktuelle gesellschaftliche Debatte'}
- Sprecheranzahl: ${speakerCount} (ein Sprecher = Monolog, mehrere Sprecher = klare Rollen)
- Stil: ${styleLabel}
- Dauer: ca. 3-5 Minuten

${options.prompts?.transcript ?? ''}

Liefere eine strukturierte Übersicht entsprechend des Schemas.`;

  const outline = await generateObject({
    model: DEFAULT_AUDIO_MODEL,
    schema: AudioOutlineSchema,
    system:
      'Du bist Hörtext-Autor für Prüfungsaufgaben des Goethe-Instituts. Du planst glaubwürdige Gesprächsverläufe mit klaren Rollen.',
    prompt: outlinePrompt,
    temperature: 0.4,
  });
  recordModelUsage(recordUsage, ModelId.CLAUDE_HAIKU_4_5, outline.usage);

  const transcriptPrompt = `
Erstelle das vollständige Transkript für den geplanten Hörtext.

Rahmendaten:
- Titel: ${outline.object.title}
- Beschreibung: ${outline.object.description}
- Szenario: ${outline.object.scenario}
- Sprechstil: ${outline.object.speakingStyle}
- Sprecher:innen: ${outline.object.participants
    .map(participant => `${participant.name} (${participant.role})`)
    .join(', ')}
- Talking Points: ${outline.object.talkingPoints.join('; ')}
- Nachrichtenimpuls: ${newsTopic?.headline ?? 'Unbekannt'} (${newsTopic?.summary ?? 'ohne Zusammenfassung'})
- Ziel: ${options.listeningMode ?? 'Ca. 3-5 minütiger Hörtext'}
- Gewünschte Anzahl Abschnitte: ${segmentCount}

Schreibe alle Inhalte auf Deutsch. Jeder Abschnitt enthält genau eine Sprecher-ID. Keine Regieanweisungen, nur gesprochenen Text.`;

  const transcript = await generateObject({
    model: DEFAULT_AUDIO_MODEL,
    schema: TranscriptSchema,
    system:
      'Du bist Dialogautor:in für Hörtexte des Goethe-Instituts. Schreibe authentische, gut strukturierte Transkripte.',
    prompt: transcriptPrompt,
    temperature: 0.45,
  });
  recordModelUsage(recordUsage, ModelId.CLAUDE_HAIKU_4_5, transcript.usage);

  const segments: AudioTranscriptSegment[] = transcript.object.segments
    .slice(0, segmentCount)
    .map(segment => ({
      speakerId: segment.speakerId,
      speakerName: segment.speakerName,
      role: segment.role,
      text: segment.text,
    }));

  return {
    title: transcript.object.title,
    description: transcript.object.description,
    summary: outline.object.summary,
    theme: newsTopic?.theme ?? outline.object.scenario,
    scenario: outline.object.scenario,
    speakingStyle: outline.object.speakingStyle,
    durationSeconds: transcript.object.durationSeconds,
    transcript: buildTranscriptString(segments),
    segments,
    newsTopic: newsTopic ?? null,
  };
}
