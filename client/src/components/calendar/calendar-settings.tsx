import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Clock, CalendarDays, AlertCircle } from "lucide-react";
import { getTimeZones } from "@vvo/tzdb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const calendarSettingsSchema = z.object({
  timeInterval: z.number().min(15).max(120),
  bufferTime: z.number().min(0).max(60),
  defaultStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  defaultEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  workingDays: z.array(z.number().min(0).max(6)),
  timezone: z.string().min(1, "Timezone is required"),
  isGlobal: z.boolean().optional(),
});

type CalendarSettingsData = z.infer<typeof calendarSettingsSchema>;

// API data type for sending to server (workingDays as strings)
type CalendarSettingsAPIData = Omit<CalendarSettingsData, 'workingDays'> & {
  workingDays: string[];
};

interface CalendarSettingsProps {
  onClose?: () => void;
}

const TIME_INTERVALS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
];

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

// Function to get timezone label with current offset using @vvo/tzdb
const getTimezoneLabel = (timezone: string): string => {
  try {
    const now = new Date();
    
    // Use @vvo/tzdb to get accurate timezone information
    const timezones = getTimeZones();
    const tzInfo = timezones.find(tz => tz.name === timezone);
    
    if (tzInfo) {
      // Get current offset in minutes
      const offsetMinutes = tzInfo.currentTimeOffsetInMinutes;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const hours = Math.abs(Math.floor(offsetMinutes / 60));
      const minutes = Math.abs(offsetMinutes % 60);
      const offsetStr = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      return `(GMT${offsetStr}) ${timezone}`;
    }
    
    // Fallback calculation if tzInfo not found
    const targetTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    
    const diffMs = targetTime.getTime() - utcTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const sign = diffHours >= 0 ? '+' : '-';
    const hours = Math.abs(Math.floor(diffHours));
    const minutes = Math.abs(Math.floor((diffHours % 1) * 60));
    const offsetStr = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return `(GMT${offsetStr}) ${timezone}`;
  } catch (error) {
    // Fallback to known timezone offsets for common timezones
    const knownOffsets: { [key: string]: string } = {
      'Asia/Dhaka': '(GMT+06:00)',
      'Asia/Kolkata': '(GMT+05:30)',
      'Asia/Tokyo': '(GMT+09:00)',
      'Asia/Shanghai': '(GMT+08:00)',
      'Asia/Singapore': '(GMT+08:00)',
      'Asia/Bangkok': '(GMT+07:00)',
      'Asia/Manila': '(GMT+08:00)',
      'Asia/Jakarta': '(GMT+07:00)',
      'Asia/Kuala_Lumpur': '(GMT+08:00)',
      'Asia/Ho_Chi_Minh': '(GMT+07:00)',
      'Asia/Dubai': '(GMT+04:00)',
      'Asia/Riyadh': '(GMT+03:00)',
      'Asia/Tehran': '(GMT+03:30)',
      'Asia/Karachi': '(GMT+05:00)',
      'America/New_York': '(GMT-05:00)',
      'America/Chicago': '(GMT-06:00)',
      'America/Denver': '(GMT-07:00)',
      'America/Los_Angeles': '(GMT-08:00)',
      'Europe/London': '(GMT+00:00)',
      'Europe/Paris': '(GMT+01:00)',
      'Europe/Berlin': '(GMT+01:00)',
      'Europe/Rome': '(GMT+01:00)',
      'Europe/Madrid': '(GMT+01:00)',
      'Europe/Moscow': '(GMT+03:00)',
      'Australia/Sydney': '(GMT+10:00)',
      'Australia/Melbourne': '(GMT+10:00)',
      'Australia/Perth': '(GMT+08:00)',
      'Pacific/Auckland': '(GMT+12:00)',
      'UTC': '(GMT+00:00)'
    };
    
    return `${knownOffsets[timezone] || ''} ${timezone}`;
  }
};

