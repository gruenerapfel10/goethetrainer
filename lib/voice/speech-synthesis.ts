/**
 * Speech Synthesis Service
 * Provides text-to-speech functionality
 */

export interface VoiceOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  voice?: SpeechSynthesisVoice;
}

export class SpeechSynthesisService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private defaultVoice: SpeechSynthesisVoice | null = null;
  private isPaused: boolean = false;

  constructor() {
    if (!window.speechSynthesis) {
      throw new Error('Speech synthesis is not supported in this browser');
    }

    this.synthesis = window.speechSynthesis;
    this.loadVoices();

    // Some browsers load voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    this.voices = this.synthesis.getVoices();
    
    // Set default voice (prefer a natural-sounding English voice)
    if (!this.defaultVoice && this.voices.length > 0) {
      // Try to find a high-quality English voice
      this.defaultVoice = 
        this.voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        this.voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('en')) ||
        this.voices.find(v => v.lang.startsWith('en-US')) ||
        this.voices.find(v => v.lang.startsWith('en')) ||
        this.voices[0];
    }
  }

  speak(text: string, options: VoiceOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice options
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      utterance.voice = options.voice ?? this.defaultVoice;

      // Set up event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        this.isPaused = false;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.isPaused = false;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  pause() {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.synthesis.paused) {
      this.synthesis.resume();
      this.isPaused = false;
    }
  }

  stop() {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
      this.currentUtterance = null;
      this.isPaused = false;
    }
  }

  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getVoicesByLanguage(langCode: string): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => 
      voice.lang.toLowerCase().startsWith(langCode.toLowerCase())
    );
  }

  setDefaultVoice(voice: SpeechSynthesisVoice) {
    this.defaultVoice = voice;
  }

  // Get recommended voices for better quality
  getRecommendedVoices(): SpeechSynthesisVoice[] {
    const qualityKeywords = ['Google', 'Microsoft', 'Natural', 'Enhanced', 'Premium'];
    
    return this.voices.filter(voice => {
      const name = voice.name.toLowerCase();
      return qualityKeywords.some(keyword => 
        name.includes(keyword.toLowerCase())
      ) && voice.lang.startsWith('en');
    });
  }

  // Check if speech synthesis is supported
  static isSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}

// Singleton instance
let speechSynthesisInstance: SpeechSynthesisService | null = null;

export function getSpeechSynthesis(): SpeechSynthesisService | null {
  if (!SpeechSynthesisService.isSupported()) {
    return null;
  }
  
  if (!speechSynthesisInstance) {
    try {
      speechSynthesisInstance = new SpeechSynthesisService();
    } catch (error) {
      console.error('Failed to initialize speech synthesis:', error);
      return null;
    }
  }
  
  return speechSynthesisInstance;
}