export enum STTProvider {
  BROWSER_SPEECH = 'browser_speech',
  AWS_TRANSCRIBE = 'aws_transcribe',
}

export interface STTOptions {
  provider?: STTProvider;
  locale?: string;
  mediaFormat?: string;
}

export interface STTResult {
  transcript: string;
  confidence?: number;
  provider: STTProvider;
}

/**
 * Placeholder for future STT integrations. Currently only a browser hook
 * is envisioned; server-side providers (e.g. Azure, ElevenLabs, etc.)
 * can be added by extending this service.
 */
export async function transcribeAudio(
  _audioUrl: string,
  options: STTOptions = {}
): Promise<STTResult> {
  const provider = options.provider ?? STTProvider.BROWSER_SPEECH;

  if (provider === STTProvider.AWS_TRANSCRIBE) {
    const { transcribeWithAwsTranscribe } = await import('./providers/aws-transcribe');
    const result = await transcribeWithAwsTranscribe(_audioUrl, {
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
      languageCode: options.locale ?? 'de-DE',
      mediaFormat: (options.mediaFormat as any) ?? 'mp3',
    });
    return {
      transcript: result.transcript ?? '',
      provider,
    };
  }

  throw new Error(`STT provider "${provider}" is not implemented yet`);
}

export const defaultSttProvider = STTProvider.BROWSER_SPEECH;
