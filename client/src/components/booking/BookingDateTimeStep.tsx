import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, addDays, isBefore } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Clock, Globe } from "lucide-react";

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
}

interface BookingDateTimeStepProps {
  availableDates?: AvailableDate[];
  availableTimes?: AvailableTime[];
  onSelect: (date: Date, time: string) => void;
  selectedDate?: Date | null;
  selectedTime?: string | null;
}

// Dummy data for demonstration
const generateDummyAvailableDates = (): AvailableDate[] => {
  const dates: AvailableDate[] = [];
  const start = startOfMonth(new Date());
  const end = endOfMonth(addMonths(new Date(), 1));
  
  eachDayOfInterval({ start, end }).forEach(date => {
    // Make weekends unavailable
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Make some random dates unavailable
    const isRandomlyUnavailable = Math.random() < 0.2;
    
    dates.push({
      date,
      available: !isWeekend && !isRandomlyUnavailable && !isBefore(date, new Date())
    });
  });
  
  return dates;
};

const generateDummyAvailableTimes = (): AvailableTime[] => {
  const times: AvailableTime[] = [];
  
  // Generate time slots from 9 AM to 5 PM in 30-minute intervals
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      
      times.push({
        time,
        label: format(date, 'h:mm a'),
        available: Math.random() > 0.3 // Randomly make some slots unavailable
      });
    }
  }
  
  return times;
};

// Timezone options
const TIMEZONES = [
  { value: "America/New_York", label: "(GMT-05:00) America/New_York" },
  { value: "America/Chicago", label: "(GMT-06:00) America/Chicago" },
  { value: "America/Denver", label: "(GMT-07:00) America/Denver" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) America/Los_Angeles" },
  { value: "Europe/London", label: "(GMT+00:00) Europe/London" },
  { value: "Europe/Paris", label: "(GMT+01:00) Europe/Paris" },
  { value: "Asia/Tokyo", label: "(GMT+09:00) Asia/Tokyo" },
  { value: "Asia/Dhaka", label: "(GMT+06:00) Asia/Dhaka" },
];

export function BookingDateTimeStep({
  availableDates = generateDummyAvailableDates(),
  availableTimes = generateDummyAvailableTimes(),
  onSelect,
  selectedDate,
  selectedTime
}: BookingDateTimeStepProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    // Default to browser timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    return availableDates.some(availableDate => 
      isSameDay(availableDate.date, date) && availableDate.available
    );
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (isDateAvailable(date)) {
      onSelect(date, selectedTime || '');
    }
  };

  // Handle date and time selection together
  const handleDateTimeSelect = (date: Date, time: string) => {
    if (isDateAvailable(date)) {
      onSelect(date, time);
    }
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    if (selectedDate) {
      onSelect(selectedDate, time);
    }
  };

  // Get timezone label
  const getTimezoneLabel = (timezone: string): string => {
    const timezoneOption = TIMEZONES.find(tz => tz.value === timezone);
    return timezoneOption ? timezoneOption.label : timezone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Select Date & Time</h2>
        <p className="text-muted-foreground">Choose when you'd like to schedule your appointment</p>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Timezone Selector */}
        <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
          <SelectTrigger className="w-auto">
            <Globe className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((timezone) => (
              <SelectItem key={timezone.value} value={timezone.value}>
                {timezone.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Week View Grid - Full Width */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Week Header */}
          <div className="grid grid-cols-8 border-b">
            {/* Empty corner */}
            <div className="p-3 bg-muted/20"></div>
            {/* Day headers */}
            {["Sun 24", "Mon 25", "Tue 26", "Wed 27", "Thu 28", "Fri 29", "Sat 30"].map((day) => {
              const dayDate = new Date(2025, 7, parseInt(day.split(' ')[1]));
              const isSelected = selectedDate && isSameDay(dayDate, selectedDate);
              
              return (
                <div key={day} className={`p-3 text-center text-sm font-medium border-l ${
                  isSelected ? 'bg-primary/10' : ''
                }`}>
                  {day}
                </div>
              );
            })}
          </div>

          {/* Time slots grid */}
          <div className="max-h-96 overflow-y-auto">
            {availableTimes.map((slot) => (
              <div key={slot.time} className="grid grid-cols-8 border-b last:border-b-0">
                {/* Time label */}
                <div className="p-3 text-sm text-muted-foreground border-r flex items-center justify-center">
                  {slot.label}
                </div>
                
                {/* Day columns */}
                {["Sun 24", "Mon 25", "Tue 26", "Wed 27", "Thu 28", "Fri 29", "Sat 30"].map((day) => {
                  const dayDate = new Date(2025, 7, parseInt(day.split(' ')[1]));
                  const isWeekend = day.includes("Sun") || day.includes("Sat");
                  const isAvailable = slot.available && !isWeekend;
                  const isSelected = selectedDate && selectedTime && 
                    isSameDay(dayDate, selectedDate) && selectedTime === slot.time;
                  
                  return (
                    <div key={day} className={`p-2 border-l flex items-center justify-center ${
                      selectedDate && isSameDay(dayDate, selectedDate) ? 'bg-primary/5' : ''
                    }`}>
                      {isAvailable ? (
                        <button
                          onClick={() => {
                            handleDateTimeSelect(dayDate, slot.time);
                          }}
                          className={`w-full py-2 px-3 text-sm rounded-md transition-colors ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted hover:bg-accent'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ) : (
                        <div className="w-full h-8 flex items-center justify-center">
                          <div className="w-8 h-0.5 bg-muted"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                <p className="text-xs text-muted-foreground mt-1">
                  Timezone: {getTimezoneLabel(selectedTimezone)}
                </p>
              </div>
              <Badge variant="secondary">Selected</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-muted rounded-full"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-muted/30 rounded-full"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}
