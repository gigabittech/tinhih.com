import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import { WebRTCMeetingService, MeetingParticipant, MeetingConfig } from '@/lib/webrtc-meeting-service';
import type { TelehealthSessionWithDetails } from '@shared/schema';

export interface UseWebRTCMeetingOptions {
  session: TelehealthSessionWithDetails;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

export interface UseWebRTCMeetingReturn {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  participants: MeetingParticipant[];
  localStream: MediaStream | null;
  error: string | null;
  
  // Controls
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  endCall: () => void;
  
  // Service
  service: WebRTCMeetingService | null;
}

export function useWebRTCMeeting({ 
  session, 
  onCallEnded, 
  onError 
}: UseWebRTCMeetingOptions): UseWebRTCMeetingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<WebRTCMeetingService | null>(null);
  const { toast } = useToast();

  // Initialize service
  useEffect(() => {
    if (!session) return;

    const config: MeetingConfig = {
      sessionId: session.id,
      userId: session.practitioner?.userId || session.patient?.userId || '',
      userRole: session.practitioner ? 'practitioner' : 'patient',
      onParticipantJoined: (participant) => {
        setParticipants(prev => [...prev, participant]);
        toast({
          title: "Participant Joined",
          description: `${participant.name} has joined the meeting`,
        });
      },
      onParticipantLeft: (participantId) => {
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        toast({
          title: "Participant Left",
          description: "A participant has left the meeting",
        });
      },
      onCallEnded: () => {
        setIsConnected(false);
        setParticipants([]);
        setLocalStream(null);
        onCallEnded?.();
        toast({
          title: "Call Ended",
          description: "The meeting has ended",
        });
      },
      onError: (errorMessage) => {
        setError(errorMessage);
        setIsConnecting(false);
        onError?.(errorMessage);
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    serviceRef.current = new WebRTCMeetingService(config);

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
    };
  }, [session, onCallEnded, onError, toast]);

  // Connect to meeting
  const connect = useCallback(async () => {
    const service = serviceRef.current;
    if (!service) return;

    try {
      setIsConnecting(true);
      setError(null);
      
      await service.connect();
      
      setIsConnected(true);
      setIsConnecting(false);
      
      // Get initial participants and local stream
      setParticipants(service.getParticipants());
      setLocalStream(service.getLocalStream());
      
      toast({
        title: "Connected",
        description: "Successfully joined the meeting",
      });
      
    } catch (error) {
      setIsConnecting(false);
      setError(error instanceof Error ? error.message : 'Connection failed');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to join meeting',
        variant: "destructive",
      });
    }
  }, [toast]);

  // Auto-connect when service is ready
  useEffect(() => {
    if (serviceRef.current && !isConnected && !isConnecting) {
      connect();
    }
  }, [connect, isConnected, isConnecting]);

  // Control methods
  const toggleAudio = useCallback((enabled: boolean) => {
    const service = serviceRef.current;
    if (service) {
      service.toggleAudio(enabled);
      setParticipants(service.getParticipants());
    }
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    const service = serviceRef.current;
    if (service) {
      service.toggleVideo(enabled);
      setParticipants(service.getParticipants());
    }
  }, []);

  const endCall = useCallback(() => {
    const service = serviceRef.current;
    if (service) {
      service.endCall();
    }
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    participants,
    localStream,
    error,
    
    // Controls
    toggleAudio,
    toggleVideo,
    endCall,
    
    // Service
    service: serviceRef.current
  };
}
