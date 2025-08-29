'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone,
  PhoneOff,
  Monitor,
  Users,
  Settings,
  MessageSquare,
  Camera,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

export function VideoCallSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStartTime = useRef<Date | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isInCall && callStartTime.current) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - callStartTime.current!.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInCall]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsInCall(true);
      callStartTime.current = new Date();
      
      // Simulate joining participants
      setTimeout(() => {
        setParticipants([
          {
            id: 'user-1',
            name: 'John Doe',
            isVideoEnabled: true,
            isAudioEnabled: true,
            isScreenSharing: false,
          },
          {
            id: 'user-2', 
            name: 'Jane Smith',
            isVideoEnabled: false,
            isAudioEnabled: true,
            isScreenSharing: false,
          },
        ]);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setIsInCall(false);
    setParticipants([]);
    callStartTime.current = null;
    setCallDuration(0);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      setIsScreenSharing(true);
      
      screenStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
      };
      
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 relative">
          <Video className="h-4 w-4" />
          Call
          {isInCall && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              •
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <div className="flex flex-col h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Call
              {isInCall && (
                <Badge variant="secondary" className="ml-2">
                  {formatDuration(callDuration)}
                </Badge>
              )}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{participants.length + (isInCall ? 1 : 0)} participants</span>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 p-4 bg-black">
            {!isInCall ? (
              // Pre-call screen
              <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="w-64 h-48 bg-gray-800 rounded-lg mb-8 flex items-center justify-center">
                  <Camera className="h-16 w-16 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Ready to start your call?</h3>
                <p className="text-gray-300 mb-8 text-center">
                  Connect with your team using high-quality video and audio
                </p>
                <Button onClick={startCall} size="lg" className="gap-2">
                  <Video className="h-5 w-5" />
                  Start Call
                </Button>
              </div>
            ) : (
              // In-call screen
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full">
                {/* Local video */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    You {!isVideoEnabled && '(Video Off)'}
                  </div>
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <VideoOff className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Participant videos */}
                {participants.map((participant) => (
                  <div key={participant.id} className="relative bg-gray-900 rounded-lg overflow-hidden">
                    {participant.isVideoEnabled ? (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {participant.name.charAt(0)}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <VideoOff className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {participant.name}
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {!participant.isAudioEnabled && (
                        <MicOff className="h-4 w-4 text-red-500" />
                      )}
                      {participant.isScreenSharing && (
                        <Monitor className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          {isInCall && (
            <div className="flex items-center justify-center gap-4 p-4 border-t bg-gray-50">
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "secondary" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={startScreenShare}
              >
                <Monitor className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                <Settings className="h-5 w-5" />
              </Button>

              <Button
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={endCall}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}