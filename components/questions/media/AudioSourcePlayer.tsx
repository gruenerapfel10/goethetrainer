'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PauseCircle, PlayCircle, RotateCcw, Volume2, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AudioSourceDefinition } from '@/lib/sessions/questions/question-types';

interface AudioSourcePlayerProps {
  source: AudioSourceDefinition;
  className?: string;
  showTranscriptToggle?: boolean;
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) {
    return '00:00';
  }
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export function AudioSourcePlayer({
  source,
  className,
  showTranscriptToggle = true,
}: AudioSourcePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source.durationSeconds ?? 0);
  const [playCount, setPlayCount] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [status, setStatus] = useState<'idle' | 'error' | 'loading'>('idle');

  const playback = useMemo(() => ({
    maxPlays: source.playback?.maxPlays ?? null,
    allowPause: source.playback?.allowPause ?? true,
    allowSeek: source.playback?.allowSeek ?? source.playback?.allowScrubbing ?? true,
    allowRestart: source.playback?.allowRestart ?? true,
    allowSpeedChange: source.playback?.allowSpeedChange ?? true,
  }), [source.playback]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(element.duration) ? element.duration : duration);
      setStatus('idle');
    };

    const handleTimeUpdate = () => {
      const nextTime = element.currentTime;
      if (!playback.allowSeek) {
        const delta = Math.abs(nextTime - lastTimeRef.current);
        if (delta > 1.5) {
          element.currentTime = lastTimeRef.current;
          return;
        }
      }
      lastTimeRef.current = nextTime;
      setCurrentTime(nextTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (!playback.allowRestart) {
        lastTimeRef.current = element.duration;
      }
    };

    const handleWaiting = () => setStatus('loading');
    const handleCanPlay = () => setStatus('idle');
    const handleError = () => setStatus('error');

    element.addEventListener('loadedmetadata', handleLoadedMetadata);
    element.addEventListener('timeupdate', handleTimeUpdate);
    element.addEventListener('play', handlePlay);
    element.addEventListener('pause', handlePause);
    element.addEventListener('ended', handleEnded);
    element.addEventListener('waiting', handleWaiting);
    element.addEventListener('canplay', handleCanPlay);
    element.addEventListener('error', handleError);

    return () => {
      element.removeEventListener('loadedmetadata', handleLoadedMetadata);
      element.removeEventListener('timeupdate', handleTimeUpdate);
      element.removeEventListener('play', handlePlay);
      element.removeEventListener('pause', handlePause);
      element.removeEventListener('ended', handleEnded);
      element.removeEventListener('waiting', handleWaiting);
      element.removeEventListener('canplay', handleCanPlay);
      element.removeEventListener('error', handleError);
    };
  }, [duration, playback.allowRestart, playback.allowSeek]);

  const canPlayMore = playback.maxPlays ? playCount < playback.maxPlays : true;

  const handlePlayClick = async () => {
    const element = audioRef.current;
    if (!element || !canPlayMore) {
      return;
    }
    if (element.currentTime < 0.3) {
      setPlayCount(count => count + 1);
    }
    try {
      setStatus('idle');
      await element.play();
    } catch (error) {
      console.error('Audio playback failed', error);
      setStatus('error');
    }
  };

  const handlePauseClick = () => {
    if (!playback.allowPause) {
      return;
    }
    const element = audioRef.current;
    element?.pause();
  };

  const handleRestart = async () => {
    const element = audioRef.current;
    if (!element || !playback.allowRestart) {
      return;
    }
    if (!canPlayMore && element.currentTime < (element.duration ?? 0) - 0.25) {
      return;
    }
    element.currentTime = 0;
    lastTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    if (element.paused && canPlayMore) {
      await handlePlayClick();
    }
  };

  const handleSeek = (value: number) => {
    if (!playback.allowSeek) {
      return;
    }
    const element = audioRef.current;
    if (!element) {
      return;
    }
    element.currentTime = value;
    lastTimeRef.current = value;
    setCurrentTime(value);
  };

  const statusLabel = useMemo(() => {
    if (source.status === 'pending') return 'Audio wird generiert …';
    if (source.status === 'processing') return 'Audio in Verarbeitung …';
    if (status === 'loading') return 'Buffering …';
    if (status === 'error') return 'Wiedergabe fehlgeschlagen';
    return null;
  }, [source.status, status]);

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-background/70 p-5 shadow-sm space-y-4',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold flex items-center gap-2">
            <Waves className="h-4 w-4" /> Audioquelle
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-1">
            {source.title ?? 'Hörtext'}
          </h3>
          {source.description && (
            <p className="text-sm text-muted-foreground mt-1">{source.description}</p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {playback.maxPlays ? (
            <p>
              Wiedergaben: {playCount}/{playback.maxPlays}
            </p>
          ) : (
            <p>Unbegrenzte Wiedergaben</p>
          )}
          {duration > 0 && <p>{formatTime(duration)}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isPlaying ? handlePauseClick : handlePlayClick}
            disabled={isPlaying ? !playback.allowPause : !canPlayMore}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
              isPlaying
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground'
            )}
          >
            {isPlaying ? (
              <>
                <PauseCircle className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" /> Abspielen
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            disabled={!playback.allowRestart || (!canPlayMore && currentTime === 0)}
            className="inline-flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> Neu starten
          </button>
          <div className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.001)}
            value={Math.min(currentTime, duration)}
            onChange={event => handleSeek(Number(event.target.value))}
            disabled={!playback.allowSeek}
            className="flex-1 accent-primary h-1"
          />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {statusLabel && (
          <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {statusLabel}
          </div>
        )}
      </div>

      {source.playback && (
        <div className="flex flex-wrap gap-2">
          {playback.maxPlays && (
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Max. {playback.maxPlays} Wiedergaben
            </span>
          )}
          {!playback.allowPause && (
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Pause deaktiviert
            </span>
          )}
          {!playback.allowSeek && (
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Spulen deaktiviert
            </span>
          )}
        </div>
      )}

      {source.segments && source.segments.length > 0 && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          {source.segments.map(segment => (
            <div key={segment.timestamp} className="flex items-start gap-3">
              <span className="font-semibold text-foreground min-w-[60px]">{segment.timestamp}</span>
              <p className="flex-1 leading-relaxed">{segment.summary}</p>
            </div>
          ))}
        </div>
      )}

      {source.transcript && showTranscriptToggle && (
        <div className="rounded-md border border-border/60">
          <button
            type="button"
            className="w-full px-4 py-2 text-sm font-medium text-left flex items-center justify-between"
            onClick={() => setShowTranscript(value => !value)}
          >
            Transkript {showTranscript ? 'ausblenden' : 'anzeigen'}
            <span className="text-xs text-muted-foreground">{source.transcriptLanguage ?? 'DE'}</span>
          </button>
          {showTranscript && (
            <div className="px-4 pb-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {source.transcript}
            </div>
          )}
        </div>
      )}

      <audio ref={audioRef} src={source.url} preload="auto" hidden />
    </div>
  );
}
