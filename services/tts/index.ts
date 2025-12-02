import type { GeneratedAudioDefinition } from '@/lib/sessions/questions/question-types';
import { synthesizeWithAwsPolly } from './providers/aws-polly';

export enum TTSProvider {
  BROWSER_SPEECH = 'browser_speech',
  AWS_POLLY = 'aws_polly',
}

export interface TTSOptions {
  provider?: TTSProvider;
  locale?: string;
  voiceHint?: string;
  rate?: number;
  pitch?: number;
  voiceId?: string;
}

export interface TTSSegment {
  speakerId?: string;
  speakerName?: string;
  role?: string;
  text: string;
}

/**
 * Build a generated audio definition for client-side playback.
 * For now we only support browser speech synthesis; other providers
 * can be plugged in by extending this service.
 */
export function buildGeneratedAudio(
  segments: TTSSegment[],
  options: TTSOptions = {}
): GeneratedAudioDefinition {
  const provider = options.provider ?? TTSProvider.BROWSER_SPEECH;
  return {
    provider,
    locale: options.locale ?? 'de-DE',
    voiceHint: options.voiceHint,
    rate: options.rate,
    pitch: options.pitch,
    segments: segments.map((segment, index) => ({
      speakerId: segment.speakerId ?? `speaker_${index + 1}`,
      speakerName: segment.speakerName,
      role: segment.role,
      text: segment.text,
    })),
  };
}

export const defaultTtsProvider = TTSProvider.BROWSER_SPEECH;

export interface SynthesizedAudio {
  url: string;
  contentType: string;
  provider: TTSProvider;
}

/**
 * Synthesize text using the configured provider. Returns a URL to the audio asset.
 * For AWS Polly, audio is written to S3 and returned as a presigned GET URL.
 * For browser speech, returns null (client-side should use generatedAudio).
 */
export async function synthesizeText(
  text: string,
  options: TTSOptions = {}
): Promise<SynthesizedAudio | null> {
  const provider = options.provider ?? TTSProvider.BROWSER_SPEECH;

  if (provider === TTSProvider.AWS_POLLY) {
    const result = await synthesizeWithAwsPolly(text, {
      voiceId: options.voiceId,
      languageCode: options.locale ?? 'de-DE',
    });
    return {
      url: result.url,
      contentType: result.contentType,
      provider,
    };
  }

  return null;
}
