import React from "react";
import { format } from "date-fns";
import { X, CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventClickHandler } from "@/components/calendar/event-click-handler";

interface EventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: any[];
  date: Date;
}

export function EventsModal({ isOpen, onClose, events, date }: EventsModalProps) {
  if (!isOpen) return null;

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const getEventColor = (event: any) => {
    if (event.id?.startsWith('google-')) {
      return 'bg-green-500 text-white';
    }
    return 'bg-[#ffdd00] text-black';
  };

  const sortedEvents = events.sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">All Events</h2>
            <p className="text-muted-foreground">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Events List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No events scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEvents.map((event) => (
                <EventClickHandler key={event.id} event={event}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getEventColor(event)}`}>
                              {event.id?.startsWith('google-') ? 'Google Calendar' : 'Appointment'}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(event.start)}
                              {event.end && (
                                <>
                                  <span className="mx-1">-</span>
                                  {formatTime(event.end)}
                                </>
                              )}
                            </div>
                          </div>
                          <h3 className="font-medium text-foreground mb-1">
                            {event.title}
                          </h3>
                          {event.patientName && (
                            <p className="text-sm text-muted-foreground">
                              Patient: {event.patientName}
                            </p>
                          )}
                          {event.practitionerName && (
                            <p className="text-sm text-muted-foreground">
                              {event.id?.startsWith('google-') ? 'Organizer' : 'Practitioner'}: {event.practitionerName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </EventClickHandler>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
