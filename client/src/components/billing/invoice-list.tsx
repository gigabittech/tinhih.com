import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, Search, Edit, Eye, CheckCircle, XCircle, Clock, FileText, Filter, Users } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { InvoiceForm } from "./invoice-form";
import { InvoiceDetailView } from "./invoice-detail-view";

interface InvoiceListProps {
  onNewInvoice: () => void;
}

export function InvoiceList({ onNewInvoice }: InvoiceListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { user } = useAuth();
  const isPractitioner = user?.role === 'practitioner';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoices with proper search and filtering
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices", searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      params.append("limit", "50");
      
      const url = params.toString() ? `/api/invoices?${params.toString()}` : "/api/invoices?limit=50";
      const response = await api.get(url);
      return Array.isArray(response) ? response : [];
    },
  });

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setShowForm(true);
  };

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleViewInvoice = (invoice: any) => {
    setViewingInvoice(invoice);
  };

  const handleCloseDetailView = () => {
    setViewingInvoice(null);
  };

  const handleEditFromDetail = () => {
    setEditingInvoice(viewingInvoice);
    setViewingInvoice(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  // Update invoice status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      return api.put(`/api/invoices/${invoiceId}`, { 
        status,
        ...(status === "paid" && { paidAt: new Date() })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Service billing status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service billing status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <XCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {isPractitioner ? "Service Billing" : "Billing & Invoices"}
            </CardTitle>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <Button onClick={handleNewInvoice}>
                <Plus className="w-4 h-4 mr-2" />
                New {isPractitioner ? "Service Bill" : "Invoice"}
              </Button>
            )}
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={isPractitioner ? "Search service bills..." : "Search invoices..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading {isPractitioner ? "service bills" : "invoices"}...</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No {isPractitioner ? "service bills" : "invoices"} yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isPractitioner 
                    ? "Start tracking recovery service payments" 
                    : "Start managing patient billing and payments"
                  }
                </p>
                {(user?.role === 'admin' || user?.role === 'staff') && (
                  <Button onClick={handleNewInvoice}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First {isPractitioner ? "Service Bill" : "Invoice"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((invoice: any) => (
                <div key={invoice.id} className="p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground">
                          {invoice.description || `${isPractitioner ? "Recovery Service" : "Medical Service"}`}
                        </h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(invoice.status)}
                            {invoice.status}
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {invoice.patient?.user?.firstName} {invoice.patient?.user?.lastName}
                          </span>
                          {invoice.practitioner && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {invoice.practitioner.user?.firstName} {invoice.practitioner.user?.lastName}
                            </span>
                          )}
                          {invoice.appointment && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(invoice.appointment.appointmentDate), "MMM dd, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-foreground">
                          ${Number(invoice.amount).toFixed(2)}
                        </span>
                        {invoice.dueDate && (
                          <span className="text-muted-foreground">
                            Due: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {format(new Date(invoice.createdAt), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(user?.role === 'admin' || user?.role === 'staff') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? "Edit Service Bill" : "New Service Bill"}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice 
                ? "Update recovery service billing information" 
                : "Create a new recovery service bill"
              }
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Service Bill Details
            </DialogTitle>
            <DialogDescription>
              View and manage service bill information and payment status
            </DialogDescription>
          </DialogHeader>
          <InvoiceDetailView
            invoice={viewingInvoice}
            onEdit={handleEditFromDetail}
            onClose={handleCloseDetailView}
            onStatusUpdate={(status) => {
              if (viewingInvoice) {
                updateStatusMutation.mutate({ invoiceId: viewingInvoice.id, status });
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}