import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ChevronLeft, Calendar, Clock, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isAfter, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { CalendarView } from "@/pages/calendar";

interface CalendarSidebarProps {
  currentDate: Date;
  view: CalendarView;
  onDateSelect: (date: Date) => void;
  onDateChange: (date: Date) => void; // For navigation without view change
  selectedTeamMembers: string[];
  onTeamMemberToggle: (memberId: string) => void;
  onSelectAllTeamMembers?: (memberIds: string[]) => void;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isDemo?: boolean;
  isCurrentUser?: boolean;
}

export function CalendarSidebar({ 
  currentDate, 
  view,
  onDateSelect, 
  onDateChange,
  selectedTeamMembers, 
  onTeamMemberToggle, 
  onSelectAllTeamMembers 
}: CalendarSidebarProps) {
  
  // Debug: Log props immediately when component receives them
  
  
  // Debug: Log props when component mounts
 

  const { user } = useAuth();
  const [teamMembersOpen, setTeamMembersOpen] = useState(true);
  const [upcomingEventsOpen, setUpcomingEventsOpen] = useState(true);
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(currentDate);

  // Role-based access control
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  const isPractitioner = user?.role === 'practitioner';
  const isPatient = user?.role === 'patient';

  // Sync mini calendar month when main calendar date changes
  useEffect(() => {
    setMiniCalendarMonth(currentDate);
  }, [currentDate]);

  // Debug: Monitor view changes
  useEffect(() => {
  
  }, [view]);

  // Navigate function similar to header navigation
  const navigateDate = (direction: "prev" | "next") => {
    console.log("🧭 navigateDate called:", { direction, onDateChange: typeof onDateChange });
    let newDate: Date;
    

    
    // Use fallback view if view is undefined
    const currentView = view || 'week';
    
    // Navigate based on current view, just like the header
    switch (currentView) {
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
    
    // Update both the main calendar and the mini calendar
    console.log("🔄 About to call onDateChange:", { onDateChange: typeof onDateChange, newDate });
    if (onDateChange && typeof onDateChange === 'function') {
      console.log("✅ Calling onDateChange with:", newDate);
      onDateChange(newDate);
    } else {
      console.warn('❌ onDateChange is not available, only updating mini calendar');
    }
    
    // Also update the mini calendar to show the month containing the new date
    setMiniCalendarMonth(newDate);
  };

  // Get practitioners for Practitioners (only for admin/staff)
  const { data: practitioners } = useQuery({
    queryKey: ["/api/practitioners"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/practitioners");
        return response;
      } catch (error) {
        console.error("Error fetching practitioners:", error);
        return [];
      }
    },
    retry: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: isAdminOrStaff, // Only fetch for admin/staff
  });

  // Build Practitioners list based on role
  const buildTeamMembers = (): TeamMember[] => {
    if (isPractitioner) {
      // Practitioners only see themselves
      return [
        {
          id: user?.id || '',
          name: `My Appointments (${user?.firstName || 'Unknown'} ${user?.lastName || 'User'})`,
          avatar: `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`,
          color: "bg-primary",
          isCurrentUser: true,
        }
      ];
    }

    if (isAdminOrStaff) {
      // Admin/staff see all Practitioners
      const teamMembers: TeamMember[] = [
        {
          id: "all",
          name: "All Practitioners",
          avatar: "AT",
          color: "bg-blue-500",
        }
      ];

      // Add current user only if they have a practitioner profile
      if (user?.id) {
        // Check if current user has a practitioner profile
        const hasPractitionerProfile = practitioners?.some((p: any) => p.user?.id === user.id);
        if (hasPractitionerProfile) {
          teamMembers.push({
            id: user.id,
            name: `Current User (${user?.firstName || 'Unknown'} ${user?.lastName || 'User'})`,
            avatar: `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`,
            color: "bg-primary",
            isCurrentUser: true,
          });
        } else {
    
        }
      }

      // Add all practitioners (only users who have practitioner profiles)
      if (practitioners) {
        practitioners.forEach((p: any) => {
          teamMembers.push({
            id: p.user?.id || p.id,
            name: `${p.user?.firstName} ${p.user?.lastName}`,
            avatar: `${p.user?.firstName?.[0] || ''}${p.user?.lastName?.[0] || ''}`,
            color: "bg-green-500",
          });
        });
      }

      return teamMembers;
    }

    // Default fallback
    return [];
  };

  const teamMembers = buildTeamMembers();

  // Check if "All Practitioners" is selected
  const isAllSelected = selectedTeamMembers.includes('all');
  
  // Fetch upcoming events from events table
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events", "upcoming"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/events");
        console.log("📅 Calendar Sidebar Events Response:", {
          userRole: user?.role,
          responseData: response?.data,
          responseLength: response?.data?.length
        });
        return response?.data || response || [];
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
        return [];
      }
    },
    retry: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: !!user && (isPatient || isPractitioner || isAdminOrStaff),
  });

  // Debug: Log events query status

  // Filter upcoming events (events that are after today)
  const upcomingEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];
    
    const today = startOfDay(new Date());
    return events
      .filter((event: any) => {
        // Combine start_date and start_time to get the full datetime
        const eventDate = new Date(`${event.startDate}T${event.startTime}`);
        return isAfter(eventDate, today);
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(`${a.startDate}T${a.startTime}`);
        const dateB = new Date(`${b.startDate}T${b.startTime}`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10); // Limit to 10 upcoming events
  }, [events]);
  
  // Get all practitioner IDs (excluding 'all' and current user)
  const allPractitionerIds = teamMembers
    .filter(member => member.id !== 'all' && member.id !== (user?.id || ''))
    .map(member => member.id);

  // Check if all individual practitioners are selected
  const areAllPractitionersSelected = allPractitionerIds.length > 0 && 
    allPractitionerIds.every(id => selectedTeamMembers.includes(id));

  // Handle team member toggle with "All" logic
  const handleTeamMemberToggle = (memberId: string) => {
    
    
    if (memberId === 'all') {
      // Toggle "All Practitioners"
      if (isAllSelected) {
        // If "All" is selected, deselect it and keep only current user
  
        onTeamMemberToggle('all'); // Remove 'all'
        if (user?.id && teamMembers.some(member => member.id === user.id)) {
          onTeamMemberToggle(user.id);
        }
      } else {
        // If "All" is not selected, select all practitioner IDs
  
        if (onSelectAllTeamMembers) {
          onSelectAllTeamMembers(allPractitionerIds);
        } else {
          // Fallback: add all practitioner IDs individually
          allPractitionerIds.forEach(id => {
            if (!selectedTeamMembers.includes(id)) {
              onTeamMemberToggle(id);
            }
          });
        }
      }
    } else {
      // Handle individual member toggle

      onTeamMemberToggle(memberId);
    }
  };

  // Check if a member should be visually checked (considering "All" selection)
  const isMemberChecked = (memberId: string) => {
    if (memberId === 'all') {
      return isAllSelected;
    }
    // For individual members, show as checked if explicitly selected OR if "all" is selected
    return selectedTeamMembers.includes(memberId) || isAllSelected;
  };

  // Generate mini calendar
  const monthStart = startOfMonth(miniCalendarMonth);
  const monthEnd = endOfMonth(miniCalendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const renderMiniCalendar = () => {
    const today = new Date();
    const monthName = format(miniCalendarMonth, "MMMM yyyy");
    
    // Get first day of month and pad with previous month days
    const firstDayOfMonth = new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth(), 1);
    const startDay = firstDayOfMonth.getDay();
    const daysInPrevMonth = new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth(), 0).getDate();
    
    const calendarDays = [];
    
    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      calendarDays.push({
        date: new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    days.forEach(day => {
      calendarDays.push({
        date: day,
        isCurrentMonth: true,
      });
    });
    
    // Next month days to fill the grid
    const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({
        date: new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() + 1, i),
        isCurrentMonth: false,
      });
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{monthName}</CardTitle>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
              
                  navigateDate("prev");
                }}
                className="h-6 w-6 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setMiniCalendarMonth(today);
                  onDateSelect(today);
                }}
                className="h-6 px-2 text-xs"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
              
                  navigateDate("next");
                }}
                className="h-6 w-6 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={`day-header-${day}-${index}`} className="text-center font-medium text-muted-foreground p-1">
                {day}
              </div>
            ))}
            {calendarDays.map((dayInfo, index) => {
              const isToday = isSameDay(dayInfo.date, today);
              const isSelected = isSameDay(dayInfo.date, currentDate);
              
              return (
                <button
                  key={`calendar-day-${index}-${format(dayInfo.date, 'yyyy-MM-dd')}`}
                  onClick={() => onDateSelect(dayInfo.date)}
                  className={`
                    text-center p-1 rounded text-xs hover:bg-accent transition-colors cursor-pointer
                    ${!dayInfo.isCurrentMonth ? 'text-muted-foreground' : ''}
                    ${isToday ? 'bg-[#ffdd00] text-black font-medium' : ''}
                    ${isSelected && !isToday ? 'bg-accent' : ''}
                  `}
                >
                  {format(dayInfo.date, 'd')}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-64 lg:w-80 bg-background border-r p-2 lg:p-4 space-y-4 overflow-y-auto">
      {/* Mini Calendar */}
      {renderMiniCalendar()}

      {/* Practitioners - Only show for admin/staff */}
      {!isPatient && (
        <Card>
          <Collapsible open={teamMembersOpen} onOpenChange={setTeamMembersOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Practitioners</CardTitle>
                  {teamMembersOpen ? (
                    <ChevronDown className="h-4 w-4 cursor-pointer" />
                  ) : (
                    <ChevronRight className="h-4 w-4 cursor-pointer" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={member.id}
                      checked={isMemberChecked(member.id)}
                      onCheckedChange={() => handleTeamMemberToggle(member.id)}
                      className="cursor-pointer"
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      {member.avatar && (
                        <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-medium`}>
                          {member.avatar}
                        </div>
                      )}
                      <label 
                        htmlFor={member.id}
                        className={`text-sm cursor-pointer ${member.isDemo ? 'text-muted-foreground' : ''}`}
                      >
                        {member.name}
                        {member.isDemo && <span className="ml-1 text-xs">(Demo)</span>}
                      </label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Upcoming Events - Show for patients and practitioners */}
      {(isPatient || isPractitioner) && (
        <Card>
          <Collapsible open={upcomingEventsOpen} onOpenChange={setUpcomingEventsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                  <div className="flex items-center space-x-2">
                    {upcomingEvents.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {upcomingEvents.length}
                      </Badge>
                    )}
                    {upcomingEventsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event: any) => {
                      // Combine start_date and start_time to get the full datetime
                      const eventDate = new Date(`${event.startDate}T${event.startTime}`);
                      const isToday = isSameDay(eventDate, new Date());
                      const isTomorrow = isSameDay(eventDate, addDays(new Date(), 1));
                      
                      let dateLabel = format(eventDate, 'MMM d, yyyy');
                      if (isToday) dateLabel = 'Today';
                      else if (isTomorrow) dateLabel = 'Tomorrow';
                      
                      const timeLabel = format(eventDate, 'h:mm a');
                      
                      return (
                        <div 
                          key={event.id} 
                          className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => onDateSelect(eventDate)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">
                                {event.title}
                              </span>
                            </div>
                            <Badge 
                              variant={isToday ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              {dateLabel}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{timeLabel}</span>
                            </div>
                            
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            
                            {event.link && (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                                  View Details
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No upcoming events</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user?.role === 'patient' ? 'Your upcoming appointments will appear here' : 'Your upcoming appointments will appear here'}
                    </p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}