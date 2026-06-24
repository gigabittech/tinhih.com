import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addMinutes, startOfDay, isBefore, isAfter } from "date-fns";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Mail, Phone, MessageSquare, Check, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { decryptData } from "@/lib/encryption-utils";
import tinhihLogo from "@/assets/tinhih-logo.svg";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MiniCalendarStep } from "@/components/booking/MiniCalendarStep";
import { usePageTitle } from "@/context/page-context";

// Form schemas for each step
const step1Schema = z.object({
  clientType: z.enum(["returning", "new"]),
});

const step2Schema = z.object({
  date: z.date({ required_error: "Please select a date" }),
  time: z.string().min(1, "Please select a time"),
});

const step3Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  message: z.string().optional(),
});

// No step 5 schema needed since we only have 3 steps

// Dummy data
const SERVICES = [
  {
    id: "consultation",
    name: "Initial Consultation",
    duration: "60 min",
    price: "$150",
    description: "Comprehensive health assessment and treatment planning"
  },
  {
    id: "follow-up",
    name: "Follow-up Appointment",
    duration: "30 min",
    price: "$100",
    description: "Progress review and treatment adjustment"
  },
  {
    id: "emergency",
    name: "Emergency Visit",
    duration: "45 min",
    price: "$200",
    description: "Urgent care for immediate health concerns"
  }
];

const LOCATIONS = [
  {
    id: "in-person",
    name: "In-Person Visit",
    description: "Visit our clinic in person",
    icon: MapPin
  },
  {
    id: "telehealth",
    name: "Video Consultation",
    description: "Meet with your practitioner online",
    icon: Clock
  }
];

interface BookingData {
  step1?: z.infer<typeof step1Schema>;
  step2?: z.infer<typeof step2Schema>;
  step3?: z.infer<typeof step3Schema>;
}

interface PublicBookingProps {
  bookingLink: string;
}

