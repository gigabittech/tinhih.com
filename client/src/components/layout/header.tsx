import { useState } from "react";
import { Search, Plus, Menu, Calendar, CheckSquare, Users, FileText, Clock, Bell, Coffee, Heart, ShoppingCart } from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { ThemedButton } from "@/components/ui/themed-button";
import { ThemedInput } from "@/components/ui/themed-input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "./sidebar";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { DonationDialog } from "@/components/donation/donation-dialog";

type EventType = "appointment" | "task" | "reminder" | "meeting" | "out-of-office";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onNewEvent?: (type: EventType, date?: Date, time?: string) => void;
}

export function Header({ title, subtitle, onNewEvent }: HeaderProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Check if current page is messages page
  const isMessagesPage = location === '/messages';

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // TODO: Implement global search functionality
  };

  const handleNewAction = (action: string) => {
    console.log('Header: handleNewAction called with:', action);
    console.log('Header: onNewEvent available:', !!onNewEvent);
    
    // Check if we're already on the calendar page and onNewEvent is available
    if (location === '/calendar' && onNewEvent && ['appointment', 'task', 'reminder', 'meeting', 'out-of-office'].includes(action)) {
      // Handle calendar events if we're on the calendar page
      console.log('Header: Using onNewEvent handler for:', action);
      const eventType = action as EventType;
      onNewEvent(eventType);
    } else {
      // Handle navigation actions
      console.log('Header: Navigating to calendar with action:', action);
      switch (action) {
        case 'note':
          setLocation('/clinical-notes?action=new');
          break;
        case 'patient':
          setLocation('/patients?action=new');
          break;
        case 'appointment':
        case 'task':
        case 'reminder':
        case 'meeting':
        case 'out-of-office':
          // Navigate to calendar page with action parameter
          setLocation(`/calendar?action=${action}`);
          break;
        default:
          console.log(`Creating new ${action}`);
      }
    }
  };

  return (
    <header 
      className={`fixed top-0 right-0 z-30 border-b px-4 lg:px-6 py-4 transition-all duration-300 backdrop-blur-sm ${
        isMessagesPage ? 'left-0' : 'left-0 lg:left-64'
      }`}
      style={{
        backgroundColor: `hsl(var(--background) / 0.95)`,
        borderColor: `hsl(var(--border))`
      }}
    >
      <div className="flex items-center justify-between">
        {/* Mobile menu and title */}
        <div className="flex items-center space-x-4">
          {/* Mobile hamburger menu (hidden on messages page) */}
          {!isMessagesPage && (
            <Sheet>
              <SheetTrigger asChild>
                <ThemedButton 
                  variant="ghost" 
                  size="sm" 
                  className="lg:hidden border border-gray-300 dark:border-gray-600"
                  style={{ minWidth: '40px', minHeight: '40px' }}
                >
                  <Menu className="h-5 w-5" />
                </ThemedButton>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar isMobile={true} />
              </SheetContent>
            </Sheet>
          )}

          {title && (
            <div>
              <h1 
                className="text-xl lg:text-2xl font-bold transition-colors duration-300"
                style={{ color: `hsl(var(--foreground))` }}
              >
                {title}
                {isMessagesPage && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (Full Screen)
                  </span>
                )}
              </h1>
              {subtitle && (
                <p 
                  className="hidden text-sm lg:text-base transition-colors duration-300"
                  style={{ color: `hsl(var(--muted-foreground))` }}
                >
                  {subtitle.includes("{name}") 
                    ? subtitle.replace("{name}", user?.firstName || "")
                    : subtitle
                  }
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Global Search - Only show for non-patient users */}
          {/* {user?.role !== 'patient' && (
            <div className="relative hidden md:block">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300" 
                style={{ color: `hsl(var(--muted-foreground))` }}
              />
              <ThemedInput
                type="text"
                placeholder="Search patients, appointments, notes..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-56 lg:w-72 pl-10 bg-muted/30 border-muted focus:bg-background"
              />
            </div>
          )} */}
          
          {/* Theme Toggle */}
          
          {/* Store Button */}
          <ThemedButton 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/store')}
            className="hidden sm:flex items-center gap-2 border border-[#000] hover:border-[#ffdd00]/80 hover:bg-[#ffdd00]/10 dark:border-white dark:hover:border-[#ffdd00]/80 dark:hover:bg-[#ffdd00]/10"
          >
            <ShoppingCart className="w-4 h-4 text-[#ffdd00]" />
            <span className="hidden md:inline text-[#000000] dark:text-[#ffdd00] font-medium">Store</span>
          </ThemedButton>
          
          {/* Donate Button */}
          <DonationDialog>
            <ThemedButton 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex items-center gap-2 border border-[#000] hover:border-[#ffdd00]/80 hover:bg-[#ffdd00]/10 dark:border-white dark:hover:border-[#ffdd00]/80 dark:hover:bg-[#ffdd00]/10"
            >
              <Heart className="w-4 h-4 text-[#ffdd00]" />
              <span className="hidden md:inline text-[#000000] dark:text-[#ffdd00] font-medium">Donate</span>
            </ThemedButton>
          </DonationDialog>

          <ThemeToggle />

          
          {/* Notifications */}
          <NotificationCenter />



          {/* New Dropdown - Only show for non-patient users */}
          {user?.role !== 'patient' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ThemedButton size="sm" className="shadow-sm">
                  <Plus className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">New</span>
                </ThemedButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Calendar Events - Always show */}
                <DropdownMenuItem onClick={() => handleNewAction('appointment')} className="cursor-pointer">
                  <Calendar className="w-4 h-4 mr-2" />
                  Appointment
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNewAction('task')} 
                  className="cursor-pointer opacity-50"
                  disabled
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Task
                  <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNewAction('reminder')} 
                  className="cursor-pointer opacity-50"
                  disabled
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Reminder
                  <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNewAction('meeting')} 
                  className="cursor-pointer opacity-50"
                  disabled
                >
                  <Users className="w-4 h-4 mr-2" />
                  Meeting
                  <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNewAction('out-of-office')} 
                  className="cursor-pointer opacity-50"
                  disabled
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  Out of Office
                  <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* General Actions */}
                <DropdownMenuItem 
                  onClick={() => handleNewAction('note')} 
                  className="cursor-pointer opacity-50"
                  disabled
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Note
                  <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleNewAction('patient')} 
                  className="cursor-pointer opacity-50"
                  disabled
                >
                  <Users className="w-4 h-4 mr-2" />
                  Patient
                  <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
