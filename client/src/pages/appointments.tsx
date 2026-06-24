import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, User, Search, Plus, Video, MapPin, CheckCircle, XCircle, AlertCircle, CalendarDays, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/context/page-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AppointmentDetail } from "@/components/appointments/appointment-detail";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { useAuth } from "@/context/auth-context";
import { convertUTCToLocalDate, convertUTCToLocalTime, convertUTCToLocalShortDate, getUserTimezone, formatTimezoneDisplay } from "@/lib/timezone-utils";
import { apiRequest } from "@/lib/queryClient";

interface Appointment {
  id: string;
  title: string;
  appointmentDate: string;
  duration: number;
  type: string;
  location: string;
  status: string;
  notes?: string;
  patient: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  practitioner: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function Appointments() {
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
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

  useEffect(() => {
    if (isPatient) {
      setPageInfo("My Appointments", "View and manage your appointments");
    } else {
      setPageInfo("Appointments", "View and manage all appointments");
    }
  }, [setPageInfo, isPatient]);

  // Determine the correct API endpoint based on user role
  const getAppointmentsQueryKey = () => {
    if (user?.role === 'patient') {
      return ["/api/appointments"]; // Patients use the main endpoint which filters by their ID
    } else if (user?.role === 'practitioner') {
      return ["/api/appointments"]; // Practitioners use the main endpoint which filters by their ID
    } else if (user?.role === 'admin' || user?.role === 'staff') {
      return ["/api/appointments"]; // Admin/Staff use the main endpoint which shows all appointments
    }
    return ["/api/appointments"];
  };

  const { data: appointmentsResponse, isLoading } = useQuery({
    queryKey: getAppointmentsQueryKey(),
    queryFn: async () => {
      const response = await apiRequest('/api/appointments', 'GET');
      return response.json();
    },
    enabled: !!user,
  });

  // Extract appointments from the response (API returns { appointments: [], events: [] })
  const appointmentsData = appointmentsResponse?.appointments || [];
  
  // Ensure appointments is always an array
  const appointments = Array.isArray(appointmentsData) ? appointmentsData : [];
  
  // Debug: Log appointments data
  console.log("📋 Appointments data:", {
    userRole: user?.role,
    appointmentsResponse,
    appointmentsData,
    isArray: Array.isArray(appointmentsData),
    appointments,
    length: appointments.length
  });

  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    const searchLower = searchTerm.toLowerCase();
    if (isPatient) {
      // For patients, only search by appointment title and practitioner name
      return (
        appointment.title.toLowerCase().includes(searchLower) ||
        appointment.practitioner.user.firstName.toLowerCase().includes(searchLower) ||
        appointment.practitioner.user.lastName.toLowerCase().includes(searchLower)
      );
    } else {
      // For staff/admin/practitioner, search by all fields
      return (
        appointment.title.toLowerCase().includes(searchLower) ||
        (appointment.patient?.user?.firstName?.toLowerCase().includes(searchLower) || false) ||
        (appointment.patient?.user?.lastName?.toLowerCase().includes(searchLower) || false) ||
        appointment.practitioner.user.firstName.toLowerCase().includes(searchLower) ||
        appointment.practitioner.user.lastName.toLowerCase().includes(searchLower)
      );
    }
  });

  const getStatusInfo = (status: string, appointmentDate: string) => {
    const now = new Date();
    const appointmentDateTime = new Date(appointmentDate);
    const isPast = appointmentDateTime < now;

    // If appointment is in the past, show "Past" status
    if (isPast) {
      return {
        label: "Past",
        icon: History,
        className: "bg-gray-100 text-gray-800 border-gray-200"
      };
    }

    // For current/future appointments, show actual status
    switch (status) {
      case "scheduled":
        return {
          label: "Scheduled",
          icon: CalendarDays,
          className: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case "confirmed":
        return {
          label: "Confirmed",
          icon: CheckCircle,
          className: "bg-green-100 text-green-800 border-green-200"
        };
      case "cancelled":
        return {
          label: "Cancelled",
          icon: XCircle,
          className: "bg-red-100 text-red-800 border-red-200"
        };
      case "completed":
        return {
          label: "Completed",
          icon: CheckCircle,
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
      case "in_progress":
        return {
          label: "In Progress",
          icon: AlertCircle,
          className: "bg-yellow-100 text-yellow-800 border-yellow-200"
        };
      case "no_show":
        return {
          label: "No Show",
          icon: XCircle,
          className: "bg-orange-100 text-orange-800 border-orange-200"
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1),
          icon: CalendarDays,
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const handleCreateNew = () => {
    setLocation("/calendar");
  };

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
  };

  const handleCloseDetail = () => {
    setSelectedAppointmentId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header 
          title={isPatient ? "My Appointments" : "Appointments"} 
          subtitle={isPatient ? "View and manage your appointments" : "View and manage appointments"} 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title={isPatient ? "My Appointments" : "Appointments"} 
        subtitle={isPatient ? "View and manage your appointments" : "View and manage appointments"}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Timezone Display */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Timezone:</span>
            <span className="font-medium text-foreground">
              {formatTimezoneDisplay(userTimezone)}
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={isPatient ? "Search your appointments..." : "Search appointments..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button onClick={handleCreateNew} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>{isPatient ? "Book Appointment" : "New Appointment"}</span>
          </Button>
        </div>


        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No appointments found" : "No appointments scheduled"}
              </h3>
              <p className="text-gray-500 text-center mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : isPatient 
                    ? "You don't have any appointments scheduled yet"
                    : "Start scheduling appointments with your patients"
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateNew} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>{isPatient ? "Book First Appointment" : "Schedule First Appointment"}</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment: Appointment) => (
              <Card 
                key={appointment.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleAppointmentClick(appointment.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{appointment.title}</CardTitle>
                    {(() => {
                      const statusInfo = getStatusInfo(appointment.status, appointment.appointmentDate);
                      const StatusIcon = statusInfo.icon;
                      return (
                        <Badge className={`${statusInfo.className} flex items-center gap-1 px-2 py-1 text-xs font-medium border`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`grid gap-4 ${isPatient ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {convertUTCToLocalShortDate(appointment.appointmentDate, userTimezone)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {convertUTCToLocalTime(appointment.appointmentDate, userTimezone)} 
                        ({appointment.duration}min)
                      </span>
                    </div>
                    
                    {!isPatient && appointment.patient?.user && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {appointment.patient.user.firstName} {appointment.patient.user.lastName}
                        </span>
                      </div>
                    )}
                    
                    {!isPatient && !appointment.patient?.user && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-400">
                          Guest Patient
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">
                        Dr. {appointment.practitioner.user.firstName} {appointment.practitioner.user.lastName}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {appointment.type}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      {appointment.location === "telehealth" ? (
                        <>
                          <Video className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-blue-600">Telehealth</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600">Physical</span>
                        </>
                      )}
                    </div>
                    
                    {appointment.notes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Appointment Detail Sheet */}
        <Sheet open={!!selectedAppointmentId} onOpenChange={() => setSelectedAppointmentId(null)}>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto h-full">
            {selectedAppointmentId && (
              <AppointmentDetail
                appointmentId={selectedAppointmentId}
                onClose={handleCloseDetail}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}