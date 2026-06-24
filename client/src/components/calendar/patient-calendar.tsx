import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { AppointmentForm } from "@/components/calendar/forms/appointment-form";
import type { CalendarView } from "@/pages/calendar";
import { useIsMobile } from "@/hooks/use-mobile";

interface PatientCalendarProps {
  className?: string;
}

export function PatientCalendar({ className }: PatientCalendarProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Force day view on mobile devices
  useEffect(() => {
    if (isMobile && view !== "day") {
      setView("day");
    }
  }, [isMobile, view]);

  // Fetch Google integration settings (same as main calendar)
  const { data: googleIntegration } = useQuery({
    queryKey: ["/api/oauth/integrations"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/oauth/integrations");
        const integrations = Array.isArray(response) ? response : [];
        return integrations.find((integration: any) => integration.provider === 'google');
      } catch (error) {
        console.error("Error fetching Google integration:", error);
        return null;
      }
    },
    enabled: !!user,
  });

  // Fetch Google Calendar events if integration is active (same as main calendar)
  const { data: googleEvents } = useQuery({
    queryKey: ["/api/google-calendar/events", currentDate, googleIntegration?.syncFrequency],
    queryFn: async () => {
      if (!googleIntegration?.calendarSync) {
        return [];
      }
      try {
        const dateParam = format(currentDate, 'yyyy-MM-dd');
        const response = await api.get(`/api/google-calendar/events?date=${dateParam}`);
        return response || [];
      } catch (error) {
        console.error("Error fetching Google Calendar events:", error);
        return [];
      }
    },
    enabled: !!googleIntegration?.calendarSync && !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const handleTimeSlotClick = (date: Date, time: string) => {
    const selectedDateTime = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only allow appointments for today or future dates
    if (selectedDateTime < today) {
      return; // Don't open form for past dates
    }
    
    setSelectedDate(selectedDateTime);
    setSelectedTime(time);
    setShowAppointmentForm(true);
  };

  const handleCloseForm = () => {
    setShowAppointmentForm(false);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleFormSubmit = () => {
    // Handle form submission
    handleCloseForm();
  };

  return (
    <div className="flex h-full bg-background">
      {/* Error boundary wrapper */}
      <div className="flex-1 flex flex-col">
        <div className="px-2 sm:px-0 relative">
          {/* Mobile: Add margin for hamburger menu */}
          <div className="lg:hidden ml-16">
            <CalendarHeader
              currentDate={currentDate}
              view={view}
              onDateChange={setCurrentDate}
              onViewChange={setView}
              googleIntegration={googleIntegration}
              onManualSync={() => {}}
            />
          </div>
          {/* Desktop: Full width header */}
          <div className="hidden lg:block">
            <CalendarHeader
              currentDate={currentDate}
              view={view}
              onDateChange={setCurrentDate}
              onViewChange={setView}
              googleIntegration={googleIntegration}
              onManualSync={() => {}}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Always show calendar grid - mobile will get day view */}
          <CalendarGrid
            currentDate={currentDate}
            view={view}
            selectedTeamMembers={[]} // Patients don't have team member selection
            onTimeSlotClick={handleTimeSlotClick}
            onEventClick={(event) => {
              // Handle event editing for patients
            
            }}
            googleIntegration={googleIntegration}
            googleEvents={googleEvents}
          />
        </div>
      </div>

      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <CalendarSidebar
          currentDate={currentDate}
          view={view}
          onDateSelect={(date) => {
            setCurrentDate(date);
            setView("day"); // Switch to day view when mini-calendar date is clicked
          }}
          onDateChange={(date) => {
            setCurrentDate(date); // For navigation without view change
          }}
          selectedTeamMembers={[]} // Patients don't have team member selection
          onTeamMemberToggle={() => {}} // No-op for patients
        />
      </div>

      {/* Appointment Form Off-canvas */}
      <Sheet open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
        <SheetContent 
          side="right" 
          className="w-[90vw] sm:w-[450px] lg:w-[600px] max-w-[600px] overflow-y-auto h-full p-4 sm:p-6"
        >
          <div className="space-y-4">
            <AppointmentForm
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSubmit={handleFormSubmit}
              onCancel={handleCloseForm}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
