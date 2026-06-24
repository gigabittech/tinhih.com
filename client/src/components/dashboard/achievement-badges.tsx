import { useState, useEffect } from "react";
import { ThemedCard, ThemedCardContent } from "@/components/ui/themed-card";
import { Trophy, Star, Heart, Target, Award, Zap, Crown, Shield, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface AchievementBadgesProps {
  className?: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  unlocked: boolean;
}

export function AchievementBadges({ className }: AchievementBadgesProps) {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    const roleBadges: Badge[] = [
      {
        id: 'first-login',
        name: 'First Steps',
        description: 'Welcome to TiNHiH Portal!',
        icon: Star,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        unlocked: true
      },
      {
        id: 'profile-complete',
        name: 'Profile Master',
        description: 'Complete your profile',
        icon: Heart,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        unlocked: true
      }
    ];

    // Add role-specific badges
    if (user?.role === 'admin') {
      roleBadges.push(
        {
          id: 'team-leader',
          name: 'Team Leader',
          description: 'Manage a team of 5+ members',
          icon: Crown,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          unlocked: true
        },
        {
          id: 'excellence',
          name: 'Excellence Award',
          description: 'Maintain 95%+ satisfaction',
          icon: Award,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          unlocked: false
        }
      );
    } else if (user?.role === 'practitioner') {
      roleBadges.push(
        {
          id: 'patient-care',
          name: 'Patient Care Expert',
          description: 'Treat 100+ patients',
          icon: Heart,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          unlocked: true
        },
        {
          id: 'excellence',
          name: 'Clinical Excellence',
          description: 'Maintain 4.8+ rating',
          icon: Trophy,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          unlocked: false
        }
      );
    } else if (user?.role === 'staff') {
      roleBadges.push(
        {
          id: 'efficiency',
          name: 'Efficiency Expert',
          description: 'Process 200+ tasks',
          icon: Zap,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          unlocked: true
        },
        {
          id: 'support',
          name: 'Support Hero',
          description: 'Help 50+ patients',
          icon: Shield,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          unlocked: false
        }
      );
    } else {
      roleBadges.push(
        {
          id: 'health-journey',
          name: 'Health Journey',
          description: 'Complete 10+ appointments',
          icon: Heart,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          unlocked: true
        },
        {
          id: 'wellness',
          name: 'Wellness Champion',
          description: 'Complete health goals',
          icon: Target,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          unlocked: false
        }
      );
    }

    setBadges(roleBadges);
  }, [user?.role]);

  const unlockedBadges = badges.filter(badge => badge.unlocked);

  return (
    <ThemedCard className={className}>
      <ThemedCardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 
            className="text-lg font-semibold flex items-center space-x-2"
            style={{ color: `hsl(var(--foreground))` }}
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span>Achievements</span>
            <span className="text-sm opacity-70">({unlockedBadges.length}/{badges.length})</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map((badge) => {
            const IconComponent = badge.icon;
            return (
              <div
                key={badge.id}
                className={`relative p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                  badge.unlocked 
                    ? 'hover:scale-105 hover:shadow-md' 
                    : 'opacity-50 grayscale'
                }`}
                style={{
                  backgroundColor: badge.unlocked ? badge.bgColor : 'hsl(var(--muted))'
                }}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium truncate">
                      {badge.name}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {badge.description}
                    </p>
                  </div>
                </div>
                
                {badge.unlocked && (
                  <div className="absolute -top-1 -right-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ThemedCardContent>
    </ThemedCard>
  );
}
