import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isBefore, isAfter, addDays, subDays, startOfDay, setHours, setMinutes } from "date-fns";
import { toZonedTime, format as formatTz } from "date-fns-tz";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, Calendar, Clock, Globe } from "lucide-react";
import { getTimeZones } from "@vvo/tzdb";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AvailableDate {
  date: Date;
  available: boolean;
}

interface AvailableTime {
  time: string;
  available: boolean;
  label: string;
  isPastInUTC?: boolean; // Optional flag for past time in UTC
  practitionerTime?: string; // Original time in practitioner's timezone
  userTime?: string; // Time in user's timezone for display
  displayLabel?: string; // Formatted display label for user timezone
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  practitionerTime?: string; // Original time in practitioner's timezone
  userTime?: string; // Time in user's timezone for display
  displayLabel?: string; // Formatted display label for user timezone
}

interface TimeConversionResult {
  originalTime: string;
  convertedTime: string;
  displayLabel: string;
  isAvailable: boolean;
}

interface PractitionerSettings {
  defaultStartTime: string;
  defaultEndTime: string;
  interval: number; // in minutes
  buffer: number; // in minutes
  weekdays: string[]; // e.g., ["monday", "tuesday", ...]
  timezone: string;
}

/**
 * Generate time slots for a specific appointment date based on practitioner settings using Luxon
 * @param appointmentDate - Date for which to generate slots
 * @param practitionerSettings - Practitioner's calendar settings
 * @param appointments - Array of existing appointments for that date
 * @param userTimezone - Optional user timezone for display purposes
 * @returns Array of time slots with availability status
 */
const generateTimeSlots = (
  appointmentDate: Date,
  practitionerSettings: PractitionerSettings,
  appointments: any[] = [],
  userTimezone?: string
): TimeSlot[] => {
  const {
    defaultStartTime,
    defaultEndTime,
    interval,
    buffer,
    weekdays,
    timezone: practitionerTimezone
  } = practitionerSettings;

  // Convert appointmentDate to Luxon DateTime
  const selectedDate = DateTime.fromJSDate(appointmentDate);

  // 1. Check if it's a working day using Luxon
  const dayOfWeek = selectedDate.toFormat('EEEE').toLowerCase();
  const isWorkingDay = weekdays.includes(dayOfWeek);

  if (!isWorkingDay) {
    console.log(`Date ${selectedDate.toFormat('yyyy-MM-dd')} (${dayOfWeek}) is not a working day`);
    return [];
  }

  console.log(`Generating slots for ${selectedDate.toFormat('yyyy-MM-dd')} (${dayOfWeek})`);

  // 2. Generate slots only for working days using Luxon
  const baseTime = DateTime.fromFormat(
    `${selectedDate.toFormat('yyyy-MM-dd')} ${defaultStartTime}`,
    'yyyy-MM-dd HH:mm',
    { zone: practitionerTimezone }
  );

  const endTime = DateTime.fromFormat(
    `${selectedDate.toFormat('yyyy-MM-dd')} ${defaultEndTime}`,
    'yyyy-MM-dd HH:mm',
    { zone: practitionerTimezone }
  );

  // 3. Generate slots with interval + buffer using Luxon
  const slots: TimeSlot[] = [];
  let currentTime = baseTime;

  while (currentTime < endTime) {
    const timeString = currentTime.toFormat('HH:mm');

    console.log('🕐 Luxon Debug - Slot:', {
      localTime: timeString,
      isoTime: currentTime.toISO(),
      practitionerTimezone: practitionerTimezone,
      date: selectedDate.toFormat('yyyy-MM-dd')
    });

    // Check if there's a conflicting appointment
    const conflictingAppointment = appointments.find(apt => {
      try {
        if (!apt.appointment_date) return false;

        // Parse appointment date (it's in UTC format)
        const aptDate = DateTime.fromISO(apt.appointment_date);

        // Check if appointment is on the same date
        if (!aptDate.hasSame(selectedDate, 'day')) return false;

        // Check if times overlap (considering duration)
        const aptDuration = apt.duration || interval; // Use interval as default duration

        // Check if the new slot overlaps with existing appointment
        const slotEnd = currentTime.plus({ minutes: interval });
        const aptEnd = aptDate.plus({ minutes: aptDuration });

        // Overlap occurs if: slot starts before apt ends AND slot ends after apt starts
        const hasOverlap = currentTime < aptEnd && slotEnd > aptDate;

        return hasOverlap;
      } catch (error) {
        console.error('Error checking appointment conflict:', error, apt);
        return false;
      }
    });

    const isAvailable = !conflictingAppointment;

    // Convert to user timezone for display if provided using Luxon
    let userTime = timeString;
    let displayLabel = timeString;

    if (userTimezone && userTimezone !== practitionerTimezone) {
      try {
        // Use Luxon setZone for timezone conversion
        const userTimeSlot = currentTime.setZone(userTimezone);
        userTime = userTimeSlot.toFormat('HH:mm');
        displayLabel = userTimeSlot.toFormat('h:mm a');

        console.log(`Luxon timezone conversion: ${timeString} (${practitionerTimezone}) → ${userTime} (${userTimezone})`);
      } catch (error) {
        console.error('Error converting to user timezone:', error);
      }
    }

    slots.push({
      time: timeString, // Always keep original practitioner time
      isAvailable,
      practitionerTime: timeString, // Original time in practitioner's timezone
      userTime: userTimezone && userTimezone !== practitionerTimezone ? userTime : undefined, // Time in user's timezone
      displayLabel: displayLabel // Formatted display label for user timezone
    });

    // Move to next slot: interval + buffer using Luxon
    currentTime = currentTime.plus({ minutes: interval + buffer });
  }

  console.log(`Generated ${slots.length} slots for ${selectedDate.toFormat('yyyy-MM-dd')}:`, slots);
  return slots;
};

