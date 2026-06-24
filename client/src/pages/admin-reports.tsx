import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  Activity,
  Target
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

// Chart colors
const CHART_COLORS = {
  primary: '#ffdd00',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1'
};

interface ReportData {
  totalPatients: number;
  totalPractitioners: number;
  totalMembers: number;
  totalAppointments: number;
  totalDonations: number;
  totalInvoices: number;
  paidInvoices: number;
  totalMessages: number;
  totalTelehealthSessions: number;
  totalRevenue: number;
  monthlyStats: {
    month: string;
    patients: number;
    members: number;
    serviceBilling: number;
    donationsAmount: number;
  }[];
  topDonors: {
    email: string;
    totalAmount: number;
    donationCount: number;
  }[];
  appointmentStats: {
    status: string;
    count: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    amount?: number;
    date: string;
  }[];
}

export default function AdminReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("overview");
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();
  const { user } = useAuth();



  useEffect(() => {
    setPageInfo("Reports & Analytics", "View comprehensive reports and analytics");
  }, [setPageInfo]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        dateRange,
        reportType,
      });

      

      const response = await api.get(`/api/admin/reports?${params}`);
      
      if (response.success) {
        setReportData(response.data);
      } else {
        const errorMsg = response.error || "Failed to fetch report data";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      const errorMsg = error.message || "Failed to fetch report data";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType]);

  const handleExportReport = async (type: string) => {
    try {
      const response = await api.get(`/api/admin/reports/export?type=${type}&dateRange=${dateRange}`);
      
      if (response.success) {
        // Create and download the file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Report exported successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffdd00] mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Loading Analytics Dashboard</h3>
          <p className="text-muted-foreground">Gathering your data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">
            <BarChart3 className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Comprehensive insights into your platform</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={fetchReportData}
              className="flex items-center space-x-2 text-xs"
              size="sm"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={() => handleExportReport(reportType)}
              className="flex items-center space-x-2 text-xs"
              size="sm"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Filters and Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Report Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateRange">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="patients">Patients</SelectItem>
                      <SelectItem value="appointments">Appointments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-sm font-bold text-blue-600">
                  {reportData?.totalPatients || 0}
                </p>
                <p className="text-xs text-blue-600">Clients (Patients)</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-sm font-bold text-green-600">
                  {reportData?.totalAppointments || 0}
                </p>
                <p className="text-xs text-green-600">Appointments</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                <p className="text-sm font-bold text-yellow-600">
                  ${Number(reportData?.totalRevenue || 0).toFixed(0)}
                </p>
                <p className="text-xs text-yellow-600">Revenue</p>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <p className="text-sm font-bold text-purple-600">
                  {reportData?.totalInvoices || 0}
                </p>
                <p className="text-xs text-purple-600">Service Bills</p>
              </div>
              <div className="text-center p-2 bg-indigo-50 rounded-lg">
                <p className="text-sm font-bold text-indigo-600">
                  {reportData?.totalPractitioners || 0}
                </p>
                <p className="text-xs text-indigo-600">Practitioners</p>
              </div>
              <div className="text-center p-2 bg-pink-50 rounded-lg">
                <p className="text-sm font-bold text-pink-600">
                  {reportData?.totalMembers || 0}
                </p>
                <p className="text-xs text-pink-600">Community Members</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Patients</p>
                  <p className="text-xl font-bold text-blue-600">{reportData?.totalPatients || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Active patients</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Appointments</p>
                  <p className="text-xl font-bold text-green-600">{reportData?.totalAppointments || 0}</p>
                  <p className="text-xs text-green-600 mt-1">All appointments</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Donations</p>
                  <p className="text-xl font-bold text-yellow-600">{reportData?.totalDonations || 0}</p>
                  <p className="text-xs text-green-600 mt-1">All donations</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold text-purple-600">${Number(reportData?.totalRevenue || 0).toFixed(2)}</p>
                  <p className="text-xs text-green-600 mt-1">Total earnings</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Practitioners</p>
                  <p className="text-xl font-bold text-indigo-600">{reportData?.totalPractitioners || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Healthcare providers</p>
                </div>
                <div className="p-2 bg-indigo-100 rounded-full">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Community Members</p>
                  <p className="text-xl font-bold text-pink-600">{reportData?.totalMembers || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Former patients</p>
                </div>
                <div className="p-2 bg-pink-100 rounded-full">
                  <Users className="h-4 w-4 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Service Bills</p>
                  <p className="text-xl font-bold text-orange-600">{reportData?.totalInvoices || 0}</p>
                  <p className="text-xs text-green-600 mt-1">{reportData?.paidInvoices || 0} paid</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-teal-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Messages</p>
                  <p className="text-xl font-bold text-teal-600">{reportData?.totalMessages || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Total messages</p>
                </div>
                <div className="p-2 bg-teal-100 rounded-full">
                  <Activity className="h-4 w-4 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Monthly Revenue Trend (Service Billing)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData?.monthlyStats && reportData.monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.monthlyStats.map(m => ({...m, serviceBilling: Number(m.serviceBilling || 0)}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Service Billing']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="serviceBilling" 
                      stroke={CHART_COLORS.primary} 
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No revenue data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Activity Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                Monthly Activity Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData?.monthlyStats && reportData.monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.monthlyStats.map(m => ({
                    ...m,
                    patients: Number(m.patients || 0),
                    members: Number(m.members || 0),
                    serviceBilling: Number(m.serviceBilling || 0),
                    donationsAmount: Number(m.donationsAmount || 0)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="patients" fill={CHART_COLORS.secondary} name="Patients" minPointSize={2} />
                    <Bar dataKey="members" fill={CHART_COLORS.pink} name="Members" minPointSize={2} />
                    <Bar dataKey="serviceBilling" fill={CHART_COLORS.primary} name="Service Billing" minPointSize={2} />
                    <Bar dataKey="donationsAmount" fill={CHART_COLORS.warning} name="Donations" minPointSize={2} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No activity data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Appointment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChart className="h-4 w-4" />
              Appointment Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData?.appointmentStats && reportData.appointmentStats.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={reportData.appointmentStats.map(s => ({...s, count: Number(s.count || 0)}))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      nameKey="status"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {reportData.appointmentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [Number(value || 0), 'Appointments']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center space-y-4">
                  {reportData.appointmentStats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length] }}
                        />
                        <span className="font-medium capitalize">{stat.status}</span>
                      </div>
                                              <span className="text-lg font-bold">{Number(stat.count || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No appointment data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Donors Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              Top Donors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData?.topDonors && reportData.topDonors.length > 0 ? (
              <div className="grid gap-6">
                <ResponsiveContainer width="50%" height={300} className="mx-auto">
                  <BarChart 
                    data={reportData.topDonors.slice(0, 8)}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="email" type="category" width={120} />
                    <Tooltip 
                      formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Total Amount']}
                      labelFormatter={(label) => `Donor: ${label}`}
                    />
                    <Bar dataKey="totalAmount" fill={CHART_COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Donor Details</h4>
                  {reportData.topDonors.slice(0, 5).map((donor, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{donor.email}</p>
                        <p className="text-xs text-muted-foreground">{Number(donor.donationCount || 0)} donations</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${Number(donor.totalAmount || 0).toFixed(2)}</p>
                        <p className="text-xs text-green-600">Top #{index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No donor data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>





        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Recent Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData?.recentActivity?.map((activity, index) => (
                <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                    activity.type === 'donation' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-xs">
                        {activity.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={activity.type === 'donation' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {activity.type}
                        </Badge>
                        {activity.amount && (
                          <span className="font-bold text-green-600 text-xs">
                            ${Number(activity.amount || 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.date), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              {(!reportData?.recentActivity || reportData.recentActivity.length === 0) && (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
