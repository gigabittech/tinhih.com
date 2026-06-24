import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  Search, 
  Filter, 
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Stethoscope,
  FileText,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Receipt,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { TransactionDetails } from "@/components/admin/transaction-details";

interface Transaction {
  id: string;
  invoiceNumber: string;
  amount: string;
  tax: string;
  total: string;
  status: string;
  stripePaymentIntentId?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  practitioner: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  appointment?: {
    id: string;
    title: string;
    appointmentDate: string;
    duration: number;
  };
}

export default function AdminTransactions() {
  const { setPageInfo } = usePageTitle();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setPageInfo("Transactions", "Monitor payments and financial transactions");
  }, [setPageInfo]);

  // Fetch transactions data
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-transactions", searchTerm, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter !== "all") params.append("date", dateFilter);
      
      const response = await api.get(`/api/admin/transactions?${params.toString()}`);
      return Array.isArray(response) ? response : [];
    },
  });

  // Calculate summary stats
  const totalRevenue = transactions.reduce((sum: number, t: Transaction) => sum + parseFloat(t.total || '0'), 0);
  const successfulPayments = transactions.filter((t: Transaction) => t.status === 'paid').length;
  const pendingPayments = transactions.filter((t: Transaction) => t.status === 'sent').length;
  const failedPayments = transactions.filter((t: Transaction) => t.status === 'overdue').length;
  const draftInvoices = transactions.filter((t: Transaction) => t.status === 'draft').length;

  // Calculate monthly revenue
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = transactions
    .filter((t: Transaction) => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             t.status === 'paid';
    })
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.total || '0'), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Mail className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><FileText className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'cancelled':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><Clock className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const handleExportTransactions = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Invoice Number,Client,Practitioner,Amount,Tax,Total,Status,Payment Method\n" +
      transactions.map((t: Transaction) => 
        `${new Date(t.createdAt).toLocaleDateString()},${t.invoiceNumber},${t.patient?.user?.firstName} ${t.patient?.user?.lastName},${t.practitioner?.user?.firstName} ${t.practitioner?.user?.lastName},$${t.amount},$${t.tax},$${t.total},${t.status},${t.paymentMethod || 'N/A'}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions-${new Date().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: "Transaction data has been exported to CSV file"
    });
  };

  const handleRefreshTransactions = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Data Refreshed",
        description: "Transaction data has been updated"
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh transaction data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleResendInvoice = async (transactionId: string) => {
    try {
      await api.post(`/api/invoices/${transactionId}/send-email`);
      toast({
        title: "Invoice Sent",
        description: "Invoice has been resent to the client"
      });
    } catch (error) {
      toast({
        title: "Failed to Send",
        description: "Failed to resend invoice",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
              <p className="text-muted-foreground mt-1">Monitor all payments and financial transactions</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleRefreshTransactions} 
                variant="outline" 
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleExportTransactions} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  All time earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${monthlyRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successfulPayments}</div>
                <p className="text-xs text-muted-foreground">
                  Completed payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingPayments}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{failedPayments}</div>
                <p className="text-xs text-muted-foreground">
                  Past due
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by invoice number, client, or practitioner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading transactions...</p>
                </div>
              ) : transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Invoice #</th>
                        <th className="text-left py-3 px-4 font-medium">Client</th>
                        <th className="text-left py-3 px-4 font-medium">Practitioner</th>
                        <th className="text-left py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction: Transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                              {format(new Date(transaction.createdAt), "MMM dd, yyyy")}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm">
                            {transaction.invoiceNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-muted-foreground" />
                              {transaction.patient?.user?.firstName} {transaction.patient?.user?.lastName}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <Stethoscope className="w-4 h-4 mr-2 text-muted-foreground" />
                              {transaction.practitioner?.user?.firstName} {transaction.practitioner?.user?.lastName}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                              ${parseFloat(transaction.total).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(transaction.status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewTransaction(transaction)}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {transaction.status === 'sent' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleResendInvoice(transaction.id)}
                                  title="Resend Invoice"
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              View detailed information about this transaction including payment status, client details, and practitioner information.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="client">Client Info</TabsTrigger>
                <TabsTrigger value="practitioner">Practitioner Info</TabsTrigger>
                <TabsTrigger value="appointment">Appointment</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Invoice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="font-medium">Invoice Number:</span>
                        <span className="font-mono">{selectedTransaction.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        {getStatusBadge(selectedTransaction.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Created:</span>
                        <span>{format(new Date(selectedTransaction.createdAt), "PPP")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Updated:</span>
                        <span>{format(new Date(selectedTransaction.updatedAt), "PPP")}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="font-medium">Subtotal:</span>
                        <span>${parseFloat(selectedTransaction.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tax:</span>
                        <span>${parseFloat(selectedTransaction.tax).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>${parseFloat(selectedTransaction.total).toFixed(2)}</span>
                      </div>
                      {selectedTransaction.stripePaymentIntentId && (
                        <>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="font-medium">Payment ID:</span>
                            <span className="font-mono text-sm">{selectedTransaction.stripePaymentIntentId}</span>
                          </div>
                        </>
                      )}
                      {selectedTransaction.paymentMethod && (
                        <div className="flex justify-between">
                          <span className="font-medium">Payment Method:</span>
                          <span className="flex items-center">
                            <CreditCard className="w-4 h-4 mr-1" />
                            {selectedTransaction.paymentMethod}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="client" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-lg">{selectedTransaction.patient.user.firstName} {selectedTransaction.patient.user.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-lg flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          {selectedTransaction.patient.user.email}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="text-lg flex items-center">
                          <Phone className="w-4 h-4 mr-2" />
                          {selectedTransaction.patient.user.phone || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Client ID</label>
                        <p className="text-lg font-mono text-sm">{selectedTransaction.patient.id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="practitioner" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Stethoscope className="w-5 h-5 mr-2" />
                      Practitioner Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-lg">{selectedTransaction.practitioner.user.firstName} {selectedTransaction.practitioner.user.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-lg flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          {selectedTransaction.practitioner.user.email}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="text-lg flex items-center">
                          <Phone className="w-4 h-4 mr-2" />
                          {selectedTransaction.practitioner.user.phone || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Practitioner ID</label>
                        <p className="text-lg font-mono text-sm">{selectedTransaction.practitioner.id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appointment" className="space-y-6">
                {selectedTransaction.appointment ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Appointment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Title</label>
                          <p className="text-lg">{selectedTransaction.appointment.title}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                          <p className="text-lg">{format(new Date(selectedTransaction.appointment.appointmentDate), "PPP 'at' p")}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Duration</label>
                          <p className="text-lg">{selectedTransaction.appointment.duration} minutes</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Appointment ID</label>
                          <p className="text-lg font-mono text-sm">{selectedTransaction.appointment.id}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No appointment linked to this transaction</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Details Component */}
      <TransactionDetails 
        transaction={selectedTransaction}
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
      />
    </AdminLayout>
  );
}