/**
 * Test function to demonstrate the time slot generation
 * This can be called from the browser console for testing
 */
const testTimeSlotGeneration = () => {
  const practitionerSettings: PractitionerSettings = {
    defaultStartTime: "09:00",
    defaultEndTime: "15:00",
    interval: 30,
    buffer: 10,
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    timezone: "America/New_York"
  };

  const appointmentDate = new Date('2025-08-25'); // Monday
  const appointments = [
    {
      id: '1',
      appointment_date: '2025-08-25T13:30:00.000Z', // 09:30 AM in America/New_York
      duration: 60
    }
  ];

  const userTimezone = "Asia/Dhaka";

  const slots = generateTimeSlots(appointmentDate, practitionerSettings, appointments, userTimezone);

  console.log('Test Time Slot Generation:', {
    practitionerSettings,
    appointmentDate: format(appointmentDate, 'yyyy-MM-dd'),
    appointments,
    userTimezone,
    generatedSlots: slots
  });

  return slots;
};

// Make test function available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testTimeSlotGeneration = testTimeSlotGeneration;
}

interface MiniCalendarStepProps {
  availableDates?: AvailableDate[];
  availableTimes?: AvailableTime[];
  onSelect: (date: Date, time: string) => void;
  selectedDate?: Date | null;
  selectedTime?: string | null;
  calendarSettings?: any;
  bookingSettings?: any;
  availableSlots?: any[];
  isLoadingSlots?: boolean;
  appointments?: any[]; // Add appointments prop
}

// Dummy data for demonstration
const generateDummyAvailableDates = (): AvailableDate[] => {
  const dates: AvailableDate[] = [];
  const start = startOfMonth(new Date());
  const end = endOfMonth(addMonths(new Date(), 2));

  eachDayOfInterval({ start, end }).forEach(date => {
    // Make weekends unavailable
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Make some random dates unavailable (but fewer)
    const isRandomlyUnavailable = Math.random() < 0.1;

    dates.push({
      date,
      available: !isWeekend && !isRandomlyUnavailable && !isBefore(date, new Date())
    });
  });

  return dates;
};



