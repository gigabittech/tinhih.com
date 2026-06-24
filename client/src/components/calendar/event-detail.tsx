import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Link as LinkIcon, FileText, ExternalLink, Image as ImageIcon, CalendarDays, User, Tag } from "lucide-react";
import { format } from "date-fns";

interface EventDetailProps {
  event: any;
  onClose: () => void;
}

export function EventDetail({ event, onClose }: EventDetailProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExternalLink = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const formatDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const formatDateTime = (date: Date) => {
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Event Details</h2>
          <p className="text-sm text-muted-foreground">TiNHiH Community Event</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Event Image */}
      {event.thumbnail && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ImageIcon className="w-4 h-4" />
            Event Image
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={event.thumbnail}
              alt={event.title}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Event Card */}
      <Card className="border-l-4 border-l-[#3b82f6]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl text-foreground mb-2">
                {event.title}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.start)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Clock className="w-4 h-4" />
                <span>
                  {formatTime(event.start)} - {formatTime(event.end)}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="bg-[#3b82f6] text-white">
              Event
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="w-4 h-4" />
                Description
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="w-4 h-4" />
                Location
              </div>
              <p className="text-sm text-muted-foreground">
                {event.location}
              </p>
            </div>
          )}

          {/* External Link */}
          {event.link && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <LinkIcon className="w-4 h-4" />
                More Information
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExternalLink(event.link)}
                className="w-full justify-start"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Event Page
              </Button>
            </div>
          )}

          {/* Event Details */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-foreground">Event Type:</span>
                <p className="text-muted-foreground">Community Event</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Duration:</span>
                <p className="text-muted-foreground">
                  {event.duration ? `${event.duration} minutes` : 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Event Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event ID */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-foreground">Event ID:</span>
              <p className="text-muted-foreground font-mono text-xs">{event.id}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Status:</span>
              <Badge variant={event.isActive ? "default" : "secondary"} className="ml-2">
                {event.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarDays className="w-4 h-4" />
              Event Period
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-foreground">Start:</span>
                <p className="text-muted-foreground">{formatDateTime(event.start)}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">End:</span>
                <p className="text-muted-foreground">{formatDateTime(event.end)}</p>
              </div>
            </div>
          </div>

          {/* Created/Updated Info */}
          {event.createdAt && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Tag className="w-4 h-4" />
                Event Details
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-foreground">Created:</span>
                  <p className="text-muted-foreground">{formatDateTime(new Date(event.createdAt))}</p>
                </div>
                {event.updatedAt && (
                  <div>
                    <span className="font-medium text-foreground">Updated:</span>
                    <p className="text-muted-foreground">{formatDateTime(new Date(event.updatedAt))}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Close
        </Button>
        {event.link && (
          <Button
            onClick={() => handleExternalLink(event.link)}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Visit Event
          </Button>
        )}
      </div>
    </div>
  );
}
