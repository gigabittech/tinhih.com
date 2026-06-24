import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/context/theme-context";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { PatientCalendar } from "@/components/calendar/patient-calendar";
import { AppointmentForm } from "@/components/calendar/forms/appointment-form";
import { TaskForm } from "@/components/calendar/forms/task-form";
import { ReminderForm } from "@/components/calendar/forms/reminder-form";
import { MeetingForm } from "@/components/calendar/forms/meeting-form";
import { OutOfOfficeForm } from "@/components/calendar/forms/out-of-office-form";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";


export type CalendarView = "month" | "week" | "day";
export type EventType = "appointment" | "task" | "reminder" | "meeting" | "out-of-office";

// Utility function to restore body pointer-events
const restoreBodyPointerEvents = () => {
  if (document.body.style.pointerEvents === 'none') {
    document.body.style.pointerEvents = '';
  }
};

export default function Calendar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { calendarView, showWeekends } = useTheme();
  const { setPageInfo, setNewEventHandler } = usePageTitle();
  const [location] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  // Use user preference for calendar view, with responsive override on mobile
  const [view, setView] = useState<CalendarView>('week'); // Always start with a valid value
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<EventType | null>(null);

  // Force day view on mobile for patients
  useEffect(() => {
    if (isMobile && user?.role === 'patient' && view !== 'day') {
      setView('day');
    }
  }, [isMobile, user?.role, view]);

  // Log form state changes
  useEffect(() => {
    console.log("📋 Form state changed:", { showForm, formType, selectedDate, selectedTime });
  }, [showForm, formType, selectedDate, selectedTime]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

  // Initialize selected team members based on user role
  useEffect(() => {
    if (user?.role === 'practitioner') {
      setSelectedTeamMembers([user.id]);
    } else if (user?.role === 'admin' || user?.role === 'staff') {
      // Admin/Staff start with "All Team Members" selected by default
      // since they might not have practitioner profiles
      setSelectedTeamMembers(['all']);
    }
  }, [user?.role, user?.id]);


  // Memoize the onDateChange function to prevent recreation on every render
  const handleDateChange = useCallback((date: Date) => {
    console.log("📅 handleDateChange called with:", date);
    setCurrentDate(date); // For navigation without view change
  }, []);

  // Debug: Log when handleDateChange is recreated
  useEffect(() => {
    console.log("🔄 handleDateChange function recreated:", typeof handleDateChange);
  }, [handleDateChange]);

  // Debug: Log sidebar rendering condition
  useEffect(() => {
    console.log("🔧 Sidebar rendering condition:", { 
      view: !!view, 
      handleDateChange: !!handleDateChange,
      viewType: typeof view,
      handleDateChangeType: typeof handleDateChange
    });
  }, [view, handleDateChange]);

  // Focus management
  const lastActiveElement = useRef<HTMLElement | null>(null);

  const handleNewEvent = useCallback((type: EventType, date?: Date, time?: string) => {
    console.log("📝 New appointment form triggered:", { type, date, time, userRole: user?.role });
    
    // Patients can't create new events
    if (user?.role === 'patient') {
      console.log("❌ Patient role - preventing appointment form");
      return;
    }
    
    // Store current focus before opening form
    lastActiveElement.current = document.activeElement as HTMLElement;
    
    const selectedDateTime = date || new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only allow appointments for today or future dates
    if (type === "appointment" && selectedDateTime < today) {
      console.log("❌ Past date - preventing appointment form");
      return; // Don't open form for past dates
    }
    
    console.log("✅ Opening appointment form:", { type, selectedDateTime, time });
    setFormType(type);
    setSelectedDate(selectedDateTime);
    setSelectedTime(time || null);
    setShowForm(true);
  }, [user?.role]);

  // Fetch Google integration settings
  const { data: googleIntegration, refetch: refetchIntegrations } = useQuery({
    queryKey: ["/api/user-integrations", user?.id],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/user-integrations?userId=${user?.id}`);
        const integrations = Array.isArray(response) ? response : [];
        return integrations.find((integration: any) => integration.provider === 'google');
      } catch (error) {
        console.error("Error fetching Google integration:", error);
        return null;
      }
    },
    enabled: !!user,
  });

  // Fetch Google Calendar events if integration is active
  const { data: googleEvents, refetch: refetchGoogleEvents } = useQuery({
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (matches server cache)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
  });



  // Manual sync function
  const handleManualSync = async () => {
    if (googleIntegration?.calendarSync) {
      try {
        // Clear server cache first
        await api.post('/api/google-calendar/clear-cache');
        
        // Force a fresh fetch with sync=true parameter
        const dateParam = format(currentDate, 'yyyy-MM-dd');
        await api.get(`/api/google-calendar/events?date=${dateParam}&sync=true`);
        
        // Invalidate and refetch the query to update the UI
        await refetchGoogleEvents();
      } catch (error) {
        console.error("Error during manual sync:", error);
      }
    }
  };

  useEffect(() => {
    if (user?.role === 'patient') {
      setPageInfo("My Appointments", "View your appointment history");
    } else {
      setPageInfo("Calendar", "Manage appointments and schedule");
    }
  }, [setPageInfo, user?.role]);

  // Register the new event handler with the page context
  useEffect(() => {
    setNewEventHandler(handleNewEvent);
  }, [setNewEventHandler]);

  // Handle URL parameters for automatic form opening and integration success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const success = urlParams.get('success');
    
    
    // Handle integration success
    if (success === 'google_connected' || success === 'integration_connected') {
      refetchIntegrations();
      refetchGoogleEvents();
      
      // Clean up the URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Handle form opening
    if (action && ['appointment', 'task', 'reminder', 'meeting', 'out-of-office'].includes(action)) {
      // Automatically open the form for the specified action
      handleNewEvent(action as EventType);
      
      // Clean up the URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location, handleNewEvent, refetchIntegrations, refetchGoogleEvents]);

  // Update view when user preference changes
  useEffect(() => {
    setView(calendarView);
  }, [calendarView]);

  // Force day view on mobile devices (only for staff/admin/practitioner)
  useEffect(() => {
    if (user?.role === 'patient') return; // Skip for patients
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setView("day");
      } else {
        setView(calendarView);
      }
    };
    
    // Check initial screen size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calendarView, user?.role]);

  // Listen for integration changes from other components
  useEffect(() => {
    const handleIntegrationChange = () => {
      refetchIntegrations();
      refetchGoogleEvents();
    };

    // Listen for custom integration change events
    window.addEventListener('integration-connected', handleIntegrationChange);
    window.addEventListener('integration-disconnected', handleIntegrationChange);

    return () => {
      window.removeEventListener('integration-connected', handleIntegrationChange);
      window.removeEventListener('integration-disconnected', handleIntegrationChange);
    };
  }, [refetchIntegrations, refetchGoogleEvents]);

  // Cleanup effect to restore focus when component unmounts
  useEffect(() => {
    return () => {
      if (lastActiveElement.current) {
        setTimeout(() => {
          lastActiveElement.current?.focus();
        }, 0);
      }
      // Ensure body pointer-events is restored
      restoreBodyPointerEvents();
    };
  }, []);

  // Monitor and fix body pointer-events when form is not open
  useEffect(() => {
    if (!showForm) {
      // Ensure body pointer-events is restored when form is not open
      const timer = setTimeout(restoreBodyPointerEvents, 100);
      
      return () => clearTimeout(timer);
    }
  }, [showForm]);

  const handleCloseForm = () => {
    setShowForm(false);
    setFormType(null);
    setSelectedDate(null);
    setSelectedTime(null);
    
    // Restore focus after form closes
    setTimeout(() => {
      if (lastActiveElement.current) {
        lastActiveElement.current.focus();
      }
    }, 100);
    
    // Ensure body pointer-events is restored
    setTimeout(restoreBodyPointerEvents, 150);
  };

  const handleFormSubmit = () => {
    // Handle form submission
    handleCloseForm();
  };

  const renderForm = () => {
    if (!formType) return null;

    const commonProps = {
      selectedDate,
      selectedTime,
      onSubmit: handleFormSubmit,
      onCancel: handleCloseForm,
    };

    switch (formType) {
      case "appointment":
        return <AppointmentForm {...commonProps} />;
      case "task":
        return <TaskForm {...commonProps} />;
      case "reminder":
        return <ReminderForm {...commonProps} />;
      case "meeting":
        return <MeetingForm {...commonProps} />;
      case "out-of-office":
        return <OutOfOfficeForm {...commonProps} />;
      default:
        return null;
    }
  };

  // Show patient calendar for patients
  if (user?.role === 'patient') {
    return (
      <div className="space-y-6">
        <PatientCalendar />
      </div>
    );
  }

  // Show full calendar for admin, staff, and practitioner
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
              onManualSync={handleManualSync}
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
              onManualSync={handleManualSync}
            />
          </div>
        </div>



        <div className="flex-1 overflow-hidden">
          {/* Always show calendar grid - mobile will get day view */}
          <CalendarGrid
            currentDate={currentDate}
            view={view}
            selectedTeamMembers={selectedTeamMembers}
            onTimeSlotClick={(date, time) => handleNewEvent("appointment", date, time)}
            onEventClick={() => {setShowForm(false)}}
            googleIntegration={googleIntegration}
            googleEvents={googleEvents}
          />
        </div>
      </div>

      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <CalendarSidebar
            currentDate={currentDate}
            view={view || 'week'}
            onDateSelect={(date) => {
              setCurrentDate(date);
              setView("day"); // Switch to day view when mini-calendar date is clicked
            }}
            onDateChange={handleDateChange}
            selectedTeamMembers={selectedTeamMembers}
            onTeamMemberToggle={(memberId) => {
              console.log('Calendar onTeamMemberToggle called with:', memberId);
              console.log('Current selectedTeamMembers before:', selectedTeamMembers);
              
              setSelectedTeamMembers(prev => {
                let newSelection: string[];
                
                if (memberId === 'all') {
                  if (prev.includes('all')) {
                    // If "All" is selected, deselect it and keep only current user
                    newSelection = [user?.id || ''];
                  } else {
                    // If "All" is not selected, the sidebar will handle adding all practitioner IDs
                    // We just need to add 'all' as a marker
                    newSelection = ['all'];
                  }
                } else {
                  // Handle individual member toggle
                  if (prev.includes('all')) {
                    // If "All" is currently selected, switch to only this practitioner
                    newSelection = [memberId];
                  } else {
                    // Normal toggle behavior when "All" is not selected
                    newSelection = prev.includes(memberId)
                      ? prev.filter(id => id !== memberId)
                      : [...prev, memberId];
                  }
                }
                
                console.log('New selectedTeamMembers:', newSelection);
                return newSelection;
              });
            }}
          />
        </div>


      {/* Off-canvas forms - Fully scrollable and responsive */}
      <Sheet open={showForm} onOpenChange={(open) => {
        if (!open) {
          // Ensure proper cleanup when sheet closes
          setTimeout(() => {
            setShowForm(false);
            setFormType(null);
            setSelectedDate(null);
            setSelectedTime(null);
            
            // Restore focus
            if (lastActiveElement.current) {
              lastActiveElement.current.focus();
            }
            
            // Ensure body pointer-events is restored
            restoreBodyPointerEvents();
          }, 0);
        }
      }}>
        <SheetContent 
          side="right" 
          className="w-[90vw] sm:w-[450px] lg:w-[600px] max-w-[600px] overflow-y-auto h-full p-4 sm:p-6"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            setShowForm(false);
            setFormType(null);
            setSelectedDate(null);
            setSelectedTime(null);
            
            // Restore focus
            setTimeout(() => {
              if (lastActiveElement.current) {
                lastActiveElement.current.focus();
              }
            }, 100);
            
            // Ensure body pointer-events is restored
            setTimeout(restoreBodyPointerEvents, 150);
          }}
        >
          <div className="space-y-4">
            {renderForm()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}