/**
 * Speech Recognition Service
 * Provides browser-based speech-to-text functionality
 */

// Define the Web Speech API types (not included in standard TypeScript)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// Extend Window interface for vendor prefixes
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface VoiceCommandCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onNoMatch?: () => void;
}

export class SpeechRecognitionService {
  private recognition: any;
  private isListening: boolean = false;
  private callbacks: VoiceCommandCallbacks = {};

  constructor() {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }

  private setupRecognition() {
    // Configure recognition settings
    this.recognition.continuous = true; // Keep listening until stopped
    this.recognition.interimResults = true; // Get results while speaking
    this.recognition.maxAlternatives = 3; // Get top 3 alternatives
    this.recognition.lang = 'en-US'; // Default language

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      
      if (lastResult) {
        const transcript = lastResult[0].transcript;
        const isFinal = lastResult.isFinal;
        
        this.callbacks.onResult?.(transcript, isFinal);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.callbacks.onError?.(event.error);
      
      // Auto-restart on certain errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (this.isListening) {
            this.restart();
          }
        }, 1000);
      }
    };

    this.recognition.onnomatch = () => {
      this.callbacks.onNoMatch?.();
    };
  }

  start(callbacks: VoiceCommandCallbacks = {}) {
    if (this.isListening) {
      console.warn('Speech recognition is already active');
      return;
    }

    this.callbacks = callbacks;
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.callbacks.onError?.('Failed to start speech recognition');
    }
  }

  stop() {
    if (!this.isListening) {
      console.warn('Speech recognition is not active');
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  restart() {
    this.stop();
    setTimeout(() => this.start(this.callbacks), 100);
  }

  setLanguage(lang: string) {
    this.recognition.lang = lang;
    
    // Restart if currently listening to apply new language
    if (this.isListening) {
      this.restart();
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Check if speech recognition is supported
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // Get list of common language codes
  static getLanguages() {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'pt-PT', name: 'Portuguese (Portugal)' },
      { code: 'ru-RU', name: 'Russian' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' },
      { code: 'ar-SA', name: 'Arabic' },
      { code: 'hi-IN', name: 'Hindi' },
    ];
  }
}

// Singleton instance
let speechRecognitionInstance: SpeechRecognitionService | null = null;

export function getSpeechRecognition(): SpeechRecognitionService | null {
  if (!SpeechRecognitionService.isSupported()) {
    return null;
  }
  
  if (!speechRecognitionInstance) {
    try {
      speechRecognitionInstance = new SpeechRecognitionService();
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      return null;
    }
  }
  
  return speechRecognitionInstance;
}