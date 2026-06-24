import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import tinhihLogo from "@/assets/tinhih-logo.svg";
import { 
  Home,
  Quote, 
  Calendar, 
  Heart,
  User,
  LogOut,
  UserPlus,
  ShoppingCart,
  Crown,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useEffect } from "react";

const memberNavigationItems = [
  { name: "Dashboard", path: "/member", icon: Home },
  { name: "Events", path: "/member/events", icon: Calendar },
  { name: "Store", path: "/store", icon: ShoppingCart },
  { name: "Quotes", path: "/member/quotes", icon: Quote },
  { name: "Donate", path: "/member/donate", icon: Heart },
  { name: "Profile", path: "/member/profile", icon: User },
];

interface MemberLayoutProps {
  children: React.ReactNode;
}

export function MemberLayout({ children }: MemberLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Premium Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl overflow-hidden">
                <img 
                  src={tinhihLogo} 
                  alt="TiNHiH Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  TiNHiH Community
                </h1>
                <p className="text-sm text-gray-600 font-medium">Premium Member Portal</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  TiNHiH
                </h1>
                <p className="text-xs text-gray-600 font-medium">Community</p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4 lg:space-x-6">
              {/* Desktop User Info */}
              <div className="hidden md:block text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="">
                  <Badge className="bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold px-3 py-1">
                    <Crown className="h-3 w-3 mr-1" />
                     Member
                  </Badge>
                </div>
              </div>

              {/* Mobile User Info */}
              <div className="md:hidden text-right">
                {/* <p className="text-sm font-semibold text-gray-900 hidden">
                  {user?.firstName} {user?.lastName}
                </p> */}
                <Badge className="bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold px-2 py-0.5 text-xs">
                  <Crown className="h-2 w-2 mr-1" />
                  Member
                </Badge>
              </div>

              {/* Desktop Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-2 border-gray-200 hover:border-[#ffdd00] hover:bg-[#ffdd00]/10 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMobileMenu}
                className="md:hidden flex items-center space-x-2 border-gray-200 hover:border-[#ffdd00] hover:bg-[#ffdd00]/10 transition-all duration-200 mobile-menu-container"
              >
                {isMobileMenuOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Premium Navigation */}
      <nav className="bg-white border-b border-gray-100 shadow-sm mobile-menu-container sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            {memberNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link 
                  key={item.name} 
                  href={item.path}
                  className={cn(
                    "flex items-center space-x-2 py-4 px-6 font-medium text-sm transition-all duration-200 rounded-lg mx-1",
                    isActive
                      ? "bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black shadow-md"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Navigation */}
          <div className={cn(
            "md:hidden transition-all duration-300 ease-in-out overflow-hidden border-t border-gray-100",
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="py-4 space-y-2">
              {memberNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link 
                    key={item.name} 
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 py-3 px-4 font-medium text-sm transition-all duration-200 rounded-lg cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black shadow-md"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Logout Button */}
              <div className="pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 border-gray-200 hover:border-[#ffdd00] hover:bg-[#ffdd00]/10 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>

      {/* Premium Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg">
                <img 
                  src={tinhihLogo} 
                  alt="TiNHiH Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-lg font-semibold text-gray-900">TiNHiH Portal</p>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Empowering healthcare communities through connection and support.
            </p>
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} TiNHiH Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
