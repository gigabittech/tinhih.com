import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { usePageTitle } from "@/context/page-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ThemedCard, ThemedCardContent, ThemedCardHeader, ThemedCardTitle } from "@/components/ui/themed-card";
import { ThemedButton } from "@/components/ui/themed-button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock, Video, MessageSquare, FileText } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { AchievementBadges } from "@/components/dashboard/achievement-badges";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

interface RecoverySpecialistStats {
  totalClients: number;
  todaySessions: number;
  totalRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
  activeRecoveryPlans: number;
}

interface TodaySession {
  id: string;
  title: string;
  appointmentDate: string;
  duration: number;
  status: string;
  sessionType: string;
  patient: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function RecoverySpecialistDashboard() {
  const { user } = useAuth();
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setPageInfo("Recovery Specialist Dashboard", `Welcome back, ${user?.firstName || 'Counselor'}!`);
  }, [setPageInfo, user]);

  // Fetch recovery specialist stats
  const { data: stats, isLoading: statsLoading } = useQuery<RecoverySpecialistStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/stats");
      return response;
    },
  });

  // Fetch today's treatment sessions
  const { data: todaySessions, isLoading: sessionsLoading } = useQuery<TodaySession[]>({
    queryKey: ["/api/dashboard/today-appointments"],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/today-appointments");
      return response;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getClientInitials = (patient: any) => {
    const firstName = patient?.user?.firstName || "";
    const lastName = patient?.user?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const quickActions = [
    {
      title: "Treatment Calendar",
      description: "Manage recovery sessions",
      icon: Calendar,
      onClick: () => setLocation("/calendar"),
      color: "bg-blue-500",
    },
    {
      title: "My Clients",
      description: "View client records",
      icon: Users,
      onClick: () => setLocation("/clients"),
      color: "bg-green-500",
    },
    {
      title: "Messages",
      description: "Communicate with clients",
      icon: MessageSquare,
      onClick: () => setLocation("/messages"),
      color: "bg-purple-500",
    },
    {
      title: "Recovery Notes",
      description: "Document treatment sessions",
      icon: FileText,
      onClick: () => setLocation("/clinical-notes"),
      color: "bg-orange-500",
    },
    {
      title: "Service Billing",
      description: "View invoices and payments",
      icon: DollarSign,
      onClick: () => setLocation("/billing"),
      color: "bg-emerald-500",
    },
    {
      title: "Telehealth Sessions",
      description: "Start virtual recovery sessions",
      icon: Video,
      onClick: () => setLocation("/telehealth"),
      color: "bg-indigo-500",
    },
  ];

  return (
    <div className="flex flex-col h-full transition-colors duration-300">
      <div className="flex-1 overflow-auto p-6">
        {/* Welcome Banner */}
        <WelcomeBanner className="mb-6" />

        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName || 'Counselor'}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your recovery clients today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <ThemedCard className="cursor-pointer hover:shadow-md transition-all" onClick={() => setLocation("/clients")}>
            <ThemedCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clients</p>
                  <p className="text-2xl font-bold">{statsLoading ? "..." : stats?.totalClients || 0}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </ThemedCardContent>
          </ThemedCard>

          <ThemedCard className="cursor-pointer hover:shadow-md transition-all" onClick={() => setLocation("/calendar")}>
            <ThemedCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Sessions</p>
                  <p className="text-2xl font-bold">{statsLoading ? "..." : stats?.todaySessions || 0}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </ThemedCardContent>
          </ThemedCard>

          <ThemedCard className="cursor-pointer hover:shadow-md transition-all" onClick={() => setLocation("/billing")}>
            <ThemedCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Revenue</p>
                  <p className="text-2xl font-bold">${statsLoading ? "..." : Number(stats?.totalRevenue || 0).toFixed(2)}</p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </ThemedCardContent>
          </ThemedCard>

          <ThemedCard className="cursor-pointer hover:shadow-md transition-all" onClick={() => setLocation("/billing?status=unpaid")}>
            <ThemedCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold">${statsLoading ? "..." : Number(stats?.outstandingRevenue || 0).toFixed(2)}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </ThemedCardContent>
          </ThemedCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sessions and Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Treatment Sessions */}
            <div>
            <ThemedCard>
              <ThemedCardHeader>
                <div className="flex items-center justify-between">
                  <ThemedCardTitle>Today's Treatment Sessions</ThemedCardTitle>
                  <ThemedButton variant="ghost" size="sm" onClick={() => setLocation("/calendar")}>
                    View All
                  </ThemedButton>
                </div>
              </ThemedCardHeader>
              <ThemedCardContent>
                {sessionsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-muted/30">
                          <div className="w-12 h-12 rounded-full bg-muted"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 rounded w-3/4 bg-muted"></div>
                            <div className="h-3 rounded w-1/2 bg-muted"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : todaySessions && todaySessions.length > 0 ? (
                  <div className="space-y-4">
                    {todaySessions.map((session) => (
                      <div 
                        key={session.id} 
                        className="flex items-center space-x-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setLocation(`/calendar?appointment=${session.id}`)}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {getClientInitials(session.patient)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{session.title}</h4>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(session.appointmentDate), 'h:mm a')} • {session.duration} min
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.patient?.user?.firstName} {session.patient?.user?.lastName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No treatment sessions scheduled for today</p>
                    <ThemedButton 
                      className="mt-4" 
                      onClick={() => setLocation("/calendar")}
                    >
                      Schedule Session
                    </ThemedButton>
                  </div>
                )}
              </ThemedCardContent>
            </ThemedCard>
            </div>

            {/* Activity Feed */}
            <ActivityFeed />
          </div>

          {/* Right Column - Achievements, Quick Actions & Activity */}
          <div className="space-y-6">
            {/* Achievement Badges */}
            <AchievementBadges />

            {/* Quick Actions */}
            <ThemedCard>
              <ThemedCardHeader>
                <ThemedCardTitle>Quick Actions</ThemedCardTitle>
              </ThemedCardHeader>
              <ThemedCardContent>
                <div className="grid grid-cols-1 gap-3">
                  {quickActions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={action.onClick}
                    >
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ThemedCardContent>
            </ThemedCard>

            {/* Recent Activity */}
            <ThemedCard>
              <ThemedCardHeader>
                <ThemedCardTitle>Recent Activity</ThemedCardTitle>
              </ThemedCardHeader>
              <ThemedCardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">Last login: {format(new Date(), 'MMM dd, h:mm a')}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">Dashboard accessed</span>
                  </div>
                </div>
              </ThemedCardContent>
            </ThemedCard>
          </div>
        </div>
      </div>
    </div>
  );
}
