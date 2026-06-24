import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { ThemedCard, ThemedCardContent } from "@/components/ui/themed-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";

interface EnhancedStatsCardsProps {
  className?: string;
}

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  totalRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  averageAppointmentDuration: number;
}

interface AppointmentStats {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export function EnhancedStatsCards({ className }: EnhancedStatsCardsProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/stats");
      console.log("Dashboard stats response:", response);
      return response; 
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch appointment statistics
  const { data: appointmentStats, isLoading: appointmentLoading } = useQuery<AppointmentStats>({
    queryKey: ["appointment-stats"],
    queryFn: async () => {
      const response = await api.get("/api/appointments/stats");
      console.log("Appointment stats response:", response);
      return response;
    },
    refetchInterval: 30000,
  });

  // Fetch insights data
  const { data: insights } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/insights");
      console.log("Dashboard insights response:", response);
      return response;
    },
  });

  if (statsLoading || appointmentLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <ThemedCard key={i} className="animate-pulse rounded-xl">
            <ThemedCardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-8 w-24 rounded bg-muted"></div>
                <div className="h-8 w-8 rounded-full bg-muted"></div>
              </div>
              <div className="h-12 w-20 rounded bg-muted mb-2"></div>
              <div className="h-4 w-32 rounded bg-muted"></div>
            </ThemedCardContent>
          </ThemedCard>
        ))}
      </div>
    );
  }

  // Get role-appropriate stats data
  const getStatsData = () => {
    const isPatient = user?.role === "patient";
    const isPractitioner = user?.role === "practitioner";
    const isAdmin = user?.role === "admin";
    const isStaff = user?.role === "staff";

    return [
      {
        title: isPatient ? "My Profile" : "Total Patients",
        value: stats?.totalPatients || 0,
        change: insights?.patientsGrowth ? `${insights.patientsGrowth >= 0 ? '+' : ''}${insights.patientsGrowth.toFixed(1)}% from last month` : "+12% from last month",
        changeType: (insights?.patientsGrowth || 0) >= 0 ? "increase" as const : "decrease" as const,
        icon: Users,
        iconBg: "bg-blue-100 dark:bg-blue-900/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        onClick: () => isPatient ? setLocation("/profile") : setLocation("/patients"),
        description: isPatient ? "Your patient profile" : "Registered patients",
      },
      {
        title: "Today's Appointments",
        value: appointmentStats?.today || 0,
        subtitle: `${appointmentStats?.completed || 0} completed`,
        icon: Calendar,
        iconBg: "bg-green-100 dark:bg-green-900/20",
        iconColor: "text-green-600 dark:text-green-400",
        onClick: () => setLocation("/calendar"),
        description: isPatient ? "Your appointments today" : "Scheduled for today",
        badges: [
          { label: "Pending", count: appointmentStats?.pending || 0, color: "bg-yellow-100 text-yellow-800" },
          { label: "Completed", count: appointmentStats?.completed || 0, color: "bg-green-100 text-green-800" },
        ]
      },
      {
        title: "This Week",
        value: appointmentStats?.thisWeek || 0,
        subtitle: "appointments scheduled",
        icon: Clock,
        iconBg: "bg-purple-100 dark:bg-purple-900/20",
        iconColor: "text-purple-600 dark:text-purple-400",
        onClick: () => setLocation("/calendar"),
        description: isPatient ? "Your weekly schedule" : "Weekly schedule",
      },
      {
        title: isPatient ? "My Records" : "Total Revenue",
        value: isPatient ? "View Records" : `$${Number(stats?.totalRevenue || 0).toLocaleString()}`,
        change: isPatient ? undefined : (insights?.revenueGrowth ? `${insights.revenueGrowth >= 0 ? '+' : ''}${insights.revenueGrowth.toFixed(1)}% from last month` : "+8% from last month"),
        changeType: isPatient ? undefined : ((insights?.revenueGrowth || 0) >= 0 ? "increase" as const : "decrease" as const),
        icon: isPatient ? Users : DollarSign,
        iconBg: isPatient ? "bg-blue-100 dark:bg-blue-900/20" : "bg-emerald-100 dark:bg-emerald-900/20",
        iconColor: isPatient ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400",
        onClick: () => isPatient ? setLocation("/medical-records") : setLocation("/billing"),
        description: isPatient ? "Your medical records" : "Total earnings",
      },
    ];
  };

  const statsData = getStatsData();

  const appointmentMetrics = [
    {
      title: "Completed",
      value: appointmentStats?.completed || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Pending",
      value: appointmentStats?.pending || 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      title: "Cancelled",
      value: appointmentStats?.cancelled || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statsData.map((stat, index) => (
          <ThemedCard 
            key={index} 
            className="shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer rounded-xl border-0"
            onClick={stat.onClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px -8px hsl(var(--primary) / 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <ThemedCardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold">{stat.value}</div>
                
                {stat.subtitle && (
                  <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
                )}
                
                {stat.change && (
                  <div className="flex items-center text-xs">
                    {stat.changeType === "increase" ? (
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={stat.changeType === "increase" ? "text-green-600" : "text-red-600"}>
                      {stat.change}
                    </span>
                  </div>
                )}

                {stat.badges && (
                  <div className="flex gap-2 mt-3">
                    {stat.badges.map((badge, idx) => (
                      <Badge key={idx} variant="secondary" className={`text-xs ${badge.color}`}>
                        {badge.label}: {badge.count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </ThemedCardContent>
          </ThemedCard>
        ))}
      </div>

      {/* Appointment Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {appointmentMetrics.map((metric, index) => (
          <ThemedCard key={index} className="rounded-xl border-0">
            <ThemedCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </ThemedCardContent>
          </ThemedCard>
        ))}
      </div>

      {/* Revenue Summary */}
      {stats && (
        <ThemedCard className="rounded-xl border-0">
          <ThemedCardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${Number(stats.totalRevenue).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  ${Number(stats.paidRevenue).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  ${Number(stats.outstandingRevenue).toLocaleString()}
                </p>
              </div>
            </div>
          </ThemedCardContent>
        </ThemedCard>
      )}
    </div>
  );
}
