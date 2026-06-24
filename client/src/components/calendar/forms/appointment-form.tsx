import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes, isBefore, addHours, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { DateTime } from "luxon";
import { CalendarIcon, Clock, MapPin, Video, Monitor, Users, Search, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

const appointmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  patientId: z.string().min(1, "Patient is required"),
  practitionerId: z.string().min(1, "Practitioner is required"),
  appointmentDate: z.date({ required_error: "Date is required" }),
  appointmentTime: z.string().min(1, "Time is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  type: z.string().min(1, "Type is required"),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "confirmed", "cancelled", "completed"]).default("scheduled"),
  // Location settings
  locationType: z.enum(["in-person", "telehealth"], { required_error: "Location type is required" }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  // Telehealth settings
  telehealthPlatform: z.enum(["inapp", "zoom", "teams", "google_meet"]).optional(),
  sendEmailConfirmation: z.boolean().default(true),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const APPOINTMENT_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "follow-up", label: "Follow-up" },
  { value: "procedure", label: "Procedure" },
  { value: "check-up", label: "Check-up" },
  { value: "emergency", label: "Emergency" },
];

const TELEHEALTH_PLATFORMS = [
  { value: "inapp", label: "TiNHiH Video", description: "Use our built-in video platform (Coming Soon)", icon: Monitor, disabled: true },
  { value: "zoom", label: "Zoom", description: "High-quality video conferencing", icon: Video, disabled: false },
  { value: "teams", label: "Microsoft Teams", description: "Enterprise-grade meetings", icon: Users, disabled: false },
  { value: "google_meet", label: "Google Meet", description: "Simple and secure meetings", icon: Monitor, disabled: false },
];

export function AppointmentForm({ selectedDate, selectedTime, onSubmit, onCancel }: AppointmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Search state for patient and practitioner selects
  const [patientSearch, setPatientSearch] = useState("");
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [patientSelectOpen, setPatientSelectOpen] = useState(false);
  const [practitionerSelectOpen, setPractitionerSelectOpen] = useState(false);
  
  // Ref for search inputs to prevent focus issues
  const patientSearchRef = useRef<HTMLInputElement>(null);
  const practitionerSearchRef = useRef<HTMLInputElement>(null);

  // Initialize form first to avoid "used before initialization" errors
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      title: "TiNHiH Portal Appointment",
      appointmentDate: selectedDate || new Date(),
      appointmentTime: selectedTime || "09:00",
      duration: 60, // Will be updated when practitioner is selected
      type: "consultation",
      status: "scheduled",
      notes: "",
      patientId: "",
      practitionerId: "",
      locationType: "in-person",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      telehealthPlatform: "zoom",
      sendEmailConfirmation: true,
    },
    mode: "onChange", // Enable real-time validation
  });

  // Watch form values for conditional rendering
  const locationType = form.watch("locationType");
  const selectedPractitionerId = form.watch("practitionerId");

  // Reset form when selectedDate or selectedTime changes
  useEffect(() => {
    form.reset({
      title: "TiNHiH Portal Appointment",
      appointmentDate: selectedDate || new Date(),
      appointmentTime: selectedTime || "09:00",
      duration: 60,
      type: "consultation",
      status: "scheduled",
      notes: "",
      patientId: "",
      practitionerId: "",
      locationType: "in-person",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      telehealthPlatform: "zoom",
      sendEmailConfirmation: true,
    });
  }, [selectedDate, selectedTime, form]);

  // Ensure conditional fields have proper values when locationType changes
  useEffect(() => {
    const currentLocationType = form.watch("locationType");
    
    if (currentLocationType === "in-person") {
      // Ensure address fields have default values
      if (!form.getValues("address")) form.setValue("address", "");
      if (!form.getValues("city")) form.setValue("city", "");
      if (!form.getValues("state")) form.setValue("state", "");
      if (!form.getValues("zipCode")) form.setValue("zipCode", "");
    } else if (currentLocationType === "telehealth") {
      // Ensure telehealth platform has default value
      if (!form.getValues("telehealthPlatform")) form.setValue("telehealthPlatform", "zoom");
    }
  }, [locationType, form]);

  // Safe focus function with multiple attempts
  const safeFocus = (ref: React.RefObject<HTMLInputElement>) => {
    const attemptFocus = (attempts: number = 0) => {
      try {
        const element = ref.current;
        if (element && typeof element.focus === 'function') {
          element.focus();
          return true;
        } else if (attempts < 5) {
          // Retry after a short delay
          setTimeout(() => attemptFocus(attempts + 1), 50);
        }
      } catch (error) {
        console.warn('Failed to focus input:', error);
        if (attempts < 5) {
          setTimeout(() => attemptFocus(attempts + 1), 50);
        }
      }
      return false;
    };
    
      // Start the focus attempt
  setTimeout(() => attemptFocus(), 100);
};

// Handle focus when select opens
useEffect(() => {
  if (patientSelectOpen) {
    setPatientSearch("");
  }
}, [patientSelectOpen]);