const generateTimeSlotsFromCalendarSettings = (calendarSettings: any, availableSlots: any[] = [], selectedDate?: Date | null, selectedTimezone?: string, appointments: any[] = []): { [key: string]: AvailableTime[] } => {
  const daySlots: { [key: string]: AvailableTime[] } = {
    'SUN': [],
    'MON': [],
    'TUE': [],
    'WED': [],
    'THU': [],
    'FRI': [],
    'SAT': []
  };

  if (!calendarSettings) {
    return daySlots;
  }

  // Convert calendar settings to the format expected by generateTimeSlots
  const practitionerSettings: PractitionerSettings = {
    defaultStartTime: calendarSettings.defaultStartTime || "09:00",
    defaultEndTime: calendarSettings.defaultEndTime || "17:00",
    interval: calendarSettings.timeInterval || calendarSettings.timeSlotDuration || 60,
    buffer: calendarSettings.bufferTime || 0,
    weekdays: calendarSettings.workingDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
    timezone: calendarSettings.timezone || "UTC"
  };

  console.log('Using practitioner settings:', practitionerSettings);

  // Generate slots for each day of the week
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayNumberToName: { [key: number]: string } = {
    0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT'
  };

  // Generate slots for each working day
  practitionerSettings.weekdays.forEach((weekday: string) => {
    const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekday);
    if (dayIndex === -1) {
      console.warn(`Invalid weekday: ${weekday}`);
      return;
    }

    const dayName = dayNumberToName[dayIndex];

    // Create a sample date for this day of the week (using current week)
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const targetDay = addDays(currentWeekStart, dayIndex);

    // Generate slots for this day
    const slots = generateTimeSlots(targetDay, practitionerSettings, appointments, selectedTimezone);

    // Convert TimeSlot[] to AvailableTime[]
    const availableTimes: AvailableTime[] = slots.map(slot => ({
      time: slot.time, // Display time (user timezone if different, otherwise practitioner timezone)
      label: slot.displayLabel || format(new Date().setHours(
        parseInt(slot.time.split(':')[0]),
        parseInt(slot.time.split(':')[1])
      ), 'h:mm a'),
      available: slot.isAvailable,
      isPastInUTC: false, // Will be calculated separately if needed
      practitionerTime: slot.practitionerTime, // Original time in practitioner's timezone
      userTime: slot.userTime, // Time in user's timezone for display
      displayLabel: slot.displayLabel // Formatted display label for user timezone
    }));

    daySlots[dayName] = availableTimes;
    console.log(`Generated ${availableTimes.length} slots for ${dayName}:`, availableTimes);
  });

  console.log('Generated time slots by day:', daySlots);
  return daySlots;
};


// Timezone conversion utility functions using date-fns-tz (working version from appointment-form.tsx)

// Reusable function to convert local time to UTC (from appointment-form.tsx)
const convertLocalToUTC = (localTime: string, timezone: string, date: Date = new Date()): string => {
  try {
    const [hours, minutes] = localTime.split(':').map(Number);

    // Create a date object for the specified date and time
    const baseDate = startOfDay(date);
    const localDateTime = setHours(setMinutes(baseDate, minutes), hours);

    // Convert to UTC using date-fns-tz
    const utcDate = toZonedTime(localDateTime, timezone);

    console.log(`convertLocalToUTC: ${localTime} (${timezone}) → ${utcDate.toISOString()}`);

    return utcDate.toISOString();
  } catch (error) {
    console.error("Error converting local time to UTC:", error);
    // Fallback: return original time as UTC
    const [hours, minutes] = localTime.split(':').map(Number);
    const fallbackDate = new Date(date);
    fallbackDate.setHours(hours, minutes, 0, 0);
    return fallbackDate.toISOString();
  }
};

