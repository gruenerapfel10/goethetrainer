export interface TextToSpeechOptions {
  lang?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voiceURI?: string;
}

export interface TextToSpeechEngine {
  id: string;
  label: string;
  description?: string;
  isAvailable(): boolean;
  speak(text: string, options?: TextToSpeechOptions): Promise<void>;
  stop(): void;
}