useEffect(() => {
  if (practitionerSelectOpen) {
    setPractitionerSearch("");
  }
}, [practitionerSelectOpen]);

  // Simple focus restoration
  const handleCancel = () => {
    // Ensure focus is restored to the previous element
    setTimeout(() => {
      const activeElement = document.querySelector('[data-focus-restore]') as HTMLElement;
      if (activeElement) {
        activeElement.focus();
      }
    }, 100);
    onCancel();
  };





  // Fetch patients - filter based on user role
  const { data: patients, isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: ["/api/patients", user?.role, user?.id],
    queryFn: async () => {
      const response = await api.get("/api/patients");
      
      // Filter patients based on user role
      if (user?.role === 'patient') {
        // Patients can only see themselves
        return response.filter((patient: any) => patient.userId === user.id);
      } else {
        // Practitioners, admin, and staff can see all patients
        return response;
      }
    },
  });

  // Fetch practitioners - filter based on user role
  const { data: practitioners, isLoading: practitionersLoading, error: practitionersError } = useQuery({
    queryKey: ["/api/practitioners", user?.role, user?.id],
    queryFn: async () => {
      const response = await api.get("/api/practitioners");
      
      // Filter practitioners based on user role
      let filteredPractitioners;
      if (user?.role === 'practitioner') {
        // Practitioners can only see themselves
        filteredPractitioners = response.filter((practitioner: any) => practitioner.userId === user.id);
      } else if (user?.role === 'patient') {
        // Patients can see all practitioners
        filteredPractitioners = response;
      } else {
        // Admin/staff can see all practitioners
        filteredPractitioners = response;
      }

      // Fetch calendar settings for each practitioner
      const practitionersWithSettings = await Promise.all(
        filteredPractitioners.map(async (practitioner: any) => {
          try {
            const calendarSettingsResponse = await api.get(`/api/calendar-settings?practitionerId=${practitioner.id}`);
            return {
              ...practitioner,
              calendarSettings: calendarSettingsResponse
            };
          } catch (error) {
            console.error(`Error fetching calendar settings for practitioner ${practitioner.id}:`, error);
            return {
              ...practitioner,
              calendarSettings: {
                timeInterval: 60,
                bufferTime: 0,
                defaultStartTime: "09:00",
                defaultEndTime: "17:00",
                workingDays: [1, 2, 3, 4, 5],
                customWorkingHours: {},
                isGlobal: false,
                timezone: "UTC"
              }
            };
          }
        })
      );

      console.log("Practitioners with calendar settings:", practitionersWithSettings);
      return practitionersWithSettings;
    },
  });

  // Auto-select practitioner if user is a practitioner
  useEffect(() => {
    if (user?.role === 'practitioner' && practitioners && practitioners.length > 0) {
      const currentPractitioner = practitioners.find((p: any) => p.userId === user.id);
      if (currentPractitioner) {
        form.setValue('practitionerId', currentPractitioner.id);
      }
    }
  }, [user, practitioners, form]);

  // Auto-select patient if user is a patient
  useEffect(() => {
    if (user?.role === 'patient' && patients && patients.length > 0) {
      const currentPatient = patients.find((p: any) => p.userId === user.id);
      if (currentPatient) {
        form.setValue('patientId', currentPatient.id);
      }
    }
  }, [user, patients, form]);

  // Fetch user integrations for telehealth platforms
  const { data: userIntegrations, isLoading: integrationsLoading, error: integrationsError } = useQuery({
    queryKey: ["/api/oauth/integrations", selectedPractitionerId],
    queryFn: async () => {
      if (!selectedPractitionerId) return [];
      
      try {
        // First get the practitioner to find their userId
        const practitionerResponse = await api.get(`/api/practitioners/${selectedPractitionerId}`);
        if (!practitionerResponse || !practitionerResponse.userId) {
          console.warn("No practitioner found or missing userId");
          return [];
        }
        
        // Then fetch OAuth integrations for that practitioner's user account
        const response = await api.get(`/api/oauth/integrations?userId=${practitionerResponse.userId}`);
        return response;
      } catch (error) {
        console.error("Error fetching practitioner integrations:", error);
        return [];
      }
    },
    enabled: !!selectedPractitionerId, // Only fetch when practitioner is selected
  });

  // Fetch selected practitioner's calendar settings for dynamic time slot generation
  const { data: practitionerCalendarSettings } = useQuery({
    queryKey: ["/api/calendar-settings", selectedPractitionerId],
    queryFn: async () => {
      if (!selectedPractitionerId) return null;
      
      try {
        // Fetch calendar settings for the selected practitioner
        const response = await api.get(`/api/calendar-settings?practitionerId=${selectedPractitionerId}`);
        console.log("Fetched practitioner calendar settings:", response);
        return response;
      } catch (error) {
        console.error("Error fetching practitioner calendar settings:", error);
        return null;
      }
    },
    enabled: !!selectedPractitionerId, // Only fetch when practitioner is selected
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Fallback to current user's calendar settings if no practitioner is selected
  const { data: currentUserCalendarSettings } = useQuery({
    queryKey: ["/api/user-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const response = await api.get(`/api/user-preferences?userId=${user.id}`);
        return response;
      } catch (error) {
        console.error("Error fetching current user calendar settings:", error);
        return null;
      }
    },
    enabled: !!user?.id && !selectedPractitionerId, // Only fetch when no practitioner is selected
    staleTime: 30000,
    gcTime: 300000,
  });

  // Fetch current patient's user preferences (including timezone) for timezone-aware slot display
  const { data: patientUserPreferences } = useQuery({
    queryKey: ["/api/user-preferences", user?.id, "patient"],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const response = await api.get(`/api/user-preferences?userId=${user.id}`);
        console.log("Fetched patient user preferences:", response);
        return response;
      } catch (error) {
        console.error("Error fetching patient user preferences:", error);
        return null;
      }
    },
    enabled: !!user?.id && user?.role === 'patient', // Only fetch for patients
    staleTime: 30000,
    gcTime: 300000,
  });

  // Use practitioner's settings if available, otherwise fall back to current user's settings
  const selectedPractitioner = practitioners?.find((p: any) => p.id === selectedPractitionerId);
  const calendarSettings = selectedPractitioner?.calendarSettings || practitionerCalendarSettings || currentUserCalendarSettings;

  // Reusable function to convert local time to UTC using Luxon
  const convertLocalToUTC = (localTime: string, timezone: string, date: Date = new Date()): string => {
    try {
      const [hours, minutes] = localTime.split(':').map(Number);
      
      // Create a DateTime object in the specified timezone
      const localDateTime = DateTime.fromObject(
        {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          hour: hours,
          minute: minutes,
          second: 0,
          millisecond: 0
        },
        { zone: timezone }
      );
      
      // Convert to UTC
      const utcDateTime = localDateTime.toUTC();
      
      const isoString = utcDateTime.toISO();
      console.log(`convertLocalToUTC: ${localTime} (${timezone}) → ${isoString}`);
      
      if (isoString) {
        return isoString;
      }
      
      // Fallback: return original time as UTC
      const [fallbackHours, fallbackMinutes] = localTime.split(':').map(Number);
      const fallbackDate = new Date(date);
      fallbackDate.setHours(fallbackHours, fallbackMinutes, 0, 0);
      return fallbackDate.toISOString();
    } catch (error) {
      console.error("Error converting local time to UTC:", error);
      // Fallback: return original time as UTC
      const [errorHours, errorMinutes] = localTime.split(':').map(Number);
      const errorFallbackDate = new Date(date);
      errorFallbackDate.setHours(errorHours, errorMinutes, 0, 0);
      return errorFallbackDate.toISOString();
    }
  };

  // Reusable function to convert UTC to local time using Luxon
  const convertUTCToLocal = (utcTime: string, timezone: string): string => {
    try {
      // Parse UTC time and convert to specified timezone
      const utcDateTime = DateTime.fromISO(utcTime, { zone: 'utc' });
      const localDateTime = utcDateTime.setZone(timezone);
      
      const hours = localDateTime.hour.toString().padStart(2, '0');
      const minutes = localDateTime.minute.toString().padStart(2, '0');
      const localTime = `${hours}:${minutes}`;
      
      console.log(`convertUTCToLocal: ${utcTime} → ${localTime} (${timezone})`);
      
      return localTime;
    } catch (error) {
      console.error("Error converting UTC to local time:", error);
      // Fallback: return UTC time as local
      const utcDate = new Date(utcTime);
      const hours = utcDate.getHours().toString().padStart(2, '0');
      const minutes = utcDate.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  // Function to convert time from practitioner's timezone to patient's timezone for display using Luxon
  const convertTimeToPatientTimezone = (timeString: string, practitionerTimezone: string, patientTimezone: string) => {
    try {
      const selectedDate = form.watch("appointmentDate") || new Date();
      
      // Convert practitioner time to UTC
      const utcTime = convertLocalToUTC(timeString, practitionerTimezone, selectedDate);
      
      // Convert UTC to patient time
      const patientTime = convertUTCToLocal(utcTime, patientTimezone);
      
      // Format for display using Luxon
      const [patientHours, patientMinutes] = patientTime.split(':').map(Number);
      const displayDateTime = DateTime.fromObject({ hour: patientHours, minute: patientMinutes });
      const displayLabel = displayDateTime.toFormat('h:mm a');
      
      console.log(`convertTimeToPatientTimezone: ${timeString} (${practitionerTimezone}) → ${patientTime} (${patientTimezone})`);
      
      return {
        originalTime: timeString,
        convertedTime: patientTime,
        displayLabel: displayLabel
      };
    } catch (error) {
      console.error("Error converting timezone:", error);
      // Fallback: return original time
      const [hours, minutes] = timeString.split(':').map(Number);
      const displayDateTime = DateTime.fromObject({ hour: hours, minute: minutes });
      return {
        originalTime: timeString,
        convertedTime: timeString,
        displayLabel: displayDateTime.toFormat('h:mm a')
      };
    }
  };

  // Function to convert time from patient's timezone back to practitioner's timezone using Luxon
  const convertTimeFromPatientToPractitioner = (timeString: string, patientTimezone: string, practitionerTimezone: string) => {
    try {
      const selectedDate = form.watch("appointmentDate") || new Date();
      
      // Convert patient time to UTC
      const utcTime = convertLocalToUTC(timeString, patientTimezone, selectedDate);
      
      // Convert UTC to practitioner time
      const practitionerTime = convertUTCToLocal(utcTime, practitionerTimezone);
      
      // Format for display using Luxon
      const [practitionerHours, practitionerMinutes] = practitionerTime.split(':').map(Number);
      const displayDateTime = DateTime.fromObject({ hour: practitionerHours, minute: practitionerMinutes });
      const displayLabel = displayDateTime.toFormat('h:mm a');
      
      console.log(`convertTimeFromPatientToPractitioner: ${timeString} (${patientTimezone}) → ${practitionerTime} (${practitionerTimezone})`);
      
      return {
        originalTime: timeString,
        convertedTime: practitionerTime,
        displayLabel: displayLabel
      };
    } catch (error) {
      console.error("Error converting timezone back:", error);
      // Fallback: return original time
      const [hours, minutes] = timeString.split(':').map(Number);
      const displayDateTime = DateTime.fromObject({ hour: hours, minute: minutes });
      return {
        originalTime: timeString,
        convertedTime: timeString,
        displayLabel: displayDateTime.toFormat('h:mm a')
      };
    }
  };

  // Fetch existing appointments for conflict checking
  const { data: existingAppointmentsResponse } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await api.get("/api/appointments");
      return response;
    },
  });

  // Extract appointments from the response (API returns { appointments: [], events: [] })
  const existingAppointments = existingAppointmentsResponse?.appointments || [];

  // Check for time slot conflicts including buffer time
  const hasTimeSlotConflict = (date: Date, time: string, practitionerId: string, bufferTime: number) => {
    if (!date || !practitionerId || !existingAppointments) return false;

    const [conflictHours, conflictMinutes] = time.split(':').map(Number);
    const appointmentDateTime = new Date(date);
    appointmentDateTime.setHours(conflictHours, conflictMinutes, 0, 0);

    const appointmentEndTime = addMinutes(appointmentDateTime, form.watch("duration") || 60);
    const bufferStartTime = addMinutes(appointmentDateTime, -bufferTime);
    const bufferEndTime = addMinutes(appointmentEndTime, bufferTime);

    return existingAppointments.some((apt: any) => {
      if (apt.practitionerId !== practitionerId) return false;
      
      const existingDateTime = new Date(apt.appointmentDate);
      const existingEndTime = addMinutes(existingDateTime, apt.duration || 60);
      
      // Check if appointments overlap (including buffer time)
      return (
        (appointmentDateTime < existingEndTime && appointmentEndTime > existingDateTime) ||
        (existingDateTime < bufferEndTime && existingEndTime > bufferStartTime)
      );
    });
  };

  // Validate that appointment is not in the past
  const isAppointmentInPast = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDateTime = new Date(date);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    return isBefore(appointmentDateTime, new Date());
  };

  // Validate that appointment is on a working day
  const isWorkingDay = (date: Date) => {
    const settings = calendarSettings || {
      workingDays: [1, 2, 3, 4, 5] // Monday to Friday
    };
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return settings.workingDays?.includes(dayOfWeek) ?? true;
  };

  // Validate that appointment is within practitioner's working hours
  const isWithinWorkingHours = (time: string) => {
    const settings = calendarSettings || {
      calendarStartHour: 8,
      calendarEndHour: 18
    };
    
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentMinutes = hours * 60 + minutes;
    
    const startMinutes = (settings.calendarStartHour || 8) * 60;
    const endMinutes = (settings.calendarEndHour || 18) * 60;
    
    return appointmentMinutes >= startMinutes && appointmentMinutes < endMinutes;
  };

  // Generate dynamic time slots based on practitioner's calendar settings
  const availableTimeSlots = useMemo(() => {
    // Use practitioner's calendar settings if available, otherwise use defaults
    const settings = calendarSettings || {
      timeSlotDuration: 60,
      calendarStartHour: 8,
      calendarEndHour: 18,
      bufferTime: 0,
      timezone: 'UTC'
    };

    // Check if user is admin/practitioner - they can schedule 24-hour appointments
    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'staff';
    const isPractitioner = user?.role === 'practitioner';
    const isPatient = user?.role === 'patient';
    const canSchedule24Hours = isAdmin || isPractitioner; // Staff can no longer schedule appointments

    // Use practitioner's working hours or 24-hour slots for admin/staff
    let startHour, endHour;
    
    if (canSchedule24Hours) {
      // 24-hour slots: 00:00 to 23:59
      startHour = 0;
      endHour = 23;
    } else {
      // Use practitioner's calendar hours
      startHour = settings.calendarStartHour || 8;
      endHour = settings.calendarEndHour || 18;
    }
    
    let currentMinutes = startHour * 60;
    const endMinutes = endHour * 60;
    const timeSlots = [];
    const selectedDate = form.watch("appointmentDate");
    const timeSlotDuration = settings.timeSlotDuration || 60;
    const bufferTime = settings.bufferTime || 0;
    
    // Get timezone information
    const practitionerTimezone = settings.timezone || 'UTC';
    const patientTimezone = patientUserPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    console.log("Time slot generation:", {
      practitionerTimezone,
      patientTimezone,
      isPatient,
      selectedPractitionerId: selectedPractitionerId || "none"
    });
    
    while (currentMinutes <= endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      // Check if this time slot is available (no conflicts with existing appointments)
      const isAvailable = !hasTimeSlotConflict(selectedDate, timeString, selectedPractitionerId || "", bufferTime);
      
      // For patients, convert time slots to their timezone when a practitioner is selected
      let displayTime = timeString;
      let displayLabel = format(new Date().setHours(hour, min), 'h:mm a');
      
      if (isPatient && selectedPractitionerId && practitionerTimezone !== patientTimezone) {
        const converted = convertTimeToPatientTimezone(timeString, practitionerTimezone, patientTimezone);
        displayTime = converted.convertedTime;
        displayLabel = `${converted.displayLabel} (Your Time)`;
        
        console.log(`Converting ${timeString} from ${practitionerTimezone} to ${patientTimezone}: ${converted.convertedTime}`);
      }
      
      timeSlots.push({
        time: timeString, // Keep original practitioner time for backend storage
        displayTime, // Time to display to user
        label: displayLabel,
        isAvailable,
        practitionerTime: timeString,
        patientTime: isPatient && selectedPractitionerId ? displayTime : timeString
      });
      
      currentMinutes += timeSlotDuration;
    }
    
    return timeSlots;
  }, [calendarSettings, form.watch("appointmentDate"), form.watch("practitionerId"), existingAppointments, user?.role, patientUserPreferences, selectedPractitionerId]);

  // Get form values for API calls
  const formSelectedDate = form.watch("appointmentDate");

  // Fetch available time slots from API
  const { data: availableSlots } = useQuery({
    queryKey: ["/api/appointments/available-slots", formSelectedDate?.toISOString(), selectedPractitionerId],
    queryFn: async () => {
      if (!formSelectedDate || !selectedPractitionerId) return [];
      
      const response = await api.get(`/api/appointments/available-slots?date=${formSelectedDate}&practitionerId=${selectedPractitionerId}`);
      return response;
    },
    enabled: !!formSelectedDate && !!selectedPractitionerId,
  });

  // Use available slots from API if available, otherwise fall back to client-side generation
  // For patients, always use client-side generation to ensure timezone conversion
  const timeSlots = (user?.role === 'patient' && selectedPractitionerId) ? availableTimeSlots : (availableSlots || availableTimeSlots);

  // Debug: Log the time slots being used
  console.log("Time slots being used:", {
    userRole: user?.role,
    selectedPractitionerId,
    isPatient: user?.role === 'patient',
    useClientSide: user?.role === 'patient' && selectedPractitionerId,
    availableTimeSlots: availableTimeSlots?.slice(0, 3), // Show first 3 slots
    availableSlots: availableSlots?.slice(0, 3), // Show first 3 slots
    finalTimeSlots: timeSlots?.slice(0, 3) // Show first 3 slots
  });

  // Test timezone conversion
  if (user?.role === 'patient' && selectedPractitionerId && calendarSettings?.timezone && patientUserPreferences?.timezone) {
    const testConversion = convertTimeToPatientTimezone('09:00', calendarSettings.timezone, patientUserPreferences.timezone);
    console.log("Test conversion 09:00:", testConversion);
  }

  // Filter patients and practitioners based on search
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (!patientSearch.trim()) return patients;
    
    const searchTerm = patientSearch.toLowerCase();
    return patients.filter((patient: any) => {
      const firstName = patient.user?.firstName?.toLowerCase() || "";
      const lastName = patient.user?.lastName?.toLowerCase() || "";
      const email = patient.user?.email?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
  }, [patients, patientSearch]);

  const filteredPractitioners = useMemo(() => {
    if (!practitioners) return [];
    if (!practitionerSearch.trim()) return practitioners;
    
    const searchTerm = practitionerSearch.toLowerCase();
    return practitioners.filter((practitioner: any) => {
      const firstName = practitioner.user?.firstName?.toLowerCase() || "";
      const lastName = practitioner.user?.lastName?.toLowerCase() || "";
      const email = practitioner.user?.email?.toLowerCase() || "";
      const specialty = practitioner.specialty?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      return fullName.includes(searchTerm) || email.includes(searchTerm) || specialty.includes(searchTerm);
    });
  }, [practitioners, practitionerSearch]);

  // Get available telehealth platforms based on integrations
  const availableTelehealthPlatforms = useMemo(() => {
    if (locationType !== "telehealth") return [];
    
    const platforms = [...TELEHEALTH_PLATFORMS];
    const integrations = userIntegrations || [];
    
    console.log("Available telehealth platforms - Location type:", locationType);
    console.log("User integrations:", integrations);
    console.log("All platforms:", platforms);
    
    // Filter out disabled platforms and check integrations for external platforms
    const availablePlatforms = platforms.filter(platform => {
      // Skip disabled platforms
      if (platform.disabled) {
        console.log(`Skipping disabled platform: ${platform.value}`);
        return false;
      }
      
      // For external platforms, check if user has integration for this platform
      const hasIntegration = integrations.some((integration: any) => {
        // Handle different provider names
        const providerMapping: { [key: string]: string } = {
          'google_meet': 'google',
          'google': 'google_meet',
          'teams': 'teams',
          'zoom': 'zoom'
        };
        
        const mappedProvider = providerMapping[integration.provider] || integration.provider;
        const isMatch = (mappedProvider === platform.value || integration.provider === platform.value) && integration.isActive;
        
        console.log(`Checking integration: ${integration.provider} (mapped: ${mappedProvider}) against platform: ${platform.value}, isActive: ${integration.isActive}, isMatch: ${isMatch}`);
        
        return isMatch;
      });
      
      console.log(`Platform ${platform.value} has integration: ${hasIntegration}`);
      return hasIntegration;
    });
    
    console.log("Final available platforms:", availablePlatforms);
    return availablePlatforms;
  }, [locationType, userIntegrations]);

  // Check if practitioner has Google integration
  const hasGoogleIntegration = useMemo(() => {
    if (!userIntegrations) return false;
    return userIntegrations.some((integration: any) => 
      (integration.provider === 'google' || integration.provider === 'google_meet') && integration.isActive
    );
  }, [userIntegrations]);

  // Show recommendation for physical location if no telehealth platforms available
  const showPhysicalLocationRecommendation = useMemo(() => {
    return locationType === "telehealth" && availableTelehealthPlatforms.length === 0;
  }, [locationType, availableTelehealthPlatforms]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      console.log("Submitting appointment data:", data);
      
      // Final validation before submission
      if (isAppointmentInPast(data.appointmentDate, data.appointmentTime)) {
        throw new Error("Cannot create appointments in the past");
      }

      // Get the selected practitioner's calendar settings
      const selectedPractitioner = practitioners?.find((p: any) => p.id === data.practitionerId);
      const practitionerTimezone = selectedPractitioner?.calendarSettings?.timezone || 'UTC';
      const patientTimezone = patientUserPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log("Appointment creation timezone info:", {
        practitionerTimezone,
        patientTimezone,
        selectedTime: data.appointmentTime,
        selectedDate: data.appointmentDate
      });

      // Determine the timezone of the selected time and convert to UTC
      let utcAppointmentTime: string;
      
      if (user?.role === 'patient' && practitionerTimezone !== patientTimezone) {
        // Patient selected time in their timezone, convert to UTC
        utcAppointmentTime = convertLocalToUTC(data.appointmentTime, patientTimezone, data.appointmentDate);
        console.log("Patient selected time converted to UTC:", {
          patientTime: data.appointmentTime,
          utcTime: utcAppointmentTime
        });
      } else {
        // Practitioner/Admin/Staff selected time in practitioner's timezone, convert to UTC
        utcAppointmentTime = convertLocalToUTC(data.appointmentTime, practitionerTimezone, data.appointmentDate);
        console.log("Practitioner time converted to UTC:", {
          practitionerTime: data.appointmentTime,
          utcTime: utcAppointmentTime
        });
      }

      // Create UTC date object
      const appointmentDateTime = new Date(utcAppointmentTime);

      console.log("Final UTC appointment date/time:", appointmentDateTime.toISOString());

      // Prepare the request payload based on location type
      const requestPayload: any = {
        ...data,
        appointmentDate: appointmentDateTime,
      };

      // Remove telehealth-specific fields for in-person appointments
      if (data.locationType === "in-person") {
        delete requestPayload.telehealthPlatform;
      }

      // Remove address fields for telehealth appointments
      if (data.locationType === "telehealth") {
        delete requestPayload.address;
        delete requestPayload.city;
        delete requestPayload.state;
        delete requestPayload.zipCode;
      }

      console.log("Final request payload:", requestPayload);

      const response = await api.post("/api/appointments", requestPayload);
      
      console.log("Appointment creation response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Appointment created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment created successfully. Notifications have been sent to the patient and practitioner.",
      });
      // Restore focus before calling onSubmit
      setTimeout(() => {
        const activeElement = document.querySelector('[data-focus-restore]') as HTMLElement;
        if (activeElement) {
          activeElement.focus();
        }
      }, 100);
      onSubmit();
    },
    onError: (error: any) => {
      console.error("Appointment creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AppointmentFormData) => {
    // Staff cannot create appointments
    if (user?.role === 'staff') {
      toast({
        title: "Access Denied",
        description: "Staff members cannot create appointments. Please contact an administrator.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate appointment is not in the past
    if (isAppointmentInPast(data.appointmentDate, data.appointmentTime)) {
      toast({
        title: "Invalid Time",
        description: "Cannot create appointments in the past",
        variant: "destructive",
      });
      return;
    }

    // Check if user is admin/practitioner/patient - they can bypass working day and working hours restrictions
    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'staff';
    const isPractitioner = user?.role === 'practitioner';
    const isPatient = user?.role === 'patient';
    const canBypassRestrictions = isAdmin || isPractitioner || isPatient; // Staff can no longer create appointments

    // Validate appointment is on a working day (skip for admin/staff)
    if (!canBypassRestrictions && !isWorkingDay(data.appointmentDate)) {
      toast({
        title: "Invalid Day",
        description: "Cannot create appointments on non-working days",
        variant: "destructive",
      });
      return;
    }

    // Validate appointment is within working hours (skip for admin/staff)
    if (!canBypassRestrictions && !isWithinWorkingHours(data.appointmentTime)) {
      toast({
        title: "Invalid Time",
        description: "Cannot create appointments outside working hours",
        variant: "destructive",
      });
      return;
    }

    // Check for appointment conflicts with buffer time
    const settings = calendarSettings || { bufferTime: 0 };
    if (hasTimeSlotConflict(data.appointmentDate, data.appointmentTime, data.practitionerId, settings.bufferTime)) {
      toast({
        title: "Scheduling Conflict",
        description: "There is already an appointment scheduled at this time for this practitioner.",
        variant: "destructive",
      });
      return;
    }

    // Validate location-specific requirements
    if (data.locationType === "in-person" && (!data.address || !data.city || !data.state || !data.zipCode)) {
      toast({
        title: "Missing Address",
        description: "Please provide complete address for in-person appointments",
        variant: "destructive",
      });
      return;
    }

    if (data.locationType === "telehealth" && !data.telehealthPlatform) {
      toast({
        title: "Missing Platform",
        description: "Please select a telehealth platform",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Appointment</h2>
          {user?.role === 'practitioner' && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Practitioner View
            </Badge>
          )}
          {user?.role === 'patient' && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Patient View
            </Badge>
          )}
          {user?.role === 'admin' && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Admin View
            </Badge>
          )}
          {user?.role === 'staff' && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Staff View (Read Only)
            </Badge>
          )}
        </div>
        {user?.role === 'practitioner' && (
          <p className="text-sm text-muted-foreground mt-1">
            You can schedule appointments for yourself with any practitioner
          </p>
        )}
        {user?.role === 'patient' && (
          <p className="text-sm text-muted-foreground mt-1">
            You can schedule appointments for yourself with any practitioner
          </p>
        )}
        {user?.role === 'admin' && (
          <p className="text-sm text-muted-foreground mt-1">
            You can schedule appointments for any patient with any practitioner (24/7)
          </p>
        )}
        {user?.role === 'staff' && (
          <p className="text-sm text-muted-foreground mt-1">
            Staff members can view appointments but cannot create, edit, or delete them
          </p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Disable entire form for staff users */}
          {user?.role === 'staff' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-orange-800">Staff Access Restricted</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Staff members can view appointments but cannot create, edit, or delete them. Please contact an administrator for assistance.
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Title Field */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Appointment title" {...field} />
                </FormControl>
                <FormMessage className="text-red-600"/>
              </FormItem>
            )}
          />

          {/* Patient Selection */}
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  onOpenChange={setPatientSelectOpen}
                  disabled={user?.role === 'patient'}
                >
                  <FormControl>
                    <SelectTrigger disabled={patientsLoading || user?.role === 'patient'}>
                      <SelectValue placeholder={
                        user?.role === 'patient' 
                          ? "You (Patient)" 
                          : patientsLoading 
                            ? "Loading patients..." 
                            : "Select a patient"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Search Input */}
                    <div className="flex items-center px-3 py-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        ref={patientSearchRef}
                        placeholder="Search patients..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        autoComplete="off"
                      />
                    </div>
                    {patientsLoading ? (
                      <div className="px-2 py-1.5 text-sm text-slate-500">Loading patients...</div>
                    ) : patientsError ? (
                      <div className="px-2 py-1.5 text-sm text-red-500">Error loading patients</div>
                    ) : filteredPatients?.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-slate-500">
                        {patientSearch ? "No patients found matching your search" : "No patients found"}
                      </div>
                    ) : (
                      filteredPatients?.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.user?.firstName && patient.user?.lastName 
                            ? `${patient.user.firstName} ${patient.user.lastName}`
                            : patient.user?.email 
                            ? patient.user.email
                            : `Patient ${patient.id.slice(0, 8)}...`
                          }
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage className="text-red-600"/>
              </FormItem>
            )}
          />

          {/* Practitioner Selection */}
          <FormField
            control={form.control}
            name="practitionerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Practitioner</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  onOpenChange={setPractitionerSelectOpen}
                  disabled={user?.role === 'practitioner'}
                >
                  <FormControl>
                    <SelectTrigger disabled={practitionersLoading || user?.role === 'practitioner'}>
                      <SelectValue placeholder={
                        user?.role === 'practitioner' 
                          ? "You (Practitioner)" 
                          : practitionersLoading 
                            ? "Loading practitioners..." 
                            : "Select a practitioner"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Search Input */}
                    <div className="flex items-center px-3 py-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        ref={practitionerSearchRef}
                        placeholder="Search practitioners..."
                        value={practitionerSearch}
                        onChange={(e) => setPractitionerSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        autoComplete="off"
                      />
                    </div>
                    {practitionersLoading ? (
                      <div className="px-2 py-1.5 text-sm text-slate-500">Loading practitioners...</div>
                    ) : practitionersError ? (
                      <div className="px-2 py-1.5 text-sm text-red-500">Error loading practitioners</div>
                    ) : filteredPractitioners?.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-slate-500">
                        {practitionerSearch ? "No practitioners found matching your search" : "No practitioners found"}
                      </div>
                    ) : (
                      filteredPractitioners?.map((practitioner: any) => (
                        <SelectItem key={practitioner.id} value={practitioner.id}>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {practitioner.user?.firstName && practitioner.user?.lastName 
                                  ? `Dr. ${practitioner.user.firstName} ${practitioner.user.lastName}`
                                  : practitioner.user?.email 
                                  ? `Dr. ${practitioner.user.email}`
                                  : `Practitioner ${practitioner.id.slice(0, 8)}...`
                                }
                              </span>
                              {practitioner.calendarSettings?.timezone && (
                                <span className="text-xs text-muted-foreground">
                                  {practitioner.calendarSettings.timezone}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              {practitioner.specialty && (
                                <span>{practitioner.specialty}</span>
                              )}
                              {practitioner.calendarSettings?.defaultStartTime && practitioner.calendarSettings?.defaultEndTime && (
                                <span>
                                  {practitioner.calendarSettings.defaultStartTime} - {practitioner.calendarSettings.defaultEndTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage className="text-red-600"/>
              </FormItem>
            )}
          />

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today || date < new Date("1900-01-01");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {/* Timezone info for patients */}
                      {user?.role === 'patient' && selectedPractitionerId && (
                        <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Times shown in your timezone</span>
                          </div>
                          <div className="mt-1">
                            Practitioner timezone: {calendarSettings?.timezone || 'UTC'}
                          </div>
                          <div>
                            Your timezone: {patientUserPreferences?.timezone || 'Browser default'}
                          </div>
                        </div>
                      )}
                      
                      {timeSlots.map((slot: any) => {
                        // Check if this time is outside working hours
                        const [hours, minutes] = slot.time.split(':').map(Number);
                        const isOutsideWorkingHours = hours < 9 || hours >= 17; // Outside 9 AM - 5 PM
                        const isAdminOrPractitioner = user?.role === 'admin' || user?.role === 'practitioner';
                        
                        return (
                          <SelectItem 
                            key={slot.time} 
                            value={slot.time}
                            disabled={!slot.isAvailable}
                            className={!slot.isAvailable ? "text-muted-foreground" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{slot.label}</span>
                              <div className="flex items-center space-x-2 text-xs">
                                {!slot.isAvailable && <span className="text-red-500">(Unavailable)</span>}
                                {isAdminOrPractitioner && isOutsideWorkingHours && slot.isAvailable && (
                                  <span className="text-yellow-600">(Outside Hours)</span>
                                )}
                                {user?.role === 'patient' && selectedPractitionerId && slot.practitionerTime !== slot.patientTime && (
                                  <span className="text-blue-500">
                                    (Dr: {(() => {
                                      const [hours, minutes] = slot.practitionerTime.split(':').map(Number);
                                      return format(new Date().setHours(hours, minutes), 'h:mm a');
                                    })()})
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Duration and Type */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {APPOINTMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Location Type Selection */}
          <FormField
            control={form.control}
            name="locationType"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-base font-semibold">Appointment Location</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div className="relative">
                      <RadioGroupItem
                        value="in-person"
                        id="in-person"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="in-person"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-gradient-to-br from-blue-50 to-indigo-50 p-6 hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-blue-100 peer-data-[state=checked]:to-indigo-100 peer-data-[state=checked]:shadow-lg transition-all duration-200 cursor-pointer group"
                      >
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                          <MapPin className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="space-y-2 text-center">
                          <p className="text-lg font-semibold text-gray-900">In-Person</p>
                          <p className="text-sm text-gray-600">
                            Face-to-face consultation at a physical location
                          </p>
                          <div className="flex items-center justify-center space-x-2 text-xs text-blue-600">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span>Traditional consultation</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem
                        value="telehealth"
                        id="telehealth"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="telehealth"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-gradient-to-br from-green-50 to-emerald-50 p-6 hover:bg-gradient-to-br hover:from-green-100 hover:to-emerald-100 hover:border-green-300 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-green-100 peer-data-[state=checked]:to-emerald-100 peer-data-[state=checked]:shadow-lg transition-all duration-200 cursor-pointer group"
                      >
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                          <Video className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="space-y-2 text-center">
                          <p className="text-lg font-semibold text-gray-900">Telehealth</p>
                          <p className="text-sm text-gray-600">
                            Virtual consultation via video call
                          </p>
                          <div className="flex items-center justify-center space-x-2 text-xs text-green-600">
                            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            <span>Remote consultation</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage className="text-red-600"/>
              </FormItem>
            )}
          />

          {/* In-Person Address Fields */}
          {locationType === "in-person" && (
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-3 text-blue-800">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  Location Details
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Provide the complete address where the appointment will take place
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Street Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 Main Street, Suite 100" 
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">City</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="New York" 
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">State</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="NY" 
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">ZIP Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="10001" 
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Address Preview */}
                {(form.watch("address") || form.watch("city") || form.watch("state") || form.watch("zipCode")) && (
                  <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">Address Preview</p>
                        <p className="text-sm text-gray-600">
                          {[
                            form.watch("address"),
                            form.watch("city"),
                            form.watch("state"),
                            form.watch("zipCode")
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Telehealth Platform Selection */}
          {locationType === "telehealth" && (
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-3 text-green-800">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Video className="h-5 w-5 text-green-600" />
                  </div>
                  Video Platform Selection
                </CardTitle>
                <CardDescription className="text-green-700">
                  Choose the platform for your virtual consultation. Available options depend on your connected integrations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="telehealthPlatform"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value || "zoom"}
                          className="space-y-4"
                        >
                          {/* Loading state */}
                          {integrationsLoading && (
                            <div className="flex items-center justify-center p-8">
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                <span className="text-sm text-gray-600">Loading practitioner's available platforms...</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Available platforms */}
                          {!integrationsLoading && availableTelehealthPlatforms.map((platform) => {
                            const IconComponent = platform.icon;
                            const isInApp = platform.value === "inapp";
                            const isDisabled = platform.disabled;
                            const platformColors = {
                              inapp: "from-purple-50 to-violet-50 border-purple-200 hover:border-purple-300 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:from-purple-100 peer-data-[state=checked]:to-violet-100",
                              zoom: "from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:from-blue-100 peer-data-[state=checked]:to-cyan-100",
                              teams: "from-indigo-50 to-purple-50 border-indigo-200 hover:border-indigo-300 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:from-indigo-100 peer-data-[state=checked]:to-purple-100",
                              google_meet: "from-red-50 to-orange-50 border-red-200 hover:border-red-300 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:from-red-100 peer-data-[state=checked]:to-orange-100"
                            };
                            
                            return (
                              <div key={platform.value} className="relative">
                                <RadioGroupItem
                                  value={platform.value}
                                  id={platform.value}
                                  className="peer sr-only"
                                  disabled={isDisabled}
                                />
                                <Label
                                  htmlFor={platform.value}
                                  className={`flex items-center space-x-4 rounded-xl border-2 border-muted bg-gradient-to-br p-4 relative transition-all duration-200 ${
                                    isDisabled 
                                      ? "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200" 
                                      : "hover:shadow-md peer-data-[state=checked]:shadow-lg cursor-pointer group hover:border-current"
                                  } ${platformColors[platform.value as keyof typeof platformColors]}`}
                                >
                                  <div className={`w-12 h-12 rounded-full bg-white dark:bg-gray-500 shadow-sm flex items-center justify-center ${
                                    isDisabled ? "" : "group-hover:scale-110 transition-transform duration-200"
                                  }`}>
                                    <IconComponent className={`h-6 w-6 ${isDisabled ? "text-gray-400" : ""}`} />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <p className={`text-sm font-semibold ${isDisabled ? "text-gray-500" : "text-gray-900"}`}>
                                        {platform.label}
                                      </p>
                                      {isInApp && isDisabled && (
                                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                          Coming Soon
                                        </Badge>
                                      )}
                                      {isInApp && !isDisabled && (
                                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                          Available
                                        </Badge>
                                      )}
                                    </div>
                                    <p className={`text-sm ${isDisabled ? "text-gray-400" : "text-gray-600"}`}>
                                      {platform.description}
                                    </p>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border-2 ${
                                    isDisabled 
                                      ? "border-gray-300 bg-gray-100" 
                                      : "border-gray-300 peer-data-[state=checked]:border-current peer-data-[state=checked]:bg-current transition-colors duration-200"
                                  }`}></div>
                                </Label>
                              </div>
                            );
                          })}
                          
                          {/* No platforms available */}
                          {!integrationsLoading && availableTelehealthPlatforms.length === 0 && (
                            <div className="text-center p-8">
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                                <div className="flex items-center justify-center mb-4">
                                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <MapPin className="h-6 w-6 text-yellow-600" />
                                  </div>
                                </div>
                                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                                  Telehealth Not Available
                                </h3>
                                <p className="text-yellow-700 mb-4">
                                  This practitioner doesn't have any telehealth platforms integrated.
                                </p>
                                <div className="bg-white border border-yellow-200 rounded-lg p-4">
                                  <p className="text-sm font-medium text-yellow-800 mb-2">
                                    💡 Recommendation:
                                  </p>
                                  <p className="text-sm text-yellow-700">
                                    Consider scheduling an <strong>in-person appointment</strong> instead. 
                                    Physical consultations often provide better care quality and allow for 
                                    comprehensive health assessments.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => form.setValue("locationType", "in-person")}
                                  className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  Switch to In-Person
                                </button>
                              </div>
                            </div>
                          )}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
                
                {/* Integration Status */}
                {userIntegrations && userIntegrations.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-800">Practitioner's Connected Platforms</p>
                        <p className="text-xs text-green-700">
                          {userIntegrations.map((integration: any) => 
                            integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)
                          ).join(", ")}
                        </p>
                        {hasGoogleIntegration && (
                          <p className="text-xs text-green-600 mt-1">
                            ✅ Google Meet available for telehealth
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {userIntegrations && userIntegrations.length === 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">Limited Platform Options</p>
                        <p className="text-xs text-yellow-700">
                          This practitioner doesn't have external telehealth platforms integrated. 
                          {hasGoogleIntegration ? " Google Meet is available." : " Consider in-person appointments for better care quality."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Debug Information */}
                {/* {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Debug Info:</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Selected Practitioner ID: {selectedPractitionerId || 'None'}</p>
                      <p>Integrations Loading: {integrationsLoading ? 'Yes' : 'No'}</p>
                      <p>User Integrations: {userIntegrations ? JSON.stringify(userIntegrations) : 'None'}</p>
                      <p>Available Platforms: {availableTelehealthPlatforms.length}</p>
                      <p>Location Type: {locationType}</p>
                    </div>
                  </div>
                )} */}
              </CardContent>
            </Card>
          )}

          {/* Email Confirmation Toggle */}
          <FormField
            control={form.control}
            name="sendEmailConfirmation"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Email Confirmation</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Send confirmation emails to patient and practitioner
                  </div>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional notes..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-600"/>
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? "Creating..." : "Create Appointment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}