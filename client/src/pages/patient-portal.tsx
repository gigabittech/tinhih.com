import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  Pill,
  User,
  Heart,
  Activity,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle,
  Video,
  Bell,
  Plus,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { usePageTitle } from '@/context/page-context';
import { api } from '@/lib/api';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { MessageCard } from '@/components/messages/message-card';
import { InvoiceCard } from '@/components/billing/invoice-card';
import { NotificationCard } from '@/components/notifications/notification-card';
import { PatientCalendar } from '@/components/calendar/patient-calendar';
import { PatientProfile } from '@/components/patient-portal/patient-profile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocation } from 'wouter';

export default function PatientPortal() {
  const { user } = useAuth();
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [showOnboardingRedirect, setShowOnboardingRedirect] = useState(false);

  useEffect(() => {
    setPageInfo("Patient Portal", "Manage your healthcare journey");
  }, [setPageInfo]);

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['/api/patient/dashboard'],
    queryFn: () => api.get('/api/patient/dashboard'),
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
    queryKey: ['/api/patient/appointments'],
    queryFn: () => api.get('/api/patient/appointments'),
    enabled: !!user && user.role === 'patient'
  });

  // Fetch recent messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/patient/messages'],
    queryFn: () => api.get('/api/patient/messages'),
    enabled: !!user && user.role === 'patient'
  });

  // Fetch pending invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['/api/patient/invoices'],
    queryFn: () => api.get('/api/patient/invoices'),
    enabled: !!user && user.role === 'patient'
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => api.get('/api/notifications'),
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

  // Use pendingInvoices instead of unpaidInvoices for consistency
  const unpaidInvoices = pendingInvoices;

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

  // const patient = patientData?.patient;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Appointments</span>
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Records</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Messages</span>
            {unreadMessages?.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {unreadMessages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Billing</span>
            {unpaidInvoices?.length > 0 && (
              <Badge variant="outline" className="ml-1 h-5 w-5 p-0 text-xs">
                {unpaidInvoices.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Welcome Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">
                    Welcome, {user?.firstName}!
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your health information and appointments in one place
                  </CardDescription>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Patient ID: {patient?.id?.slice(-8)}</p>
                  <p>Last login: {user?.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd, hh:mm a') : 'First time'}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{upcomingAppointments?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{unreadMessages?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">New Messages</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">New Results</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{unpaidInvoices?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Pending Bills</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items */}
          {(upcomingAppointments?.length > 0 || unreadMessages?.length > 0 || unpaidInvoices?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Action Items
                </CardTitle>
                <CardDescription>
                  Items that need your attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingAppointments?.slice(0, 2).map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{appointment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.appointmentDate), 'MMM dd, yyyy at hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('appointments')}>
                      View Details
                    </Button>
                  </div>
                ))}

                {unreadMessages?.slice(0, 2).map((message: any) => (
                  <div key={message.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">{message.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          From: {message.senderName}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('messages')}>
                      Read Message
                    </Button>
                  </div>
                ))}

                {unpaidInvoices?.slice(0, 2).map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Invoice #{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Amount: ${Number(invoice.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('billing')}>
                      Pay Now
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Health Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient?.medications?.length > 0 ? (
                  <div className="space-y-2">
                    {patient.medications.slice(0, 3).map((medication: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{medication}</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))}
                    {patient.medications.length > 3 && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('profile')}>
                        View all {patient.medications.length} medications
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No current medications</p>
                )}
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Allergies & Medical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient?.allergies?.length > 0 ? (
                  <div className="space-y-2">
                    {patient.allergies.slice(0, 3).map((allergy: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-red-800">{allergy}</span>
                      </div>
                    ))}
                    {patient.allergies.length > 3 && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('profile')}>
                        View all {patient.allergies.length} allergies
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-800">No known allergies</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <PatientCalendar />
        </TabsContent>

        <TabsContent value="records">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">My Medical Records</h3>
            <p className="text-muted-foreground">Medical records coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">My Messages</h3>
            <p className="text-muted-foreground">Messaging system coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">My Billing</h3>
            <p className="text-muted-foreground">Billing system coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <PatientProfile />
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