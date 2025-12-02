import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type LanguageCode,
} from '@aws-sdk/client-transcribe';
import { fromIni } from '@aws-sdk/credential-providers';
import crypto from 'crypto';

export interface AwsTranscribeOptions {
  region?: string;
  languageCode?: LanguageCode | string;
  mediaFormat?: 'mp3' | 'mp4' | 'wav' | 'flac' | 'ogg' | 'amr' | 'webm';
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export async function transcribeWithAwsTranscribe(
  mediaUrl: string,
  {
    region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    languageCode = 'de-DE' as LanguageCode,
    mediaFormat = 'mp3',
    timeoutMs = 120_000,
    pollIntervalMs = 5_000,
  }: AwsTranscribeOptions = {}
): Promise<{ transcript: string | null; jobName: string }> {
  const sharedCreds =
    process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID
      ? fromIni({ profile: process.env.AWS_PROFILE })
      : undefined;
  const client = new TranscribeClient({ region, credentials: sharedCreds });
  const jobName = `transcribe-${crypto.randomUUID()}`;

  await client.send(
    new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: languageCode as LanguageCode,
      Media: { MediaFileUri: mediaUrl },
      MediaFormat: mediaFormat,
      OutputBucketName: undefined, // keep inline result
    })
  );

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await client.send(
      new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      })
    );
    const job = status.TranscriptionJob;
    if (!job) {
      break;
    }
    if (job.TranscriptionJobStatus === 'COMPLETED' && job.Transcript?.TranscriptFileUri) {
      const uri = job.Transcript.TranscriptFileUri;
      const res = await fetch(uri);
      const json = await res.json();
      const transcript = json.results?.transcripts?.[0]?.transcript ?? null;
      return { transcript, jobName };
    }
    if (job.TranscriptionJobStatus === 'FAILED') {
      throw new Error(`Transcription failed: ${job.FailureReason ?? 'unknown reason'}`);
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return { transcript: null, jobName };
}
