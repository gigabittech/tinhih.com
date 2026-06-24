import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Calendar,
  MessageSquare,
  CreditCard,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Plus,
  ArrowRight,
  FileText,
  DollarSign,
  Activity,
  UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { usePageTitle } from "@/context/page-context";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { MessageCard } from "@/components/messages/message-card";
import { InvoiceCard } from "@/components/billing/invoice-card";
import { NotificationCard } from "@/components/notifications/notification-card";
import { PatientProfile } from "@/components/patient-portal/patient-profile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showOnboardingRedirect, setShowOnboardingRedirect] = useState(false);

  useEffect(() => {
    setPageInfo("Patient Dashboard", "Manage your healthcare journey");
  }, [setPageInfo]);

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["/api/patient/dashboard"],
    queryFn: () => api.get("/api/patient/dashboard"),
    enabled: !!user && user.role === 'patient'
  });

  // Check if patient needs to complete onboarding
  useEffect(() => {
    if (patient && user?.role === 'patient') {
      const needsOnboarding = !patient.patient || Object.keys(patient.patient?.onboardingData || {}).length === 0;
      if (needsOnboarding) {
        setShowOnboardingRedirect(true);
      }
    }
  }, [patient, user]);

  // Fetch upcoming appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/patient/appointments"],
    queryFn: () => api.get("/api/patient/appointments"),
    enabled: !!user && user.role === 'patient'
  });

  // Fetch recent messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/patient/messages"],
    queryFn: () => api.get("/api/patient/messages"),
    enabled: !!user && user.role === 'patient'
  });

  // Fetch pending invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/patient/invoices"],
    queryFn: () => api.get("/api/patient/invoices"),
    enabled: !!user && user.role === 'patient'
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => api.get("/api/notifications"),
    enabled: !!user && user.role === 'patient'
  });

  const isLoading = patientLoading || appointmentsLoading || messagesLoading || invoicesLoading || notificationsLoading;

  const upcomingAppointments = appointments.filter(
    (apt: any) => new Date(apt.appointmentDate) > new Date()
  );

  const pendingInvoices = invoices.filter(
    (inv: any) => inv.status !== "paid"
  );

  const unreadMessages = messages.filter(
    (msg: any) => !msg.readBy?.includes(user?.id)
  );

  const unreadNotifications = notifications.filter(
    (notif: any) => !notif.read
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your health portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
            <AvatarImage src={patient?.profileImage} />
            <AvatarFallback className="text-lg sm:text-xl bg-[#ffdd00] text-black">
              {patient?.user?.firstName?.[0]}{patient?.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {getGreeting()}, {patient?.user?.firstName || "Patient"}!
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-4">
              Welcome to your health portal. Here's what's happening with your care.
            </p>
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setLocation('/patient-onboarding')}
                className="bg-[#ffdd00] text-black hover:bg-[#ffdd00]/90 w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Complete Onboarding
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab('profile')}
                className="w-full sm:w-auto"
              >
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>
            </div>
          </div>
          <div className="text-center sm:text-right w-full sm:w-auto">
            <div className="text-sm text-muted-foreground mb-1">Patient ID</div>
            <div className="font-mono text-base sm:text-lg font-medium">{patient?.id?.slice(0, 8)}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className=" shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{upcomingAppointments.length}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Upcoming</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className=" shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">{unreadMessages.length}</div>
                <div className="text-sm text-green-700 dark:text-green-300 font-medium">New Conversations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className=" shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{pendingInvoices.length}</div>
                <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">Pending Bills</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className=" shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{unreadNotifications.length}</div>
                <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Notifications</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Appointments */}
            <Card className=" shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.slice(0, 3).map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {appointment.title || 'Appointment'}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(appointment.appointmentDate), 'MMM dd')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {format(new Date(appointment.appointmentDate), 'hh:mm a')} • {appointment.practitionerName || 'No practitioner'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                            {appointment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcomingAppointments.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab('appointments')}
                    >
                      View All ({upcomingAppointments.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-4">No upcoming appointments</p>
                  <Button className="bg-[#ffdd00] text-black hover:bg-[#ffdd00]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Book Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Conversations
          <Card className=" shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <MessageSquare className="h-6 w-6 text-green-600" />
                Recent Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.slice(0, 3).map((message: any) => (
                    <div key={message.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={message.senderAvatar} />
                          <AvatarFallback className="bg-[#ffdd00] text-black text-sm font-medium">
                            {message.senderName?.[0] || message.senderName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {message.senderName || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.createdAt), 'MMM dd, h:mm a')}
                            </span>
                            {!message.readBy?.includes(user?.id) && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {message.subject && (
                            <p className="text-sm font-medium text-foreground truncate">
                              {message.subject}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.content?.substring(0, 80) || 'No message content'}
                            {message.content && message.content.length > 80 && '...'}
                          </p>
                        </div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {messages.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab('messages')}
                    >
                      View All Conversations ({messages.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No conversations yet</p>
                  <p className="text-sm">Start a conversation with your care team</p>
                </div>
              )}
            </CardContent>
          </Card> */}

          {/* Pending Bills */}
          <Card className=" shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <DollarSign className="h-6 w-6 text-orange-600" />
                Pending Bills
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {pendingInvoices.length > 0 ? (
                <div className="space-y-3">
                  {pendingInvoices.slice(0, 3).map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            Invoice #{invoice.invoiceNumber}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(invoice.createdAt), 'MMM dd')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          ${Number(invoice.total).toFixed(2)} • {invoice.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingInvoices.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab('billing')}
                    >
                      View All ({pendingInvoices.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No pending bills</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card className=" shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Bell className="h-6 w-6 text-purple-600" />
                Unread Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {unreadNotifications.length > 0 ? (
                <div className="space-y-3">
                  {unreadNotifications.slice(0, 3).map((notification: any) => (
                    <div key={notification.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.title || 'Notification'}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), 'MMM dd')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {notification.message?.substring(0, 60) || 'No message'}
                        </p>
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      </div>
                    </div>
                  ))}
                  {unreadNotifications.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab('notifications')}
                    >
                      View All Unread ({unreadNotifications.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No unread notifications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-8">
          <PatientProfile />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
                All Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment: any) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No appointments found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <MessageSquare className="h-6 w-6 text-green-600" />
                All Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message: any) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No messages found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <DollarSign className="h-6 w-6 text-orange-600" />
                All Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice: any) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No invoices found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Onboarding Redirect Modal */}
      <Dialog open={showOnboardingRedirect} onOpenChange={setShowOnboardingRedirect}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-yellow-600" />
              Complete Your Onboarding
            </DialogTitle>
            <DialogDescription>
              Welcome to TiNHiH Foundation! To provide you with the best care, we need you to complete your onboarding process first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Why onboarding is important:</strong>
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                <li>• Helps us understand your recovery journey</li>
                <li>• Ensures we have your complete medical history</li>
                <li>• Allows us to provide personalized care</li>
                <li>• Required for insurance and financial assistance</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setLocation('/patient-onboarding')}
                className="flex-1"
              >
                Start Onboarding
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowOnboardingRedirect(false)}
              >
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
