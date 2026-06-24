import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Video, Clock, Smartphone, CheckCircle, Info, Search, User, Stethoscope } from "lucide-react";
import { TeamsIcon, GoogleMeetIcon } from "@/components/ui/platform-icons";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AppointmentWithDetails, InsertTelehealthSession } from "@shared/schema";

const createSessionSchema = z.object({
  appointmentId: z.string().min(1, "Please select an appointment"),
  patientId: z.string().min(1, "Patient ID is required"),
  practitionerId: z.string().min(1, "Practitioner ID is required"),
  platform: z.enum(["zoom", "teams", "google_meet", "webrtc"], {
    required_error: "Please select a platform",
  }),
  sessionNotes: z.string().optional(),
});

type CreateSessionFormData = z.infer<typeof createSessionSchema>;

interface CreateTelehealthSessionFormProps {
  appointments: AppointmentWithDetails[] | undefined;
  onSubmit: (data: InsertTelehealthSession) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CreateTelehealthSessionForm({
  appointments,
  onSubmit,
  onCancel,
  isLoading = false,
}: CreateTelehealthSessionFormProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [showPlatformComparison, setShowPlatformComparison] = useState(false);
  const [appointmentSearchOpen, setAppointmentSearchOpen] = useState(false);
  const [appointmentSearchValue, setAppointmentSearchValue] = useState("");

  const form = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      platform: "webrtc", // Default to TiNHiH Video
      sessionNotes: "",
    },
  });

  const handleAppointmentSelect = (appointmentId: string) => {
    const appointment = Array.isArray(appointments) ? appointments.find(a => a.id === appointmentId) : undefined;
    if (appointment) {
      setSelectedAppointment(appointment);
      form.setValue("appointmentId", appointmentId);
      form.setValue("patientId", appointment.patientId || "");
      form.setValue("practitionerId", appointment.practitionerId || "");
    }
  };

  // Check if selected appointment is in the past
  const isPastAppointment = selectedAppointment ? new Date(selectedAppointment.appointmentDate) < new Date() : false;
  const isCompletedOrCancelled = selectedAppointment ? ['completed', 'cancelled'].includes(selectedAppointment.status || '') : false;
  const canCreateSession = selectedAppointment && !isPastAppointment && !isCompletedOrCancelled;

  const handleSubmit = (data: CreateSessionFormData) => {
    if (!canCreateSession) {
      return; // Prevent submission for invalid appointments
    }
    
    onSubmit({
      ...data,
      status: "scheduled" as const,
    });
  };

  const getPlatformInfo = (platform: string) => {
    switch (platform) {
      case "webrtc":
        return {
          name: "TiNHiH Video",
          icon: <Smartphone className="w-5 h-5" />,
          description: "Built-in video calling - no downloads required",
          features: ["No Downloads", "Instant Join", "Secure", "Free"],
          pros: ["Seamless experience", "No external apps", "Direct integration", "Cost-effective"],
          cons: ["Basic features", "Internet dependent", "Limited recording"],
          recommended: true,
          color: "bg-yellow-500",
          disabled: false,
        };
      case "zoom":
        return {
          name: "Zoom (Coming Soon)",
          icon: <Video className="w-5 h-5" />,
          description: "High-quality video conferencing with advanced features",
          features: ["HD Video", "Screen Share", "Recording", "Waiting Room"],
          pros: ["Reliable", "Advanced features", "Mobile app", "Recording"],
          cons: ["Requires download", "Meeting limits", "Cost for premium"],
          recommended: false,
          color: "dark:bg-gray-800 bg-gray-400",
          disabled: true,
        };
      case "teams":
        return {
          name: "Microsoft Teams (Coming Soon)",
          icon: <TeamsIcon className="w-5 h-5" />,
          description: "Enterprise-grade meetings with collaboration tools",
          features: ["Video & Audio", "Chat", "File Sharing", "Transcription"],
          pros: ["Enterprise features", "Integration", "Security", "Recording"],
          cons: ["Complex setup", "Requires account", "Heavy app"],
          recommended: false,
          color: "dark:bg-gray-800 bg-gray-400",
          disabled: true,
        };
      case "google_meet":
        return {
          name: "Google Meet (Coming Soon)",
          icon: <GoogleMeetIcon className="w-5 h-5" />,
          description: "Simple and secure video meetings",
          features: ["Easy Join", "Mobile Support", "Live Captions", "Recording"],
          pros: ["Easy to use", "Browser-based", "Free tier", "Captions"],
          cons: ["Google account required", "Limited features", "Internet dependent"],
          recommended: false,
          color: "dark:bg-gray-800 bg-gray-400",
          disabled: true,
        };
      default:
        return null;
    }
  };

  const getRecommendedPlatform = () => {
    // Simple recommendation logic - can be enhanced based on user preferences, history, etc.
    return "webrtc"; // Default to in-app for better user experience
  };

  // Show all appointments (no filtering by date or status)
  const availableAppointments = useMemo(() => {
    return Array.isArray(appointments) ? appointments : []; // Ensure it's always an array
  }, [appointments]);

  // Filter appointments based on search
  const filteredAppointments = useMemo(() => {
    if (!appointmentSearchValue) return availableAppointments;
    
    const searchLower = appointmentSearchValue.toLowerCase().trim();
    
    return availableAppointments.filter(apt => {
      // Patient name search
      const patientFirstName = apt.patient?.user?.firstName?.toLowerCase() || '';
      const patientLastName = apt.patient?.user?.lastName?.toLowerCase() || '';
      const patientFullName = `${patientFirstName} ${patientLastName}`.trim();
      
      // Practitioner name search
      const practitionerFirstName = apt.practitioner?.user?.firstName?.toLowerCase() || '';
      const practitionerLastName = apt.practitioner?.user?.lastName?.toLowerCase() || '';
      const practitionerFullName = `${practitionerFirstName} ${practitionerLastName}`.trim();
      
      // Date search
      const appointmentDate = new Date(apt.appointmentDate);
      const dateString = appointmentDate.toLocaleDateString().toLowerCase();
      const timeString = appointmentDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }).toLowerCase();
      
      // Type search
      const appointmentType = apt.type?.toLowerCase() || '';
      
      // Check if search term matches any of these fields
      return (
        patientFirstName.includes(searchLower) ||
        patientLastName.includes(searchLower) ||
        patientFullName.includes(searchLower) ||
        practitionerFirstName.includes(searchLower) ||
        practitionerLastName.includes(searchLower) ||
        practitionerFullName.includes(searchLower) ||
        dateString.includes(searchLower) ||
        timeString.includes(searchLower) ||
        appointmentType.includes(searchLower)
      );
    });
  }, [availableAppointments, appointmentSearchValue]);

  const selectedPlatform = form.watch("platform");
  const platformInfo = getPlatformInfo(selectedPlatform);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
        {/* Appointment Selection */}
        <FormField
          control={form.control}
          name="appointmentId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-base font-semibold mb-2">Select Appointment</FormLabel>
              <Popover open={appointmentSearchOpen} onOpenChange={setAppointmentSearchOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={appointmentSearchOpen}
                      className={cn(
                        "w-full justify-between text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        selectedAppointment ? (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {selectedAppointment.patient?.user?.firstName || 'Unknown'} {selectedAppointment.patient?.user?.lastName || 'Patient'}
                            </span>
                            <span className="text-muted-foreground">
                              • {new Date(selectedAppointment.appointmentDate).toLocaleDateString()} at{" "}
                              {new Date(selectedAppointment.appointmentDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : (
                          "Loading appointment details..."
                        )
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span>Search and select an appointment...</span>
                        </div>
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search appointments by patient, practitioner, date, or type..."
                      value={appointmentSearchValue}
                      onValueChange={setAppointmentSearchValue}
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty className="py-6 text-center">
                        <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No appointments found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your search terms
                        </p>
                      </CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {filteredAppointments.length === 0 ? (
                          <div className="p-4 text-center">
                            <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No appointments available</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {appointmentSearchValue ? 'Try adjusting your search terms' : 'Schedule an appointment first to create a telehealth session'}
                            </p>
                          </div>
                        ) : (
                          filteredAppointments.map((appointment) => (
                            <CommandItem
                              key={appointment.id}
                              value={`${appointment.patient?.user?.firstName || ''} ${appointment.patient?.user?.lastName || ''} ${appointment.practitioner?.user?.firstName || ''} ${appointment.practitioner?.user?.lastName || ''} ${new Date(appointment.appointmentDate).toLocaleDateString()} ${appointment.type || ''}`}
                              onSelect={() => {
                                field.onChange(appointment.id);
                                handleAppointmentSelect(appointment.id);
                                setAppointmentSearchOpen(false);
                                setAppointmentSearchValue("");
                              }}
                              className={`cursor-pointer ${
                                new Date(appointment.appointmentDate) < new Date() || 
                                ['completed', 'cancelled'].includes(appointment.status || '') 
                                  ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3 w-full">
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    new Date(appointment.appointmentDate) < new Date() 
                                      ? 'bg-gray-100 dark:bg-gray-800' 
                                      : 'bg-primary/10'
                                  }`}>
                                    <User className={`h-4 w-4 ${
                                      new Date(appointment.appointmentDate) < new Date() 
                                        ? 'text-gray-400' 
                                        : 'text-primary'
                                    }`} />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium truncate">
                                      {appointment.patient?.user?.firstName || 'Unknown'} {appointment.patient?.user?.lastName || 'Patient'}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {appointment.type || 'consultation'}
                                    </Badge>
                                    <Badge 
                                      variant={appointment.status === 'completed' ? 'secondary' : 
                                              appointment.status === 'cancelled' ? 'destructive' : 
                                              appointment.status === 'in_progress' ? 'default' : 'outline'} 
                                      className="text-xs"
                                    >
                                      {appointment.status || 'scheduled'}
                                    </Badge>
                                    {new Date(appointment.appointmentDate) < new Date() && (
                                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                        Past
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <Stethoscope className="h-3 w-3" />
                                      <span className="truncate">
                                        Dr. {appointment.practitioner?.user?.firstName || 'Unknown'} {appointment.practitioner?.user?.lastName || 'Practitioner'}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {new Date(appointment.appointmentDate).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {new Date(appointment.appointmentDate).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage className="text-red-600"/>
            </FormItem>
          )}
        />

        {/* Selected Appointment Details */}
        {selectedAppointment && (
          <>
            {/* Warning for past appointments */}
            {(isPastAppointment || isCompletedOrCancelled) && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Cannot create telehealth session:</strong>{" "}
                  {isPastAppointment 
                    ? "This appointment is in the past. Telehealth sessions can only be created for current or future appointments." 
                    : "This appointment is already completed or cancelled. Please select an active appointment."}
                </AlertDescription>
              </Alert>
            )}
            
            <Card className={`border-l-4 ${
              isPastAppointment || isCompletedOrCancelled 
                ? 'border-l-red-500/20 opacity-60' 
                : 'border-l-primary/20'
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Appointment Details</span>
                  <Badge 
                    variant={selectedAppointment.status === 'completed' ? 'secondary' : 
                            selectedAppointment.status === 'cancelled' ? 'destructive' : 
                            selectedAppointment.status === 'in_progress' ? 'default' : 'outline'} 
                    className="ml-2"
                  >
                    {selectedAppointment.status || 'scheduled'}
                  </Badge>
                  {isPastAppointment && (
                    <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                      Past Appointment
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Patient</p>
                      <p className="text-sm font-medium">
                        {selectedAppointment.patient?.user?.firstName || 'Unknown'} {selectedAppointment.patient?.user?.lastName || 'Patient'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Practitioner</p>
                      <p className="text-sm font-medium">
                        Dr. {selectedAppointment.practitioner?.user?.firstName || 'Unknown'} {selectedAppointment.practitioner?.user?.lastName || 'Practitioner'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date & Time</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedAppointment.appointmentDate).toLocaleDateString()} at{" "}
                        {new Date(selectedAppointment.appointmentDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</p>
                      <p className="text-sm font-medium">{selectedAppointment.duration || 30} minutes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                      <Badge variant="outline" className="capitalize text-xs border-0 bg-transparent">
                        {selectedAppointment.type || 'consultation'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
                      <Badge variant="outline" className="capitalize">
                        {selectedAppointment.type || 'consultation'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
        )}

        {/* Platform Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base font-semibold">Video Platform</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPlatformComparison(!showPlatformComparison)}
              className="text-sm"
            >
              {showPlatformComparison ? "Hide" : "Compare"} Platforms
            </Button>
          </div>

          {/* Platform Comparison */}
          {showPlatformComparison && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platform Comparison</CardTitle>
                <CardDescription>Choose the best option for your session</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2  gap-4">
                  {["webrtc", "zoom", "teams", "google_meet"].map((platform) => {
                    const info = getPlatformInfo(platform);
                    if (!info) return null;
                    
                    return (
                      <Card 
                        key={platform} 
                        className={`cursor-pointer transition-all  ${
                          selectedPlatform === platform ? 'ring-2 ring-yellow-500' : ''
                        }`}
                        onClick={() => form.setValue("platform", platform as any)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`p-2 rounded-lg ${info.color} dark:text-white`}>
                              {info.icon}
                            </div>
                            <div>
                              <CardTitle className="text-sm">{info.name}</CardTitle>
                              {info.recommended && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-gray-600 mb-3">{info.description}</p>
                          
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">Pros:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {info.pros.slice(0, 2).map((pro, idx) => (
                                  <li key={idx} className="flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                    {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium text-red-600 mb-1">Cons:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {info.cons.slice(0, 2).map((con, idx) => (
                                  <li key={idx} className="flex items-center">
                                    <span className="w-3 h-3 mr-1 text-red-500">•</span>
                                    {con}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Simple Platform Selection */}
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {["webrtc", "zoom", "teams", "google_meet"].map((platform) => {
                    const info = getPlatformInfo(platform);
                    if (!info) return null;
                    
                    return (
                      <div key={platform}>
                        <RadioGroupItem
                          value={platform}
                          id={platform}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={platform}
                          className={`flex flex-col items-start p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-900 peer-checked:border-yellow-500 peer-checked:bg-yellow-50 ${
                            info.recommended ? 'ring-2 ring-yellow-200' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`p-2 rounded-lg ${info.color} text-white`}>
                              {info.icon}
                            </div>
                            <div>
                              <p className="font-medium">{info.name}</p>
                              {info.recommended && (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{info.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {info.features.slice(0, 3).map((feature) => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
                <FormMessage className="text-red-600"/>
              </FormItem>
            )}
          />
        </div>

        {/* Platform-Specific Information */}
        {platformInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${platformInfo.color} text-white`}>
                  {platformInfo.icon}
                </div>
                <span>{platformInfo.name} Session</span>
              </CardTitle>
              <CardDescription>
                {platformInfo.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                                 {/* Platform-specific alerts */}
                 {selectedPlatform === "webrtc" && (
                   <Alert>
                     <Info className="h-4 w-4" />
                     <AlertDescription>
                       <strong>TiNHiH Video:</strong> Our built-in video calling feature is now available! No downloads required. 
                       Patients can join directly from their browser or mobile device. All data stays within the TiNHiH platform for maximum privacy and security.
                     </AlertDescription>
                   </Alert>
                 )}
                
                                 {selectedPlatform === "zoom" && (
                   <Alert>
                     <Video className="h-4 w-4" />
                     <AlertDescription>
                       <strong>Zoom Integration (Coming Soon):</strong> Zoom integration is currently under development. 
                       For now, please use TiNHiH Video for your telehealth sessions.
                     </AlertDescription>
                   </Alert>
                 )}

                                                                   {selectedPlatform === "teams" && (
                    <Alert>
                      <TeamsIcon className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Microsoft Teams Integration (Coming Soon):</strong> Teams integration is currently under development. 
                        For now, please use TiNHiH Video for your telehealth sessions.
                      </AlertDescription>
                    </Alert>
                  )}

                                   {selectedPlatform === "google_meet" && (
                    <Alert>
                      <GoogleMeetIcon className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Google Meet Integration (Coming Soon):</strong> Google Meet integration is currently under development. 
                        For now, please use TiNHiH Video for your telehealth sessions.
                      </AlertDescription>
                    </Alert>
                  )}

                {/* Features list */}
                <div>
                  <p className="text-sm font-medium mb-2">Available Features:</p>
                  <div className="flex flex-wrap gap-2">
                    {platformInfo.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Notes */}
        <FormField
          control={form.control}
          name="sessionNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Add any preparation notes, special instructions, or requirements for this telehealth session..."
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage className="text-red-600"/>
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className={`w-full sm:w-auto ${
              canCreateSession 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={isLoading || !canCreateSession}
          >
            {isLoading ? "Creating..." : 
             !canCreateSession ? "Cannot Create Session" : "Schedule Session"}
          </Button>
        </div>
      </form>
    </Form>
  );
}