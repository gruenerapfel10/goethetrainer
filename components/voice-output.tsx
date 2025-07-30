'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSpeechSynthesis, type SpeechSynthesisService } from '@/lib/voice/speech-synthesis';
import { cn } from '@/lib/utils';

interface VoiceOutputProps {
  text: string;
  className?: string;
  autoPlay?: boolean;
}

export function VoiceOutput({ text, className, autoPlay = false }: VoiceOutputProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const speechSynthesis = useRef<SpeechSynthesisService | null>(null);

  useEffect(() => {
    // Check if speech synthesis is supported
    const synthesis = getSpeechSynthesis();
    if (!synthesis) {
      setIsSupported(false);
      return;
    }
    
    speechSynthesis.current = synthesis;

    // Auto-play if requested
    if (autoPlay && text) {
      playText();
    }
  }, []);

  const playText = async () => {
    if (!speechSynthesis.current || !text) return;
    
    try {
      setIsPlaying(true);
      setIsPaused(false);
      
      await speechSynthesis.current.speak(text, {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.9,
      });
      
      setIsPlaying(false);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to play text:', error);
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const pauseSpeech = () => {
    if (!speechSynthesis.current) return;
    
    speechSynthesis.current.pause();
    setIsPaused(true);
  };

  const resumeSpeech = () => {
    if (!speechSynthesis.current) return;
    
    speechSynthesis.current.resume();
    setIsPaused(false);
  };

  const stopSpeech = () => {
    if (!speechSynthesis.current) return;
    
    speechSynthesis.current.stop();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      if (isPaused) {
        resumeSpeech();
      } else {
        pauseSpeech();
      }
    } else {
      playText();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesis.current?.isSpeaking()) {
        speechSynthesis.current.stop();
      }
    };
  }, []);

  if (!isSupported || !text) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={togglePlayback}
        className={cn(
          'h-8 w-8 transition-all',
          isPlaying && 'text-primary'
        )}
        title={
          isPlaying 
            ? (isPaused ? 'Resume reading' : 'Pause reading')
            : 'Read message aloud'
        }
      >
        {isPlaying ? (
          isPaused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
      </Button>
      
      {isPlaying && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={stopSpeech}
          className="h-8 w-8"
          title="Stop reading"
        >
          <VolumeX className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}