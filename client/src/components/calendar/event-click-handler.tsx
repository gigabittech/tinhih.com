import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AppointmentDetail } from "@/components/appointments/appointment-detail";
import { GoogleEventDetail } from "@/components/calendar/google-event-detail";
import { EventDetail } from "@/components/calendar/event-detail";

// Global state to track if any event detail is open
let isAnyEventDetailOpen = false;

// Function to update global state
const setGlobalEventDetailOpen = (open: boolean) => {
  isAnyEventDetailOpen = open;
  // Add/remove a class to body to prevent calendar interactions
  if (open) {
    document.body.classList.add('event-detail-open');
  } else {
    document.body.classList.remove('event-detail-open');
  }
};

// Function to check if any event detail is open
export const isEventDetailOpen = () => isAnyEventDetailOpen;

interface EventClickHandlerProps {
  children: React.ReactNode;
  event: any;
}

export function EventClickHandler({ children, event }: EventClickHandlerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Cleanup global state on unmount
  useEffect(() => {
    return () => {
      if (isOpen) {
        setGlobalEventDetailOpen(false);
      }
    };
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("🎯 Event clicked for details:", {
      id: event.id,
      title: event.title,
      type: event.type,
      start: event.start,
      end: event.end
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    console.log("📋 Event detail sheet state change:", { open, eventTitle: event.title });
    setIsOpen(open);
    // Update global state to prevent calendar interactions
    setGlobalEventDetailOpen(open);
  };

  // Check event type to determine which detail component to show
  const isGoogleEvent = event.id?.startsWith('google-') || event._source === 'google_calendar' || event.googleEventData;
  const isEventFromEventsTable = event.type === 'event' || event.id?.startsWith('event-');

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer event-click-handler">
        {children}
      </div>
      
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent 
          className="w-[350px] sm:w-[450px] lg:w-[600px] overflow-y-auto h-full"
        >
          {isOpen && (
            isGoogleEvent ? (
              <GoogleEventDetail
                event={event.googleEventData || event}
                onClose={handleClose}
              />
            ) : isEventFromEventsTable ? (
              <EventDetail
                event={event}
                onClose={handleClose}
              />
            ) : (
              <AppointmentDetail
                appointmentId={event.id}
                onClose={handleClose}
              />
            )
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
