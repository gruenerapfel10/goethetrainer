import {
  PollyClient,
  SynthesizeSpeechCommand,
  type LanguageCode,
  type VoiceId,
} from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

type PollyFormat = 'mp3' | 'ogg_vorbis' | 'pcm';

export interface AwsPollyOptions {
  region?: string;
  voiceId?: VoiceId | string;
  languageCode?: LanguageCode | string;
  engine?: 'standard' | 'neural';
  outputFormat?: PollyFormat;
  bucket?: string;
}

export interface AwsPollyResult {
  url: string;
  bucket: string;
  key: string;
  contentType: string;
}

function createHash(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function synthesizeWithAwsPolly(
  text: string,
  {
    region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    voiceId = 'Vicki',
    languageCode = 'de-DE',
    engine = 'neural',
    outputFormat = 'mp3',
  bucket = process.env.AWS_TTS_BUCKET || '',
  }: AwsPollyOptions = {}
): Promise<AwsPollyResult> {
  if (!bucket) {
    throw new Error('AWS_TTS_BUCKET is not configured');
  }

  const sharedCreds =
    process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID
      ? fromIni({ profile: process.env.AWS_PROFILE })
      : undefined;

  const polly = new PollyClient({ region, credentials: sharedCreds });
  const s3 = new S3Client({ region, credentials: sharedCreds });

  const key = `tts/${voiceId}/${createHash(`${languageCode}:${voiceId}:${engine}:${text}`)}.${outputFormat}`;

  // First try to put directly; SynthesizeSpeech returns audio stream
  const synthResponse = await polly.send(
    new SynthesizeSpeechCommand({
      Engine: engine,
      LanguageCode: languageCode as LanguageCode,
      OutputFormat: outputFormat,
      Text: text,
      VoiceId: voiceId as VoiceId,
    })
  );

  if (!synthResponse.AudioStream) {
    throw new Error('Polly did not return audio');
  }

  const body = Buffer.from(await synthResponse.AudioStream.transformToByteArray());

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: outputFormat === 'mp3' ? 'audio/mpeg' : 'application/octet-stream',
    })
  );

  const getUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 60 * 60 }
  );

  return {
    url: getUrl,
    bucket,
    key,
    contentType: outputFormat === 'mp3' ? 'audio/mpeg' : 'application/octet-stream',
  };
}
