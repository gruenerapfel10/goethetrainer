'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSpeechRecognition, type SpeechRecognitionService } from '@/lib/voice/speech-recognition';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  autoSubmit?: boolean;
}

export function VoiceInput({ onTranscript, className, autoSubmit = true }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const speechRecognition = useRef<SpeechRecognitionService | null>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setIsSupported(false);
      return;
    }
    
    speechRecognition.current = recognition;
  }, []);

  const startListening = () => {
    if (!speechRecognition.current) return;
    
    setError(null);
    setTranscript('');
    
    speechRecognition.current.start({
      onStart: () => {
        setIsListening(true);
        console.log('Voice recognition started');
      },
      onEnd: () => {
        setIsListening(false);
        console.log('Voice recognition ended');
      },
      onResult: (text, isFinal) => {
        setTranscript(text);
        
        // Clear existing silence timer
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current);
        }
        
        if (isFinal && autoSubmit) {
          // Auto-submit after a short pause when we get final results
          silenceTimer.current = setTimeout(() => {
            if (text.trim()) {
              onTranscript(text.trim());
              stopListening();
            }
          }, 1000);
        }
      },
      onError: (error) => {
        setError(error);
        setIsListening(false);
        
        // Don't show "no-speech" errors as they're expected
        if (error === 'no-speech') {
          setError(null);
        }
      },
      onNoMatch: () => {
        setError('No speech was detected. Please try again.');
      }
    });
  };

  const stopListening = () => {
    if (!speechRecognition.current) return;
    
    speechRecognition.current.stop();
    
    // Clear silence timer
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    
    // Submit current transcript if available
    if (transcript.trim() && !autoSubmit) {
      onTranscript(transcript.trim());
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechRecognition.current?.getIsListening()) {
        speechRecognition.current.stop();
      }
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
    };
  }, []);

  if (!isSupported) {
    return null; // Don't show voice input if not supported
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        size="icon"
        variant={isListening ? 'destructive' : 'ghost'}
        onClick={toggleListening}
        className={cn(
          'transition-all',
          isListening && 'animate-pulse'
        )}
        title={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {/* Voice visualization */}
      {isListening && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg min-w-[200px] max-w-[300px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              <span className="w-1 h-4 bg-primary rounded-full animate-pulse" />
              <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-100" />
              <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-200" />
            </div>
            <span className="text-xs text-muted-foreground">Listening...</span>
          </div>
          {transcript && (
            <p className="text-sm">{transcript}</p>
          )}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2 text-xs whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}