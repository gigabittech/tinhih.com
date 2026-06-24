import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { PageProvider, usePageTitle } from "@/context/page-context";
import { useWebSocketAccountStatus } from "@/hooks/useWebSocketAccountStatus";
import { useGlobalMessaging } from "@/hooks/useGlobalMessaging";
import { VersionUpdateDialog } from "@/components/version-update-dialog";
import { versionService } from "@/lib/version-service";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState, useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load all page components for optimal performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/login"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Register = lazy(() => import("@/pages/register"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const RecoverySpecialistDashboard = lazy(() => import("@/pages/practitioner-dashboard"));
const Patients = lazy(() => import("@/pages/patients"));
const Calendar = lazy(() => import("@/pages/calendar")); // <-- CORRECTED LAZY IMPORT
const Appointments = lazy(() => import("@/pages/appointments"));
const ClinicalNotes = lazy(() => import("@/pages/clinical-notes"));
const ClinicalNoteDetail = lazy(() => import("@/pages/clinical-note-detail"));
const Billing = lazy(() => import("@/pages/billing"));
const Messages = lazy(() => import("@/pages/messages"));
const Reports = lazy(() => import("@/pages/reports"));
const Settings = lazy(() => import("@/pages/settings"));
const PatientPortal = lazy(() => import("@/pages/patient-portal"));
const PatientDashboard = lazy(() => import("@/pages/patient-dashboard"));
const PublicBooking = lazy(() => import("@/pages/public-booking"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const PatientOnboarding = lazy(() => import("@/pages/patient-onboarding"));
const AdminPanel = lazy(() => import("@/pages/admin"));
const AdminTransactions = lazy(() => import("@/pages/admin-transactions"));
const AdminStaff = lazy(() => import("@/pages/admin-staff"));
const AdminPractitioners = lazy(() => import("@/pages/admin-practitioners"));
const AdminAdmins = lazy(() => import("@/pages/admin-admins"));
const AdminQuotes = lazy(() => import("@/pages/admin-quotes"));
const AdminDonations = lazy(() => import("@/pages/admin-donations"));
const AdminReports = lazy(() => import("@/pages/admin-reports"));
const AdminActivity = lazy(() => import("@/pages/admin-activity"));
const AdminPatients = lazy(() => import("@/pages/admin-patients"));
const AdminMembers = lazy(() => import("@/pages/admin-members"));
const AdminPrintful = lazy(() => import("@/pages/admin-printful"));
const AdminOrders = lazy(() => import("@/pages/admin-orders"));
const AdminEvents = lazy(() => import("@/pages/admin-events"));
const Store = lazy(() => import("@/pages/store"));
const Checkout = lazy(() => import("@/pages/checkout"));
const MemberDashboard = lazy(() => import("@/pages/member-dashboard"));
const MemberEvents = lazy(() => import("@/pages/member-events"));
const MemberProductDetail = lazy(() => import("@/pages/member-product-detail"));
const MemberProfile = lazy(() => import("@/pages/member-profile"));
const MemberOnboarding = lazy(() => import("@/pages/member-onboarding"));
const MemberQuotes = lazy(() => import("@/pages/member-quotes"));
const MemberDonations = lazy(() => import("@/pages/member-donations"));
const MemberOrders = lazy(() => import("@/pages/member-orders"));
const DummyBooking = lazy(() => import("@/pages/dummy-booking"));
const BookingDemo = lazy(() => import("@/pages/booking-demo"));
const PractitionerPublicBookings = lazy(() => import("@/pages/practitioner-public-bookings"));
const AdminPublicBookings = lazy(() => import("@/pages/admin-public-bookings"));
const MemberRedirectNotice = lazy(() => import("@/components/member-redirect-notice").then(module => ({ default: module.MemberRedirectNotice })));

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Wrapper component for lazy-loaded pages with Suspense
const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// Logout loading overlay component
const LogoutOverlay = () => {
  const { isLoggingOut } = useAuth();
  
  if (!isLoggingOut) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-card border shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Logging out...</p>
        <p className="text-xs text-muted-foreground">Please wait while we clear your session</p>
      </div>
    </div>
  );
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { title, subtitle, onNewEvent } = usePageTitle();
  const [, setLocation] = useLocation();
  const [versionInfo, setVersionInfo] = useState<any>(null);

  const isMessagesPage = useLocation()[0] === '/messages';
  
  useWebSocketAccountStatus();
  useGlobalMessaging();
  
  useEffect(() => {
    const handleUpdateAvailable = (info: any) => {
      const skippedVersion = localStorage.getItem('skipVersionUpdate');
      const remindLater = localStorage.getItem('remindUpdateLater');
      
      if (skippedVersion === info.latestVersion) {
        return;
      }
      
      if (remindLater) {
        const remindTime = parseInt(remindLater);
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - remindTime < oneHour) {
          return;
        }
      }
      
      setVersionInfo(info);
    };

    const handleUpdateProgress = (progress: any) => {
      console.log('Update progress:', progress);
    };

    versionService.initialize(handleUpdateAvailable, handleUpdateProgress);

    return () => {
      versionService.destroy();
    };
  }, []);
  
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role === 'member') {
    return <>{children}</>;
  }

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ 
        backgroundColor: `hsl(var(--background))`,
        color: `hsl(var(--foreground))`
      }}
    >
      {!isMessagesPage && (
        <div className="hidden lg:block">
          <Sidebar />
        </div>
      )}
      
      <Header title={title} subtitle={subtitle} onNewEvent={onNewEvent} />
      
      <main 
        className={`px-1 pt-20 min-h-screen overflow-y-auto transition-all duration-500 ease-in-out ${
          isMessagesPage ? 'lg:ml-0' : 'lg:ml-64'
        }`}
        style={{
          backgroundColor: `hsl(var(--background))`
        }}
      >
        <div className="">
          {children}
        </div>
      </main>

      <VersionUpdateDialog 
        versionInfo={versionInfo}
        onClose={() => setVersionInfo(null)}
      />
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && user.role !== 'admin') {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}

function MemberRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && user.role !== 'member') {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/login">
        <LazyPage>
          <Login />
        </LazyPage>
      </Route>
      <Route path="/reset-password">
        <LazyPage>
          <ResetPassword />
        </LazyPage>
      </Route>
      <Route path="/register">
        <LazyPage>
          <Register />
        </LazyPage>
      </Route>
      <Route path="/patient-onboarding">
        <LazyPage>
          <PatientOnboarding />
        </LazyPage>
      </Route>
      <Route path="/forgot-password">
        <LazyPage>
          <ForgotPassword />
        </LazyPage>
      </Route>
      
      {/* Public booking route - no authentication required */}
      <Route path="/book/:bookingLink">
        {({ bookingLink }: { bookingLink: string }) => (
          <LazyPage>
            <PublicBooking bookingLink={bookingLink} />
          </LazyPage>
        )}
      </Route>
      
      {/* Dummy booking route - no authentication required */}
      <Route path="/dummy-booking">
        <LazyPage>
          <DummyBooking />
        </LazyPage>
      </Route>
      
      {/* Booking demo route - no authentication required */}
      <Route path="/booking-demo">
        <LazyPage>
          <BookingDemo />
        </LazyPage>
      </Route>
      

      
      <Route path="/patient-portal">
        <ProtectedRoute>
          <LazyPage>
            <PatientPortal />
          </LazyPage>
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          {user?.role === 'patient' ? (
            <LazyPage>
              <PatientDashboard />
            </LazyPage>
          ) : user?.role === 'practitioner' ? (
            <LazyPage>
              <RecoverySpecialistDashboard />
            </LazyPage>
          ) : user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Dashboard />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute>
          {user?.role === 'patient' ? (
            <LazyPage>
              <PatientDashboard />
            </LazyPage>
          ) : user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Patients />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/patients">
        <ProtectedRoute>
          {user?.role === 'patient' ? (
            <LazyPage>
              <PatientDashboard />
            </LazyPage>
          ) : user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Patients />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/calendar">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Calendar />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/appointments">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Appointments />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/recovery-notes">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <ClinicalNotes />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/recovery-notes/:id">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <ClinicalNoteDetail />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>

      <Route path="/billing">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Billing />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Messages />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          {user?.role === 'patient' ? (
            <LazyPage>
              <PatientDashboard />
            </LazyPage>
          ) : user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Reports />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <Settings />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/practitioner/public-bookings">
        <ProtectedRoute>
          {user?.role === 'member' ? (
            <LazyPage>
              <MemberDashboard />
            </LazyPage>
          ) : (
            <LazyPage>
              <PractitionerPublicBookings />
            </LazyPage>
          )}
        </ProtectedRoute>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin">
        <AdminRoute>
          <LazyPage>
            <AdminPanel />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/transactions">
        <AdminRoute>
          <LazyPage>
            <AdminTransactions />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/staff">
        <AdminRoute>
          <LazyPage>
            <AdminStaff />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/practitioners">
        <AdminRoute>
          <LazyPage>
            <AdminPractitioners />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/patients">
        <AdminRoute>
          <LazyPage>
            <AdminPatients />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/members">
        <AdminRoute>
          <LazyPage>
            <AdminMembers />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/admins">
        <AdminRoute>
          <LazyPage>
            <AdminAdmins />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/quotes">
        <AdminRoute>
          <LazyPage>
            <AdminQuotes />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/donations">
        <AdminRoute>
          <LazyPage>
            <AdminDonations />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/reports">
        <AdminRoute>
          <LazyPage>
            <AdminReports />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/activity">
        <AdminRoute>
          <LazyPage>
            <AdminActivity />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/printful">
        <AdminRoute>
          <LazyPage>
            <AdminPrintful />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/orders">
        <AdminRoute>
          <LazyPage>
            <AdminOrders />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/events">
        <AdminRoute>
          <LazyPage>
            <AdminEvents />
          </LazyPage>
        </AdminRoute>
      </Route>
      <Route path="/admin/public-bookings">
        <AdminRoute>
          <LazyPage>
            <AdminPublicBookings />
          </LazyPage>
        </AdminRoute>
      </Route>
        
      {/* Protected Store Routes - Only authenticated users */}
      <Route path="/store">
        <ProtectedRoute>
          <LazyPage>
            <Store />
          </LazyPage>
        </ProtectedRoute>
      </Route>
      <Route path="/checkout">
        <ProtectedRoute>
          <LazyPage>
            <Checkout />
          </LazyPage>
        </ProtectedRoute>
      </Route>
      <Route path="/checkout/success">
        <ProtectedRoute>
          <LazyPage>
            <Checkout />
          </LazyPage>
        </ProtectedRoute>
      </Route>
        
      {/* Protected Product Detail Route - Only authenticated users */}
      <Route path="/product/:id">
        <ProtectedRoute>
          <LazyPage>
            <MemberProductDetail />
          </LazyPage>
        </ProtectedRoute>
      </Route>
        
      {/* Member Routes */}
      <Route path="/member">
        <MemberRoute>
          <LazyPage>
            <MemberDashboard />
          </LazyPage>
        </MemberRoute>
      </Route>

      <Route path="/member/events">
        <MemberRoute>
          <LazyPage>
            <MemberEvents />
          </LazyPage>
        </MemberRoute>
      </Route>

      <Route path="/member/product">
        <MemberRoute>
          <LazyPage>
            <MemberProductDetail />
          </LazyPage>
        </MemberRoute>
      </Route>
      <Route path="/member/profile">
        <MemberRoute>
          <LazyPage>
            <MemberProfile />
          </LazyPage>
        </MemberRoute>
      </Route>
      <Route path="/member/onboarding">
        <MemberRoute>
          <LazyPage>
            <MemberOnboarding />
          </LazyPage>
        </MemberRoute>
      </Route>

      <Route path="/member/quotes">
        <MemberRoute>
          <LazyPage>
            <MemberQuotes />
          </LazyPage>
        </MemberRoute>
      </Route>

      <Route path="/member/donate">
        <MemberRoute>
          <LazyPage>
            <MemberDonations />
          </LazyPage>
        </MemberRoute>
      </Route>

      <Route path="/member/orders">
        <ProtectedRoute>
          <LazyPage>
            <MemberOrders />
          </LazyPage>
        </ProtectedRoute>
      </Route>

      <Route path="/orders">
        <ProtectedRoute>
          <LazyPage>
            <MemberOrders />
          </LazyPage>
        </ProtectedRoute>
      </Route>
        
      <Route>
        <LazyPage>
          <NotFound />
        </LazyPage>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <PageProvider>
            <TooltipProvider>
              <Toaster />
              <Suspense fallback={null}>
                <MemberRedirectNotice />
              </Suspense>
              <LogoutOverlay />
              <Router />
            </TooltipProvider>
          </PageProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;