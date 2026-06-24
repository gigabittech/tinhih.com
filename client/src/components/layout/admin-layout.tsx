import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./admin-sidebar";
import { useAuth } from "@/context/auth-context";
import { usePageTitle } from "@/context/page-context";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();
  const { title, subtitle } = usePageTitle();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ 
        backgroundColor: `hsl(var(--background))`,
        color: `hsl(var(--foreground))`
      }}
    >
      {/* Desktop Admin Sidebar - Fixed */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>
      
      {/* Mobile Menu */}
      <div className="lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-4 left-4 z-50 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <AdminSidebar isMobile={true} />
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Admin Header - Fixed */}
      <header 
        className="fixed top-0 left-0 right-0 lg:left-64 z-30 h-16 border-b transition-all duration-300"
        style={{
          backgroundColor: `hsl(var(--background))`,
          borderColor: `hsl(var(--border))`
        }}
      >
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-xs font-medium text-red-700 dark:text-red-300">Admin Mode</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content Area - Scrollable with header offset */}
      <main 
        className="lg:ml-64 pt-16 min-h-screen overflow-y-auto"
        style={{
          backgroundColor: `hsl(var(--background))`
        }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
