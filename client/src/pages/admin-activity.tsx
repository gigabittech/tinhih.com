import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Eye, 
  Download,
  RefreshCw,
  Clock,
  MapPin,
  Monitor,
  CreditCard,
  Heart,
  UserPlus,
  MessageSquare,
  FileText,
  Video,
  DollarSign,
  Users,
  Shield
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";

interface Activity {
  id: string;
  userId?: string;
  type: string;
  title: string;
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

const activityTypeColors = {
  'user_login': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'user_logout': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'user_registered': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'appointment_created': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'appointment_updated': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'appointment_cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'appointment_completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'invoice_created': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'invoice_paid': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'payment_processed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'donation_received': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'message_sent': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'message_read': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  'profile_updated': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'password_changed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'admin_action': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'system_event': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  'telehealth_session_started': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'telehealth_session_ended': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'patient_onboarding_completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'member_onboarding_completed': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

const activityTypeLabels = {
  'user_login': 'User Login',
  'user_logout': 'User Logout',
  'user_registered': 'User Registration',
  'appointment_created': 'Appointment Created',
  'appointment_updated': 'Appointment Updated',
  'appointment_cancelled': 'Appointment Cancelled',
  'appointment_completed': 'Appointment Completed',
  'invoice_created': 'Invoice Created',
  'invoice_paid': 'Invoice Paid',
  'payment_processed': 'Payment Processed',
  'donation_received': 'Donation Received',
  'message_sent': 'Message Sent',
  'message_read': 'Message Read',
  'profile_updated': 'Profile Updated',
  'password_changed': 'Password Changed',
  'admin_action': 'Admin Action',
  'system_event': 'System Event',
  'telehealth_session_started': 'Telehealth Session Started',
  'telehealth_session_ended': 'Telehealth Session Ended',
  'patient_onboarding_completed': 'Patient Onboarding Completed',
  'member_onboarding_completed': 'Community Member Onboarding Completed'
};

const activityTypeIcons = {
  'user_login': User,
  'user_logout': User,
  'user_registered': UserPlus,
  'appointment_created': Calendar,
  'appointment_updated': Calendar,
  'appointment_cancelled': Calendar,
  'appointment_completed': Calendar,
  'invoice_created': FileText,
  'invoice_paid': CreditCard,
  'payment_processed': CreditCard,
  'donation_received': Heart,
  'message_sent': MessageSquare,
  'message_read': MessageSquare,
  'profile_updated': User,
  'password_changed': User,
  'admin_action': Shield,
  'system_event': Monitor,
  'telehealth_session_started': Video,
  'telehealth_session_ended': Video,
  'patient_onboarding_completed': UserPlus,
  'member_onboarding_completed': UserPlus
};

export default function AdminActivity() {
  const { setPageInfo } = usePageTitle();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setPageInfo("System Activity", "Monitor system activity and user actions");
  }, [setPageInfo]);

  useEffect(() => {
    fetchActivities();
    fetchUsers();
  }, [dateRange]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/admin/activities?dateRange=${dateRange}`);
      setActivities(response || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch activities",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/api/admin/users");
      setUsers(response || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleViewDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowDetailsDialog(true);
  };

  const exportActivities = () => {
    const csvContent = [
      ['Date', 'Type', 'User', 'Description', 'IP Address', 'User Agent'].join(','),
      ...filteredActivities.map(activity => [
        new Date(activity.createdAt).toLocaleString(),
        activityTypeLabels[activity.type as keyof typeof activityTypeLabels] || activity.type,
        activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System',
        activity.description,
        activity.ipAddress || '',
        activity.userAgent || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Activity logs exported successfully"
    });
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.user && (
        activity.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      ));

    const matchesType = selectedType === "all" || activity.type === selectedType;
    const matchesUser = selectedUser === "all" || activity.userId === selectedUser;

    return matchesSearch && matchesType && matchesUser;
  });

  const activityStats = {
    total: activities.length,
    today: activities.filter(a => {
      const today = new Date().toDateString();
      return new Date(a.createdAt).toDateString() === today;
    }).length,
    thisWeek: activities.filter(a => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(a.createdAt) >= weekAgo;
    }).length,
    uniqueUsers: new Set(activities.map(a => a.userId).filter(Boolean)).size
  };

  const getActivityIcon = (type: string) => {
    const IconComponent = activityTypeIcons[type as keyof typeof activityTypeIcons] || Activity;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
              <p className="text-muted-foreground mt-1">Monitor system activities and user actions</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={fetchActivities} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={exportActivities}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                    <p className="text-2xl font-bold">{activityStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold">{activityStats.today}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">{activityStats.thisWeek}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{activityStats.uniqueUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search activities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="type">Activity Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(activityTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="user">User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateRange">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last 24 Hours</SelectItem>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                      <SelectItem value="365">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activities List */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs ({filteredActivities.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading activities...</span>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No activities found matching your criteria</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(activity.type)}
                          <Badge 
                            variant="secondary" 
                            className={activityTypeColors[activity.type as keyof typeof activityTypeColors] || 'bg-gray-100 text-gray-800'}
                          >
                            {activityTypeLabels[activity.type as keyof typeof activityTypeLabels] || activity.type}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                            {activity.user && (
                              <span className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                {activity.user.firstName} {activity.user.lastName} ({activity.user.role})
                              </span>
                            )}
                            {activity.ipAddress && (
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {activity.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(activity)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Activity Details</DialogTitle>
              <DialogDescription>
                Detailed information about this activity
              </DialogDescription>
            </DialogHeader>
            {selectedActivity && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Activity Type</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getActivityIcon(selectedActivity.type)}
                      <Badge 
                        variant="secondary" 
                        className={activityTypeColors[selectedActivity.type as keyof typeof activityTypeColors] || 'bg-gray-100 text-gray-800'}
                      >
                        {activityTypeLabels[selectedActivity.type as keyof typeof activityTypeLabels] || selectedActivity.type}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date & Time</Label>
                    <p className="text-sm mt-1">{new Date(selectedActivity.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="text-sm mt-1">{selectedActivity.title}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1">{selectedActivity.description}</p>
                </div>

                {selectedActivity.user && (
                  <div>
                    <Label className="text-sm font-medium">User</Label>
                    <div className="mt-1 p-2 bg-muted rounded">
                      <p className="text-sm"><strong>Name:</strong> {selectedActivity.user.firstName} {selectedActivity.user.lastName}</p>
                      <p className="text-sm"><strong>Email:</strong> {selectedActivity.user.email}</p>
                      <p className="text-sm"><strong>Role:</strong> {selectedActivity.user.role}</p>
                    </div>
                  </div>
                )}

                {selectedActivity.ipAddress && (
                  <div>
                    <Label className="text-sm font-medium">IP Address</Label>
                    <p className="text-sm mt-1 font-mono">{selectedActivity.ipAddress}</p>
                  </div>
                )}

                {selectedActivity.userAgent && (
                  <div>
                    <Label className="text-sm font-medium">User Agent</Label>
                    <p className="text-sm mt-1 font-mono text-xs break-all">{selectedActivity.userAgent}</p>
                  </div>
                )}

                {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Additional Data</Label>
                    <pre className="text-sm mt-1 p-2 bg-muted rounded overflow-auto">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
