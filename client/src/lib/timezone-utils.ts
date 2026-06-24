import { DateTime } from "luxon";

/**
 * Convert user's local time to UTC for database storage
 * @param date - Selected date (e.g., "2025-08-25")
 * @param time - Selected time in user's timezone (e.g., "14:00")
 * @param userTimezone - User's timezone (e.g., "Asia/Dhaka")
 * @returns UTC ISO string for database storage
 */
export const convertLocalToUTC = (date: string, time: string, userTimezone: string): string => {
  try {
    // Create DateTime in user's timezone
    const localDateTime = DateTime.fromFormat(
      `${date} ${time}`,
      'yyyy-MM-dd HH:mm',
      { zone: userTimezone }
    );
    
    // Convert to UTC
    const utcDateTime = localDateTime.toUTC();
    
    console.log(`🕐 Local to UTC Conversion:`, {
      local: `${date} ${time} (${userTimezone})`,
      utc: utcDateTime.toISO(),
      utcFormatted: utcDateTime.toFormat('yyyy-MM-dd HH:mm')
    });
    
    return utcDateTime.toISO() || '';
  } catch (error) {
    console.error('Error converting local to UTC:', error);
    throw new Error(`Failed to convert ${date} ${time} (${userTimezone}) to UTC`);
  }
};

/**
 * Convert UTC time from database to user's local timezone for display
 * @param utcDateTime - UTC ISO string from database
 * @param userTimezone - User's timezone for display
 * @returns Formatted time in user's timezone
 */
export const convertUTCToLocal = (utcDateTime: string, userTimezone: string): {
  date: string;
  time: string;
  displayTime: string;
  isoString: string;
} => {
  try {
    // Parse UTC datetime
    const utc = DateTime.fromISO(utcDateTime);
    
    // Convert to user's timezone
    const local = utc.setZone(userTimezone);
    
    const result = {
      date: local.toFormat('yyyy-MM-dd'),
      time: local.toFormat('HH:mm'),
      displayTime: local.toFormat('h:mm a'),
      isoString: local.toISO() || ''
    };
    
    console.log(`🕐 UTC to Local Conversion:`, {
      utc: utcDateTime,
      local: result,
      timezone: userTimezone
    });
    
    return result;
  } catch (error) {
    console.error('Error converting UTC to local:', error);
    throw new Error(`Failed to convert UTC ${utcDateTime} to ${userTimezone}`);
  }
};

/**
 * Get current time in a specific timezone
 * @param timezone - Target timezone
 * @returns Current time in the specified timezone
 */
export const getCurrentTimeInTimezone = (timezone: string): {
  date: string;
  time: string;
  displayTime: string;
  isoString: string;
} => {
  const now = DateTime.now().setZone(timezone);
  
  return {
    date: now.toFormat('yyyy-MM-dd'),
    time: now.toFormat('HH:mm'),
    displayTime: now.toFormat('h:mm a'),
    isoString: now.toISO() || ''
  };
};

/**
 * Validate if a timezone is valid
 * @param timezone - Timezone string to validate
 * @returns boolean indicating if timezone is valid
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    DateTime.now().setZone(timezone);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format appointment time for display with timezone conversion
 * @param utcDateTime - UTC datetime from database
 * @param userTimezone - User's timezone
 * @param practitionerTimezone - Practitioner's timezone
 * @returns Formatted display information
 */
export const formatAppointmentTime = (
  utcDateTime: string, 
  userTimezone: string, 
  practitionerTimezone: string
): {
  userTime: string;
  practitionerTime: string;
  utcTime: string;
  displayText: string;
} => {
  const utc = DateTime.fromISO(utcDateTime);
  const userTime = utc.setZone(userTimezone);
  const practitionerTime = utc.setZone(practitionerTimezone);
  
  return {
    userTime: userTime.toFormat('h:mm a'),
    practitionerTime: practitionerTime.toFormat('h:mm a'),
    utcTime: utc.toFormat('HH:mm'),
    displayText: userTimezone === practitionerTimezone 
      ? userTime.toFormat('h:mm a')
      : `${userTime.toFormat('h:mm a')} (${userTimezone})`
  };
};

// Legacy functions for backward compatibility
// These functions maintain the old API while using the new Luxon implementation

/**
 * Converts UTC time to local time in the specified timezone (Legacy function)
 * @param utcTime - UTC time string or Date object
 * @param timezone - Target timezone (e.g., 'America/New_York', 'Asia/Kolkata')
 * @param format - Optional format string (default: 'MMM d, yyyy h:mm a')
 * @returns Formatted local time string
 */
export const convertUTCToLocalLegacy = (
  utcTime: string | Date, 
  timezone: string, 
  format: string = 'MMM d, yyyy h:mm a'
): string => {
  try {
    const utcDate = typeof utcTime === 'string' ? DateTime.fromISO(utcTime) : DateTime.fromJSDate(utcTime);
    const localDate = utcDate.setZone(timezone);
    const localTime = localDate.toFormat(format);
    return localTime;
  } catch (error) {
    console.error(`Error converting UTC to local time for timezone ${timezone}:`, error);
    // Fallback to UTC formatting if conversion fails
    const utcDate = typeof utcTime === 'string' ? DateTime.fromISO(utcTime) : DateTime.fromJSDate(utcTime);
    return utcDate.toFormat(format) + ' UTC';
  }
};

/**
 * Converts UTC time to local time for date only (without time) - Legacy function
 * @param utcTime - UTC time string or Date object
 * @param timezone - Target timezone
 * @returns Formatted local date string
 */
export const convertUTCToLocalDate = (
  utcTime: string | Date, 
  timezone: string
): string => {
  return convertUTCToLocalLegacy(utcTime, timezone, 'EEEE, MMMM dd, yyyy');
};

/**
 * Converts UTC time to local time for time only (without date) - Legacy function
 * @param utcTime - UTC time string or Date object
 * @param timezone - Target timezone
 * @returns Formatted local time string
 */
export const convertUTCToLocalTime = (
  utcTime: string | Date, 
  timezone: string
): string => {
  return convertUTCToLocalLegacy(utcTime, timezone, 'h:mm a');
};

/**
 * Converts UTC time to local time for short date format - Legacy function
 * @param utcTime - UTC time string or Date object
 * @param timezone - Target timezone
 * @returns Formatted local date string
 */
export const convertUTCToLocalShortDate = (
  utcTime: string | Date, 
  timezone: string
): string => {
  return convertUTCToLocalLegacy(utcTime, timezone, 'MMM dd, yyyy');
};

/**
 * Gets the user's timezone preference with fallback to browser default - Legacy function
 * @param userPreferences - User preferences object
 * @returns Timezone string
 */
export const getUserTimezone = (userPreferences?: any): string => {
  return userPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Formats timezone for display in UI
 * @param timezone - Timezone string (e.g., 'America/New_York')
 * @returns Formatted timezone display string
 */
export const formatTimezoneDisplay = (timezone: string): string => {
  try {
    const now = DateTime.now().setZone(timezone);
    const offset = now.toFormat('ZZ');
    const zoneName = timezone.split('/').pop()?.replace('_', ' ') || timezone;
    return `${zoneName} (${offset})`;
  } catch (error) {
    console.error('Error formatting timezone display:', error);
    return timezone;
  }
};
