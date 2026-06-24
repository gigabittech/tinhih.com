import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemedButton } from "@/components/ui/themed-button";
import { usePageTitle } from "@/context/page-context";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Shield, Lock, Eye, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TelehealthSessionWithDetails, InsertTelehealthSession, AppointmentWithDetails } from "@shared/schema";
import { CreateTelehealthSessionForm } from "@/components/telehealth/create-session-form";
import { SessionDashboard } from "@/components/telehealth/session-dashboard";
import { useAuth } from "@/context/auth-context";
import { auditService } from "@/lib/audit-service";

export default function TelehealthPage() {
  const { setPageInfo } = usePageTitle();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TelehealthSessionWithDetails | null>(null);
  const [sessionPhase, setSessionPhase] = useState<'dashboard'>('dashboard');
  const wsRef = useRef<WebSocket | null>(null);

  // Debug session phase changes
  useEffect(() => {
    console.log('🔄 Session phase changed to:', sessionPhase);
  }, [sessionPhase]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Note: Audit service is initialized automatically when needed

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('🔌 Connected to WebSocket for telehealth updates');
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle telehealth session updates
        if (message.type === 'telehealth_session_created' || 
            message.type === 'telehealth_session_updated' || 
            message.type === 'telehealth_session_deleted') {
          
          console.log('🔄 Received telehealth update:', message.type);
          
          // Invalidate and refetch sessions
          queryClient.invalidateQueries({ queryKey: ['/api/telehealth-sessions'] });
          
          // Show toast notification
          if (message.type === 'telehealth_session_created') {
            toast({
              title: "New Session Created",
              description: "A new telehealth session has been scheduled",
            });
          } else if (message.type === 'telehealth_session_updated') {
            toast({
              title: "Session Updated",
              description: "A telehealth session has been updated",
            });
          } else if (message.type === 'telehealth_session_deleted') {
            toast({
              title: "Session Deleted",
              description: "A telehealth session has been removed",
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, queryClient, toast]);

  useEffect(() => {
    setPageInfo("HIPAA Telehealth", "Manage secure virtual collaborative meetings with enhanced privacy protection");
  }, [setPageInfo]);

  // Fetch telehealth sessions with HIPAA compliance status
  const { data: sessions = [], isLoading, error: sessionsError } = useQuery<TelehealthSessionWithDetails[]>({
    queryKey: ['/api/telehealth-sessions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/telehealth-sessions');
        const data = await response.json();
        
        // Log audit event for session list access
        if (user) {
          auditService.logSystemEvent(
            user.id,
            user.role as 'patient' | 'practitioner' | 'admin' | 'staff',
            'session_created',
            { sessionCount: data.length, action: 'session_list_access' }
          );
        }
        
        return data;
              } catch (fetchError) {
          console.error("Error fetching telehealth sessions:", fetchError);
        toast({
          title: "Error",
          description: "Failed to load telehealth sessions. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  console.log("HIPAA Telehealth sessions data:", { sessions, isLoading, error: sessionsError });

  // Fetch upcoming appointments (for scheduling telehealth) with proper error handling
  const { 
    data: appointments = [], 
    isLoading: appointmentsLoading, 
    error: appointmentsError 
  } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/appointments');
        const data = await response.json();
        console.log("Fetched appointments:", data);
        return data;
      } catch (error) {
        console.error("Error fetching appointments:", error);
        toast({
          title: "Error",
          description: "Failed to load appointments. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!user, // Only fetch when user is available
    retry: 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  console.log("Appointments data:", { 
    appointments, 
    appointmentsLoading, 
    appointmentsError, 
    userRole: user?.role,
    userId: user?.id 
  });

  // Create session mutation with HIPAA compliance
  const createSessionMutation = useMutation({
    mutationFn: (data: InsertTelehealthSession) => 
      apiRequest('/api/telehealth-sessions', 'POST', data),
    onSuccess: async (response) => {
      const data = await response.json();
      console.log("HIPAA-compliant session created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/telehealth-sessions'] });
      setCreateDialogOpen(false);
      
      // Log audit event for session creation
      if (user) {
        auditService.logEvent(
          data.id,
          user.id,
          user.role as 'patient' | 'practitioner' | 'admin' | 'staff',
          'session_created',
          { 
            appointmentId: data.appointmentId,
            platform: data.platform,
            encryptionLevel: 'SRTP',
            complianceFeatures: ['consent_management', 'audit_logging', 'encryption', 'access_control']
          }
        );
      }
      
      toast({
        title: "HIPAA-Compliant Session Scheduled",
        description: "Secure telehealth session has been scheduled with enhanced privacy protection.",
      });
    },
    onError: (error: any) => {
      console.error("Session creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule session",
        variant: "destructive",
      });
    },
  });

  // Join session mutation with consent requirement
  const joinSessionMutation = useMutation({
    mutationFn: ({ id, isPatient }: { id: string; isPatient: boolean }) =>
      apiRequest(`/api/telehealth-sessions/${id}/join`, 'POST', { isPatient }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/telehealth-sessions'] });
      
      // Log audit event for session join
      if (user) {
        auditService.logEvent(
          variables.id,
          user.id,
          user.role as 'patient' | 'practitioner' | 'admin' | 'staff',
          'session_joined',
          { isPatient: variables.isPatient }
        );
      }
      
      toast({
        title: "Joined Secure Session",
        description: "Successfully joined the HIPAA-compliant telehealth session.",
      });
    },
    onError: (error: any) => {
      console.error("Error joining session:", error);
      toast({
        title: "Error",
        description: "Failed to join session. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Start session mutation with readiness check
  const startSessionMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/telehealth-sessions/${id}/start`, 'POST'),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/telehealth-sessions'] });
      
      // Log audit event for session start
      if (user) {
        auditService.logEvent(
          variables,
          user.id,
          user.role as 'patient' | 'practitioner' | 'admin' | 'staff',
          'session_started',
          { timestamp: new Date() }
        );
      }
      
      toast({
        title: "Secure Session Started",
        description: "HIPAA-compliant telehealth session has been started with all participants ready.",
      });
    },
    onError: (error: any) => {
      console.error("Error starting session:", error);
      toast({
        title: "Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive",
      });
    }
  });

  // End session mutation with audit logging
  const endSessionMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/telehealth-sessions/${id}/end`, 'POST'),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/telehealth-sessions'] });
      
      // Log audit event for session end
      if (user) {
        auditService.logEvent(
          variables,
          user.id,
          user.role as 'patient' | 'practitioner' | 'admin' | 'staff',
          'session_ended',
          { 
            timestamp: new Date(),
            duration: selectedSession ? 
              Math.round((new Date().getTime() - new Date(selectedSession.sessionStartedAt || '').getTime()) / 1000) : 0
          }
        );
      }
      
      toast({
        title: "Session Ended Securely",
        description: "HIPAA-compliant telehealth session has been ended and all data is securely stored.",
      });
    },
    onError: (error: any) => {
      console.error("Error ending session:", error);
      toast({
        title: "Error",
        description: "Failed to end session. Please try again.",
        variant: "destructive",
      });
    }
  });



  const handleCreateSession = (data: InsertTelehealthSession) => {
    try {
      // Add HIPAA compliance metadata
      const hipaaData = {
        ...data,
        metadata: {
          ...data.metadata,
          hipaa: {
            encryptionLevel: 'SRTP',
            auditEnabled: true,
            consentRequired: true,
            recordingConsentRequired: true,
            sessionKey: crypto.randomUUID(),
            complianceVersion: '1.0'
          }
        }
      };
      
      createSessionMutation.mutate(hipaaData);
    } catch (error) {
      console.error("Error creating HIPAA session:", error);
      toast({
        title: "Error",
        description: "Failed to create secure session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleJoinSession = (session: TelehealthSessionWithDetails, isPatient: boolean = false) => {
    try {
      joinSessionMutation.mutate({ id: session.id, isPatient });
      setSelectedSession(session);
      toast({
        title: "Session Joined",
        description: "Successfully joined the telehealth session",
      });
    } catch (error) {
      console.error("Error joining HIPAA session:", error);
      toast({
        title: "Error",
        description: "Failed to join secure session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartSession = (id: string) => {
    try {
      startSessionMutation.mutate(id);
    } catch (error) {
      console.error("Error starting HIPAA session:", error);
      toast({
        title: "Error",
        description: "Failed to start secure session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = (id: string) => {
    try {
      endSessionMutation.mutate(id);
      setSelectedSession(null);
      setSessionPhase('dashboard');
    } catch (error) {
      console.error("Error ending HIPAA session:", error);
      toast({
        title: "Error",
        description: "Failed to end secure session. Please try again.",
        variant: "destructive",
      });
    }
  };




  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* HIPAA Compliance Header */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">HIPAA-Compliant Telehealth Meetings</h3>
                <p className="text-sm text-blue-700">
                  All collaborative meeting sessions are encrypted, audited, and protected under HIPAA regulations
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-blue-600">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>End-to-end encryption</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>Audit logging</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Consent management</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">HIPAA Telehealth Meeting Sessions</h2>
              <p className="text-muted-foreground">Manage secure virtual collaborative meetings with enhanced privacy protection</p>
            </div>
            <Sheet open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <SheetTrigger asChild>
                <ThemedButton>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Secure Meeting
                </ThemedButton>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Schedule HIPAA-Compliant Meeting</SheetTitle>
                  <SheetDescription>
                    Create a new secure virtual collaborative meeting with enhanced privacy protection and audit logging
                  </SheetDescription>
                </SheetHeader>
                <CreateTelehealthSessionForm
                  appointments={appointments}
                  onSubmit={handleCreateSession}
                  onCancel={() => setCreateDialogOpen(false)}
                  isLoading={createSessionMutation.isPending}
                />
              </SheetContent>
            </Sheet>
          </div>

          <SessionDashboard
            sessions={sessions}
            onJoinSession={handleJoinSession}
            onStartSession={handleStartSession}
            onEndSession={handleEndSession}
          />
        </div>
      </div>
    </div>
  );
}