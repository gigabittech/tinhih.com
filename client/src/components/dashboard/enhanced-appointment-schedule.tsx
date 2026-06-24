import { useState } from "react";
import { Calendar, Clock, User, MapPin, Phone, Mail, MoreHorizontal, CheckCircle, XCircle, AlertCircle, DollarSign } from "lucide-react";
import { ThemedCard, ThemedCardContent, ThemedCardHeader, ThemedCardTitle } from "@/components/ui/themed-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useLocation } from "wouter";

interface EnhancedAppointmentScheduleProps {
  className?: string;
}

interface Appointment {
  id: string;
  title: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  type: string;
  notes?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  practitioner: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export function EnhancedAppointmentSchedule({ className }: EnhancedAppointmentScheduleProps) {
  const [, setLocation] = useLocation();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch today's appointments
  const { data: appointments, isLoading, refetch } = useQuery<Appointment[]>({
    queryKey: ["today-appointments"],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/today-appointments");
      console.log("Today appointments response:", response);
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no-show":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      case "no-show":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatTime = (time: string) => {
    try {
      return format(parseISO(time), "h:mm a");
    } catch {
      return time;
    }
  };

  const formatDate = (date: string) => {
    try {
      const parsedDate = parseISO(date);
      if (isToday(parsedDate)) return "Today";
      if (isTomorrow(parsedDate)) return "Tomorrow";
      return format(parsedDate, "MMM d, yyyy");
    } catch {
      return date;
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: string) => {
    try {
      await api.post(`/api/appointments/${appointmentId}/${action}`);
      refetch();
    } catch (error) {
      console.error(`Failed to ${action} appointment:`, error);
    }
  };

  const upcomingAppointments = appointments?.filter(apt => 
    apt.status === "scheduled" && new Date(apt.appointmentDate) >= new Date()
  ).sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()) || [];

  const completedAppointments = appointments?.filter(apt => 
    apt.status === "completed"
  ).sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()) || [];

  if (isLoading) {
    return (
      <ThemedCard className={className}>
        <ThemedCardHeader>
          <ThemedCardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </ThemedCardTitle>
        </ThemedCardHeader>
        <ThemedCardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </ThemedCardContent>
      </ThemedCard>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upcoming Appointments */}
      <ThemedCard>
        <ThemedCardHeader>
          <ThemedCardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments ({upcomingAppointments.length})
          </ThemedCardTitle>
        </ThemedCardHeader>
        <ThemedCardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming appointments for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {appointment.patient.firstName[0]}{appointment.patient.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">
                        {appointment.patient.firstName} {appointment.patient.lastName}
                      </h4>
                      <Badge variant="secondary" className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {appointment.type}
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/appointments/${appointment.id}`)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAppointmentAction(appointment.id, "complete")}>
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAppointmentAction(appointment.id, "cancel")}>
                        Cancel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/messages?patient=${appointment.patient.id}`)}>
                        Send Message
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              
              {upcomingAppointments.length > 5 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation("/calendar")}
                >
                  View All Appointments
                </Button>
              )}
            </div>
          )}
        </ThemedCardContent>
      </ThemedCard>

      {/* Completed Appointments */}
      {completedAppointments.length > 0 && (
        <ThemedCard>
          <ThemedCardHeader>
            <ThemedCardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completed Today ({completedAppointments.length})
            </ThemedCardTitle>
          </ThemedCardHeader>
          <ThemedCardContent>
            <div className="space-y-3">
              {completedAppointments.slice(0, 3).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {appointment.patient.firstName[0]}{appointment.patient.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm truncate">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(appointment.startTime)} - {appointment.type}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation(`/appointments/${appointment.id}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </ThemedCardContent>
        </ThemedCard>
      )}

      {/* Quick Actions */}
      <ThemedCard>
        <ThemedCardHeader>
          <ThemedCardTitle>Quick Actions</ThemedCardTitle>
        </ThemedCardHeader>
        <ThemedCardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setLocation("/calendar?action=new")}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm">New Appointment</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setLocation("/patients?action=new")}
            >
              <User className="h-5 w-5" />
              <span className="text-sm">Add Patient</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setLocation("/messages")}
            >
              <Mail className="h-5 w-5" />
              <span className="text-sm">Messages</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setLocation("/billing")}
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-sm">Billing</span>
            </Button>
          </div>
        </ThemedCardContent>
      </ThemedCard>
    </div>
  );
}
