import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";
import { format } from "date-fns";
import {
  Quote,
  Calendar,
  Heart,
  Users,
  TrendingUp,
  ExternalLink,
  Clock,
  Crown,
  Gift,
  ShoppingBag,
  Star,
  Award
} from "lucide-react";
import { DonationDialog } from "@/components/donation/donation-dialog";
import { MemberLayout } from "@/components/layout/member-layout";
import { PremiumStatCard } from "@/components/premium-stat-card";
import { useMemberStore, useEventStore, useQuoteStore } from "@/store";
import { Link } from "wouter";

export default function MemberDashboard() {
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();

  // Store hooks
  const {
    profile,
    stats,
    isLoading: memberLoading,
    error: memberError,
    fetchProfile,
    fetchStats
  } = useMemberStore();

  const {
    upcomingEvents,
    isLoading: eventsLoading,
    error: eventsError,
    fetchEvents
  } = useEventStore();

  const {
    currentQuote,
    isLoading: quotesLoading,
    error: quotesError,
    fetchQuotes
  } = useQuoteStore();

  useEffect(() => {
    setPageInfo("Premium Member Dashboard", "Welcome to the TiNHiH Community");
  }, [setPageInfo]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
    fetchEvents();
    fetchQuotes();
  }, [fetchProfile, fetchStats, fetchEvents, fetchQuotes]);

  // Handle errors
  useEffect(() => {
    if (memberError) {
      toast({
        title: "Error",
        description: memberError,
        variant: "destructive",
      });
    }
  }, [memberError, toast]);

  useEffect(() => {
    if (eventsError) {
      toast({
        title: "Error",
        description: eventsError,
        variant: "destructive",
      });
    }
  }, [eventsError, toast]);

  useEffect(() => {
    if (quotesError) {
      toast({
        title: "Error",
        description: quotesError,
        variant: "destructive",
      });
    }
  }, [quotesError, toast]);

  const getCategoryColor = (category: string) => {
    const colors = {
      health: "bg-blue-100 text-blue-800",
      wellness: "bg-green-100 text-green-800",
      motivation: "bg-yellow-100 text-yellow-800",
      recovery: "bg-purple-100 text-purple-800",
      general: "bg-gray-100 text-gray-800",
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const isLoading = memberLoading || eventsLoading || quotesLoading;

  if (isLoading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffdd00]"></div>
          <span className="ml-2 text-gray-600">Loading your premium dashboard...</span>
        </div>
      </MemberLayout>
    );
  }

  // Calculate member stats
  const eventsAttended = stats?.eventsAttended || 0;
  const totalDonations = stats?.totalDonations || 0; // This is the amount, not count
  const productsPurchased = stats?.productsPurchased || 0;
  const daysAsMember = stats?.daysAsMember || 0;

  // Debug logging
  console.log('Member dashboard stats:', stats);
  console.log('Products purchased:', productsPurchased);

  return (
    <MemberLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center py-8 sm:py-12 bg-gradient-to-r from-[#ffdd00]/10 via-white to-[#ffdd00]/10 rounded-2xl border border-[#ffdd00]/20">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 rounded-full bg-gradient-to-r from-[#ffdd00] to-yellow-400 shadow-lg">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-black" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Welcome to TiNHiH Community
            </h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 max-w-2xl mx-auto px-4">
            Your support makes healthcare better for everyone. Thank you for being part of our community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 px-4">
            <Button
              className="bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold px-6 sm:px-8 py-2 sm:py-3 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 w-full sm:w-auto"
              onClick={() => window.location.href = '/store'}
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Visit Store
            </Button>
            <DonationDialog>
              <Button
                variant="outline"
                className="border-[#ffdd00] text-[#ffdd00] hover:bg-[#ffdd00] hover:text-black font-semibold px-6 sm:px-8 py-2 sm:py-3 transition-all duration-200 w-full sm:w-auto"
              >
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Make a Donation
              </Button>
            </DonationDialog>
          </div>
        </div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PremiumStatCard
            icon={Users}
            number={eventsAttended}
            label="Events Attended"
            subtext="This Month"
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            delay={0}
          />

          <PremiumStatCard
            icon={Heart}
            number={totalDonations}
            label="Total Donations"
            prefix="$"
            subtext="This Year"
            gradient="bg-gradient-to-br from-pink-500 to-red-500"
            delay={200}
          />

          <PremiumStatCard
            icon={ShoppingBag}
            number={productsPurchased}
            label="Products Purchased"
            subtext="Member Discount"
            gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            delay={400}
          />

          <PremiumStatCard
            icon={Crown}
            number={daysAsMember}
            label="Days as Member"
            suffix="days"
            subtext="Premium Status"
            gradient="bg-gradient-to-br from-[#ffdd00] to-yellow-500"
            delay={600}
          />
        </div>

        {/* Featured Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inspirational Quote */}
          {currentQuote && (
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                    <Quote className="h-5 w-5 text-white" />
                  </div>
                  <span>Today's Inspiration</span>
                  {currentQuote.isFeatured && (
                    <Badge className="bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <blockquote className="text-xl italic text-gray-700 mb-6 leading-relaxed">
                  "{currentQuote.text}"
                </blockquote>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-gray-800">
                    — {currentQuote.author}
                  </p>
                  <Badge className={getCategoryColor(currentQuote.category)}>
                    {currentQuote.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span>Upcoming Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents
                    .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .slice(0, 3)
                    .map((event: any) => (
                      <div key={event.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-[#ffdd00]/30 transition-all duration-200">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(event.startDate), "MMM dd, yyyy 'at' h:mm a")}</span>
                            </div>
                            {event.location && (
                              <span className="flex items-center space-x-1">
                                <span>📍</span>
                                <span>{event.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="border-[#ffdd00] text-[#ffdd00] hover:bg-[#ffdd00] hover:text-black">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    ))}
                  <Button
                    variant="outline"
                    className="w-full border-[#ffdd00] text-[#ffdd00] hover:bg-[#ffdd00] hover:text-black font-semibold"
                    onClick={() => window.location.href = '/member/events'}
                  >
                    View All Events
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No upcoming events at the moment</p>
                  <p className="text-sm text-gray-500 mt-2">Check back soon for new community events!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-[#ffdd00] to-yellow-400">
                <Award className="h-5 w-5 text-black" />
              </div>
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3 border-gray-200 hover:border-[#ffdd00] hover:bg-[#ffdd00]/10 transition-all duration-200"
                onClick={() => window.location.href = '/store'}
              >
                <ShoppingBag className="h-6 w-6 text-[#ffdd00]" />
                <span className="font-semibold">Visit Store</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3 border-gray-200 hover:border-[#ffdd00] hover:bg-[#ffdd00]/10 transition-all duration-200"
                onClick={() => window.location.href = '/member/events'}
              >
                <Calendar className="h-6 w-6 text-[#ffdd00]" />
                <span className="font-semibold">View Events</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3 border-gray-200 hover:border-[#ffdd00] hover:bg-[#ffdd00]/10 transition-all duration-200"
                onClick={() => window.location.href = '/member/quotes'}
              >
                <Quote className="h-6 w-6 text-[#ffdd00]" />
                <span className="font-semibold">Read Quotes</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3 border-gray-200 hover:border-[#ffdd00] hover:bg-[#ffdd00]/10 transition-all duration-200"
                onClick={() => window.location.href = '/member/profile'}
              >
                <Users className="h-6 w-6 text-[#ffdd00]" />
                <span className="font-semibold">My Profile</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Community Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-[#ffdd00]/10 to-yellow-100/50">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 rounded-full bg-gradient-to-r from-[#ffdd00] to-yellow-400 shadow-lg">
                  <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-black" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Support Our Community</h3>
              </div>
              <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                Your donation helps us provide better healthcare services and support our community initiatives.
                Every contribution makes a difference.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 px-4">
                <DonationDialog>
                  <Button className="bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold px-6 sm:px-8 py-2 sm:py-3 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 w-full sm:w-auto">
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Make a Donation
                  </Button>
                </DonationDialog>
                <Link href="/store"
                  className="flex items-center justify-center rounded border border-[#ffdd00] text-[#ffdd00] hover:bg-[#ffdd00] hover:text-black font-semibold px-6 sm:px-8 py-2 transition-all duration-200 w-full sm:w-auto"
                >
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Visit Store
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  );
}
