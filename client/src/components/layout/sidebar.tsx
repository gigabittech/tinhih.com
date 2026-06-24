import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import tinhihLogo from "@/assets/tinhih-logo.svg";
import { 
  BarChart, 
  Users, 
  Calendar, 
  FileText, 
  Video, 
  CreditCard, 
  MessageSquare, 
  Stethoscope,
  Settings,
  CalendarCheck,
  UserPlus
} from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

const getNavigationSections = (userRole: string) => {
  const isPatient = userRole === 'patient';
  const isPractitioner = userRole === 'practitioner';
  const isMember = userRole === 'member';
  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';
  
  // If member, return empty array to hide sidebar navigation
  if (isMember) {
    return [];
  }
  
  return [
    {
      title: isPatient ? "My Health" : "Dashboard",
      items: [
        { name: "Overview", path: "/", icon: BarChart },
      ]
    },
    {
      title: isPatient ? "My Care" : isPractitioner ? "Patient Care" : "Patient Care",
      items: [
        // Patients see their own appointments, practitioners see their patients, admin/staff see all patients
        { 
          name: isPatient ? "My Appointments" : "Clients", 
          path: isPatient ? "/appointments" : "/clients", 
          icon: isPatient ? Calendar : Users 
        },
        { 
          name: isPatient ? "My Notes" : isPractitioner ? "Recovery Notes" : "Recovery Notes", 
          path: "/recovery-notes", 
          icon: FileText 
        },
        { 
          name: "Telehealth (Coming Soon)", 
          path: "#", 
          icon: Video 
        },
        // Only show onboarding to patients
        ...(isPatient ? [
          { 
            name: "Complete Onboarding", 
            path: "/patient-onboarding", 
            icon: UserPlus 
          }
        ] : []),
      ]
    },
    {
      title: isPatient ? "My Schedule" : "Scheduling",
      items: [
        { 
          name: isPatient ? "My Calendar" : isPractitioner ? "Treatment Calendar" : "Calendar", 
          path: "/calendar", 
          icon: Calendar 
        },
        // Only show "Book Appointment" for non-patients (practitioners, admin, staff)
        ...(isPatient ? [] : [
          { 
            name: isPractitioner ? "Treatment Sessions" : "Appointments", 
            path: "/appointments", 
            icon: CalendarCheck 
          }
        ]),
      ]
    },
    {
      title: isPatient ? "My Account" : "Business Operations",
      items: [
        { 
          name: isPatient ? "My Billing" : isPractitioner ? "Service Billing" : "Billing", 
          path: "/billing", 
          icon: CreditCard 
        },
        { 
          name: isPatient ? "My Messages" : "Messages", 
          path: "/messages", 
          icon: MessageSquare 
        },
        // Only show Reports to admin/staff, Settings available to all users including patients
        ...(isAdminOrStaff ? [{ name: "Reports", path: "/reports", icon: BarChart }] : []),
        { name: "Settings", path: "/settings", icon: Settings },
      ]
    }
  ];
};

interface SidebarProps {
  isMobile?: boolean;
}

export function Sidebar({ isMobile = false }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  
  const navigationSections = getNavigationSections(user?.role || 'patient');

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <aside 
      className={`w-64 h-screen fixed left-0 top-0 z-40 shadow-sm flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800/50 ${!isMobile ? 'hidden lg:flex' : 'flex'}`}
      style={{
        backgroundColor: `hsl(var(--sidebar-background))`,
        color: `hsl(var(--sidebar-foreground))`,
      }}
    >
      {/* Clean Header - Logo & Branding */}
      <div 
        className="flex-shrink-0 p-6 transition-colors duration-300" 
      >
        <div className="flex items-center space-x-4">
          <div 
            className="w-14 h-14 rounded-xl overflow-hidden p-1.5 transition-all duration-300"
            style={{ 
              backgroundColor: `hsl(var(--card))`,
              border: `1px solid hsl(var(--sidebar-border))`
            }}
          >
            <img 
              src={tinhihLogo} 
              alt="TiNHiH Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span 
              className="text-xl font-bold leading-tight transition-colors duration-300"
              style={{ color: `hsl(var(--sidebar-foreground))` }}
            >
              TiNHiH Portal
            </span>
            <span 
              className="text-xs font-medium tracking-wide transition-colors duration-300"
              style={{ color: `hsl(var(--muted-foreground))` }}
            >
              {/* Healthcare Management */}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Content */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <div className="px-3 space-y-8">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 
                className="text-xs font-bold uppercase tracking-widest px-3 py-2 transition-colors duration-300"
                style={{ color: `hsl(var(--muted-foreground) / 0.8)` }}
              >
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location === item.path;
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.path} >
                      <Link href={item.path}>
                        <div
                          className="flex items-center space-x-3 px-3 py-3 mx-2 rounded-lg font-medium transition-all duration-200 cursor-pointer group relative overflow-hidden"
                          style={isActive ? {
                            backgroundColor: `hsl(var(--sidebar-accent) / 0.15)`,
                            color: `hsl(var(--sidebar-accent))`,
                            boxShadow: `inset 3px 0 0 hsl(var(--sidebar-accent))`
                          } : {
                            color: `hsl(var(--sidebar-foreground) / 0.75)`
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = `hsl(var(--sidebar-muted) / 0.5)`;
                              e.currentTarget.style.color = `hsl(var(--sidebar-foreground))`;
                              e.currentTarget.style.transform = 'translateX(2px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = `hsl(var(--sidebar-foreground) / 0.75)`;
                              e.currentTarget.style.transform = 'translateX(0)';
                            }
                          }}
                        >
                          <Icon 
                            className="w-5 h-5 flex-shrink-0 transition-all duration-200"
                            style={{
                              color: isActive 
                                ? `hsl(var(--sidebar-accent))` 
                                : `hsl(var(--muted-foreground) / 0.8)`
                            }}
                          />
                          <span className="text-sm font-medium tracking-wide">{item.name}</span>
                          {isActive && (
                            <div 
                              className="absolute right-2 w-2 h-2 rounded-full"
                              style={{ backgroundColor: `hsl(var(--sidebar-accent))` }}
                            />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Elegant Footer - User Profile */}
      <div 
        className="flex-shrink-0 p-5 transition-colors duration-300 border-t border-gray-200 dark:border-gray-800/80"
        style={{
          backgroundColor: `hsl(var(--sidebar-background))`,
        }}
      >
        <UserMenu user={user} logout={logout} isLoggingOut={isLoggingOut} />
      </div>
    </aside>
  );
}
