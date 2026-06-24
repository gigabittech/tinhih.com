import { useState, useEffect } from "react";
import { EnhancedStatsCards } from "@/components/dashboard/enhanced-stats-cards";
import { EnhancedAppointmentSchedule } from "@/components/dashboard/enhanced-appointment-schedule";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { InsightsCards } from "@/components/dashboard/insights-cards";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { AchievementBadges } from "@/components/dashboard/achievement-badges";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AppointmentForm } from "@/components/calendar/forms/appointment-form";
import { useAuth } from "@/context/auth-context";
import { usePageTitle } from "@/context/page-context";
import { Plus } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function Dashboard() {
  const { user } = useAuth();
  const { setPageInfo } = usePageTitle();
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    document.title = "Dashboard";
    setPageInfo("Dashboard", "Welcome back, {name}");
  }, [setPageInfo]);

  const handleQuickAction = () => {
    setSelectedDate(new Date()); // Default to today
    setShowAppointmentForm(true);
  };

  const handleCloseForm = () => {
    setShowAppointmentForm(false);
    setSelectedDate(null);
  };

  const handleFormSubmit = () => {
    // Handle form submission - could add success toast here
    handleCloseForm();
  };

  return (
    <div 
      className="flex flex-col h-full transition-colors duration-300"
      style={{ backgroundColor: `hsl(var(--background))` }}
    >      
      <div className="flex-1 overflow-auto">
        {/* Welcome Banner */}
        <WelcomeBanner className="mb-4 lg:mb-6" />

        {/* Enhanced Stats Cards */}
        <EnhancedStatsCards className="mb-4 lg:mb-6" />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Schedule and Activity */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Enhanced Appointment Schedule */}
            <EnhancedAppointmentSchedule className="w-full" />
            
            {/* Activity Feed */}
            <ActivityFeed className="w-full" />
          </div>

          {/* Right Column - Quick Actions, Achievements, Insights & Recent Activity */}
          <div className="space-y-4 lg:space-y-6">
            {/* Achievement Badges */}
            <AchievementBadges className="w-full" />
            
            {/* Quick Actions */}
            <QuickActions />
            
            {/* Insights Cards */}
            <div>
              <h3 
                className="text-lg font-semibold mb-4 transition-colors duration-300"
                style={{ color: `hsl(var(--foreground))` }}
              >
                Insights
              </h3>
              <InsightsCards />
            </div>
            
            {/* Recent Activity */}
            <RecentActivity />
          </div>
        </div>
      </div>

      {/* Floating Action Button - Mobile only */}
      <button 
        onClick={handleQuickAction}
        className="fixed bottom-4 right-4 w-12 h-12 lg:w-14 lg:h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center lg:hidden"
        style={{
          backgroundColor: `hsl(var(--primary))`,
          color: `hsl(var(--primary-foreground))`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = `hsl(var(--primary) / 0.9)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = `hsl(var(--primary))`;
        }}
      >
        <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>

      {/* Appointment Creation Form */}
      <Sheet open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <AppointmentForm
            selectedDate={selectedDate}
            selectedTime={null}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
