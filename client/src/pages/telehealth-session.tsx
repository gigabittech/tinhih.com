import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { VideoMeeting } from "@/components/telehealth/video-meeting";
import { usePageTitle } from "@/context/page-context";
import type { TelehealthSessionWithDetails } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function TelehealthSession() {
  const [, params] = useRoute("/telehealth-session/:sessionId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { setPageInfo } = usePageTitle();
  const { toast } = useToast();
  
  const [session, setSession] = useState<TelehealthSessionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInMeeting, setIsInMeeting] = useState(false);

  const sessionId = params?.sessionId;

  useEffect(() => {
    if (!sessionId) {
      setError("Session ID is required");
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await apiRequest(`/api/telehealth-sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch session");
        }
        
        const sessionData = await response.json();
        setSession(sessionData);
        
        // Set page info
        setPageInfo(
          "HIPAA-Compliant Meeting", 
          `Secure video meeting with ${sessionData.patient?.user?.firstName || 'Patient'}`
        );
        
      } catch (error) {
        console.error("Error fetching session:", error);
        setError("Failed to load session");
        toast({
          title: "Error",
          description: "Failed to load telehealth session",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, setPageInfo, toast]);

  const handleEndCall = () => {
    setIsInMeeting(false);
    setLocation("/telehealth");
  };

  const handleStartMeeting = async () => {
    if (!session) return;

    try {
      // Call API to start the session
      const response = await apiRequest(`/api/telehealth-sessions/${session.id}/start`, 'POST');
      if (!response.ok) {
        throw new Error("Failed to start session");
      }

      setIsInMeeting(true);
      toast({
        title: "Meeting Started",
        description: "HIPAA-compliant video meeting is now active",
      });
      
    } catch (error) {
      console.error("Error starting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to start meeting",
        variant: "destructive",
      });
    }
  };

  const handleJoinMeeting = async () => {
    if (!session) return;

    try {
      // Call API to join the session
      const response = await apiRequest(`/api/telehealth-sessions/${session.id}/join`, 'POST', {
        isPatient: user?.role === 'patient'
      });
      
      if (!response.ok) {
        throw new Error("Failed to join session");
      }

      setIsInMeeting(true);
      toast({
        title: "Joined Meeting",
        description: "Successfully joined the HIPAA-compliant meeting",
      });
      
    } catch (error) {
      console.error("Error joining meeting:", error);
      toast({
        title: "Error",
        description: "Failed to join meeting",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || "The requested session could not be found"}</p>
          <button 
            onClick={() => setLocation("/telehealth")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Telehealth Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check if user has permission to access this session
  const isPatient = user?.role === 'patient';
  const isPractitioner = user?.role === 'practitioner';
  const isSessionPatient = session.patient?.userId === user?.id;
  const isSessionPractitioner = session.practitioner?.userId === user?.id;

  if (!isSessionPatient && !isSessionPractitioner && !isPractitioner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have permission to access this session</p>
          <button 
            onClick={() => setLocation("/telehealth")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Telehealth Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If in meeting, show video interface
  if (isInMeeting && session) {
    return (
      <VideoMeeting
        session={session}
        onEndCall={handleEndCall}
      />
    );
  }

  // Show session details and join/start options
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">HIPAA-Compliant Meeting</h1>
          <p className="text-muted-foreground">
            Secure video consultation between {session.practitioner?.user?.firstName} {session.practitioner?.user?.lastName} and {session.patient?.user?.firstName} {session.patient?.user?.lastName}
          </p>
        </div>

        {/* Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Session Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {session.status}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Platform:</span>
                <span className="ml-2 font-medium">{session.platform}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="ml-2 font-medium">
                  {new Date(session.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Participants</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Practitioner:</span>
                <div className="ml-2 font-medium">
                  Dr. {session.practitioner?.user?.firstName} {session.practitioner?.user?.lastName}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Patient:</span>
                <div className="ml-2 font-medium">
                  {session.patient?.user?.firstName} {session.patient?.user?.lastName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {session.status === 'scheduled' && (
            <>
              {isSessionPractitioner && (
                <button
                  onClick={handleStartMeeting}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                >
                  Start Meeting
                </button>
              )}
              {(isSessionPatient || isSessionPractitioner) && (
                <button
                  onClick={handleJoinMeeting}
                  className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 font-medium"
                >
                  Join Meeting
                </button>
              )}
            </>
          )}
          
          {session.status === 'in_session' && (
            <button
              onClick={handleJoinMeeting}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              Rejoin Meeting
            </button>
          )}

          <button
            onClick={() => setLocation("/telehealth")}
            className="px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90 font-medium"
          >
            Back to Dashboard
          </button>
        </div>

        {/* HIPAA Compliance Notice */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">HIPAA Compliance</h4>
          <p className="text-sm text-blue-700">
            This meeting is conducted in compliance with HIPAA regulations. All communications are encrypted, 
            and session data is securely logged for audit purposes. Your privacy and security are our top priorities.
          </p>
        </div>
      </div>
    </div>
  );
}
