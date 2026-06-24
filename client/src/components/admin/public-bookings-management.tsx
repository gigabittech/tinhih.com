import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PublicBookingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PublicBooking {
  id: string;
  bookingLink: string;
  practitionerId: string;
  publicBookingUserId: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BookingWithUser {
  booking: PublicBooking;
  user: PublicBookingUser;
}

interface PublicBookingsManagementProps {
  practitionerId: string;
}

export function PublicBookingsManagement({ practitionerId }: PublicBookingsManagementProps) {
  const [bookings, setBookings] = useState<BookingWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithUser | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [practitionerId]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/public-bookings/practitioner/${practitionerId}`, 'GET');
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedBooking || !newStatus) return;

    try {
      setUpdating(true);
      const response = await apiRequest(`/api/public-bookings/${selectedBooking.booking.id}/status`, 'PATCH', {
        status: newStatus,
        notes: notes || undefined,
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `Booking ${newStatus} successfully`,
        });
        setStatusDialogOpen(false);
        setSelectedBooking(null);
        setNewStatus('');
        setNotes('');
        fetchBookings(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update booking status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = (booking: BookingWithUser, status: string) => {
    setSelectedBooking(booking);
    setNewStatus(status);
    setNotes('');
    setStatusDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Public Bookings</h2>
        <Badge variant="outline">{bookings.length} total bookings</Badge>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-500">Public bookings will appear here when patients book appointments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((bookingWithUser) => {
            const { booking, user } = bookingWithUser;
            const appointmentDate = new Date(booking.appointmentDate);
            
            return (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusIcon(booking.status)}
                          <span className="ml-1 capitalize">{booking.status}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">{user.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{booking.appointmentTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Service:</span>
                            <span className="text-sm font-medium capitalize">{booking.service}</span>
                          </div>
                        </div>
                      </div>

                      {user.message && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Message:</span>
                          </div>
                          <p className="text-sm text-gray-700">{user.message}</p>
                        </div>
                      )}

                      {booking.notes && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700">Notes:</span>
                          </div>
                          <p className="text-sm text-blue-700">{booking.notes}</p>
                        </div>
                      )}
                    </div>

                    {booking.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => openStatusDialog(bookingWithUser, 'accepted')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openStatusDialog(bookingWithUser, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === 'accepted' ? 'Accept' : 'Reject'} Booking
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Booking Details</h4>
                <p className="text-sm text-gray-600">
                  {selectedBooking.user.firstName} {selectedBooking.user.lastName} - {selectedBooking.user.email}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedBooking.booking.appointmentDate), 'EEEE, MMMM d, yyyy')} at {selectedBooking.booking.appointmentTime}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder={`Add notes for ${newStatus === 'accepted' ? 'accepting' : 'rejecting'} this booking...`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setStatusDialogOpen(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className={newStatus === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {updating ? 'Updating...' : `${newStatus === 'accepted' ? 'Accept' : 'Reject'} Booking`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
