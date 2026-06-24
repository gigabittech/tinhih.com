import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, Search, Filter, Eye } from 'lucide-react';

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

interface Practitioner {
  id: string;
  userId: string;
  licenseNumber: string | null;
  specialty: string | null;
  qualifications: string[] | null;
  bio: string | null;
  consultationFee: string | null;
  bookingLink: string | null;
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

interface BookingWithDetails {
  booking: PublicBooking;
  user: PublicBookingUser;
  practitioner: Practitioner;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AllPublicBookings() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    practitionerId: '',
    search: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [pagination.page, pagination.limit, filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.practitionerId && { practitionerId: filters.practitionerId }),
      });

      const response = await apiRequest(`/api/public-bookings?${params}`, 'GET');
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
        setPagination(data.pagination);
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

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
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

  const filteredBookings = bookings.filter(booking => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const userName = `${booking.user.firstName} ${booking.user.lastName}`.toLowerCase();
      const userEmail = booking.user.email.toLowerCase();
      const practitionerName = booking.practitioner.specialty?.toLowerCase() || '';
      
      return userName.includes(searchTerm) || 
             userEmail.includes(searchTerm) || 
             practitionerName.includes(searchTerm);
    }
    return true;
  });

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
        <h2 className="text-2xl font-bold">All Public Bookings</h2>
        <Badge variant="outline">{pagination.total} total bookings</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or specialty..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Practitioner</label>
              <Select value={filters.practitionerId} onValueChange={(value) => handleFilterChange('practitionerId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All practitioners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All practitioners</SelectItem>
                  {/* You can add practitioner options here if needed */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((bookingWithDetails) => {
            const { booking, user, practitioner } = bookingWithDetails;
            const appointmentDate = new Date(booking.appointmentDate);
            
            return (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={getStatusColor(booking.status)}>
                          <span className="capitalize">{booking.status}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

                        <div className="space-y-2">
                          <div className="text-sm text-gray-500">Practitioner</div>
                          <div className="font-medium">
                            {practitioner.specialty || 'General Practitioner'}
                          </div>
                          {practitioner.consultationFee && (
                            <div className="text-sm text-gray-600">
                              Fee: ${practitioner.consultationFee}
                            </div>
                          )}
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

                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNum)}
                        isActive={pageNum === pagination.page}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className={pagination.page >= pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            
            <div className="text-center text-sm text-gray-500 mt-2">
              Page {pagination.page} of {pagination.totalPages} • {pagination.total} total bookings
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
