import { useState, useEffect } from "react";
import { ThemedCard, ThemedCardContent, ThemedCardHeader, ThemedCardTitle } from "@/components/ui/themed-card";
import { ThemedButton } from "@/components/ui/themed-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  Calendar, 
  Clock, 
  Activity,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Phone,
  Smartphone,
  Users,
  Monitor,
  PhoneOff,
  List
} from "lucide-react";
import { TeamsIcon, GoogleMeetIcon } from "@/components/ui/platform-icons";
import type { TelehealthSessionWithDetails } from "@shared/schema";
import { DateTime } from "luxon";
import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

interface SessionDashboardProps {
  sessions: TelehealthSessionWithDetails[];
  onJoinSession: (session: TelehealthSessionWithDetails, isPatient?: boolean) => void;
  onStartSession: (id: string) => void;
  onEndSession: (id: string) => void;
}

export function SessionDashboard({
  sessions,
  onJoinSession,
  onStartSession,
  onEndSession
}: SessionDashboardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user preferences for timezone
  const { data: userPreferences } = useQuery({
    queryKey: ["/api/user-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await api.get(`/api/user-preferences?userId=${user.id}`);
        return response;
      } catch (error) {
        console.error("Error fetching user preferences:", error);
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const userTimezone = userPreferences?.timezone || 'UTC';

  // Function to convert UTC time to user's preferred timezone using Luxon
  const convertToUserTimezone = (utcTime: string | Date) => {
    try {
      const utcDateTime = DateTime.fromISO(utcTime.toString(), { zone: 'utc' });
      const userLocalDateTime = utcDateTime.setZone(userTimezone);
      return userLocalDateTime.toFormat('h:mm a');
    } catch (error) {
      console.error("Error converting timezone:", error);
      // Fallback to browser timezone
      return new Date(utcTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Check if there are active sessions to determine default tab
  const activeSessions = sessions.filter(s => s.status === 'waiting_room' || s.status === 'in_session');
  const todaySessions = sessions.filter(s => {
    if (!s.appointment) return false;
    const sessionDate = new Date(s.appointment.appointmentDate);
    const today = new Date();
    return sessionDate.toDateString() === today.toDateString();
  });
  const upcomingSessions = sessions.filter(s => {
    // Don't show completed or cancelled sessions in upcoming
    if (s.status === 'completed' || s.status === 'cancelled') return false;
    
    if (!s.appointment) return s.status === 'scheduled'; // Show sessions without appointments if scheduled
    const sessionDate = new Date(s.appointment.appointmentDate);
    const today = new Date();
    // Only show future sessions that are NOT today
    return sessionDate > today && sessionDate.toDateString() !== today.toDateString();
  });
  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Set default tab based on active sessions or today's sessions
  const [selectedTab, setSelectedTab] = useState(() => {
    if (activeSessions.length > 0 || todaySessions.length > 0) return "today";
    return "all";
  });

  // Debug logging
  console.log('Session Dashboard Debug:', {
    totalSessions: sessions.length,
    activeSessions: activeSessions.length,
    todaySessions: todaySessions.length,
    upcomingSessions: upcomingSessions.length,
    completedSessions: completedSessions.length,
    selectedTab,
    sessions: sessions.map(s => ({
      id: s.id,
      status: s.status,
      appointmentDate: s.appointment?.appointmentDate,
      isToday: s.appointment ? new Date(s.appointment.appointmentDate).toDateString() === new Date().toDateString() : false,
      isUpcoming: s.status !== 'completed' && s.status !== 'cancelled' && s.appointment ? 
        new Date(s.appointment.appointmentDate) > new Date() && 
        new Date(s.appointment.appointmentDate).toDateString() !== new Date().toDateString() : false
    }))
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'waiting_room': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_session': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Play className="w-3 h-3" />;
      case 'waiting_room': return <Video className="w-3 h-3" />;
      case 'in_session': return <Video className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'cancelled': return <AlertCircle className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'Ready to Start',
      'waiting_room': 'Active',
      'in_session': 'Active',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'zoom': return <Video className="w-4 h-4" />;
      case 'teams': return <TeamsIcon className="w-4 h-4" />;
      case 'google_meet': return <GoogleMeetIcon className="w-4 h-4" />;
      case 'webrtc': return <Smartphone className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'zoom': return 'Zoom (Coming Soon)';
      case 'teams': return 'Microsoft Teams (Coming Soon)';
      case 'google_meet': return 'Google Meet (Coming Soon)';
      case 'webrtc': return 'TiNHiH Session';
      default: return 'TiNHiH Session';
    }
  };

  // Handle stat card clicks to filter sessions
  const handleStatClick = (filterType: string) => {
    if (filterType === "active") {
      // For active sessions, show "All" tab but filter to active sessions only
      setSelectedTab("all");
      // We'll use a state to track if we're filtering for active sessions
      setActiveFilter(true);
    } else {
      setSelectedTab(filterType);
      setActiveFilter(false);
    }
  };

  // State to track if we're filtering for active sessions in the "All" tab
  const [activeFilter, setActiveFilter] = useState(false);

  const SessionCard = ({ session }: { session: TelehealthSessionWithDetails }) => (
    <ThemedCard className="mb-4">
      <ThemedCardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center space-x-2">
                {getPlatformIcon(session.platform || 'webrtc')}
                <span className="font-semibold">
                  {session.patient?.user?.firstName} {session.patient?.user?.lastName}
                </span>
              </div>
              <Badge className={getStatusColor(session.status)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(session.status)}
                  <span>{getStatusText(session.status)}</span>
                </div>
              </Badge>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-600">
                {getPlatformName(session.platform || 'webrtc')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="w-4 h-4" style={{ color: `hsl(var(--muted-foreground))` }} />
                <span>{session.appointment ? new Date(session.appointment.appointmentDate).toLocaleDateString() : new Date(session.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4" style={{ color: `hsl(var(--muted-foreground))` }} />
                <span>
                  {session.appointment 
                    ? `${convertToUserTimezone(session.appointment.appointmentDate)} (${userTimezone})`
                    : 'Direct Session'
                  }
                </span>
              </div>
            </div>

            {session.platform && session.platform !== 'webrtc' && (
              <div className="mb-3">
                <span className="text-sm" style={{ color: `hsl(var(--muted-foreground))` }}>
                  Platform: {session.platform.toUpperCase()}
                </span>
              </div>
            )}

            {session.sessionNotes && (
              <div className="mb-4">
                <p className="text-sm" style={{ color: `hsl(var(--muted-foreground))` }}>
                  {session.sessionNotes}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2">
                                         {session.status === 'scheduled' && (
           <ThemedButton
             onClick={() => {
               // Use React Router for navigation
               setLocation(`/telehealth-session/${session.id}`);
             }}
             size="sm"
             className="min-w-[120px]"
           >
             <Play className="w-4 h-4 mr-2" />
             Start Meeting
           </ThemedButton>
         )}

                          {(session.status === 'waiting_room' || session.status === 'in_session') && (
                <>
                  <ThemedButton
                    onClick={() => {
                      // Use React Router for navigation
                      setLocation(`/telehealth-session/${session.id}`);
                    }}
                    size="sm"
                    className="min-w-[120px]"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Rejoin
                  </ThemedButton>
                <ThemedButton
                  onClick={() => onEndSession(session.id)}
                  variant="destructive"
                  size="sm"
                  className="min-w-[120px]"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Cancel
                </ThemedButton>
                {session.meetingUrl && (
                  <ThemedButton
                    onClick={() => {
                      navigator.clipboard.writeText(session.meetingUrl!);
                      const toast = document.createElement('div');
                      toast.textContent = 'Meeting link copied!';
                      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
                      document.body.appendChild(toast);
                      setTimeout(() => document.body.removeChild(toast), 3000);
                    }}
                    variant="outline"
                    size="sm"
                    className="min-w-[120px]"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Copy Link
                  </ThemedButton>
                )}
              </>
            )}

            {session.status === 'completed' && (
              <div className="text-sm text-center py-2" style={{ color: `hsl(var(--muted-foreground))` }}>
                Session Completed
              </div>
            )}

            {session.status === 'cancelled' && (
              <div className="text-sm text-center py-2" style={{ color: `hsl(var(--muted-foreground))` }}>
                Session Cancelled
              </div>
            )}
          </div>
        </div>
      </ThemedCardContent>
    </ThemedCard>
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ThemedCard 
          onClick={() => handleStatClick("today")}
          className="cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800"
        >
          <ThemedCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Today
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {todaySessions.length}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Sessions
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </ThemedCardContent>
        </ThemedCard>

        <ThemedCard 
          onClick={() => handleStatClick("active")}
          className="cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800"
        >
          <ThemedCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Active Now
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {sessions.filter(s => s.status === 'waiting_room' || s.status === 'in_session').length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Live Sessions
                </p>
              </div>
              <div className="relative">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Video className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-ping"></div>
              </div>
            </div>
          </ThemedCardContent>
        </ThemedCard>

        <ThemedCard 
          onClick={() => handleStatClick("upcoming")}
          className="cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800"
        >
          <ThemedCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Upcoming
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {upcomingSessions.length}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Scheduled
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </ThemedCardContent>
        </ThemedCard>

        <ThemedCard 
          onClick={() => handleStatClick("completed")}
          className="cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800"
        >
          <ThemedCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Completed
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {completedSessions.length}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Sessions
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </ThemedCardContent>
        </ThemedCard>
      </div>

      {/* Session Tabs */}
      <ThemedCard>
        <ThemedCardHeader>
                          <ThemedCardTitle>Telehealth Meeting Sessions</ThemedCardTitle>
        </ThemedCardHeader>
        <ThemedCardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full mt-1 grid-cols-4 h-12 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <TabsTrigger 
                value="all" 
                className="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <List className="w-4 h-4" />
                All ({activeFilter ? activeSessions.length : sessions.length})
                {activeFilter && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="today" 
                className="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Calendar className="w-4 h-4" />
                Today ({todaySessions.length})
              </TabsTrigger>
              <TabsTrigger 
                value="upcoming" 
                className="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Clock className="w-4 h-4" />
                Upcoming ({upcomingSessions.length})
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <CheckCircle className="w-4 h-4" />
                Completed ({completedSessions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {activeFilter && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Showing Active Sessions Only
                    </span>
                    <button
                      onClick={() => setActiveFilter(false)}
                      className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Show All
                    </button>
                  </div>
                </div>
              )}
              
              {(activeFilter ? activeSessions : sessions).length === 0 ? (
                <div className="text-center py-8">
                  <List className="w-12 h-12 mx-auto mb-4" style={{ color: `hsl(var(--muted-foreground))` }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: `hsl(var(--foreground))` }}>
                    {activeFilter ? "No active sessions found" : "No sessions found"}
                  </h3>
                  <p style={{ color: `hsl(var(--muted-foreground))` }}>
                    {activeFilter ? "There are no active sessions at the moment" : "Schedule a telehealth session to get started"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(activeFilter ? activeSessions : sessions).map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="today" className="mt-6">
              {todaySessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: `hsl(var(--muted-foreground))` }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: `hsl(var(--foreground))` }}>
                    No sessions today
                  </h3>
                  <p style={{ color: `hsl(var(--muted-foreground))` }}>
                    Schedule a telehealth session to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaySessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="mt-6">
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: `hsl(var(--muted-foreground))` }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: `hsl(var(--foreground))` }}>
                    No upcoming sessions
                  </h3>
                  <p style={{ color: `hsl(var(--muted-foreground))` }}>
                    Your future sessions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedSessions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: `hsl(var(--muted-foreground))` }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: `hsl(var(--foreground))` }}>
                    No completed sessions
                  </h3>
                  <p style={{ color: `hsl(var(--muted-foreground))` }}>
                    Completed sessions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ThemedCardContent>
      </ThemedCard>
    </div>
  );
}