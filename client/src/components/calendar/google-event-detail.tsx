import React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, X, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface GoogleEventDetailProps {
  event: any;
  onClose: () => void;
}

export function GoogleEventDetail({ event, onClose }: GoogleEventDetailProps) {
  const formatDateTime = (dateTime: string) => {
    return format(new Date(dateTime), 'PPP p');
  };

  const formatTime = (dateTime: string) => {
    return format(new Date(dateTime), 'p');
  };

  const getEventColor = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800';
      case 'appointment':
        return 'bg-green-100 text-green-800';
      case 'reminder':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openInGoogleCalendar = () => {
    if (event.htmlLink) {
      window.open(event.htmlLink, '_blank');
    }
  };

  return (
    <div className="space-y-6">
             {/* Header */}
       <div className="flex items-center justify-between">
         <div className="flex items-center space-x-2">
           <Badge variant="secondary" className={`text-xs ${getEventColor(event.type || 'meeting')}`}>
             Google Calendar
           </Badge>
           {event.status && (
             <Badge variant="outline" className="capitalize text-xs">
               {event.status}
             </Badge>
           )}
         </div>
         <Button variant="ghost" size="sm" onClick={onClose}>
           <X className="h-3 w-3" />
         </Button>
       </div>

      {/* Event Title */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">{event.summary}</h2>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
            {event.description}
          </p>
        )}
      </div>

      <Separator />

      {/* Event Details */}
      <div className="space-y-4">
                 {/* Date and Time */}
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center space-x-2">
               <CalendarIcon className="h-4 w-4" />
               <span>Date & Time</span>
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-1">
             <div className="flex items-center space-x-2">
               <Clock className="h-3 w-3 text-muted-foreground" />
               <span className="text-sm">
                 {event.start?.dateTime ? (
                   <>
                     {formatDateTime(event.start.dateTime)}
                     {event.end?.dateTime && (
                       <span className="text-muted-foreground ml-1">
                         - {formatTime(event.end.dateTime)}
                       </span>
                     )}
                   </>
                 ) : (
                   format(new Date(event.start?.date || event.start?.dateTime), 'PPP')
                 )}
               </span>
             </div>
             {event.duration && (
               <div className="text-xs text-muted-foreground ml-5">
                 Duration: {Math.round(event.duration / (1000 * 60))} minutes
               </div>
             )}
           </CardContent>
         </Card>

                 {/* Location */}
         {event.location && (
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center space-x-2">
                 <MapPin className="h-4 w-4" />
                 <span>Location</span>
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-sm text-foreground">{event.location}</p>
             </CardContent>
           </Card>
         )}

                 {/* Organizer */}
         {event.organizer && (
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center space-x-2">
                 <User className="h-4 w-4" />
                 <span>Organizer</span>
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-1">
                 <div>
                   <span className="text-sm font-medium">{event.organizer.displayName || 'Unknown'}</span>
                   {event.organizer.email && (
                     <div className="text-xs text-muted-foreground">
                       {event.organizer.email}
                     </div>
                   )}
                 </div>
               </div>
             </CardContent>
           </Card>
         )}

                 {/* Attendees */}
         {event.attendees && event.attendees.length > 0 && (
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium">Attendees</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-2">
                 {event.attendees.map((attendee: any, index: number) => (
                   <div key={index} className="flex items-center justify-between">
                     <div>
                       <span className="text-sm font-medium">
                         {attendee.displayName || attendee.email || 'Unknown'}
                       </span>
                       {attendee.email && attendee.displayName && (
                         <div className="text-xs text-muted-foreground">
                           {attendee.email}
                         </div>
                       )}
                     </div>
                     {attendee.responseStatus && (
                       <Badge variant="outline" className="capitalize text-xs">
                         {attendee.responseStatus}
                       </Badge>
                     )}
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         )}

                 {/* Conference Data (for video calls) */}
         {event.conferenceData && (
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium">Video Conference</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-2">
                 {event.conferenceData.entryPoints?.map((entry: any, index: number) => (
                   <div key={index} className="flex items-center justify-between">
                     <span className="text-sm capitalize">{entry.entryPointType}</span>
                     <Button
                       variant="outline"
                       size="sm"
                       className="text-xs h-7 px-2"
                       onClick={() => window.open(entry.uri, '_blank')}
                     >
                       Join
                     </Button>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         )}
      </div>

             {/* Actions */}
       <div className="flex justify-end space-x-2 pt-4">
         <Button variant="outline" size="sm" onClick={onClose}>
           Close
         </Button>
         {event.htmlLink && (
           <Button size="sm" onClick={openInGoogleCalendar} className="flex items-center space-x-2">
             <ExternalLink className="h-3 w-3" />
             <span className="text-sm">Open in Google Calendar</span>
           </Button>
         )}
       </div>
    </div>
  );
}
