import React, { useEffect } from 'react';
import { AllPublicBookings } from '@/components/admin/all-public-bookings';
import { usePageTitle } from '@/context/page-context';

export default function AdminPublicBookings() {
  const { setPageInfo } = usePageTitle();

  useEffect(() => {
    setPageInfo("All Public Bookings", "View and manage all public booking requests across all practitioners");
  }, [setPageInfo]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Public Bookings</h1>
        <p className="text-gray-600">
          View and manage all public booking requests across all practitioners.
        </p>
      </div>

      <AllPublicBookings />
    </div>
  );
}
