import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Stethoscope, 
  DollarSign, 
  Quote, 
  CalendarDays, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Crown
} from "lucide-react";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";

export default function AdminPanel() {
  const { setPageInfo } = usePageTitle();
  const { user } = useAuth();

  useEffect(() => {
    setPageInfo("Admin Panel", "TiNHiH Portal Administration Dashboard");
  }, [setPageInfo]);

  // Fetch admin dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const response = await api.get("/api/admin/dashboard");
      return response;
    },
  });

  const adminSections = [
    {
      title: "Staff Management",
      description: "Manage staff accounts and permissions",
      icon: Users,
      path: "/admin/staff",
      color: "bg-blue-500",
      stats: dashboardData?.staffCount || 0
    },
    {
      title: "Practitioner Management",
      description: "Manage recovery specialists and their profiles",
      icon: Stethoscope,
      path: "/admin/practitioners",
      color: "bg-green-500",
      stats: dashboardData?.practitionerCount || 0
    },
    {
      title: "Admin Management",
      description: "Manage system administrators and their permissions",
      icon: Crown,
      path: "/admin/admins",
      color: "bg-purple-500",
      stats: dashboardData?.adminCount || 0
    },
    {
      title: "Transactions",
      description: "Monitor payments and financial transactions",
      icon: DollarSign,
      path: "/admin/transactions",
      color: "bg-yellow-500",
      stats: dashboardData?.transactionCount || 0
    },
    {
      title: "Quotes",
      description: "Manage inspirational quotes and content",
      icon: Quote,
      path: "/admin/quotes",
      color: "bg-purple-500",
      stats: dashboardData?.quoteCount || 0
    },
    {
      title: "Events",
      description: "Manage community events and activities",
      icon: CalendarDays,
      path: "/admin/events",
      color: "bg-red-500",
      stats: dashboardData?.eventCount || 0
    }
  ];

  return (
    <AdminLayout>
    <div className="flex flex-col h-full">
      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.staffCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active staff members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Practitioners</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.practitionerCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Recovery specialists
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${dashboardData?.monthlyRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">
                This month's earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.activeEventCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Upcoming events
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.path} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${section.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {section.stats}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-4">{section.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <Link href={section.path}>
                    <Button className="w-full" variant="outline">
                      Manage {section.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading recent activity...</p>
                </div>
              ) : dashboardData?.recentActivity?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4 p-3 rounded-lg border">
                      <div className="flex-shrink-0">
                        {activity.type === 'payment' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {activity.type === 'user' && <Users className="h-5 w-5 text-blue-500" />}
                        {activity.type === 'event' && <CalendarDays className="h-5 w-5 text-red-500" />}
                        {activity.type === 'default' && <Clock className="h-5 w-5 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
