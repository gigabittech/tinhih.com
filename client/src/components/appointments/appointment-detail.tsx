import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, X, Edit2, Save, XCircle, Trash2, Video, MapPin, Building, Monitor, History, CheckCircle, AlertCircle, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/auth-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { convertUTCToLocalDate, convertUTCToLocalTime, getUserTimezone, formatTimezoneDisplay } from "@/lib/timezone-utils";

const appointmentEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  appointmentDate: z.date({ required_error: "Date is required" }),
  appointmentTime: z.string().min(1, "Time is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  type: z.string().min(1, "Type is required"),
  location: z.enum(["telehealth", "physical"]),
  address: z.string().optional(),
  telehealthType: z.enum(["integrated", "in_app"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "confirmed", "cancelled", "completed"]),
});

type AppointmentEditData = z.infer<typeof appointmentEditSchema>;

interface AppointmentDetailProps {
  appointmentId: string;
  onClose: () => void;
}

const TIME_SLOTS = [
  "06:00", "06:15", "06:30", "06:45",
  "07:00", "07:15", "07:30", "07:45",
  "08:00", "08:15", "08:30", "08:45",
  "09:00", "09:15", "09:30", "09:45",
  "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45",
  "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45",
  "16:00", "16:15", "16:30", "16:45",
  "17:00", "17:15", "17:30", "17:45",
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00", "20:15", "20:30", "20:45",
  "21:00", "21:15", "21:30", "21:45",
];

const APPOINTMENT_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "follow-up", label: "Follow-up" },
  { value: "procedure", label: "Procedure" },
  { value: "check-up", label: "Check-up" },
  { value: "emergency", label: "Emergency" },
];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

