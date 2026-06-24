import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useWebRTCMeeting } from '@/hooks/use-webrtc-meeting';
import type { TelehealthSessionWithDetails } from '@shared/schema';

interface VideoMeetingProps {
  session: TelehealthSessionWithDetails;
  onEndCall: () => void;
}

export function VideoMeeting({ session, onEndCall }: VideoMeetingProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    isConnected,
    isConnecting,
    participants,
    localStream,
    error,
    toggleAudio,
    toggleVideo,
    endCall
  } = useWebRTCMeeting({
    session,
    onCallEnded: onEndCall,
    onError: (error) => {
      console.error('Meeting error:', error);
    }
  });

  // Handle local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle remote video stream
  useEffect(() => {
    const remoteParticipant = participants.find(p => !p.isLocal);
    if (remoteVideoRef.current && remoteParticipant?.stream) {
      remoteVideoRef.current.srcObject = remoteParticipant.stream;
    }
  }, [participants]);

  // Handle audio toggle
  const handleAudioToggle = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    toggleAudio(newState);
  };

  // Handle video toggle
  const handleVideoToggle = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    toggleVideo(newState);
  };

  // Handle end call
  const handleEndCall = () => {
    endCall();
    onEndCall();
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold">Connection Error</h2>
              <p className="text-muted-foreground text-center">{error}</p>
              <Button onClick={onEndCall} variant="outline">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="text-xl font-semibold">Connecting to Meeting</h2>
              <p className="text-muted-foreground text-center">
                Please wait while we establish your connection...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remoteParticipant = participants.find(p => !p.isLocal);
  const localParticipant = participants.find(p => p.isLocal);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">HIPAA-Compliant Meeting</h1>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Connecting..."}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {session.practitioner?.user?.firstName} {session.practitioner?.user?.lastName} & {session.patient?.user?.firstName} {session.patient?.user?.lastName}
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative p-4">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Remote Video (Main) */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {remoteParticipant?.stream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onDoubleClick={toggleFullscreen}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Waiting for participant...</p>
                  <p className="text-sm opacity-75">
                    {remoteParticipant?.name || "Other participant"} will appear here
                  </p>
                </div>
              </div>
            )}
            
            {/* Remote participant info */}
            {remoteParticipant && (
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {remoteParticipant.name} {!remoteParticipant.videoEnabled && "(Camera Off)"}
              </div>
            )}
          </div>

          {/* Local Video (Picture-in-Picture) */}
          <div className="relative bg-black rounded-lg overflow-hidden lg:col-span-1">
            {localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <VideoOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-75">Your camera</p>
                </div>
              </div>
            )}
            
            {/* Local participant info */}
            {localParticipant && (
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                You {!localParticipant.videoEnabled && "(Camera Off)"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-center justify-center space-x-4">
          {/* Audio Toggle */}
          <Button
            onClick={handleAudioToggle}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          {/* Video Toggle */}
          <Button
            onClick={handleVideoToggle}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          {/* End Call */}
          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {/* Status Info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {participants.length} participant{participants.length !== 1 ? 's' : ''} in meeting
          </p>
          {!isAudioEnabled && (
            <p className="text-xs text-destructive mt-1">Your microphone is muted</p>
          )}
          {!isVideoEnabled && (
            <p className="text-xs text-destructive mt-1">Your camera is off</p>
          )}
        </div>
      </div>
    </div>
  );
}
