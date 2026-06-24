import { auditService } from './audit-service';

export interface MeetingParticipant {
  id: string;
  name: string;
  role: 'patient' | 'practitioner';
  isLocal: boolean;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface MeetingConfig {
  sessionId: string;
  userId: string;
  userRole: 'patient' | 'practitioner';
  onParticipantJoined?: (participant: MeetingParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

export class WebRTCMeetingService {
  private config: MeetingConfig;
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private participants: Map<string, MeetingParticipant> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: MeetingConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Start local media stream
      await this.startLocalStream();
      
      // Connect to signaling server
      await this.connectToSignalingServer();
      
      // Log audit event
      auditService.logSystemEvent(
        this.config.userId,
        this.config.userRole,
        'meeting_joined',
        { sessionId: this.config.sessionId }
      );
      
    } catch (error) {
      console.error('Failed to connect to meeting:', error);
      this.config.onError?.(error instanceof Error ? error.message : 'Connection failed');
    }
  }

  private async startLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Add local participant
      const localParticipant: MeetingParticipant = {
        id: this.config.userId,
        name: this.config.userRole === 'practitioner' ? 'Dr. Practitioner' : 'Patient',
        role: this.config.userRole,
        isLocal: true,
        stream: this.localStream,
        audioEnabled: true,
        videoEnabled: true
      };

      this.participants.set(this.config.userId, localParticipant);
      
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Camera and microphone access required');
    }
  }

  private async connectToSignalingServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to signaling server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send join message
        this.ws?.send(JSON.stringify({
          type: 'join_meeting',
          sessionId: this.config.sessionId,
          userId: this.config.userId,
          userRole: this.config.userRole,
          token
        }));
        
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleSignalingMessage(message);
        } catch (error) {
          console.error('Failed to parse signaling message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
        this.handleReconnection();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('Failed to connect to signaling server'));
      };
    });
  }

  private handleSignalingMessage(message: any): void {
    switch (message.type) {
      case 'participant_joined':
        this.handleParticipantJoined(message);
        break;
      case 'participant_left':
        this.handleParticipantLeft(message);
        break;
      case 'offer':
        this.handleOffer(message);
        break;
      case 'answer':
        this.handleAnswer(message);
        break;
      case 'ice_candidate':
        this.handleIceCandidate(message);
        break;
      case 'meeting_ended':
        this.endCall();
        break;
    }
  }

  private async handleParticipantJoined(message: any): Promise<void> {
    const { userId, userName, userRole } = message;
    
    if (userId === this.config.userId) return; // Skip self
    
    const participant: MeetingParticipant = {
      id: userId,
      name: userName,
      role: userRole,
      isLocal: false,
      audioEnabled: true,
      videoEnabled: true
    };
    
    this.participants.set(userId, participant);
    
    // Create peer connection
    await this.createPeerConnection(userId);
    
    this.config.onParticipantJoined?.(participant);
    
    // Log audit event
    auditService.logSystemEvent(
      this.config.userId,
      this.config.userRole,
      'participant_joined',
      { sessionId: this.config.sessionId, participantId: userId }
    );
  }

  private handleParticipantLeft(message: any): void {
    const { userId } = message;
    
    // Close peer connection
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
    
    // Remove participant
    this.participants.delete(userId);
    
    this.config.onParticipantLeft?.(userId);
    
    // Log audit event
    auditService.logSystemEvent(
      this.config.userId,
      this.config.userRole,
      'participant_left',
      { sessionId: this.config.sessionId, participantId: userId }
    );
  }

  private async createPeerConnection(peerId: string): Promise<void> {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    this.peerConnections.set(peerId, peerConnection);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const participant = this.participants.get(peerId);
      if (participant) {
        participant.stream = event.streams[0];
        this.participants.set(peerId, participant);
      }
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.ws?.send(JSON.stringify({
          type: 'ice_candidate',
          sessionId: this.config.sessionId,
          from: this.config.userId,
          to: peerId,
          candidate: event.candidate
        }));
      }
    };
    
    // Create and send offer
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.ws?.send(JSON.stringify({
        type: 'offer',
        sessionId: this.config.sessionId,
        from: this.config.userId,
        to: peerId,
        offer
      }));
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  }

  private async handleOffer(message: any): Promise<void> {
    const { from, offer } = message;
    const peerConnection = this.peerConnections.get(from);
    
    if (!peerConnection) {
      await this.createPeerConnection(from);
    }
    
    const connection = this.peerConnections.get(from);
    if (connection) {
      try {
        await connection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        
        this.ws?.send(JSON.stringify({
          type: 'answer',
          sessionId: this.config.sessionId,
          from: this.config.userId,
          to: from,
          answer
        }));
      } catch (error) {
        console.error('Failed to handle offer:', error);
      }
    }
  }

  private async handleAnswer(message: any): Promise<void> {
    const { from, answer } = message;
    const peerConnection = this.peerConnections.get(from);
    
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Failed to handle answer:', error);
      }
    }
  }

  private async handleIceCandidate(message: any): Promise<void> {
    const { from, candidate } = message;
    const peerConnection = this.peerConnections.get(from);
    
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    }
  }

  // Public API Methods
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        
        const localParticipant = this.participants.get(this.config.userId);
        if (localParticipant) {
          localParticipant.audioEnabled = enabled;
          this.participants.set(this.config.userId, localParticipant);
        }
        
        // Log audit event
        auditService.logSystemEvent(
          this.config.userId,
          this.config.userRole,
          'audio_toggled',
          { sessionId: this.config.sessionId, enabled }
        );
      }
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
        
        const localParticipant = this.participants.get(this.config.userId);
        if (localParticipant) {
          localParticipant.videoEnabled = enabled;
          this.participants.set(this.config.userId, localParticipant);
        }
        
        // Log audit event
        auditService.logSystemEvent(
          this.config.userId,
          this.config.userRole,
          'video_toggled',
          { sessionId: this.config.sessionId, enabled }
        );
      }
    }
  }

  getParticipants(): MeetingParticipant[] {
    return Array.from(this.participants.values());
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  endCall(): void {
    // Close all peer connections
    this.peerConnections.forEach(connection => connection.close());
    this.peerConnections.clear();
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Clear participants
    this.participants.clear();
    this.isConnected = false;
    
    // Log audit event
    auditService.logSystemEvent(
      this.config.userId,
      this.config.userRole,
      'meeting_ended',
      { sessionId: this.config.sessionId }
    );
    
    this.config.onCallEnded?.();
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectToSignalingServer().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      this.config.onError?.('Connection lost. Please refresh the page.');
    }
  }

  disconnect(): void {
    this.endCall();
  }
}