export function AppointmentDetail({ appointmentId, onClose }: AppointmentDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  // Fetch user preferences for timezone
  const { data: userPreferences } = useQuery({
    queryKey: ['/api/user-preferences', user?.id],
    queryFn: async () => {
      const response = await apiRequest('/api/user-preferences', 'GET');
      return response.json();
    },
    enabled: !!user,
  });

  // Get user's timezone
  const userTimezone = getUserTimezone(userPreferences);

  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: async () => {
      const response = await apiRequest(`/api/appointments/${appointmentId}`, 'GET');
      if (!response.ok) throw new Error("Failed to fetch appointment");
      const data = await response.json();
      console.log("📋 Appointment detail data:", { appointmentId, data });
      return data;
    },
    enabled: !!appointmentId && !!user,
  });

  const form = useForm<AppointmentEditData>({
    resolver: zodResolver(appointmentEditSchema),
  });

  // Set form values when appointment data loads
  React.useEffect(() => {
    if (appointment) {
      try {
        const appointmentDate = new Date(appointment.appointmentDate);
        const appointmentTime = format(appointmentDate, "HH:mm");
        
        form.reset({
          title: appointment.title || "",
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime,
          duration: appointment.duration || 30,
          type: appointment.type || "consultation",
          location: appointment.location || "physical",
          address: appointment.address || "",
          telehealthType: appointment.telehealthType || "integrated",
          notes: appointment.notes || "",
          status: appointment.status || "scheduled",
        });
      } catch (error) {
        console.error("Error setting form values:", error);
        console.error("Appointment data:", appointment);
      }
    }
  }, [appointment, form]);

  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentEditData) => {
      // Combine date and time
      const [hours, minutes] = data.appointmentTime.split(':');
      const appointmentDateTime = new Date(data.appointmentDate);
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const response = await apiRequest("PUT", `/api/appointments/${appointmentId}`, {
        ...data,
        appointmentDate: appointmentDateTime,
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/appointments/${appointmentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patient/appointments"] });
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete appointment",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (appointment) {
      try {
        const appointmentDate = new Date(appointment.appointmentDate);
        const appointmentTime = format(appointmentDate, "HH:mm");
        
        form.reset({
          title: appointment.title || "",
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime,
          duration: appointment.duration || 30,
          type: appointment.type || "consultation",
          location: appointment.location || "physical",
          address: appointment.address || "",
          telehealthType: appointment.telehealthType || "integrated",
          notes: appointment.notes || "",
          status: appointment.status || "scheduled",
        });
      } catch (error) {
        console.error("Error resetting form values:", error);
        console.error("Appointment data:", appointment);
      }
    }
  };

  const handleSubmit = (data: AppointmentEditData) => {
    updateAppointmentMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      deleteAppointmentMutation.mutate();
    }
  };

  const getStatusInfo = (status: string, appointmentDate: string) => {
    const now = new Date();
    const appointmentDateTime = new Date(appointmentDate);
    const isPast = appointmentDateTime < now;

    // If appointment is in the past, show "Past" status
    if (isPast) {
      return {
        label: "Past",
        icon: "History",
        className: "bg-gray-100 text-gray-800 border-gray-200"
      };
    }

    // For current/future appointments, show actual status
    switch (status) {
      case "scheduled":
        return {
          label: "Scheduled",
          icon: "CalendarDays",
          className: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case "confirmed":
        return {
          label: "Confirmed",
          icon: "CheckCircle",
          className: "bg-green-100 text-green-800 border-green-200"
        };
      case "cancelled":
        return {
          label: "Cancelled",
          icon: "XCircle",
          className: "bg-red-100 text-red-800 border-red-200"
        };
      case "completed":
        return {
          label: "Completed",
          icon: "CheckCircle",
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
      case "in_progress":
        return {
          label: "In Progress",
          icon: "AlertCircle",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200"
        };
      case "no_show":
        return {
          label: "No Show",
          icon: "XCircle",
          className: "bg-orange-100 text-orange-800 border-orange-200"
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1),
          icon: "CalendarDays",
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Loading...</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("📋 Appointment detail error:", error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-red-600">Error Loading Appointment</h2>
        </div>
        <div className="text-red-500">
          Failed to load appointment details. Please try again.
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Appointment not found</h2>
        </div>
        <div className="text-gray-500">
          The appointment you're looking for could not be found.
        </div>
      </div>
    );
  }

  // Add safety check for required appointment properties
  if (!appointment.title || !appointment.appointmentDate) {
    console.error("Invalid appointment data:", appointment);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-red-600">Invalid Appointment Data</h2>
        </div>
        <div className="text-red-500">
          The appointment data is incomplete or invalid.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEditing ? "Edit Appointment" : "Appointment Details"}
        </h2>
        <div className="flex items-center space-x-2">
          {!isEditing && !isPatient && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {!isEditing && isPatient && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={deleteAppointmentMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleteAppointmentMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
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
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            {/* Duration, Type, and Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="15" 
                        step="15" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
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

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="telehealth">
                          <div className="flex items-center space-x-2">
                            <Video className="h-4 w-4" />
                            <span>Telehealth</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="physical">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>Physical Location</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
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
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={updateAppointmentMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateAppointmentMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updateAppointmentMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="space-y-6">
          {/* Appointment Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{appointment.title}</CardTitle>
                {(() => {
                  const statusInfo = getStatusInfo(appointment.status, appointment.appointmentDate);
                  return (
                    <Badge className={`${statusInfo.className} flex items-center gap-1 px-2 py-1 text-xs font-medium border`}>
                      {statusInfo.label}
                    </Badge>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {convertUTCToLocalDate(appointment.appointmentDate, userTimezone)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {convertUTCToLocalTime(appointment.appointmentDate, userTimezone)} 
                    ({appointment.duration} minutes)
                  </span>
                </div>
              </div>
              
              {/* Timezone Display */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Timezone:</span>
                <span className="font-medium text-foreground">
                  {formatTimezoneDisplay(userTimezone)}
                </span>
              </div>
              
              <div className="pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Type:</strong> <span className="capitalize">{appointment.type}</span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Location:</strong> 
                  <div className="flex items-center space-x-2 mt-1">
                    {appointment.location === "telehealth" ? (
                      <>
                        <Video className="h-4 w-4 text-blue-500" />
                        <span className="capitalize text-blue-600">Telehealth (Video Consultation)</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="capitalize text-green-600">Physical Location (In-person)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Address for Physical Location */}
                {appointment.location === "physical" && appointment.address && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Address:</strong>
                    <p className="mt-1">{appointment.address}</p>
                  </div>
                )}

                {/* Telehealth Type */}
                {appointment.location === "telehealth" && appointment.telehealthType && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Platform:</strong>
                    <div className="flex items-center space-x-2 mt-1">
                      {appointment.telehealthType === "integrated" ? (
                        <>
                          <Building className="h-4 w-4 text-purple-500" />
                          <span className="capitalize text-purple-600">Integrated System (External Platform)</span>
                        </>
                      ) : (
                        <>
                          <Monitor className="h-4 w-4 text-orange-500" />
                          <span className="capitalize text-orange-600">In-App Session</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {appointment.notes && (
                  <div className="text-sm text-gray-600">
                    <strong>Notes:</strong>
                    <p className="mt-1">{appointment.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Patient Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {appointment.patient.user.firstName} {appointment.patient.user.lastName}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Practitioner Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Practitioner Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  Dr. {appointment.practitioner.user.firstName} {appointment.practitioner.user.lastName}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}