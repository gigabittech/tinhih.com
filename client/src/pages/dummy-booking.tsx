import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Mail, Phone, MessageSquare, Check, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MiniCalendarStep } from "@/components/booking/MiniCalendarStep";
import { usePageTitle } from "@/context/page-context";

// Form schemas for each step
const step1Schema = z.object({
    clientType: z.enum(["returning", "new"]),
});

const step2Schema = z.object({
    service: z.string().min(1, "Please select a service"),
});

const step3Schema = z.object({
    date: z.date({ required_error: "Please select a date" }),
    time: z.string().min(1, "Please select a time"),
});

const step4Schema = z.object({
    location: z.enum(["in-person", "telehealth"]),
    address: z.string().optional(),
});

const step5Schema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(1, "Phone number is required"),
    message: z.string().optional(),
});

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
    step4?: z.infer<typeof step4Schema>;
    step5?: z.infer<typeof step5Schema>;
}

export default function DummyBooking() {
    const { setPageInfo } = usePageTitle();
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingData, setBookingData] = useState<BookingData>({});
      const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    setPageInfo("Dummy Booking", "Test booking functionality");
  }, [setPageInfo]);

  // Form for step 5 - moved outside render function to avoid hook rules violation
  const step5Form = useForm({
    resolver: zodResolver(step5Schema),
    defaultValues: bookingData.step5 || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      message: ""
    }
  });

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
        { id: 2, title: "Service", description: "Select your service" },
        { id: 3, title: "Date & Time", description: "Choose appointment time" },
        { id: 4, title: "Location", description: "In-person or telehealth" },
        { id: 5, title: "Contact Info", description: "Your details" }
    ];

    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = (data: any) => {
        setBookingData(prev => ({ ...prev, [`step${currentStep}`]: data }));

        if (currentStep === 5) {
            // Final submission
            console.log("Booking submitted:", { ...bookingData, step5: data });
            alert("Booking submitted successfully!");
        } else {
            handleNext();
        }
    };

    const renderStep1 = () => (
        <div className="max-w-lg mx-auto space-y-6">
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

    const renderStep2 = () => (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-[15px] font-bold">Select a Service</h2>
                <p className="text-[13px] text-muted-foreground">Choose the service that best fits your needs</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {SERVICES.map((service) => (
                    <Card
                        key={service.id}
                        className={`cursor-pointer hover:bg-accent/50 transition-colors ${bookingData.step2?.service === service.id ? 'ring-2 ring-primary' : ''
                            }`}
                        onClick={() => handleSubmit({ service: service.id })}
                    >
                        <CardContent className="p-6">
                            <div className="flex flex-col h-full">
                                <div className="flex-1">
                                    <h3 className="text-[13px] font-medium">{service.name}</h3>
                                    <p className="text-[13px] text-muted-foreground mt-2">{service.description}</p>
                                    <div className="flex items-center space-x-4 mt-4">
                                        <Badge variant="secondary">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {service.duration}
                                        </Badge>
                                        <Badge variant="outline">
                                            {service.price}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="w-full">
            <MiniCalendarStep
                onSelect={(date, time) => {
                    setSelectedDate(date);
                    setSelectedTime(time);
                    handleSubmit({ date, time });
                }}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
            />
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-2">
                <h2 className="text-[15px] font-bold">Choose Location</h2>
                <p className="text-[13px] text-muted-foreground">Select how you'd like to meet with your practitioner</p>
            </div>

            <div className="space-y-4">
                {LOCATIONS.map((location) => (
                    <Card
                        key={location.id}
                        className={`cursor-pointer hover:bg-accent/50 transition-colors ${bookingData.step4?.location === location.id ? 'ring-2 ring-primary' : ''
                            }`}
                        onClick={() => handleSubmit({ location: location.id })}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <location.icon className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-[13px] font-medium">{location.name}</h3>
                                    <p className="text-[13px] text-muted-foreground">{location.description}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderStep5 = () => {
        return (
            <div className="space-y-6 max-w-lg mx-auto">
                <div className="text-center space-y-2">
                    <h2 className="text-[15px] font-bold">Contact Information</h2>
                    <p className="text-[13px] text-muted-foreground">Please provide your details to complete the booking</p>
                </div>

                <Form {...step5Form}>
                    <form onSubmit={step5Form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={step5Form.control}
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
                                control={step5Form.control}
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
                            control={step5Form.control}
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
                            control={step5Form.control}
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
                            control={step5Form.control}
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

                        <div className="flex justify-end pt-4">
                            <Button type="submit" className="w-full md:w-auto">
                                Confirm Booking
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        );
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return null;
        }
    };

      return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
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
                <p className="text-sm text-muted-foreground">Online Booking</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Powered by TiNHiH Portal</span>
            </div>
          </div>
        </div>
      </header>

            {/* Progress Bar */}
            <div className="border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-start">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex border items-center justify-center text-sm font-semibold ${currentStep > step.id ? 'border-none' : 'bg-gray-300'}`}>
                                        {currentStep > step.id ? (
                                            <span>
                                                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="30" height="30" x="0" y="0" viewBox="0 0 2.54 2.54" xmlSpace="preserve" fillRule="evenodd" className=""><g><circle cx="1.27" cy="1.27" r="1.27" fill="#48b02c" opacity="1" data-original="#48b02c"></circle><g fill="#fff"><path d="m.962 1.626.895-.895a.068.068 0 0 1 .096 0l.087.087a.068.068 0 0 1 0 .096l-.896.895a.068.068 0 0 1-.095 0l-.087-.087a.068.068 0 0 1 0-.096z" fill="#ffffff" opacity="1" data-original="#ffffff"></path><path d="m.683 1.08.545.546a.068.068 0 0 1 0 .096l-.086.086a.068.068 0 0 1-.096 0L.5 1.263a.068.068 0 0 1 0-.096l.087-.086a.068.068 0 0 1 .096 0z" fill="#ffffff" opacity="1" data-original="#ffffff"></path></g></g></svg>
                                            </span>
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <div className="text-start">
                                        <p className="text-xs font-medium text-nowrap">{step.title}</p>
                                    </div>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`w-[100px] h-0.5 mx-4 ${currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <main className="flex-1 px-4 py-8 overflow-y-auto">
                <div className="w-full">
                    {renderCurrentStep()}
                </div>
            </main>

            {/* Footer Navigation - Fixed at Bottom */}
            <footer className={`border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
                currentStep === 1 ? 'py-2' : 'py-4'
            }`}>
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between">
                        {/* Left side - Back button (only show for steps > 1) */}
                        <div className="flex-1">
                            {currentStep > 1 && (
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    className="flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </Button>
                            )}
                        </div>
                        
                        {/* Center - Powered by text */}
                        <div className="flex-1 text-center">
                            <p className="text-sm text-muted-foreground">
                                Powered by TiNHiH Portal
                            </p>
                        </div>

                        {/* Right side - Next button (only show for steps > 1) */}
                        <div className="flex-1 flex justify-end">
                            {currentStep > 1 && currentStep < 5 && (
                                <Button
                                    onClick={handleNext}
                                    disabled={
                                        (currentStep === 2 && !bookingData.step2) ||
                                        (currentStep === 3 && !bookingData.step3) ||
                                        (currentStep === 4 && !bookingData.step4)
                                    }
                                    className="flex items-center gap-2"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