// Reusable function to convert UTC to local time (from appointment-form.tsx)
const convertUTCToLocal = (utcTime: string, timezone: string): string => {
  try {
    const utcDate = new Date(utcTime);
    const localDate = toZonedTime(utcDate, timezone);

    const hours = localDate.getHours().toString().padStart(2, '0');
    const minutes = localDate.getMinutes().toString().padStart(2, '0');
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

const convertTimeToPatientTimezone = (timeString: string, practitionerTimezone: string, patientTimezone: string, selectedDate: Date): TimeConversionResult => {
  try {
    console.log(`🔍 Timezone Conversion: ${timeString} (${practitionerTimezone}) → ${patientTimezone}`);

    // If timezones are the same, no conversion needed
    if (practitionerTimezone === patientTimezone) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const displayLabel = format(new Date().setHours(hours, minutes), 'h:mm a');

      console.log(`✅ Same timezone - no conversion needed: ${timeString} (${practitionerTimezone})`);

      return {
        originalTime: timeString,
        convertedTime: timeString,
        displayLabel: displayLabel,
        isAvailable: true
      };
    }

    // Use Luxon for timezone conversion
    try {
      // Create Luxon DateTime in practitioner's timezone
      const practitionerDateTime = DateTime.fromFormat(
        `${DateTime.fromJSDate(selectedDate).toFormat('yyyy-MM-dd')} ${timeString}`,
        'yyyy-MM-dd HH:mm',
        { zone: practitionerTimezone }
      );

      // Convert to patient's timezone using Luxon
      const patientDateTime = practitionerDateTime.setZone(patientTimezone);

      // Extract time components
      const convertedHours = patientDateTime.hour;
      const convertedMinutes = patientDateTime.minute;

      // Handle day boundary cases
      let finalHours = convertedHours;
      let finalMinutes = convertedMinutes;

      if (finalHours < 0) {
        finalHours += 24;
      } else if (finalHours >= 24) {
        finalHours -= 24;
      }

      const patientTimeString = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

      // Format for display using Luxon
      const displayLabel = patientDateTime.toFormat('h:mm a');

      console.log(`✅ Luxon Final Result: ${timeString} (${practitionerTimezone}) → ${patientTimeString} (${patientTimezone})`);
      console.log(`🕐 Luxon Debug - Practitioner: ${practitionerDateTime.toISO()}`);
      console.log(`🕐 Luxon Debug - Patient: ${patientDateTime.toISO()}`);

      return {
        originalTime: timeString,
        convertedTime: patientTimeString,
        displayLabel: displayLabel,
        isAvailable: true
      };

    } catch (error) {
      console.error("Error in Luxon timezone conversion:", error);

      // Fallback: return original time but mark as potentially incorrect
      console.warn(`Luxon timezone conversion failed for: ${practitionerTimezone} → ${patientTimezone}. Using original time.`);
      const [hours, minutes] = timeString.split(':').map(Number);
      return {
        originalTime: timeString,
        convertedTime: timeString,
        displayLabel: format(new Date().setHours(hours, minutes), 'h:mm a'),
        isAvailable: true // Still available, just time might be wrong
      };
    }
  } catch (error) {
    console.error("❌ Error converting timezone:", error);
    // Fallback: return original time
    const [hours, minutes] = timeString.split(':').map(Number);
    return {
      originalTime: timeString,
      convertedTime: timeString,
      displayLabel: format(new Date().setHours(hours, minutes), 'h:mm a'),
      isAvailable: false
    };
  }
};

// Comprehensive timezone list using @vvo/tzdb
const getComprehensiveTimezones = () => {
  const timezones = getTimeZones();
  const grouped: { [key: string]: Array<{ value: string; label: string }> } = {
    'Popular': [],
    'North America': [],
    'Europe': [],
    'Asia': [],
    'Oceania': [],
    'Africa': [],
    'Other': []
  };

  const popularTimezones = [
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Asia/Dhaka',
    'Asia/Kolkata',
    'Australia/Sydney'
  ];

  timezones.forEach(tz => {
    const timezoneOption = {
      value: tz.name,
      label: `(GMT${tz.currentTimeOffsetInMinutes >= 0 ? '+' : '-'}${Math.abs(Math.floor(tz.currentTimeOffsetInMinutes / 60)).toString().padStart(2, '0')}:${Math.abs(tz.currentTimeOffsetInMinutes % 60).toString().padStart(2, '0')}) ${tz.name}`
    };

    if (popularTimezones.includes(tz.name)) {
      grouped['Popular'].push(timezoneOption);
    } else if (tz.name.startsWith('America/')) {
      grouped['North America'].push(timezoneOption);
    } else if (tz.name.startsWith('Europe/')) {
      grouped['Europe'].push(timezoneOption);
    } else if (tz.name.startsWith('Asia/')) {
      grouped['Asia'].push(timezoneOption);
    } else if (tz.name.startsWith('Australia/') || tz.name.startsWith('Pacific/')) {
      grouped['Oceania'].push(timezoneOption);
    } else if (tz.name.startsWith('Africa/')) {
      grouped['Africa'].push(timezoneOption);
    } else {
      grouped['Other'].push(timezoneOption);
    }
  });

  return grouped;
};

// Function to get timezone label with current offset
const getTimezoneLabel = (timezone: string): string => {
  try {
    const now = new Date();
    const targetTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const offset = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const sign = offset >= 0 ? '+' : '';
    const hours = Math.abs(Math.floor(offset));
    const minutes = Math.abs(Math.floor((offset % 1) * 60));
    const offsetStr = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return `(GMT${offsetStr}) ${timezone}`;
  } catch (error) {
    return timezone;
  }
};

export function MiniCalendarStep({
  availableDates = generateDummyAvailableDates(),
  availableTimes,
  onSelect,
  selectedDate,
  selectedTime,
  calendarSettings,
  bookingSettings,
  availableSlots,
  isLoadingSlots,
  appointments = []
}: MiniCalendarStepProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  // Ensure practitioner timezone is properly set from calendar settings
  const practitionerTimezone = calendarSettings?.timezone || 'UTC';

  // Use practitioner's calendar settings to generate time slots by day
  // availableSlots contains availability data for the selected date
  const practitionerTimeSlotsByDay = generateTimeSlotsFromCalendarSettings(calendarSettings, availableSlots, selectedDate, selectedTimezone, appointments);

  // Debug: Log practitioner timezone
  console.log('Practitioner timezone from calendar settings:', practitionerTimezone);

  // Debug: Log the generated slots
  console.log('Generated practitionerTimeSlotsByDay:', practitionerTimeSlotsByDay);
  console.log('Available Slots from API:', availableSlots);

  // Generate calendar days for current month only
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Create calendar grid with empty spaces for previous/next month days
    const calendarGrid = allDays.map(day => {
      const isCurrentMonth = isSameMonth(day, currentMonth);
      return isCurrentMonth ? day : null;
    });

    console.log('Calendar Days Debug:', {
      currentMonth: format(currentMonth, 'yyyy-MM'),
      monthStart: format(monthStart, 'yyyy-MM-dd'),
      monthEnd: format(monthEnd, 'yyyy-MM-dd'),
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      totalDays: allDays.length,
      calendarGrid: calendarGrid.map(day => day ? format(day, 'yyyy-MM-dd') : 'null')
    });

    return calendarGrid;
  }, [currentMonth]);

  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
  });

  // Check if a date is available based on calendar settings
  const isDateAvailable = (date: Date): boolean => {
    // Check if the date is not in the past
    const today = new Date();
    const isNotPast = isAfter(date, startOfDay(today)) || isSameDay(date, today);

    if (!calendarSettings) {
      // If no calendar settings, rely on availableDates (if any) and ensure not in past
      return isNotPast && availableDates.some(availableDate =>
        isSameDay(availableDate.date, date) && availableDate.available
      );
    }

    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check if the day is in working days - use calendarSettings
    const isWorkingDay = calendarSettings.workingDays?.includes(dayName) || false;

    // Check if weekend bookings are allowed
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const allowWeekendBookings = calendarSettings.allowWeekendBookings || false;

    // Date is available if it's a working day OR if weekend bookings are allowed
    const isBookableDay = isWorkingDay || (isWeekend && allowWeekendBookings);

    // Combine checks: must be a bookable day and not in the past
    return isBookableDay && isNotPast;
  };

  // Set today as selected date by default when component mounts
  useEffect(() => {
    if (!selectedDate) {
      const today = new Date();
      if (isDateAvailable(today)) {
        onSelect(today, selectedTime || '');
      } else {
        // If today is not available, find the next available date
        let nextDate = addDays(today, 1);
        let attempts = 0;
        while (!isDateAvailable(nextDate) && attempts < 30) { // Look up to 30 days ahead
          nextDate = addDays(nextDate, 1);
          attempts++;
        }
        if (attempts < 30) {
          onSelect(nextDate, selectedTime || '');
        }
      }
    }
  }, [selectedDate, onSelect, selectedTime, isDateAvailable]); // Dependencies

  // Log timezone changes and their effects
  useEffect(() => {
    console.log(`🔄 Timezone Effect - Selected Timezone: ${selectedTimezone}`);
    console.log(`🔄 Timezone Effect - Practitioner Timezone: ${practitionerTimezone}`);
    console.log(`🔄 Timezone Effect - Conversion Needed: ${selectedTimezone !== practitionerTimezone ? 'Yes' : 'No'}`);

    if (selectedDate) {
      console.log(`🔄 Timezone Effect - Recalculating slots for date: ${format(selectedDate, 'yyyy-MM-dd')}`);
      console.log(`🔄 Timezone Effect - Sample conversion test: 09:00 (${practitionerTimezone}) → ${selectedTimezone}`);

      // Test a sample conversion
      try {
        const testConversion = convertTimeToPatientTimezone("09:00", practitionerTimezone, selectedTimezone, selectedDate);
        console.log(`🔄 Timezone Effect - Test conversion result:`, testConversion);
      } catch (error) {
        console.error(`🔄 Timezone Effect - Test conversion failed:`, error);
      }
    }
  }, [selectedTimezone, practitionerTimezone, selectedDate]);

  // Generate week days for the right side based on current week
  const weekDays = useMemo(() => {
    const weekStart = currentWeek;
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 }); // 0 = Sunday

    console.log('Week Days Debug:', {
      currentWeek: format(currentWeek, 'yyyy-MM-dd'),
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd')
    });

    return eachDayOfInterval({
      start: weekStart,
      end: weekEnd
    });
  }, [currentWeek]);

  // Get all unique time strings across the week for consistent rendering
  const allUniqueTimeStrings = useMemo(() => {
    if (!weekDays || !practitionerTimeSlotsByDay) {
      return [];
    }

    const allTimes = new Set<string>();

    weekDays.forEach((day) => {
      const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][day.getDay()];
      const daySlots = practitionerTimeSlotsByDay[dayName] || [];

      // Add ALL time slots to the display (both available and unavailable)
      daySlots.forEach((slot) => {
        allTimes.add(slot.time);
      });
    });

    // If no time slots found, generate some dummy ones for testing
    if (allTimes.size === 0 && calendarSettings) {
      const startHour = parseInt(calendarSettings.defaultStartTime?.split(':')[0]) || 9;
      const endHour = parseInt(calendarSettings.defaultEndTime?.split(':')[0]) || 17;
      const timeInterval = calendarSettings.timeInterval || 60;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += timeInterval) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          allTimes.add(time);
        }
      }
    }

    const result = Array.from(allTimes).sort();
    console.log('allUniqueTimeStrings Debug:', {
      allTimesSize: allTimes.size,
      result,
      weekDays: weekDays?.map(d => format(d, 'EEE yyyy-MM-dd')),
      practitionerTimeSlotsByDayKeys: Object.keys(practitionerTimeSlotsByDay || {}),
      practitionerTimeSlotsByDay: practitionerTimeSlotsByDay
    });
    return result;
  }, [weekDays, practitionerTimeSlotsByDay, calendarSettings]);

  // Debug logging
  console.log('MiniCalendarStep Debug:', {
    availableSlots: availableSlots,
    availableSlotsLength: availableSlots?.length,
    availableSlotsSample: availableSlots?.slice(0, 3),
    selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
    practitionerTimeSlotsByDay: practitionerTimeSlotsByDay,
    allUniqueTimeStrings: allUniqueTimeStrings,
    allUniqueTimeStringsLength: allUniqueTimeStrings?.length,
    bookingSettings: bookingSettings,
    calendarSettings: calendarSettings,
    calendarSettingsWorkingDays: calendarSettings?.workingDays,
    calendarSettingsAllowWeekend: calendarSettings?.allowWeekendBookings,
    isLoadingSlots: isLoadingSlots,
    weekDays: weekDays?.map(day => format(day, 'EEE')),
    weekDaysWithSlots: weekDays?.map(day => {
      const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][day.getDay()];
      const daySlots = practitionerTimeSlotsByDay[dayName] || [];
      const availableSlots = daySlots.filter(s => s.available);
      const isSelectedDay = selectedDate && isSameDay(day, selectedDate);
      const hasAvailabilityData = selectedDate && isSameDay(day, selectedDate);
      return {
        day: format(day, 'EEE'),
        dayName,
        isSelectedDay,
        hasAvailabilityData,
        totalSlots: daySlots.length,
        availableSlotsCount: availableSlots.length,
        allSlots: daySlots.map(s => ({ time: s.time, available: s.available })),
        availableSlots: availableSlots.map(s => s.time)
      };
    })
  });

  // Debug logging for date availability (after function is defined)
  console.log('Date Availability Test:', weekDays?.map(day => ({
    day: format(day, 'EEE'),
    isAvailable: isDateAvailable(day),
    dayOfWeek: day.getDay(),
    dayName: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day.getDay()]
  })));

  // Check if previous month navigation should be disabled
  const isPreviousMonthDisabled = (): boolean => {
    const currentDate = new Date();
    const currentMonthStart = startOfMonth(currentDate);
    const previousMonth = subMonths(currentMonth, 1);
    return isBefore(previousMonth, currentMonthStart);
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (!isPreviousMonthDisabled()) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Check if previous week navigation should be disabled
  const isPreviousWeekDisabled = (): boolean => {
    const today = new Date();
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    return isBefore(currentWeek, todayWeekStart) || isSameDay(currentWeek, todayWeekStart);
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    if (!isPreviousWeekDisabled()) {
      setCurrentWeek(subDays(currentWeek, 7));
    }
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7));
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (isDateAvailable(date)) {
      // Update current week to the week of the selected date
      setCurrentWeek(startOfWeek(date, { weekStartsOn: 0 })); // 0 = Sunday
      onSelect(date, selectedTime || '');
    }
  };

  // Handle time selection
  const handleTimeSelect = (date: Date, time: string) => {
    onSelect(date, time);
  };

  // Handle timezone change
  const handleTimezoneChange = (newTimezone: string) => {
    console.log(`🔄 Timezone changed from ${selectedTimezone} to ${newTimezone}`);
    console.log(`🕐 Current time in new timezone: ${new Date().toLocaleString('en-US', { timeZone: newTimezone })}`);
    console.log(`🕐 Practitioner timezone: ${practitionerTimezone}`);
    console.log(`🔄 Conversion needed: ${newTimezone !== practitionerTimezone ? 'Yes' : 'No'}`);

    setSelectedTimezone(newTimezone);
    // Clear selected time when timezone changes to avoid confusion
    if (selectedTime) {
      onSelect(selectedDate || new Date(), '');
    }
  };

  // Get timezone label
  const getTimezoneLabel = (timezone: string): string => {
    const timezones = getComprehensiveTimezones();
    // Flatten all timezone groups to find the matching timezone
    const allTimezones = Object.values(timezones).flat();
    const timezoneOption = allTimezones.find(tz => tz.value === timezone);
    return timezoneOption ? timezoneOption.label : timezone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Select Date & Time</h2>
        <p className="text-muted-foreground">Choose when you'd like to schedule your appointment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        {/* Left Side - Mini Calendar */}
        <Card className="lg:col-span-1 border-0 shadow-none w-72 mx-auto lg:mx-0">
          <CardContent className="p-3">
            {/* Mini Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousMonth}
                  disabled={isPreviousMonthDisabled()}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextMonth}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mini Calendar Grid */}
            <div className="space-y-2">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <div key={`day-header-${index}`} className="p-1 text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    // Empty space for previous/next month days
                    return (
                      <div key={`empty-${index}`} className="p-2 text-xs">
                        {/* Empty space */}
                      </div>
                    );
                  }

                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isAvailable = isDateAvailable(day);
                  const isTodaySelected = isTodayDate && isSelected;



                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      disabled={!isAvailable}
                      className={`
                        p-2 text-xs transition-all duration-200
                        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                        ${isTodayDate && isAvailable && !isSelected ? 'bg-primary/10 font-semibold' : ''}
                        ${isSelected ? 'bg-[#ffdd00] font-semibold rounded-full' : ''}
                        ${isAvailable && !isSelected ? 'bg-[#ffdd00]/40 hover:bg-[#ffdd00]/60 cursor-pointer rounded-full' : ''}
                        ${!isAvailable ? 'text-muted-foreground/50 cursor-not-allowed' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timezone Selector */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">Your Timezone</div>
              <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger className="w-full text-xs">
                  <Globe className="w-3 h-3 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="p-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Select your timezone:</div>
                  </div>
                  {(() => {
                    const timezones = getComprehensiveTimezones();
                    return Object.entries(timezones).map(([groupName, timezones]) => (
                      <div key={groupName}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                          {groupName}
                        </div>
                        {timezones.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value} className="text-xs">
                            {timezone.label}
                          </SelectItem>
                        ))}
                      </div>
                    ));
                  })()}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground mt-1">
                Times are based on practitioner's timezone. Your timezone affects display only.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side - Week View with Time Slots */}
        <Card className="lg:col-span-3 overflow-hidden border-0 shadow-none w-full mx-auto ms:pr-10">
          <CardContent className="p-0">
            {/* Day Headers with Navigation */}
            <div className="relative p-4">
              {/* Navigation buttons positioned absolutely */}
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                disabled={isPreviousWeekDisabled()}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Day headers container - responsive grid */}
              <div className="grid grid-cols-3 lg:grid-cols-7 px-12">
                {weekDays.map((day, index) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <div key={day.toISOString()} className={`p-3 text-center ${index >= 3 ? 'hidden lg:block' : ''}`}>
                      <div className={`flex flex-col items-center justify-center ${isSelected ? 'bg-[#ffdd00] rounded-full w-16 h-16' : ''}`}>
                        <span className="text-[18px] leading-[18px] text-muted-foreground">
                          {format(day, 'EEE')}
                        </span>
                        <span className={`text-[18px] leading-[18px] font-medium ${isTodayDate ? 'font-bold text-primary' : ''}`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div className="px-12">
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading available times...</span>
                </div>
              ) : !allUniqueTimeStrings || allUniqueTimeStrings.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-muted-foreground">
                    No time slots available for this practitioner. Debug: {JSON.stringify({
                      allUniqueTimeStringsLength: allUniqueTimeStrings?.length,
                      practitionerTimeSlotsByDay: Object.keys(practitionerTimeSlotsByDay || {}),
                      weekDays: weekDays?.map(d => format(d, 'EEE'))
                    })}
                  </span>
                </div>
              ) : selectedDate && isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading availability for {format(selectedDate, 'EEEE, MMMM d')}...
                  </span>
                </div>
              ) : (
                allUniqueTimeStrings.map((timeString) => (
                  <div key={timeString} className="grid grid-cols-3 lg:grid-cols-7 min-h-[40px]">
                    {/* Day columns */}
                    {weekDays.map((day, index) => {
                      const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][day.getDay()];
                      const daySlots = practitionerTimeSlotsByDay[dayName] || [];
                      const slot = daySlots.find(s => s.time === timeString);
                      const isDateBookable = isDateAvailable(day);
                      const isSelected = selectedDate && selectedTime &&
                        isSameDay(day, selectedDate) && selectedTime === timeString;

                      // Check if this day has availability data (only for selected date)
                      const hasAvailabilityData = selectedDate && isSameDay(day, selectedDate);
                      const isSlotAvailable = hasAvailabilityData ? (slot?.available === true) : true;

                      // Additional conflict check using appointments data
                      let hasConflict = false;
                      if (hasAvailabilityData && appointments && appointments.length > 0) {
                        const [hour, minute] = timeString.split(':').map(Number);
                        const slotDateTime = setHours(setMinutes(startOfDay(day), minute), hour);

                        // Check for conflicts with existing appointments
                        hasConflict = appointments.some(apt => {
                          try {
                            if (!apt.appointment_date) return false;

                            const aptDate = new Date(apt.appointment_date);
                            if (!isSameDay(aptDate, day)) return false;

                            const aptTime = aptDate.getHours() * 60 + aptDate.getMinutes();
                            const slotTime = hour * 60 + minute;
                            const aptDuration = apt.duration || 60; // Default 60 minutes

                            // Check if the new slot overlaps with existing appointment
                            const slotEnd = slotTime + 60; // Assuming 60 min slots
                            const aptEnd = aptTime + aptDuration;

                            // Overlap occurs if: slot starts before apt ends AND slot ends after apt starts
                            return slotTime < aptEnd && slotEnd > aptTime;
                          } catch (error) {
                            console.error('Error checking appointment conflict:', error, apt);
                            return false;
                          }
                        });
                      }

                      const isAvailable = isDateBookable && isSlotAvailable && !hasConflict;

                      // Show slot if the day is bookable (working day)
                      const shouldShowSlot = isDateBookable;

                      return (
                        <div key={`${format(day, 'yyyy-MM-dd')}-${timeString}`} className={`p-2 flex items-center justify-center ${index >= 3 ? 'hidden lg:block' : ''}`}>
                          {shouldShowSlot ? (
                            isAvailable ? (
                              <button
                                onClick={() => handleTimeSelect(day, timeString)}
                                className={`w-full py-2 px-3 text-[13px] rounded-md transition-colors border ${isSelected
                                    ? 'bg-[#ffdd00] text-black border-[#ffdd00]/50'
                                    : 'bg-gray-300/30 hover:bg-gray-300/50 border-[#ffdd00]/50'
                                  }`}
                              >
                                <div className="flex flex-col items-center justify-center">
                                  {/* Show converted time (user's timezone) */}
                                  <div className="font-medium text-[13px]">
                                    {(() => {
                                      // Convert time to user's timezone for display
                                      if (selectedTimezone && selectedTimezone !== practitionerTimezone) {
                                        try {
                                          console.log(`🔄 Converting: ${timeString} (${practitionerTimezone}) → ${selectedTimezone} for date: ${format(day, 'yyyy-MM-dd')}`);
                                          const converted = convertTimeToPatientTimezone(timeString, practitionerTimezone, selectedTimezone, day);
                                          console.log(`✅ Conversion result:`, converted);
                                          return converted.displayLabel;
                                        } catch (error) {
                                          console.error('❌ Error converting time for display:', error);
                                        }
                                      }
                                      // Fallback to original time if same timezone or conversion fails
                                      const fallbackTime = format(new Date().setHours(
                                        parseInt(timeString.split(':')[0]),
                                        parseInt(timeString.split(':')[1])
                                      ), 'h:mm a');
                                      console.log(`🔄 Using fallback time: ${fallbackTime} for ${timeString}`);
                                      return fallbackTime;
                                    })()}
                                  </div>
                                </div>
                              </button>
                            ) : (
                              <div
                                className="w-full h-8 flex items-center justify-center text-[13px] text-muted-foreground bg-gray-100 rounded-md border border-gray-200 cursor-not-allowed"
                                title="This time slot is already booked"
                              >
                                —
                              </div>
                            )
                          ) : (
                            <div className="w-full h-8 flex items-center justify-center text-[13px] text-muted-foreground">
                              —
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Appointment Summary */}
      {selectedDate && selectedTime && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Selected Appointment</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, 'EEEE, MMMM d')} at {format(new Date().setHours(
                    parseInt(selectedTime.split(':')[0]),
                    parseInt(selectedTime.split(':')[1])
                  ), 'h:mm a')}
                </p>
                {/* Show practitioner's actual time if different timezone */}
                {selectedTimezone !== practitionerTimezone && (
                  <p className="text-xs text-muted-foreground">
                    Practitioner time: {selectedTime} ({practitionerTimezone})
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Your timezone: {getTimezoneLabel(selectedTimezone)}
                </p>
              </div>
              <Badge variant="secondary">Selected</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