// Get comprehensive timezone list from @vvo/tzdb package and organize by region
const getOrganizedTimezones = () => {
  const allTimezones = getTimeZones();
  
  // Group timezones by region
  const grouped: { [key: string]: Array<{ value: string; label: string }> } = {
    'Popular': [],
    'North America': [],
    'South America': [],
    'Europe': [],
    'Asia': [],
    'Oceania': [],
    'Africa': [],
    'Other': []
  };
  
  // Popular timezones to show first
  const popularTimezones = [
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Asia/Dhaka',
    'Asia/Kolkata',
    'Australia/Sydney'
  ];
  
  allTimezones.forEach(tz => {
    const timezoneOption = {
      value: tz.name,
      label: `${getTimezoneLabel(tz.name)}`
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

const TIMEZONE_GROUPS = getOrganizedTimezones();

export function CalendarSettings({ onClose }: CalendarSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/calendar-settings", "practitioner-specific"],
    queryFn: async () => {
      const response = await api.get("/api/calendar-settings");
      return response;
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const form = useForm<CalendarSettingsData>({
    resolver: zodResolver(calendarSettingsSchema),
    defaultValues: {
      timeInterval: 60,
      bufferTime: 15,
      defaultStartTime: "09:00",
      defaultEndTime: "17:00",
      workingDays: [1, 2, 3, 4, 5],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Default to user's timezone
      isGlobal: false,
    },
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      // Convert working days from strings or numbers to numbers for form compatibility
      const workingDaysNumbers = settings.workingDays?.map((day: string | number) => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        // Handle both string and number types
        if (typeof day === 'string') {
          return dayNames.indexOf(day.toLowerCase());
        } else if (typeof day === 'number') {
          // If it's already a number, validate it's in range
          return day >= 0 && day <= 6 ? day : -1;
        }
        return -1;
      }).filter((day: number) => day !== -1) || [1, 2, 3, 4, 5];

      form.reset({
        timeInterval: settings.timeInterval || 60,
        bufferTime: settings.bufferTime || 0,
        defaultStartTime: settings.defaultStartTime || "09:00",
        defaultEndTime: settings.defaultEndTime || "17:00",
        workingDays: workingDaysNumbers,
        timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        isGlobal: settings.isGlobal || false,
      });
    }
  }, [settings, form]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CalendarSettingsAPIData) => {
      console.log("Saving calendar settings:", data);
      console.log("Current settings ID:", settings?.id);
      
      if (settings?.id) {
        console.log("Updating existing settings with ID:", settings.id);
        return await api.put(`/api/calendar-settings/${settings.id}`, data);
      } else {
        console.log("Creating new settings");
        return await api.post("/api/calendar-settings", data);
      }
    },
    onSuccess: () => {
      // CRITICAL: Force immediate calendar refresh
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-settings", "practitioner-specific"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      // Force refetch to ensure data is fresh
      queryClient.refetchQueries({ queryKey: ["/api/calendar-settings", "practitioner-specific"] });
      
      // Close the sheet first
      onClose?.();
      
      // Show success message after a brief delay to ensure sheet closes smoothly
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Calendar settings saved successfully",
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("Save settings error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save calendar settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CalendarSettingsData) => {
    console.log("Form submitted with data:", data);
    console.log("Selected timezone:", data.timezone);
    
    // Validate that end time is after start time
    const [startHour, startMin] = data.defaultStartTime.split(':').map(Number);
    const [endHour, endMin] = data.defaultEndTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    console.log("Time validation:", { startMinutes, endMinutes, isValid: endMinutes > startMinutes });
    
    if (endMinutes <= startMinutes) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    // Convert working days from numbers to strings for database compatibility
    const processedData: CalendarSettingsAPIData = {
      ...data,
      workingDays: data.workingDays.map(day => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return dayNames[day];
      })
    };

    console.log("Processed data for API:", processedData);
    console.log("Calling saveSettingsMutation.mutate");
    saveSettingsMutation.mutate(processedData);
  };

  const generateTimeSlots = (startTime: string, endTime: string, interval: number, bufferTime: number = 0) => {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      // Add buffer time between appointments
      currentMinutes += interval + bufferTime;
    }
    
    return slots;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Calendar Settings</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const currentValues = form.watch();
  const previewSlots = generateTimeSlots(
    currentValues.defaultStartTime,
    currentValues.defaultEndTime,
    currentValues.timeInterval,
    currentValues.bufferTime || 0
  );

  return (
    <div className="max-w-2xl mx-auto  space-y-8">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar Settings</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure your working hours, time slots, and availability preferences for <span className="font-semibold text-primary-foreground">Public Booking Page</span>
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Time Interval Settings */}
          <div className="space-y-8 max-h-[550px] overflow-y-auto"> 
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span className="font-semibold">Time Interval</span>
                  <p className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                    Configure appointment duration and buffer times
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="timeInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Appointment Duration</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(Number(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_INTERVALS.map((interval) => (
                          <SelectItem key={interval.value} value={interval.value.toString()}>
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This determines how time slots are generated in the calendar
                    </FormDescription>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bufferTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer Time (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="60" 
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Prevent appointments from being booked within this time before the slot
                    </FormDescription>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-lg">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <span className="font-semibold">Working Hours</span>
                  <p className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                    Set your daily schedule and working days
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        <div className="p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Select your timezone:</div>
                        </div>
                        {Object.entries(TIMEZONE_GROUPS).map(([groupName, timezones]) => (
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
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This timezone will be used for your working hours and time slot generation
                    </FormDescription>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <strong>Recommendation:</strong> We highly recommend keeping the same timezone in your user settings and calendar settings to avoid confusion. This ensures consistent time display across the platform.
                        </div>
                      </div>
                    </div>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Working Days</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <FormField
                      key={day.value}
                      control={form.control}
                      name="workingDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <Switch
                                checked={field.value?.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, day.value]);
                                  } else {
                                    field.onChange(current.filter(d => d !== day.value));
                                  }
                                }}
                              />
                              <Label className="text-sm font-medium cursor-pointer">{day.label}</Label>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-lg">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <span className="font-semibold">Time Slots Preview</span>
                  <p className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                    Preview of available time slots based on your settings
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available time slots ({previewSlots.length} total) in {getTimezoneLabel(currentValues.timezone || 'UTC')}:
                  </p>
                  {currentValues.bufferTime > 0 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                      +{currentValues.bufferTime}min buffer
                    </span>
                  )}
                </div>
                                 <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {previewSlots.slice(0, 24).map((slot, index) => (
                    <span key={index} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-2 rounded-lg font-medium text-center">
                      {slot}
                    </span>
                  ))}
                  {previewSlots.length > 24 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 text-center">
                      +{previewSlots.length - 24} more
                    </span>
                  )}
                </div>
                {currentValues.bufferTime > 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 italic">
                    Buffer time of {currentValues.bufferTime} minutes is added between each appointment slot
                  </p>
                )}
                
                {/* Timezone Preview */}
                {currentValues.timezone && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Timezone Preview (Your times in different regions):
                    </p>
                    <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                      <div><strong>Your Timezone:</strong> {getTimezoneLabel(currentValues.timezone)}</div>
                      <div><strong>Start Time:</strong> {currentValues.defaultStartTime} in your timezone</div>
                      <div><strong>End Time:</strong> {currentValues.defaultEndTime} in your timezone</div>
                      <div className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                        <strong>Example conversions:</strong>
                      </div>
                      <div>• New York: {new Date(`2025-01-01T${currentValues.defaultStartTime}:00`).toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} - {new Date(`2025-01-01T${currentValues.defaultEndTime}:00`).toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })}</div>
                      <div>• London: {new Date(`2025-01-01T${currentValues.defaultStartTime}:00`).toLocaleString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' })} - {new Date(`2025-01-01T${currentValues.defaultEndTime}:00`).toLocaleString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' })}</div>
                      <div>• Tokyo: {new Date(`2025-01-01T${currentValues.defaultStartTime}:00`).toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })} - {new Date(`2025-01-01T${currentValues.defaultEndTime}:00`).toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )}
                
                {/* Debug Info */}
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                    Debug Info (Current Form Values):
                  </p>
                  <div className="space-y-1 text-xs text-yellow-700 dark:text-yellow-400">
                    <div><strong>Timezone:</strong> {currentValues.timezone || 'Not set'}</div>
                    <div><strong>Start Time:</strong> {currentValues.defaultStartTime || 'Not set'}</div>
                    <div><strong>End Time:</strong> {currentValues.defaultEndTime || 'Not set'}</div>
                    <div><strong>Interval:</strong> {currentValues.timeInterval || 'Not set'} minutes</div>
                    <div><strong>Buffer:</strong> {currentValues.bufferTime || 'Not set'} minutes</div>
                    <div><strong>Working Days:</strong> {currentValues.workingDays?.join(', ') || 'Not set'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveSettingsMutation.isPending}
              className="px-6 py-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
            >
              {saveSettingsMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}