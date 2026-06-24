export interface AuditEvent {
  id: string;
  sessionId: string;
  userId: string;
  userRole: 'patient' | 'practitioner' | 'admin' | 'staff';
  eventType: AuditEventType;
  eventData: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditEventType = 
  | 'session_created'
  | 'session_joined'
  | 'session_started'
  | 'session_ended'
  | 'consent_granted'
  | 'consent_denied'
  | 'participant_ready'
  | 'participant_left'
  | 'recording_started'
  | 'recording_stopped'
  | 'screen_share_started'
  | 'screen_share_stopped'
  | 'connection_established'
  | 'connection_lost'
  | 'technical_issue'
  | 'security_violation'
  | 'session_notes_updated'
  | 'session_cancelled';

export class AuditService {
  private static instance: AuditService;
  private sessionEvents: Map<string, AuditEvent[]> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  private initialize() {
    if (this.isInitialized) return;
    
    // Load existing audit logs from localStorage
    try {
      const existingLogs = localStorage.getItem('telehealth-audit-logs');
      if (existingLogs) {
        const logs = JSON.parse(existingLogs);
        logs.forEach((log: AuditEvent) => {
          if (!this.sessionEvents.has(log.sessionId)) {
            this.sessionEvents.set(log.sessionId, []);
          }
          this.sessionEvents.get(log.sessionId)!.push(log);
        });
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
    
    this.isInitialized = true;
  }

  /**
   * Log an audit event for HIPAA compliance
   */
  logEvent(
    sessionId: string,
    userId: string,
    userRole: 'patient' | 'practitioner' | 'admin' | 'staff',
    eventType: AuditEventType,
    eventData: Record<string, any> = {}
  ): void {
    const event: AuditEvent = {
      id: this.generateEventId(),
      sessionId,
      userId,
      userRole,
      eventType,
      eventData,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    // Add to session events
    if (!this.sessionEvents.has(sessionId)) {
      this.sessionEvents.set(sessionId, []);
    }
    this.sessionEvents.get(sessionId)!.push(event);

    // Save to localStorage
    this.saveToStorage();

    // Log to console for debugging (remove in production)
    console.log('🔒 AUDIT LOG:', {
      eventType,
      sessionId,
      userId,
      userRole,
      timestamp: event.timestamp,
      data: eventData
    });

    // Send to server for permanent storage (if available)
    this.sendToServer(event).catch(error => {
      console.error('Failed to send audit event to server:', error);
    });
  }

  /**
   * Log a system event (not tied to a specific session)
   */
  logSystemEvent(
    userId: string,
    userRole: 'patient' | 'practitioner' | 'admin' | 'staff',
    eventType: AuditEventType,
    eventData: Record<string, any> = {}
  ): void {
    const event: AuditEvent = {
      id: this.generateEventId(),
      sessionId: 'system', // Use 'system' as sessionId for system events
      userId,
      userRole,
      eventType,
      eventData,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    // Add to system events
    if (!this.sessionEvents.has('system')) {
      this.sessionEvents.set('system', []);
    }
    this.sessionEvents.get('system')!.push(event);

    // Save to localStorage
    this.saveToStorage();

    // Log to console for debugging (remove in production)
    console.log('🔒 SYSTEM AUDIT LOG:', {
      eventType,
      userId,
      userRole,
      timestamp: event.timestamp,
      data: eventData
    });

    // Send to server for permanent storage (if available)
    this.sendToServer(event).catch(error => {
      console.error('Failed to send system audit event to server:', error);
    });
  }

  /**
   * Get all audit events for a session
   */
  getSessionEvents(sessionId: string): AuditEvent[] {
    return this.sessionEvents.get(sessionId) || [];
  }

  /**
   * Get audit events by type
   */
  getEventsByType(eventType: AuditEventType): AuditEvent[] {
    const allEvents: AuditEvent[] = [];
    this.sessionEvents.forEach(events => {
      allEvents.push(...events.filter(event => event.eventType === eventType));
    });
    return allEvents;
  }

  /**
   * Get audit events for a specific user
   */
  getUserEvents(userId: string): AuditEvent[] {
    const allEvents: AuditEvent[] = [];
    this.sessionEvents.forEach(events => {
      allEvents.push(...events.filter(event => event.userId === userId));
    });
    return allEvents;
  }

  /**
   * Export audit logs for a session
   */
  exportSessionLogs(sessionId: string): string {
    const events = this.getSessionEvents(sessionId);
    const exportData = {
      sessionId,
      exportDate: new Date(),
      totalEvents: events.length,
      events: events
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear audit logs for a session (use with caution)
   */
  clearSessionLogs(sessionId: string): void {
    this.sessionEvents.delete(sessionId);
    this.saveToStorage();
  }

  /**
   * Get audit summary for a session
   */
  getSessionSummary(sessionId: string): {
    totalEvents: number;
    eventTypes: Record<string, number>;
    participants: string[];
    duration?: number;
    firstEvent?: string;
    lastEvent?: string;
  } {
    const events = this.getSessionEvents(sessionId);
    
    if (events.length === 0) {
      return {
        totalEvents: 0,
        eventTypes: {},
        participants: []
      };
    }

    const eventTypes: Record<string, number> = {};
    const participants = new Set<string>();
    
    events.forEach(event => {
      eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
      participants.add(event.userId);
    });

    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstEvent = sortedEvents[0].timestamp;
    const lastEvent = sortedEvents[sortedEvents.length - 1].timestamp;
    const duration = new Date(lastEvent).getTime() - new Date(firstEvent).getTime();

    return {
      totalEvents: events.length,
      eventTypes,
      participants: Array.from(participants),
      duration,
      firstEvent,
      lastEvent
    };
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(): string {
    // In a real implementation, this would be obtained from the server
    // For now, we'll use a placeholder
    return 'client_ip_placeholder';
  }

  private saveToStorage(): void {
    try {
      const allEvents: AuditEvent[] = [];
      this.sessionEvents.forEach(events => {
        allEvents.push(...events);
      });
      
      // Keep only the last 1000 events to prevent localStorage overflow
      const recentEvents = allEvents
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000);
      
      localStorage.setItem('telehealth-audit-logs', JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Error saving audit logs to localStorage:', error);
    }
  }

  private async sendToServer(event: AuditEvent): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token available for audit logging');
        return;
      }

      const response = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Failed to send audit event: ${response.status}`);
      }
    } catch (error) {
      // Don't throw here - audit logging should not break the main application
      console.error('Failed to send audit event to server:', error);
    }
  }

  /**
   * Log consent events specifically
   */
  logConsent(
    sessionId: string,
    userId: string,
    userRole: 'patient' | 'practitioner' | 'admin' | 'staff',
    consentType: 'general' | 'privacy' | 'recording',
    granted: boolean,
    additionalData: Record<string, any> = {}
  ): void {
    const eventType = granted ? 'consent_granted' : 'consent_denied';
    
    this.logEvent(sessionId, userId, userRole, eventType, {
      consentType,
      ...additionalData
    });
  }

  /**
   * Log session lifecycle events
   */
  logSessionLifecycle(
    sessionId: string,
    userId: string,
    userRole: 'patient' | 'practitioner' | 'admin' | 'staff',
    eventType: 'session_created' | 'session_joined' | 'session_started' | 'session_ended' | 'session_cancelled',
    additionalData: Record<string, any> = {}
  ): void {
    this.logEvent(sessionId, userId, userRole, eventType, additionalData);
  }

  /**
   * Log participant status changes
   */
  logParticipantStatus(
    sessionId: string,
    userId: string,
    userRole: 'patient' | 'practitioner' | 'admin' | 'staff',
    status: 'ready' | 'left' | 'joined',
    additionalData: Record<string, any> = {}
  ): void {
    const eventType = status === 'ready' ? 'participant_ready' : 'participant_left';
    
    this.logEvent(sessionId, userId, userRole, eventType, {
      status,
      ...additionalData
    });
  }

  /**
   * Log technical issues
   */
  logTechnicalIssue(
    sessionId: string,
    userId: string,
    userRole: 'patient' | 'practitioner' | 'admin' | 'staff',
    issueType: string,
    description: string,
    additionalData: Record<string, any> = {}
  ): void {
    this.logEvent(sessionId, userId, userRole, 'technical_issue', {
      issueType,
      description,
      ...additionalData
    });
  }

  /**
   * Log security violations
   */
  logSecurityViolation(
    sessionId: string,
    userId: string,
    userRole: 'patient' | 'practitioner' | 'admin' | 'staff',
    violationType: string,
    description: string,
    additionalData: Record<string, any> = {}
  ): void {
    this.logEvent(sessionId, userId, userRole, 'security_violation', {
      violationType,
      description,
      ...additionalData
    });
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();
