import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addHours, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, startOfMonth, endOfMonth, isSameMonth, addMinutes, isBefore, isAfter } from "date-fns";
import { DateTime } from "luxon";
import { api } from "@/lib/api";
import { EventClickHandler, isEventDetailOpen } from "@/components/calendar/event-click-handler";
import { EventsModal } from "@/components/calendar/events-modal";
import type { CalendarView } from "@/pages/calendar";
import { useAuth } from "@/context/auth-context";

interface CalendarGridProps {
  currentDate: Date;
  view: CalendarView;
  selectedTeamMembers: string[];
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventClick: (event: any) => void;
  googleIntegration?: any;
  googleEvents?: any[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  duration?: number;
  type: "appointment" | "task" | "reminder" | "meeting" | "out-of-office" | "event";
  patientName?: string;
  practitionerName?: string;
  color: string;
  appointment?: any; // Store original appointment data
  googleEventData?: any; // Store original Google Calendar event data
  eventData?: any; // Store original event data from events table
  description?: string;
  link?: string;
  thumbnail?: string;
}

export function CalendarGrid({
  currentDate,
  view,
  selectedTeamMembers,
  onTimeSlotClick,
  onEventClick,
  googleIntegration,
  googleEvents
}: CalendarGridProps) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvents, setModalEvents] = useState<any[]>([]);
  const [modalDate, setModalDate] = useState<Date>(new Date());

  // Role-based access control for appointments
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  const isPractitioner = user?.role === 'practitioner';

  // Fetch appointments and events with role-based filtering
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError } = useQuery({
    queryKey: ["/api/appointments", user?.role, user?.id, selectedTeamMembers],
    queryFn: async () => {
      try {
        let url = "/api/appointments";
        const params = new URLSearchParams();

        // Role-based filtering
        if (user?.role === 'patient') {
          // Patients can only see their own appointments
          params.append('patientId', user.id);
        } else if (user?.role === 'practitioner') {
          // Practitioners can see appointments where they are the practitioner
          // First get the practitioner ID for the current user
          try {
            const practitionerResponse = await api.get(`/api/practitioners?userId=${user.id}`);
            if (practitionerResponse && practitionerResponse.length > 0) {
              const practitionerId = practitionerResponse[0].id;
              params.append('practitionerId', practitionerId);
            }
          } catch (error) {
            console.error("Error getting practitioner ID:", error);
          }
        } else if (isAdminOrStaff && selectedTeamMembers.length > 0) {
          // Admin/staff can see all appointments or filter by selected team members
          const isAllSelected = selectedTeamMembers.includes('all');

          if (!isAllSelected) {
            // When individual users are selected, get their practitioner IDs
            const practitionerIds: string[] = [];

            // Process each selected user ID to get their practitioner ID
            for (const userId of selectedTeamMembers) {
              if (userId === 'all') continue; // Skip 'all' as it's handled above

              try {
                const userResponse = await api.get(`/api/users/${userId}`);

                if (userResponse?.practitioner?.id) {
                  // User has a practitioner profile
                  practitionerIds.push(userResponse.practitioner.id);
                } else if (userResponse?.role === 'admin' || userResponse?.role === 'staff') {
                  // Admin/staff users don't have practitioner profiles
                } else {
                }
              } catch (error) {
                console.error(`Error getting practitioner ID for user ${userId}:`, error);
              }
            }

            // Add practitioner IDs to the query
            if (practitionerIds.length > 0) {
              params.append('practitionerIds', practitionerIds.join(','));
            }
          }
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await api.get(url);

        // Handle both old format (array) and new format (object with appointments and events)
        if (Array.isArray(response)) {
          // Old format - return as appointments only
          return { appointments: response, events: [] };
        } else {
          // New format - return as is
          return response;
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
        return { appointments: [], events: [] };
      }
    },
    retry: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: !!user,
  });

  // Extract appointments and events from the response
  const appointments = appointmentsData?.appointments || [];
  const eventsData = appointmentsData?.events || [];

  // Debug: Log events data
  // useEffect(() => {
  //   console.log("📅 Calendar Grid Events Debug:", {
  //     appointmentsCount: appointments.length,
  //     eventsDataCount: eventsData.length,
  //     eventsData: eventsData,
  //     view: view,
  //     currentDate: currentDate
  //   });
  // }, [appointments, eventsData, view, currentDate]);



  // Filter Google events to only show authenticated user's events
  const filteredGoogleEvents = useMemo(() => {
    if (!googleEvents || !googleIntegration) {
      return [];
    }


    // For now, show all Google events since they should already be filtered by the authenticated user
    // You might want to add additional filtering here if needed
    return googleEvents;
  }, [googleEvents, googleIntegration, user?.id]);

  // Convert appointments to calendar events
  const appointmentEvents: CalendarEvent[] = (appointments || []).map((apt: any) => {

    let title = apt.title || `${apt.patient?.user?.firstName || 'Unknown'} ${apt.patient?.user?.lastName || 'Patient'}`;

    // Only show practitioner names when individual practitioners are selected (not "All Team Members")
    if (isAdminOrStaff && apt.practitioner?.user && !selectedTeamMembers.includes('all')) {
      const practitionerName = `${apt.practitioner.user.firstName || 'Dr.'} ${apt.practitioner.user.lastName || 'Unknown'}`;
      if (selectedTeamMembers.length > 1) {
        title = `${title} (${practitionerName})`;
      }
    }

    // Improved date parsing for appointments
    let startDate: Date;
    let endDate: Date;

    try {
      // Check if appointmentDate exists and is valid
      if (!apt.appointmentDate) {
        console.error("No appointmentDate field found in appointment:", apt);
        return null; // Skip this appointment
      }

      // Enhanced date parsing to handle different formats
      if (typeof apt.appointmentDate === 'string') {
        // Try to parse as ISO string first
        if (apt.appointmentDate.includes('T') || apt.appointmentDate.includes('Z')) {
          startDate = new Date(apt.appointmentDate);
        } else {
          // If it's a simple date string, try to convert to ISO format
          // Assuming format like "2025-08-25 11:30:00" or "2025-08-25"
          const dateStr = apt.appointmentDate.replace(' ', 'T');
          startDate = new Date(dateStr);
        }
      } else if (apt.appointmentDate instanceof Date) {
        startDate = apt.appointmentDate;
      } else {
        // Try to parse as timestamp or other format
        startDate = new Date(apt.appointmentDate);
      }

      // Validate the parsed date
      if (isNaN(startDate.getTime())) {
        console.error("Invalid appointment date:", apt.appointmentDate);
        console.error("Date parsing failed for appointment ID:", apt.id);
        return null; // Skip this appointment
      }

      // Calculate end date based on duration
      const durationMinutes = apt.duration || 60;
      endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    } catch (error) {
      console.error("Error parsing appointment date:", error, apt);
      return null; // Skip this appointment
    }

    return {
      id: apt.id,
      title,
      start: startDate,
      end: endDate,
      type: "appointment",
      patientName: `${apt.patient?.user?.firstName || 'Unknown'} ${apt.patient?.user?.lastName || 'Patient'}`,
      practitionerName: `${apt.practitioner?.user?.firstName || 'Dr.'} ${apt.practitioner?.user?.lastName || 'Unknown'}`,
      color: apt.status === 'confirmed' ? '#ffdd00' : apt.status === 'pending' ? '#ffdd00' : '#ffdd00',
      appointment: apt,
    };
  }).filter((event: CalendarEvent | null): event is CalendarEvent => event !== null); // Remove null events




  // Convert Google Calendar events to calendar events
  const googleCalendarEvents: CalendarEvent[] = (filteredGoogleEvents || []).map((googleEvent: any) => {
    // Handle both dateTime and date formats from Google Calendar
    const startDate = googleEvent.start?.dateTime || googleEvent.start?.date;
    const endDate = googleEvent.end?.dateTime || googleEvent.end?.date;

    // Skip events without valid start/end dates
    if (!startDate || !endDate) {
      return null;
    }

    // Calculate duration in minutes
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    const event: CalendarEvent = {
      id: `google-${googleEvent.id}`,
      title: googleEvent.summary || 'Google Calendar Event',
      start: start,
      end: end,
      duration: durationMinutes,
      type: "meeting",
      patientName: googleEvent.attendees?.[0]?.displayName || 'Google Calendar',
      practitionerName: googleEvent.organizer?.displayName || 'Google Calendar',
      color: "bg-green-500", // Different color for Google Calendar events
      // Store the original Google event data for detailed view
      googleEventData: googleEvent,
    };

    return event;
  }).filter((event: CalendarEvent | null): event is CalendarEvent => event !== null); // Remove null events










  // Fetch user preferences for calendar display hours
  const { data: userPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/user-preferences", user?.id],
    queryFn: async () => {
      try {
        const response = await api.get("/api/user-preferences");
        return response;
      } catch (error) {
        console.error("Error fetching user preferences:", error);
        // Return default preferences
        return {
          calendarStartHour: 8,
          calendarEndHour: 18,
          calendarTimeInterval: 30
        };
      }
    },
    enabled: !!user,
  });

  // Convert events from events table to calendar events (after userPreferences is available)
  const databaseEvents: CalendarEvent[] = useMemo(() => {
    if (!eventsData) return [];
    
    return (eventsData || []).map((event: any) => {
      try {
        // Get user's timezone preference
        const userTimezone = userPreferences?.timezone || 'UTC';
        
        // Use appointmentDate if available, otherwise combine startDate and startTime
        let startDate: Date;
        let endDate: Date;

        if (event.appointmentDate) {
          // Use the appointmentDate field (ISO format) - parse in user's timezone
          startDate = new Date(event.appointmentDate);

          // Calculate end date based on duration or use endDate/endTime
          if (event.endDate && event.endTime) {
            // Use Luxon for consistent date parsing - parse in user's timezone
            const endDateTimeStr = `${event.endDate}T${event.endTime}`;
            const endDt = DateTime.fromISO(endDateTimeStr, { zone: userTimezone });
            const endDateStr = endDt.toISO();
            if (endDateStr) {
              endDate = new Date(endDateStr);
            } else {
              // Fallback to manual parsing if Luxon fails
              endDate = new Date(`${event.endDate}T${event.endTime}:00`);
            }
          } else {
            // Default duration of 60 minutes if no end time specified
            endDate = new Date(startDate.getTime() + 60 * 60000);
          }
        } else {
          // Convert event date to proper ISO format with timezone
          // Example: startDate: "2025-08-31", startTime: "15:00:00" → "2025-08-31T15:00:00+00:00Z"
          const startDateTimeStr = `${event.startDate}T${event.startTime}`;
          const startDt = DateTime.fromISO(startDateTimeStr, { zone: userTimezone });
          const startDateStr = startDt.toISO();
          
          if (startDateStr) {
            startDate = new Date(startDateStr);
          } else {
            // Fallback to manual parsing
            startDate = new Date(`${event.startDate}T${event.startTime}:00`);
          }

          // Convert end date similarly
          const endDateTimeStr = `${event.endDate}T${event.endTime}`;
          const endDt = DateTime.fromISO(endDateTimeStr, { zone: userTimezone });
          const endDateStr = endDt.toISO();
          
          if (endDateStr) {
            endDate = new Date(endDateStr);
          } else {
            // Fallback to manual parsing
            endDate = new Date(`${event.endDate}T${event.endTime}:00`);
          }
        }

        // Validate the parsed dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error("Invalid event date:", event);
          return null;
        }

        // Calculate duration in minutes
        const durationMs = endDate.getTime() - startDate.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        return {
          id: `event-${event.id}`,
          title: event.title,
          start: startDate,
          end: endDate,
          duration: durationMinutes,
          type: "event",
          patientName: "Event",
          practitionerName: "TiNHiH Events",
          color: "#3b82f6", // Blue color for events
          description: event.description,
          link: event.link,
          thumbnail: event.thumbnail,
          eventData: event, // Store the original event data
        };
      } catch (error) {
        console.error("Error parsing event:", error, event);
        return null;
      }
    }).filter((event: CalendarEvent | null): event is CalendarEvent => event !== null);
  }, [eventsData, userPreferences?.timezone]);

  // Combine all events (after databaseEvents is defined)
  const events: CalendarEvent[] = [...appointmentEvents, ...databaseEvents, ...googleCalendarEvents];

  // Show all events (no date filtering)
  const filteredEvents = events;

  // Debug: Show calendar day dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Add a summary of which dates have appointments
  const appointmentsByDate = filteredEvents
    .filter(event => event.type === 'appointment')
    .reduce((acc, event) => {
      const dateKey = new Date(event.start).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event.title);
      return acc;
    }, {} as Record<string, string[]>);

  // Debug: Show current calendar month and any appointments in this month
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const appointmentsInCurrentMonth = filteredEvents.filter(event => {
    const eventDate = new Date(event.start);
    return event.type === 'appointment' &&
      eventDate.getMonth() === currentMonth &&
      eventDate.getFullYear() === currentYear;
  });

  // // Re-process events when userPreferences loads to apply correct timezone
  // useEffect(() => {
  //   if (userPreferences?.timezone && eventsData) {
  //     console.log("🔄 Re-processing events with user timezone:", userPreferences.timezone);
  //     // This will trigger a re-render with the correct timezone
  //   }
  // }, [userPreferences?.timezone, eventsData]);

  // Generate time slots based on user preferences for display, but allow booking at any time
  const generateTimeSlots = (targetDate?: Date) => {
    const dateToUse = targetDate || currentDate;

    // Use user preferences for display hours, with extended range for week/day views
    const preferences = userPreferences || {
      calendarStartHour: 8,  // 8 AM
      calendarEndHour: 23,   // 11 PM (extended from 6 PM to 11 PM)
      timeSlotDuration: 60
    };

    // Debug: Log user preferences
    console.log("⚙️ User Preferences for Time Slots:", {
      userPreferences,
      preferences,
      calendarStartHour: preferences.calendarStartHour,
      calendarEndHour: preferences.calendarEndHour
    });

    const timeInterval = 60;
    const startHour = preferences.calendarStartHour || 8;  // 8 AM
    const endHour = preferences.calendarEndHour || 23;     // 11 PM (extended range)

    // Generate slots for the user's preferred display hours
    const [startMin] = [0]; // Start at minute 0
    const [endMin] = [59]; // End at minute 59

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const timeSlots = [];

    while (currentMinutes <= endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const displayTime = format(new Date().setHours(hour, min), 'h:mm a');

      // Check if this time slot conflicts with existing appointments
      const slotDateTime = new Date(dateToUse);
      slotDateTime.setHours(hour, min, 0, 0);

      const conflictingAppointments = filteredEvents.filter(event => {
        if (!isSameDay(event.start, dateToUse)) return false;

        const eventStart = event.start;
        const eventEnd = addMinutes(eventStart, event.duration || 60);

        // Check if appointments overlap with this time slot
        return (
          (slotDateTime < eventEnd && addMinutes(slotDateTime, timeInterval) > eventStart)
        );
      });

      timeSlots.push({
        time: timeString,
        label: displayTime,
        isAvailable: conflictingAppointments.length === 0,
        conflictingAppointments: conflictingAppointments.length > 0 ? conflictingAppointments : undefined,
        isWorkingHours: true // All hours are available for booking
      });

      currentMinutes += timeInterval;
    }

    // Debug: Log time slots generation
    console.log("🕐 Generated Time Slots:", {
      date: format(dateToUse, 'yyyy-MM-dd'),
      startHour,
      endHour,
      timeSlotsCount: timeSlots.length,
      timeSlots: timeSlots.map(slot => slot.time)
    });

    return timeSlots;
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Use any day for time slot generation - no working day restrictions
    const firstWorkingDay = currentDate;

    const timeSlots = generateTimeSlots(firstWorkingDay);

    return (
      <div className="flex-1 flex flex-col">
        {/* Fixed Headers */}
        <div className="grid grid-cols-8 gap-px bg-muted">
          {/* Time column header */}
          <div className="p-2 text-center text-sm font-medium bg-background border-r">
            Time
          </div>

          {/* Day headers */}
          {days.map((day) => (
            <div key={format(day, 'yyyy-MM-dd')} className="p-2 text-center text-sm font-medium bg-background last:border-r">
              <div className="text-xs text-muted-foreground">
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg font-semibold ${isToday(day) ? 'text-primary' : 'text-foreground'
                }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="grid grid-cols-8 gap-px bg-muted max-h-[520px] overflow-y-auto">
          {/* Time slots */}
          {timeSlots.map((slot) => (
            <div key={slot.time} className="contents">
              {/* Time label */}
              <div className="p-2 text-xs text-muted-foreground bg-background border-r border-t">
                {slot.label}
              </div>

                            {/* Day columns */}
              {days.map((day) => {
                const dayEvents = filteredEvents.filter(event => {
                  // Simple date comparison - use isSameDay from date-fns
                  const isSameDayResult = isSameDay(event.start, day);

                  if (!isSameDayResult) return false;

                  const eventHour = event.start.getHours();
                  const eventMinute = event.start.getMinutes();
                  const slotHour = parseInt(slot.time.split(':')[0]);
                  const slotMinute = parseInt(slot.time.split(':')[1]);

                  // Handle different event types appropriately
                  let matches = false;
                  if (event.type === "appointment") {
                    // For appointments, show them in the hour slot they belong to
                    matches = eventHour === slotHour;
                  } else if (event.type === "event") {
                    // For events from events table, show them in the hour slot they belong to (like appointments)
                    matches = eventHour === slotHour;
                  } else {
                    // For other events (like Google events), use strict time slot matching
                    matches = eventHour === slotHour && eventMinute >= slotMinute && eventMinute < slotMinute + 60;
                  }

                  // Debug: Log time slot matching for events
                  if (event.type === "event") {
                    console.log("🔍 Week View Time Slot Matching:", {
                      eventTitle: event.title,
                      eventHour,
                      eventMinute,
                      slotHour,
                      slotMinute,
                      matches,
                      day: format(day, 'yyyy-MM-dd')
                    });
                  }

                  return matches;
                });

                // Debug: Log events for this day
                if (dayEvents.length > 0) {
                  console.log("📅 Week View Day Events:", {
                    day: format(day, 'yyyy-MM-dd'),
                    events: dayEvents.map(e => ({ id: e.id, title: e.title, type: e.type, start: e.start }))
                  });
                }

                // Check if this time slot is in the past
                const slotDateTime = new Date(day);
                const [slotHour, slotMinute] = slot.time.split(':').map(Number);
                slotDateTime.setHours(slotHour, slotMinute, 0, 0);
                const isPast = isBefore(slotDateTime, new Date());

                // All time slots are available - no calendar settings restrictions
                const isAvailable = !isPast;

                return (
                  <div
                    key={`${day}-${slot.time}`}
                    className={`p-1 border-r border-t min-h-[60px] bg-background ${isPast
                        ? 'cursor-not-allowed opacity-50 bg-muted-foreground/80'
                        : 'hover:bg-accent/50 cursor-pointer'
                      }`}
                    onClick={() => {
                      if (!isPast) {
                        console.log("🕐 Time slot clicked:", { day: day.toDateString(), time: slot.time, isEventDetailOpen: isEventDetailOpen() });
                        onTimeSlotClick(day, slot.time);
                      }
                    }}
                    title={isPast ? "Past time slot - not available for booking" : "Available for booking"}
                  >
                    {dayEvents.slice(0, 2).map((event) => (
                      <EventClickHandler key={event.id} event={event}>
                        <div className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 mb-1 ${event.type === 'appointment'
                            ? 'bg-[#ffdd00] text-black'
                            : event.type === 'event'
                              ? 'bg-[#3b82f6] text-white'
                              : `${event.color} text-white`
                          }`}>
                          <div className="truncate font-medium">{event.title}</div>
                          {event.patientName && event.type !== 'event' && (
                            <div className={`text-xs ${event.type === 'appointment' ? 'opacity-70' : 'opacity-80'}`}>{event.patientName}</div>
                          )}
                          {event.type === 'event' && event.description && (
                            <div className="text-xs opacity-80 truncate">{event.description}</div>
                          )}
                        </div>
                      </EventClickHandler>
                    ))}
                    {dayEvents.length > 2 && (
                      <div
                        className="text-xs text-muted-foreground cursor-pointer hover:text-foreground hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalEvents(dayEvents);
                          setModalDate(day);
                          setModalOpen(true);
                        }}
                      >
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="flex-1 flex flex-col">
        {/* Fixed Headers */}
        <div className="grid grid-cols-7 gap-px bg-muted">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium bg-background border-r">
              {day}
            </div>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="grid grid-cols-7 gap-px bg-muted max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Calendar days */}
          {days.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const dayEvents = filteredEvents.filter(event => {
              // Debug the date comparison
              const eventDate = new Date(event.start);
              const dayDate = new Date(day);

              // Get date components for comparison
              const eventYear = eventDate.getFullYear();
              const eventMonth = eventDate.getMonth();
              const eventDay = eventDate.getDate();

              const dayYear = dayDate.getFullYear();
              const dayMonth = dayDate.getMonth();
              const dayDay = dayDate.getDate();

              // Compare date components directly
              const isSame = eventYear === dayYear && eventMonth === dayMonth && eventDay === dayDay;



              return isSame;
            });

            // Check if this day is in the past
            const isPast = isBefore(day, new Date()) && !isToday;

            return (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={`border-r last:border-r-0 border-b p-2 min-h-[120px] ${!isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
                  } ${isPast
                    ? 'cursor-not-allowed opacity-50 bg-muted-foreground/80'
                    : 'cursor-pointer hover:bg-accent/50'
                  }`}
                onClick={() => {
                if (!isPast) {
                  console.log("📅 Month view day clicked:", { day: day.toDateString(), isEventDetailOpen: isEventDetailOpen() });
                  onTimeSlotClick(day, "09:00");
                }
              }}
                title={isPast ? "Past date - not available for booking" : "Click to book appointment"}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-primary font-bold' : ''
                  }`}>
                  {format(day, 'd')}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventClickHandler key={event.id} event={event}>
                      <div className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 ${event.type === 'appointment'
                          ? 'bg-[#ffdd00] text-black'
                          : event.type === 'event'
                            ? 'bg-[#3b82f6] text-white'
                            : `${event.color} text-white`
                        }`}>
                        <div className="truncate">{event.title}</div>
                        {event.patientName && event.type !== 'event' && (
                          <div className={`text-xs ${event.type === 'appointment' ? 'opacity-70' : 'opacity-80'}`}>{event.patientName}</div>
                        )}
                        {event.type === 'event' && event.description && (
                          <div className="text-xs opacity-80 truncate">{event.description}</div>
                        )}
                      </div>
                    </EventClickHandler>
                  ))}
                  {dayEvents.length > 3 && (
                    <div
                      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalEvents(dayEvents);
                        setModalDate(day);
                        setModalOpen(true);
                      }}
                    >
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = filteredEvents.filter(event => {
      // Simple date comparison - use isSameDay from date-fns
      const isSame = isSameDay(event.start, currentDate);
      return isSame;
    });
    const timeSlots = generateTimeSlots(currentDate);

    return (
      <div className="flex flex-col h-full max-h-[calc(100vh)] ">
        {/* Header */}
        <div className="border-b bg-muted/30 p-4 py-2">
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">
              {format(currentDate, 'EEEE')}
            </div>
            <div className={`text-xl font-semibold mt-1 ${isSameDay(currentDate, new Date()) ? 'text-primary' : 'text-foreground'
              }`}>
              {format(currentDate, 'd')}
            </div>
          </div>
        </div>

        {/* Time slots */}
        <div className="flex-1 overflow-y-auto max-h-[500px]">
          <div className="relative">
            {timeSlots.map((slot) => {
              const slotEvents = dayEvents.filter(event => {
                const eventHour = event.start.getHours();
                const eventMinute = event.start.getMinutes();
                const slotHour = parseInt(slot.time.split(':')[0]);
                const slotMinute = parseInt(slot.time.split(':')[1]);

                // Handle different event types appropriately
                let matches = false;
                if (event.type === "appointment") {
                  // For appointments, show them in the hour slot they belong to
                  matches = eventHour === slotHour;
                } else if (event.type === "event") {
                  // For events from events table, show them in the hour slot they belong to (like appointments)
                  matches = eventHour === slotHour;
                } else {
                  // For other events (like Google events), use strict time slot matching
                  matches = eventHour === slotHour && eventMinute >= slotMinute && eventMinute < slotMinute + 60;
                }

                // Debug: Log time slot matching for events
                // if (event.type === "event") {
                //   console.log("🔍 Day View Time Slot Matching:", {
                //     eventTitle: event.title,
                //     eventHour,
                //     eventMinute,
                //     slotHour,
                //     slotMinute,
                //     matches,
                //     date: format(currentDate, 'yyyy-MM-dd')
                //   });
                // }

                return matches;
              });

              // Check if this time slot is in the past
              const slotDateTime = new Date(currentDate);
              const [slotHour, slotMinute] = slot.time.split(':').map(Number);
              slotDateTime.setHours(slotHour, slotMinute, 0, 0);
              const isPast = isBefore(slotDateTime, new Date());
              const isAvailable = slot.isAvailable && !isPast;

              return (
                <div key={slot.time} className="flex border-b border-border/50 min-h-[80px]">
                  {/* Time label */}
                  <div className="w-20 p-3 text-xs text-muted-foreground border-r bg-muted/20 flex items-start">
                    {slot.label}
                  </div>

                  {/* Event area */}
                  <div
                    className={`flex-1 p-2 transition-colors ${isAvailable && !isEventDetailOpen()
                        ? 'hover:bg-accent/50 cursor-pointer'
                        : 'bg-muted/30 cursor-not-allowed opacity-50 bg-muted-foreground/80'
                      }`}
                    onClick={() => {
                      if (isAvailable && !isEventDetailOpen()) {
                        // console.log("🕐 Week view time slot clicked:", { date: currentDate.toDateString(), time: slot.time, isEventDetailOpen: isEventDetailOpen() });
                        onTimeSlotClick(currentDate, slot.time);
                      }
                    }}
                    title={
                      isEventDetailOpen()
                        ? 'Event detail is open - close it first'
                        : isAvailable
                          ? 'Click to book appointment'
                          : isPast
                            ? 'Past time slot - not available for booking'
                            : slot.conflictingAppointments
                              ? 'Blocked by existing appointment'
                              : 'Outside working hours'
                    }
                  >
                    {slotEvents.map((event) => (
                      <EventClickHandler key={event.id} event={event}>
                        <div className={`p-2 rounded mb-2 cursor-pointer hover:opacity-80 ${event.type === 'appointment'
                            ? 'bg-[#ffdd00] text-black'
                            : event.type === 'event'
                              ? 'bg-[#3b82f6] text-white'
                              : `${event.color} text-white`
                          }`}>
                          <div className="font-medium">{event.title}</div>
                          {event.patientName && event.type !== 'event' && (
                            <div className={`text-sm ${event.type === 'appointment' ? 'opacity-70' : 'opacity-80'}`}>{event.patientName}</div>
                          )}
                          {event.practitionerName && event.type !== 'event' && (
                            <div className={`text-xs ${event.type === 'appointment' ? 'opacity-60' : 'opacity-60'}`}>with {event.practitionerName}</div>
                          )}
                          {event.type === 'event' && event.description && (
                            <div className="text-sm opacity-80">{event.description}</div>
                          )}
                        </div>
                      </EventClickHandler>
                    ))}

                    {/* Show unavailable message if slot is blocked */}
                    {!isAvailable && slotEvents.length === 0 && (
                      <div className="text-xs text-muted-foreground italic">
                        {isPast
                          ? 'Past time slot'
                          : slot.conflictingAppointments
                            ? 'Blocked by existing appointment'
                            : 'Unavailable'
                        }
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-grid">


      {view === "week" && renderWeekView()}
      {view === "month" && renderMonthView()}
      {view === "day" && renderDayView()}
      {view !== "week" && view !== "month" && view !== "day" && renderWeekView()}

      <EventsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        events={modalEvents}
        date={modalDate}
      />
    </div>
  );
}