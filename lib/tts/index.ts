import type { TextToSpeechOptions } from './types';

export * from './types';

let synthRef: SpeechSynthesis | null = null;
let voices: SpeechSynthesisVoice[] = [];
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function getSynth(): SpeechSynthesis | null {
  if (!hasWindow()) {
    return null;
  }
  if (synthRef) {
    return synthRef;
  }
  if ('speechSynthesis' in window) {
    synthRef = window.speechSynthesis;
    return synthRef;
  }
  return null;
}

function applyOptions(utterance: SpeechSynthesisUtterance, options?: TextToSpeechOptions) {
  if (!options) {
    return;
  }
  if (options.lang) {
    utterance.lang = options.lang;
  }
  if (typeof options.pitch === 'number') {
    utterance.pitch = options.pitch;
  }
  if (typeof options.rate === 'number') {
    utterance.rate = options.rate;
  }
  if (typeof options.volume === 'number') {
    utterance.volume = options.volume;
  }
}

function chooseVoice(
  available: SpeechSynthesisVoice[],
  { voiceURI, lang }: TextToSpeechOptions = {}
): SpeechSynthesisVoice | null {
  if (!available.length) {
    return null;
  }

  if (voiceURI) {
    const byUri = available.find(voice => voice.voiceURI === voiceURI);
    if (byUri) {
      return byUri;
    }
  }

  if (lang) {
    const target = lang.toLowerCase();
    const exact = available.find(voice => voice.lang?.toLowerCase() === target);
    if (exact) {
      return exact;
    }
    const base = target.split('-')[0];
    const partial = available.find(voice => voice.lang?.toLowerCase().startsWith(base));
    if (partial) {
      return partial;
    }
  }

  const defaultVoice = available.find(voice => voice.default);
  return defaultVoice ?? available[0] ?? null;
}

async function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = getSynth();
  if (!synth) {
    throw new Error('Speech synthesis is not available in this environment.');
  }

  const cached = synth.getVoices();
  if (cached.length) {
    voices = cached;
    return voices;
  }

  if (!voicesPromise) {
    voicesPromise = new Promise(resolve => {
      let timeoutId: number | null = null;
      const handle = () => {
        const next = synth.getVoices();
        if (next.length) {
          cleanup();
          voices = next;
          resolve(next);
        }
      };

      const cleanup = () => {
        if (typeof synth.removeEventListener === 'function') {
          synth.removeEventListener('voiceschanged', handle as EventListener);
        } else {
          synth.onvoiceschanged = null;
        }
        if (timeoutId !== null && hasWindow()) {
          window.clearTimeout(timeoutId);
        }
        voicesPromise = null;
      };

      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', handle as EventListener);
      } else {
        synth.onvoiceschanged = handle;
      }

      timeoutId = hasWindow()
        ? window.setTimeout(() => {
            cleanup();
            const next = synth.getVoices();
            voices = next;
            resolve(next);
          }, 1500)
        : null;
    });
  }

  return voicesPromise;
}

function resetCurrentUtterance() {
  currentUtterance = null;
}

export function isTextToSpeechAvailable(): boolean {
  return getSynth() !== null;
}

export async function speakText(text: string, options?: TextToSpeechOptions): Promise<void> {
  if (!text?.trim()) {
    return;
  }

  const synth = getSynth();
  if (!synth) {
    throw new Error('Speech synthesis is not available in this browser.');
  }

  if (currentUtterance || synth.speaking || synth.pending) {
    synth.cancel();
    resetCurrentUtterance();
  }

  await ensureVoices().catch(() => {
    // If voices fail to load we can still attempt to speak; continue silently.
    voices = [];
  });

  const utterance = new SpeechSynthesisUtterance(text);
  applyOptions(utterance, options);

  const voice = chooseVoice(voices.length ? voices : synth.getVoices(), options);
  if (voice) {
    utterance.voice = voice;
    if (!utterance.lang && voice.lang) {
      utterance.lang = voice.lang;
    }
  } else if (options?.lang) {
    utterance.lang = options.lang;
  }

  if (synth.paused && typeof synth.resume === 'function') {
    try {
      synth.resume();
    } catch {
      // Ignore resume errors (Safari can throw if resume is called too early).
    }
  }

  currentUtterance = utterance;

  return new Promise<void>((resolve, reject) => {
    utterance.onend = () => {
      resetCurrentUtterance();
      resolve();
    };
    utterance.onerror = event => {
      resetCurrentUtterance();
      if (event.error === 'canceled' || event.error === 'interrupted') {
        resolve();
        return;
      }
      reject(
        event.error
          ? new Error(`Speech synthesis failed: ${event.error}`)
          : new Error('Speech synthesis failed.')
      );
    };

    try {
      synth.speak(utterance);
    } catch (err) {
      resetCurrentUtterance();
      reject(err instanceof Error ? err : new Error('Failed to start speech synthesis.'));
    }
  });
}

export function stopSpeaking(): void {
  const synth = getSynth();
  if (!synth) {
    return;
  }
  if (currentUtterance || synth.speaking || synth.pending) {
    synth.cancel();
    resetCurrentUtterance();
  }
}
