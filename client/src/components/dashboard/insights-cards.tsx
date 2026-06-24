import { useQuery } from "@tanstack/react-query";
import { ThemedCard, ThemedCardContent } from "@/components/ui/themed-card";
import { TrendingUp, TrendingDown, Calendar, Users, DollarSign, Heart, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface InsightsCardsProps {
  className?: string;
}

interface InsightsData {
  patientsGrowth: number;
  appointmentsGrowth: number;
  revenueGrowth: number;
  currentMonth: {
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
  };
  previousMonth: {
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
  };
}

export function InsightsCards({ className }: InsightsCardsProps) {
  const { user } = useAuth();
  const { data: insights, isLoading } = useQuery<InsightsData>({
    queryKey: ["/api/dashboard/insights"],
  });

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <ThemedCard key={i} className="animate-pulse rounded-xl">
            <ThemedCardContent className="p-4">
              <div 
                className="h-16 rounded"
                style={{ backgroundColor: `hsl(var(--muted))` }}
              ></div>
            </ThemedCardContent>
          </ThemedCard>
        ))}
      </div>
    );
  }

  const getInsightsData = () => {
    const isPatient = user?.role === "patient";
    const isPractitioner = user?.role === "practitioner";
    const isAdmin = user?.role === "admin";
    const isStaff = user?.role === "staff";

    if (isPatient) {
      return [
        {
          title: "Health Score",
          value: 85, // Mock data - in real app, calculate from health metrics
          icon: Heart,
          description: "Your current health status",
          positive: true,
        },
        {
          title: "Appointment Growth",
          value: insights?.appointmentsGrowth || 0,
          icon: Calendar,
          description: "from last month",
          positive: (insights?.appointmentsGrowth || 0) >= 0,
        },
        {
          title: "Activity Level",
          value: 92, // Mock data - in real app, calculate from activity metrics
          icon: Activity,
          description: "Your engagement level",
          positive: true,
        },
      ];
    }

    return [
      {
        title: "Patient Growth",
        value: insights?.patientsGrowth || 0,
        icon: Users,
        description: "from last month",
        positive: (insights?.patientsGrowth || 0) >= 0,
      },
      {
        title: "Appointment Growth",
        value: insights?.appointmentsGrowth || 0,
        icon: Calendar,
        description: "from last month",
        positive: (insights?.appointmentsGrowth || 0) >= 0,
      },
      {
        title: "Revenue Growth",
        value: insights?.revenueGrowth || 0,
        icon: DollarSign,
        description: "from last month",
        positive: (insights?.revenueGrowth || 0) >= 0,
      },
    ];
  };

  const insightsData = getInsightsData();

  return (
    <div className={`space-y-4 ${className}`}>
      {insightsData.map((insight, index) => {
        const Icon = insight.icon;
        const TrendIcon = insight.positive ? TrendingUp : TrendingDown;
        const trendColor = insight.positive ? "text-green-600" : "text-red-600";
        const sign = insight.positive ? "+" : "";
        
        return (
          <ThemedCard key={index} className="rounded-xl">
            <ThemedCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="p-2 rounded-lg transition-colors duration-300"
                    style={{ 
                      backgroundColor: insight.positive 
                        ? 'hsl(var(--primary) / 0.1)' 
                        : 'hsl(var(--destructive) / 0.1)' 
                    }}
                  >
                    <Icon 
                      className={`w-5 h-5 ${trendColor} transition-colors duration-300`}
                    />
                  </div>
                  <div>
                    <p 
                      className="text-sm font-medium transition-colors duration-300"
                      style={{ color: `hsl(var(--foreground))` }}
                    >
                      {insight.title}
                    </p>
                    <p 
                      className="text-xs transition-colors duration-300"
                      style={{ color: `hsl(var(--muted-foreground))` }}
                    >
                      {insight.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                  <span className={`text-sm font-medium ${trendColor}`}>
                    {sign}{Math.abs(insight.value).toFixed(1)}%
                  </span>
                </div>
              </div>
            </ThemedCardContent>
          </ThemedCard>
        );
      })}
    </div>
  );
}