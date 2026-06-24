import { useState, useEffect } from "react";
import { ThemedCard, ThemedCardContent } from "@/components/ui/themed-card";
import { 
  MessageCircle, 
  Calendar, 
  Heart, 
  Star, 
  Zap, 
  TrendingUp, 
  Users, 
  Award,
  Clock,
  CheckCircle,
  FileText,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ActivityFeedProps {
  className?: string;
}

interface Activity {
  id: string;
  type: 'appointment' | 'message' | 'achievement' | 'milestone' | 'reminder' | 'clinical_note' | 'invoice';
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  time: string;
  isNew?: boolean;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'appointment':
      return Calendar;
    case 'message':
      return MessageCircle;
    case 'achievement':
      return Award;
    case 'milestone':
      return Star;
    case 'reminder':
      return Clock;
    case 'clinical_note':
      return FileText;
    case 'invoice':
      return DollarSign;
    default:
      return Zap;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'appointment':
      return { color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'message':
      return { color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'achievement':
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    case 'milestone':
      return { color: 'text-purple-600', bgColor: 'bg-purple-100' };
    case 'reminder':
      return { color: 'text-orange-600', bgColor: 'bg-orange-100' };
    case 'clinical_note':
      return { color: 'text-indigo-600', bgColor: 'bg-indigo-100' };
    case 'invoice':
      return { color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
    default:
      return { color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

export function ActivityFeed({ className }: ActivityFeedProps) {
  const { user } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch real activities for practitioners
  const { data: practitionerActivities, isLoading } = useQuery({
    queryKey: ["/api/dashboard/activities"],
    queryFn: async () => {
      if (user?.role === 'practitioner') {
        const response = await api.get("/api/dashboard/activities");
        return response;
      }
      return [];
    },
    enabled: user?.role === 'practitioner'
  });

  // Generate role-specific activities for non-practitioners
  const generateRoleActivities = (): Activity[] => {
    const roleActivities: Activity[] = [
      {
        id: '1',
        type: 'achievement',
        title: 'Welcome to TiNHiH!',
        description: 'You\'ve successfully logged in',
        icon: getActivityIcon('achievement'),
        ...getActivityColor('achievement'),
        time: 'Just now',
        isNew: true
      }
    ];

    if (user?.role === 'admin') {
      roleActivities.push(
        {
          id: '2',
          type: 'milestone',
          title: 'Team Growth',
          description: 'Your team has grown by 3 members this month',
          icon: getActivityIcon('milestone'),
          ...getActivityColor('milestone'),
          time: '2 hours ago'
        },
        {
          id: '3',
          type: 'appointment',
          title: 'Staff Meeting',
          description: 'Monthly team meeting scheduled for tomorrow',
          icon: getActivityIcon('appointment'),
          ...getActivityColor('appointment'),
          time: '4 hours ago'
        }
      );
    } else if (user?.role === 'practitioner') {
      roleActivities.push(
        {
          id: '2',
          type: 'appointment',
          title: 'Patient Consultation',
          description: 'Dr. Smith completed consultation with John Doe',
          icon: getActivityIcon('appointment'),
          ...getActivityColor('appointment'),
          time: '1 hour ago'
        },
        {
          id: '3',
          type: 'message',
          title: 'New Message',
          description: 'Patient Sarah Johnson sent you a message',
          icon: getActivityIcon('message'),
          ...getActivityColor('message'),
          time: '3 hours ago'
        }
      );
    } else if (user?.role === 'staff') {
      roleActivities.push(
        {
          id: '2',
          type: 'reminder',
          title: 'Patient Check-in',
          description: 'Reminder: 5 patients waiting for check-in',
          icon: getActivityIcon('reminder'),
          ...getActivityColor('reminder'),
          time: '30 minutes ago'
        },
        {
          id: '3',
          type: 'appointment',
          title: 'Appointment Scheduled',
          description: 'New appointment booked for Dr. Johnson',
          icon: getActivityIcon('appointment'),
          ...getActivityColor('appointment'),
          time: '2 hours ago'
        }
      );
    } else {
      roleActivities.push(
        {
          id: '2',
          type: 'appointment',
          title: 'Appointment Confirmed',
          description: 'Your appointment with Dr. Smith is confirmed',
          icon: getActivityIcon('appointment'),
          ...getActivityColor('appointment'),
          time: '1 hour ago'
        },
        {
          id: '3',
          type: 'message',
          title: 'Health Update',
          description: 'Your test results are ready to view',
          icon: getActivityIcon('message'),
          ...getActivityColor('message'),
          time: '4 hours ago'
        }
      );
    }

    return roleActivities;
  };

  const handleActivityClick = (activity: Activity) => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  // Transform practitioner activities to match the Activity interface
  const transformPractitionerActivities = (): Activity[] => {
    if (!practitionerActivities || !Array.isArray(practitionerActivities)) {
      return [];
    }

    return practitionerActivities.map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      icon: getActivityIcon(activity.type),
      ...getActivityColor(activity.type),
      time: new Date(activity.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      isNew: new Date(activity.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // New if created in last 24 hours
    }));
  };

  // Use practitioner activities if available, otherwise use role-based activities
  const activities = user?.role === 'practitioner' 
    ? transformPractitionerActivities() 
    : generateRoleActivities();

  return (
    <ThemedCard className={className}>
      <ThemedCardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 
            className="text-lg font-semibold flex items-center space-x-2"
            style={{ color: `hsl(var(--foreground))` }}
          >
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Activity Feed</span>
            {activities.filter(a => a.isNew).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {activities.filter(a => a.isNew).length}
              </span>
            )}
          </h3>
        </div>

        <div className="space-y-3">
          {activities.map((activity, index) => {
            const IconComponent = activity.icon;
            return (
              <div
                key={activity.id}
                className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-300 hover:bg-muted/50 ${
                  activity.isNew ? 'bg-primary/5 border-l-4 border-primary' : ''
                } ${isAnimating && index === 0 ? 'animate-pulse' : ''}`}
                onClick={() => handleActivityClick(activity)}
              >
                <div 
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${activity.bgColor}`}
                >
                  <IconComponent className={`w-4 h-4 ${activity.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium truncate">
                      {activity.title}
                    </h4>
                    <span className="text-xs opacity-70">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {activity.description}
                  </p>
                </div>

                {activity.isNew && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {activities.length === 0 && (
          <div className="text-center py-6">
            <Zap 
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              style={{ color: `hsl(var(--muted-foreground))` }}
            />
            <p 
              className="text-sm opacity-70"
              style={{ color: `hsl(var(--muted-foreground))` }}
            >
              No recent activity
            </p>
          </div>
        )}
      </ThemedCardContent>
    </ThemedCard>
  );
}