export default function PublicBooking({ bookingLink }: PublicBookingProps) {
  const { setPageInfo } = usePageTitle();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    setPageInfo("Public Booking", "Book an appointment with TiNHiH Portal");
  }, [setPageInfo]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
    // Default to user's local timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Timezone conversion function
  const convertTimeToUserTimezone = (timeString: string, practitionerTimezone: string, userTimezone: string, selectedDate: Date) => {
    try {
      // If timezones are the same, no conversion needed
      if (practitionerTimezone === userTimezone) {
        return {
          originalTime: timeString,
          convertedTime: timeString,
          displayLabel: format(new Date().setHours(parseInt(timeString.split(':')[0]), parseInt(timeString.split(':')[1])), 'h:mm a')
        };
      }

      // Create Luxon DateTime in practitioner's timezone
      const practitionerDateTime = DateTime.fromFormat(
        `${DateTime.fromJSDate(selectedDate).toFormat('yyyy-MM-dd')} ${timeString}`,
        'yyyy-MM-dd HH:mm',
        { zone: practitionerTimezone }
      );

      // Convert to user's timezone
      const userDateTime = practitionerDateTime.setZone(userTimezone);

      // Extract time components
      const convertedHours = userDateTime.hour;
      const convertedMinutes = userDateTime.minute;

      // Handle day boundary cases
      let finalHours = convertedHours;
      let finalMinutes = convertedMinutes;

      if (finalHours < 0) {
        finalHours += 24;
      } else if (finalHours >= 24) {
        finalHours -= 24;
      }

      const userTimeString = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

      // Format for display
      const displayLabel = userDateTime.toFormat('h:mm a');

      return {
        originalTime: timeString,
        convertedTime: userTimeString,
        displayLabel: displayLabel
      };
    } catch (error) {
      console.error("Error converting timezone:", error);
      // Fallback: return original time
      return {
        originalTime: timeString,
        convertedTime: timeString,
        displayLabel: format(new Date().setHours(parseInt(timeString.split(':')[0]), parseInt(timeString.split(':')[1])), 'h:mm a')
      };
    }
  };

  // Set page title
  useEffect(() => {
    document.title = "Public Booking | TiNHiH Portal";
  }, []);

  // Fetch comprehensive practitioner data by booking link
  const { data: practitionerData, isLoading: practitionerLoading, error: practitionerError } = useQuery({
    queryKey: ['/api/public/practitioner', bookingLink],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/public/practitioner/${bookingLink}`);
        
        // Check if response is encrypted
        if (response.encrypted && response.data && response.iv) {
          // Decrypt the data
          const decryptedData = decryptData(response.data, response.iv);
          console.log('Decrypted data:', decryptedData);
          return decryptedData;
        }
        
        // If not encrypted, return as is (for backward compatibility)
        return response;
      } catch (error: any) {
        console.error('Error fetching practitioner data:', error);
        throw new Error(error.response?.data?.message || 'Failed to fetch practitioner data');
      }
    },
    enabled: !!bookingLink,
    retry: 1,
  });

  // Extract data from the comprehensive response
  const practitioner = practitionerData?.practitioner;
  const calendarSettings = practitionerData?.calendarSettings;
  const bookingSettings = practitionerData?.bookingSettings;
  const appointments = practitionerData?.appointments || [];

  // Check if public booking is enabled
  const isPublicBookingEnabled = bookingSettings?.isPublicBookingEnabled;

  // Loading state - check if any query is loading
  const isLoading = practitionerLoading;

  // Error state - check if any critical query has error
  const error = practitionerError;

  // Check if public booking is disabled
  if (bookingSettings && !isPublicBookingEnabled) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={tinhihLogo} alt="TiNHiH Logo" className="w-10 h-10"/>
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    TP
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold">TiNHiH Portal</h1>
                  <p className="text-sm text-muted-foreground">Public Booking</p>
      </div>
      </div>
      </div>
        </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Booking Unavailable</h2>
            <p className="text-muted-foreground mb-4">
              Public booking is currently disabled for this practitioner.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the practitioner directly to schedule an appointment.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time,
          label: format(new Date().setHours(hour, minute), 'h:mm a'),
          available: Math.random() > 0.3 // Randomly make some slots unavailable
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Generate calendar days
  const generateCalendarDays = () => {
    const start = startOfWeek(new Date());
    const end = endOfWeek(addDays(new Date(), 14));
    return eachDayOfInterval({ start, end });
  };

  const calendarDays = generateCalendarDays();

  const steps = [
    { id: 1, title: "Client Type", description: "New or returning client" },
    { id: 2, title: "Date & Time", description: "Choose appointment time" },
    { id: 3, title: "Contact Info", description: "Your details" }
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setBookingData({});
    setSelectedDate(null);
    setSelectedTime(null);
    setShowConfirmation(false);
  };

  const handleSubmit = async (data: any) => {
    setBookingData(prev => ({ ...prev, [`step${currentStep}`]: data }));
    
    if (currentStep === 3) {
      // Final submission
      const finalBookingData = {
        ...bookingData,
        step3: data,
        bookingLink: bookingLink,
        practitionerId: practitioner?.id,
        practitionerName: practitioner?.user?.firstName + ' ' + practitioner?.user?.lastName,
        service: "consultation", // Default service
        appointmentDate: selectedDate,
        appointmentTime: selectedTime
      };
      console.log("Booking submitted:", finalBookingData);
      
      // Call API to save booking
      try {
        // Format the date properly to avoid timezone issues
        // Use the date as-is without timezone conversion
        const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
        
        // Get user's timezone for reference
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Create a proper date string that represents the local date and time
        // This ensures the date doesn't shift due to timezone conversion
        const localDateTime = selectedDate && selectedTime ? 
          `${formattedDate}T${selectedTime}:00` : null;
        
        console.log('Submitting booking with:', {
          selectedDate,
          formattedDate,
          selectedTime,
          userTimezone,
          localDateTime,
          originalDate: selectedDate?.toISOString(),
          formattedDateISO: selectedDate ? new Date(formattedDate + 'T' + selectedTime).toISOString() : null,
          expectedDBFormat: selectedDate ? `${formattedDate} ${selectedTime}:00+00` : null
        });
        
        const response = await api.post("/api/public-bookings", {
          bookingLink: bookingLink,
          practitionerId: practitioner?.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          message: data.message,
          service: "consultation",
          appointmentDate: formattedDate,
          appointmentTime: selectedTime,
          notes: data.message
        });

        if (response.success) {
          setShowConfirmation(true);
        } else {
          alert("Failed to submit booking. Please try again.");
        }
      } catch (error) {
        console.error("Error submitting booking:", error);
        alert("Failed to submit booking. Please try again.");
      }
    } else {
      handleNext();
    }
  };

  const renderStep1 = () => (
    <div className="max-w-lg mx-auto space-y-6 px-4 md:px-0">
      <div className="text-center space-y-2">
        <h2 className="text-[15px] font-bold">Are you a new or returning client?</h2>
        <p className="text-[13px] text-muted-foreground">Help us provide the best care for you</p>
      </div>

      <RadioGroup 
        defaultValue={bookingData.step1?.clientType} 
        onValueChange={(value) => handleSubmit({ clientType: value })}
        className="space-y-4"
      >
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <RadioGroupItem value="returning" id="returning" className="sr-only" />
            <Label htmlFor="returning" className="flex items-center space-x-4 cursor-pointer">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-[13px] font-medium">Returning Client</h3>
                <p className="text-[13px] text-muted-foreground">I've been here before</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Label>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <RadioGroupItem value="new" id="new" className="sr-only" />
            <Label htmlFor="new" className="flex items-center space-x-4 cursor-pointer">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-[13px] font-medium">New Client</h3>
                <p className="text-[13px] text-muted-foreground">This is my first visit</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Label>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );

  // Service step commented out - using default consultation service
  // const renderStep2 = () => (
  //   <div className="max-w-lg mx-auto space-y-6">
  //     <div className="text-center space-y-2">
  //       <h2 className="text-[15px] font-bold">Service Information</h2>
  //       <p className="text-[13px] text-muted-foreground">Default consultation service will be provided</p>
  //     </div>
  //     <Card className="ring-2 ring-primary">
  //       <CardContent className="p-6">
  //         <div className="flex flex-col h-full">
  //           <div className="flex-1">
  //             <h3 className="text-[13px] font-medium">Initial Consultation</h3>
  //             <p className="text-[13px] text-muted-foreground mt-2">Comprehensive health assessment and treatment planning</p>
  //             <div className="flex items-center space-x-4 mt-4">
  //               <Badge variant="secondary">
  //                 <Clock className="w-3 h-3 mr-1" />
  //                 60 min
  //               </Badge>
  //               <Badge variant="outline">
  //                 $150
  //               </Badge>
  //             </div>
  //           </div>
  //           <div className="flex justify-end mt-4">
  //             <Button onClick={() => handleSubmit({ service: "consultation" })}>
  //               Continue
  //               <ArrowRight className="w-4 h-4 ml-2" />
  //             </Button>
  //           </div>
  //         </div>
  //       </CardContent>
  //     </Card>
  //   </div>
  // );

  const renderStep2 = () => (
    <div className="w-full">
      <MiniCalendarStep
        onSelect={(date, time) => {
          setSelectedDate(date);
          setSelectedTime(time);
          // Only submit to bookingData when both date and time are selected
          if (date && time) {
            setBookingData(prev => ({ ...prev, step2: { date, time } }));
          }
        }}
        onTimezoneChange={(timezone) => {
          setSelectedTimezone(timezone);
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        selectedTimezone={selectedTimezone}
        calendarSettings={calendarSettings}
        bookingSettings={bookingSettings}
        availableSlots={[]} // Empty array since we're not using separate available slots API
        isLoadingSlots={false}
        appointments={appointments}
      />
     
    </div>
  );

  const renderStep3 = () => {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-[15px] font-bold">Contact Information</h2>
          <p className="text-[13px] text-muted-foreground">Please provide your details to complete the booking</p>
                  </div>

        <Form {...step3Form}>
          <form onSubmit={step3Form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                control={step3Form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                    <FormLabel>First Name *</FormLabel>
                              <FormControl>
                      <Input placeholder="Enter your first name" {...field} />
                              </FormControl>
                    <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                control={step3Form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                              <FormControl>
                      <Input placeholder="Enter your last name" {...field} />
                              </FormControl>
                    <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
              control={step3Form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                  <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
              control={step3Form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                    <Input placeholder="Enter your phone number" {...field} />
                            </FormControl>
                  <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
              control={step3Form.control}
              name="message"
                        render={({ field }) => (
                          <FormItem>
                  <FormLabel>Additional Message</FormLabel>
                            <FormControl>
                              <Textarea
                      placeholder="Any specific concerns or information you'd like to share..."
                      className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                  <FormMessage />
                          </FormItem>
                        )}
                      />
          </form>
        </Form>
                        </div>
    );
  };

  // Step 4 removed - no longer needed

  // Form for step 3 - moved outside render function to avoid hook rules violation
  const step3Form = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: bookingData.step3 || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  const renderStep5 = () => {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-[15px] font-bold">Confirm Your Booking</h2>
          <p className="text-[13px] text-muted-foreground">Please review your booking details before confirming</p>
                        </div>

        <Card className="border-2 border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Service:</span>
                <span className="text-sm">Initial Consultation</span>
                        </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Date:</span>
                <span className="text-sm">{selectedDate ? format(selectedDate, 'PPP') : 'Not selected'}</span>
                      </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Time:</span>
                <span className="text-sm">{selectedTime || 'Not selected'}</span>
                    </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Practitioner:</span>
                <span className="text-sm">{practitioner ? `${practitioner.firstName} ${practitioner.lastName}` : 'Not available'}</span>
              </div>
                        <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{bookingData.step3 ? `${bookingData.step3.firstName} ${bookingData.step3.lastName}` : 'Not provided'}</span>
                        </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm">{bookingData.step3?.email || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Phone:</span>
                <span className="text-sm">{bookingData.step3?.phone || 'Not provided'}</span>
            </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
                        <Button 
            onClick={() => handleSubmit({ confirmed: true })}
            disabled={!selectedDate || !selectedTime || !bookingData.step3}
            className="w-full md:w-auto"
          >
            Confirm Booking
                        </Button>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
  return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
                </div>
          <h2 className="text-2xl font-bold text-green-600">Booking Confirmed!</h2>
          <p className="text-muted-foreground">
            Your appointment has been successfully booked. A confirmation email will be sent to your email address.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-sm font-medium">Booking Details:</p>
            {selectedDate && selectedTime && calendarSettings?.timezone && (
              <>
                {(() => {
                  const timeConversion = convertTimeToUserTimezone(
                    selectedTime,
                    calendarSettings.timezone,
                    selectedTimezone,
                    selectedDate
                  );
                  
                  return (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {timeConversion.displayLabel}
                      </p>
                      {timeConversion.originalTime !== timeConversion.convertedTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          (Practitioner time: {timeConversion.originalTime} {calendarSettings.timezone})
                        </p>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            <p className="text-sm text-muted-foreground">
              with {practitioner?.firstName} {practitioner?.lastName}
            </p>
          </div>
          </div>
        <div className="text-center">
          <Button onClick={handleReset} className="bg-[#ffdd00] text-black hover:bg-[#ffdd00]/90">
            Book Another Appointment
          </Button>
                  </div>
                </div>
    );
  };

  const renderCurrentStep = () => {
    if (showConfirmation) {
      return renderConfirmation();
    }
    
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={tinhihLogo} alt="TiNHiH Logo" className="w-10 h-10" />
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    TP
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold">TiNHiH Portal</h1>
                  <p className="text-sm text-muted-foreground">Public Booking</p>
                  </div>
                </div>
              </div>
                </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading booking page...</p>
              </div>
        </main>
            </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    TP
                  </AvatarFallback>
                </Avatar>
                            <div>
                  <h1 className="text-xl font-semibold">TiNHiH Portal</h1>
                  <p className="text-sm text-muted-foreground">Public Booking</p>
                            </div>
                          </div>
                        </div>
              </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Booking Unavailable</h2>
            <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : 'An error occurred'}</p>
            <p className="text-sm text-muted-foreground">
              The booking link you're looking for doesn't exist or is invalid.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
          {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Desktop/Tablet Header */}
        <div className="hidden md:block">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    TP
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold">TiNHiH Portal</h1>
                  <p className="text-sm text-muted-foreground">
                    {practitioner ? `Booking with ${practitioner.firstName} ${practitioner.lastName}` : 'Public Booking'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Powered by TiNHiH Portal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header - Diagonal Ribbon */}
        <div className="md:hidden block relative h-12">
          {/* Diagonal Ribbon in Top-Right Corner */}
          <div className="absolute top-0 right-0 z-10">
            <div className="text-black transform rotate-45 origin-top-right px-3 py-1 shadow-md" style={{ backgroundColor: '#ffdd00' }}>
              <div className="text-center">
                <p className="text-xs font-medium">Powered by</p>
                <p className="text-xs font-bold">TiNHiH Portal</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {!showConfirmation && (
        <div className="sm:border-b">
          <div className="container mx-auto px-4 py-6">
            {/* Desktop/Tablet Progress Bar */}
            <div className="hidden md:flex items-center justify-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-8 h-8 rounded-full flex border items-center justify-center text-sm font-semibold ${
                        currentStep > step.id 
                          ? 'border-none bg-green-500' 
                          : currentStep === step.id 
                          ? 'border-none' 
                          : 'bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: currentStep === step.id ? '#ffdd00' : undefined
                      }}
                    >
                      {currentStep > step.id ? (
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="30" height="30" x="0" y="0" viewBox="0 0 2.54 2.54" xmlSpace="preserve" fillRule="evenodd" className=""><g><circle cx="1.27" cy="1.27" r="1.27" fill="#48b02c" opacity="1" data-original="#48b02c"></circle><g fill="#fff"><path d="m.962 1.626.895-.895a.068.068 0 0 1 .096 0l.087.087a.068.068 0 0 1 0 .096l-.896.895a.068.068 0 0 1-.095 0l-.087-.087a.068.068 0 0 1 0-.096z" fill="#ffffff" opacity="1" data-original="#ffffff"></path><path d="m.683 1.08.545.546a.068.068 0 0 1 0 .096l-.086.086a.068.068 0 0 1-.096 0L.5 1.263a.068.068 0 0 1 0-.096l.087-.086a.068.068 0 0 1 .096 0z" fill="#ffffff" opacity="1" data-original="#ffffff"></path></g></g></svg>
                        </span>
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="text-start">
                      <p 
                        className={`text-xs font-medium text-nowrap ${
                          currentStep === step.id ? 'font-bold' : ''
                        }`}
                        style={{
                          color: currentStep === step.id ? '#000' : undefined
                        }}
                      >
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-[100px] h-0.5 mx-4 ${currentStep > step.id ? 'bg-[#ffdd00]' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Fixed Height */}
      <main className="flex-1 px-4 py-8 overflow-y-auto">
        <div className="w-full">
          {renderCurrentStep()}
        </div>
      </main>

      {/* Footer Navigation - Fixed at Bottom */}
      {!showConfirmation && (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              {/* Left side - Back button */}
              <div className="flex-1">
                {currentStep > 1 && (
                  <Button 
                    variant="outline"
                    onClick={handleBack}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                )}
              </div>

              {/* Center - Mobile Steps Indicator */}
              {/* <div className="md:hidden flex items-center gap-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div 
                      className={`h-6 rounded-full flex border items-center justify-center text-xs font-semibold ${
                        currentStep > step.id 
                          ? 'border-none bg-green-500' 
                          : currentStep === step.id 
                          ? 'border-none' 
                          : 'bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: currentStep === step.id ? '#ffdd00' : undefined
                      }}
                    >
                      {currentStep > step.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 2.54 2.54" xmlSpace="preserve" fillRule="evenodd" className=""><g><circle cx="1.27" cy="1.27" r="1.27" fill="#48b02c" opacity="1" data-original="#48b02c"></circle><g fill="#fff"><path d="m.962 1.626.895-.895a.068.068 0 0 1 .096 0l.087.087a.068.068 0 0 1 0 .096l-.896.895a.068.068 0 0 1-.095 0l-.087-.087a.068.068 0 0 1 0-.096z" fill="#ffffff" opacity="1" data-original="#ffffff"></path><path d="m.683 1.08.545.546a.068.068 0 0 1 0 .096l-.086.086a.068.068 0 0 1-.096 0L.5 1.263a.068.068 0 0 1 0-.096l.087-.086a.068.068 0 0 1 .096 0z" fill="#ffffff" opacity="1" data-original="#ffffff"></path></g></g></svg>
                      ) : (
                        step.id
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 mx-2 ${currentStep > step.id ? 'bg-[#ffdd00]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div> */}

              {/* Right side - Next button */}
              <div className="flex-1 flex justify-end">
                {currentStep < 3 && (
                  <Button 
                    onClick={handleNext}
                    disabled={
                      (currentStep === 2 && (!selectedDate || !selectedTime))
                    }
                    className="flex items-center gap-2"
                    style={{ backgroundColor: '#ffdd00', color: 'black' }}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                {currentStep === 3 && (
                  <Button 
                    onClick={() => step3Form.handleSubmit(handleSubmit)()}
                    disabled={!step3Form.formState.isValid || !selectedDate || !selectedTime}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: '#ffdd00', color: 'black' }}
                  >
                    Confirm
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
} 