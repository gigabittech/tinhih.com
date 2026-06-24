import { useState, useEffect } from "react";
import { MemberLayout } from "@/components/layout/member-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { usePageTitle } from "@/context/page-context";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export default function MemberEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();

  useEffect(() => {
    setPageInfo("Community Events", "Stay updated with upcoming community events");
  }, [setPageInfo]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/events");
      if (response.success) {
        const eventsData = response.data || response;
        setEvents(eventsData);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch events",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { status: "upcoming", color: "bg-blue-100 text-blue-800", label: "Upcoming" };
    } else if (now >= start && now <= end) {
      return { status: "ongoing", color: "bg-green-100 text-green-800", label: "Ongoing" };
    } else {
      return { status: "past", color: "bg-gray-100 text-gray-800", label: "Past" };
    }
  };

  const upcomingEvents = events
    .filter(event => event.isActive && new Date(event.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const ongoingEvents = events
    .filter(event => {
      const now = new Date();
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      return event.isActive && now >= start && now <= end;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastEvents = events
    .filter(event => event.isActive && new Date(event.endDate) < new Date())
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading events...</span>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Community Events</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Stay connected with our community through various events and activities
          </p>
        </div>

        {/* Ongoing Events */}
        {ongoingEvents.length > 0 && (
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <Calendar className="h-5 w-5" />
                <span>Currently Happening</span>
                <Badge className="bg-green-200 text-green-800">Live</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ongoingEvents.map((event) => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-green-200 space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base sm:text-lg text-green-800">{event.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Until {format(new Date(event.endDate), "MMM dd, yyyy 'at' h:mm a")}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-green-300 text-green-700 w-full sm:w-auto">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Now
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Upcoming Events</span>
              <Badge className="bg-blue-100 text-blue-800">{upcomingEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base sm:text-lg">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(event.startDate), "MMM dd, yyyy 'at' h:mm a")}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Check back soon for new community events
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Past Events</span>
                <Badge className="bg-gray-100 text-gray-800">{pastEvents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pastEvents.map((event) => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-gray-50 space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base sm:text-lg text-gray-600">{event.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{event.description}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Ended {format(new Date(event.endDate), "MMM dd, yyyy")}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-gray-500 w-fit">
                      Past Event
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Calendar Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-blue-900 mb-2">Stay Connected</h3>
              <p className="text-blue-700 mb-4 text-sm sm:text-base">
                Join our community events to connect with others, learn new things, and support each other in your healthcare journey.
              </p>
              <p className="text-xs sm:text-sm text-blue-600">
                Events are regularly updated. Check back often for new opportunities to engage with the community.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  );
}
