import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { PublicBookingsManagement } from '@/components/admin/public-bookings-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Mail, Phone } from 'lucide-react';
import { usePageTitle } from '@/context/page-context';

export default function PractitionerPublicBookings() {
  const { user } = useAuth();
  const { setPageInfo } = usePageTitle();
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageInfo("Public Bookings Management", "Manage and respond to public booking requests from patients");
  }, [setPageInfo]);

  useEffect(() => {
    if (user) {
      // Find the practitioner record for the current user
      fetchPractitionerId();
    }
  }, [user]);

  const fetchPractitionerId = async () => {
    try {
      setLoading(true);
      // You'll need to implement this API endpoint to get practitioner by user ID
      const response = await fetch(`/api/practitioners/user/${user?.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPractitionerId(data.data.id);
      }
    } catch (error) {
      console.error('Error fetching practitioner ID:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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

  if (!practitionerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Practitioner Profile Not Found</h3>
            <p className="text-gray-500">Please contact an administrator to set up your practitioner profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Public Bookings Management</h1>
        <p className="text-gray-600">
          Manage and respond to public booking requests from patients.
        </p>
      </div>

      <PublicBookingsManagement practitionerId={practitionerId} />
    </div>
  );
}
