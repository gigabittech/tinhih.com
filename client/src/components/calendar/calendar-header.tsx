import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CalendarSettings } from "@/components/calendar/calendar-settings";
import { BookingLink } from "@/components/calendar/booking-link";
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  RefreshCw
} from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import type { CalendarView } from "@/pages/calendar";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  googleIntegration?: any;
  onManualSync?: () => void;
}

export function CalendarHeader({ 
  currentDate, 
  view, 
  onDateChange, 
  onViewChange, 
  googleIntegration,
  onManualSync
}: CalendarHeaderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isPatient = user?.role === 'patient';
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const navigateDate = (direction: "prev" | "next") => {
    let newDate: Date;
    
    switch (view) {
      case "month":
        newDate = direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
        break;
      case "week":
        newDate = direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
        break;
      case "day":
        newDate = direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1);
        break;
      default:
        newDate = currentDate;
    }
    
    onDateChange(newDate);
  };

  const getDateRangeText = () => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "week":
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${format(startOfWeek, "dd")} - ${format(endOfWeek, "dd MMM yyyy")}`;
      case "day":
        return format(currentDate, "EEEE, dd MMMM yyyy");
      default:
        return "";
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="border-b bg-background px-2 sm:px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left side - Navigation and date */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="outline" size="sm" onClick={goToToday} className="cursor-pointer">
            Today
          </Button>
          
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigateDate("prev")}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigateDate("next")}
              className="cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h1 className="text-lg sm:text-xl font-semibold text-foreground hidden sm:block">
            {getDateRangeText()}
          </h1>
          <h1 className="text-sm font-semibold text-foreground block sm:hidden">
            {isMobile && isPatient ? (
              <span className="flex items-center gap-2">
                <span>Day View</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span>{format(currentDate, "MMM d")}</span>
              </span>
            ) : (
              format(currentDate, view === "month" ? "MMM yyyy" : "MMM d")
            )}
          </h1>
        </div>

        {/* Center - View toggle */}
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
          {(["month", "week", "day"] as CalendarView[]).map((viewType) => (
            <Button
              key={viewType}
              variant={view === viewType ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                // On mobile, only allow day view for patients
                if (isMobile && isPatient && viewType !== "day") {
                  return;
                }
                onViewChange(viewType);
              }}
              className={`capitalize cursor-pointer ${
                view === viewType ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""
              } ${isMobile && isPatient && viewType !== "day" ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isMobile && isPatient && viewType !== "day"}
            >
              {viewType}
            </Button>
          ))}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Google Calendar Sync Indicator */}
          {googleIntegration?.calendarSync && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700 font-medium">Google Calendar Synced</span>
              </div>
              {/* Manual Sync Button - Always show when connected */}
              {onManualSync && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onManualSync}
                  className="flex items-center space-x-1"
                  title="Manual sync Google Calendar events"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="text-xs">Sync</span>
                </Button>
              )}
            </div>
          )}
          {/* Day view: icons only - Not for patients */}
          {!isPatient && (
            <>
              {view === "day" ? (
                <>
                  <BookingLink />

                  <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="cursor-pointer">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
                      <CalendarSettings onClose={() => setIsSettingsOpen(false)} />
                    </SheetContent>
                  </Sheet>
                </>
              ) : (
                /* Other views: show text labels */
                <>
                  <BookingLink />

                  <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
                      <CalendarSettings onClose={() => setIsSettingsOpen(false)} />
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}