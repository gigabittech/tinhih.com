import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import tinhihLogo from "@/assets/tinhih-logo.svg";
import { 
  Shield,
  Users, 
  Stethoscope, 
  DollarSign, 
  Quote, 
  CalendarDays,
  ArrowLeft,
  BarChart,
  Settings,
  Activity,
  Crown,
  Heart,
  Package,
  ShoppingCart,
  UserCheck,
  Users2,
  LandPlot
} from "lucide-react";

const adminNavigationItems = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", path: "/admin", icon: Shield },
      { name: "Activity", path: "/admin/activity", icon: Activity },
    ]
  },
  {
    title: "Management",
    items: [
      { name: "Staff Management", path: "/admin/staff", icon: Users },
      { name: "Practitioner Management", path: "/admin/practitioners", icon: Stethoscope },
      { name: "Client Management", path: "/admin/patients", icon: UserCheck },
      { name: "Community Members", path: "/admin/members", icon: LandPlot },
      { name: "Admin Management", path: "/admin/admins", icon: Crown },
    ]
  },
  {
    title: "Financial",
    items: [
      { name: "Transactions", path: "/admin/transactions", icon: DollarSign },
      { name: "Donations", path: "/admin/donations", icon: Heart },
      { name: "Reports", path: "/admin/reports", icon: BarChart },
    ]
  },
  {
    title: "Content",
    items: [
      { name: "Quotes", path: "/admin/quotes", icon: Quote },
      { name: "Events", path: "/admin/events", icon: CalendarDays },
      { name: "Printful Store", path: "/admin/printful", icon: Package },
      { name: "Store Orders", path: "/admin/orders", icon: ShoppingCart },
    ]
  },
  {
    title: "System",
    items: [
      { name: "Settings", path: "/admin/settings", icon: Settings },
    ]
  }
];

interface AdminSidebarProps {
  isMobile?: boolean;
}

export function AdminSidebar({ isMobile = false }: AdminSidebarProps) {
  const [location] = useLocation();

  return (
    <aside 
      className={`w-64 h-screen fixed left-0 top-0 z-40 shadow-sm flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800/50 ${!isMobile ? 'hidden lg:flex' : 'flex'}`}
      style={{
        backgroundColor: `hsl(var(--sidebar-background))`,
        color: `hsl(var(--sidebar-foreground))`,
      }}
    >
      {/* Admin Header - Logo & Branding */}
      <div 
        className="flex-shrink-0 p-6 transition-colors duration-300" 
        style={{
          backgroundColor: `hsl(var(--sidebar-background))`,
          borderBottom: `1px solid hsl(var(--sidebar-border) / 0.5)`
        }}
      >
        <div className="flex items-center space-x-4">
          <div 
            className="w-14 h-14"
            style={{ 
              backgroundColor: `hsl(var(--card))`,
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
              Admin Panel
            </span>
            <span 
              className="text-xs font-medium tracking-wide transition-colors duration-300"
              style={{ color: `hsl(var(--muted-foreground))` }}
            >
              TiNHiH Portal
            </span>
          </div>
        </div>
      </div>

      {/* Back to Main App Button */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-800/50">
        <Link href="/">
          <Button variant="outline" className="w-full justify-start">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main App
          </Button>
        </Link>
      </div>

      {/* Admin Navigation Content */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <div className="px-3 space-y-8">
          {adminNavigationItems.map((section) => (
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
                    <li key={item.path}>
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

      {/* Admin Footer */}
      <div 
        className="flex-shrink-0 p-5 transition-colors duration-300 border-t border-gray-200 dark:border-gray-800/80"
        style={{
          backgroundColor: `hsl(var(--sidebar-background))`,
        }}
      >
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-medium text-foreground">Administrator Access</p>
          <p className="text-xs text-muted-foreground mt-1">TiNHiH Portal</p>
        </div>
      </div>
    </aside>
  );
}
