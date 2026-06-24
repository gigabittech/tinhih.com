import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  Printer, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  CreditCard,
  DollarSign,
  Edit,
  MoreHorizontal,
  ArrowLeft,
  History,
  User,
  Stethoscope
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { StripePaymentWrapper } from "@/components/payments/payment-form";
import { PaymentHistory } from "@/components/payments/payment-history";
import tinhihLogo from "@assets/tinhih-logo.svg";

// Using the official TiNHiH SVG logo
const logoPath = tinhihLogo;

interface InvoiceDetailViewProps {
  invoice: any;
  onEdit: () => void;
  onClose: () => void;
  onStatusUpdate?: (status: string) => void;
}

export function InvoiceDetailView({ invoice, onEdit, onClose, onStatusUpdate }: InvoiceDetailViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [showManualPaymentDialog, setShowManualPaymentDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Update state when invoice changes
  useEffect(() => {
    if (invoice) {
      setEmailSubject(`Service Bill ${invoice.invoiceNumber} from TiNHiH Portal`);
      setPaymentAmount(invoice.total || "0");
    }
  }, [invoice]);

  const isPatient = user?.role === "patient";
  const isPractitioner = user?.role === "practitioner";
  const canMakePayment = isPatient && invoice?.status !== "paid";

  // Update invoice status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, paymentMethod, paymentAmount, paymentNotes }: { 
      status: string; 
      paymentMethod?: string; 
      paymentAmount?: number; 
      paymentNotes?: string; 
    }) => {
      return api.put(`/api/invoices/${invoice.id}`, { 
        status,
        ...(status === "paid" && { paidAt: new Date() }),
        ...(paymentMethod && { paymentMethod }),
        ...(paymentAmount && { paymentAmount }),
        ...(paymentNotes && { paymentNotes })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({
        title: "Success",
        description: "Service bill status updated successfully",
      });
      if (onStatusUpdate) {
        onStatusUpdate(invoice.status);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service bill status",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-green-800"><XCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
    }
  };

  const handleManualPayment = () => {
    updateStatusMutation.mutate({
        status: "paid",
        paymentMethod,
        paymentAmount: Number(paymentAmount),
        paymentNotes
      });
    setShowManualPaymentDialog(false);
  };

  const handleEmailInvoice = async () => {
    setIsSendingEmail(true);
    try {
      const response = await api.post(`/api/invoices/${invoice.id}/send-email`, {
        emailAddress,
        customMessage
      });

      if (response.message) {
        toast({
          title: "Success",
          description: `Service bill sent via email to ${response.recipientEmail}`,
        });
        setShowEmailSheet(false);
        setEmailAddress("");
        setCustomMessage("");
        setEmailSubject(`Service Bill ${invoice.invoiceNumber} from TiNHiH Portal`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send service bill via email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Service Bill Not Found</h3>
          <p className="text-muted-foreground">The service bill you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              {isPractitioner ? "Service Bill" : "Invoice"} #{invoice.invoiceNumber}
            </h2>
            <p className="text-muted-foreground">
              {format(new Date(invoice.createdAt), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>
        
          <div className="flex items-center gap-2">
          {getStatusBadge(invoice.status)}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
          </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Information */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Service Information</h3>
                  {invoice.appointment && (
                    <Badge variant="secondary" className="text-xs">
                      Linked to Recovery Session
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Client
                    </label>
                    <p className="text-foreground font-medium">
                      {invoice.patient?.user?.firstName} {invoice.patient?.user?.lastName}
                    </p>
                    {invoice.patient?.user?.email && (
                      <p className="text-sm text-muted-foreground">{invoice.patient.user.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Stethoscope className="w-4 h-4" />
                      Recovery Specialist
                    </label>
                    <p className="text-foreground font-medium">
                      {invoice.practitioner?.user?.firstName} {invoice.practitioner?.user?.lastName}
                    </p>
                    {invoice.practitioner?.user?.email && (
                      <p className="text-sm text-muted-foreground">{invoice.practitioner.user.email}</p>
                    )}
                  </div>
                </div>

                {invoice.appointment && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Linked Recovery Session</label>
                    <p className="text-foreground">
                      {invoice.appointment.title} - {format(new Date(invoice.appointment.appointmentDate), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Service Description</label>
                  <p className="text-foreground">{invoice.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Payment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Amount:</span>
                  <span className="font-medium">${Number(invoice.amount).toFixed(2)}</span>
                </div>
                {Number(invoice.tax) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">${Number(invoice.tax).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>${Number(invoice.total).toFixed(2)}</span>
                </div>
          </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status and Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Status & Actions</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(invoice.status)}
                    </div>
                
                {invoice.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Due Date:</span>
                    <span className="text-sm font-medium">
                      {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}

                {invoice.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Paid Date:</span>
                    <span className="text-sm font-medium">
                      {format(new Date(invoice.paidAt), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="space-y-2 grid md:grid-cols-2 gap-2 items-center lg:grid-cols-1">
              {canMakePayment && (
                <Button 
                  onClick={() => setShowPaymentDialog(true)} 
                      className="w-full"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                </Button>
              )}
              
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPaymentHistory(true)}
                    className="w-full"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Payment History
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEmailSheet(true)}
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send via Email
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.print()}
                    className="w-full"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions for Admin/Staff */}
          {(user?.role === 'admin' || user?.role === 'staff') && invoice.status !== "paid" && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={() => setShowManualPaymentDialog(true)}
                    variant="outline"
                    className="w-full"
                >
                    <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
                  
                  <Button 
                    onClick={() => updateStatusMutation.mutate({ status: "cancelled" })}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Bill
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Debug Actions for Admin */}
          {user?.role === 'admin' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Debug Actions</h3>
          <div className="space-y-2">
                  <Button 
                    onClick={async () => {
                      try {
                        await api.post('/api/payments/test-success', { invoiceId: invoice.id });
                        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
                        toast({
                          title: "Success",
                          description: "Payment marked as successful for testing",
                        });
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to test payment",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    className="w-full text-blue-600 hover:text-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Test Payment Success
                  </Button>
                  
                  {invoice.stripePaymentIntentId && (
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await api.get(`/api/payments/debug/${invoice.stripePaymentIntentId}`);
                          console.log('Payment Intent Debug Info:', response);
                          toast({
                            title: "Debug Info",
                            description: `Payment Intent Status: ${response.paymentIntent.status}. Check console for details.`,
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to get debug info",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="outline"
                      className="w-full text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Debug Payment Intent
                    </Button>
            )}
          </div>
              </CardContent>
            </Card>
              )}
            </div>
          </div>

            {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
            <DialogDescription>
              Complete your payment securely using the form below.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <StripePaymentWrapper
              invoice={invoice}
              onSuccess={() => {
                setShowPaymentDialog(false);
                queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
              }}
              onCancel={() => setShowPaymentDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showPaymentHistory} onOpenChange={setShowPaymentHistory}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              View all payment transactions and their details for this invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <PaymentHistory invoiceId={invoice.id} />
          </div>
        </DialogContent>
      </Dialog>

             {/* Manual Payment Dialog */}
       <Dialog open={showManualPaymentDialog} onOpenChange={setShowManualPaymentDialog}>
         <DialogContent className="max-w-md">
           <DialogHeader>
            <DialogTitle>Record Manual Payment</DialogTitle>
           </DialogHeader>
          <div className="space-y-4">
             <div>
              <Label>Payment Method</Label>
               <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                <SelectContent>
                   <SelectItem value="cash">Cash</SelectItem>
                   <SelectItem value="check">Check</SelectItem>
                   <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                   <SelectItem value="other">Other</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div>
              <Label>Payment Amount</Label>
               <Input
                 type="number"
                 value={paymentAmount}
                 onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
               />
             </div>
             
             <div>
              <Label>Notes</Label>
               <Textarea
                 value={paymentNotes}
                 onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Payment notes..."
               />
             </div>
             
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowManualPaymentDialog(false)}>
                 Cancel
               </Button>
              <Button onClick={handleManualPayment}>
                Record Payment
               </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Sheet */}
      <Sheet open={showEmailSheet} onOpenChange={setShowEmailSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Send Service Bill via Email</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder={invoice.patient?.user?.email || "client@example.com"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use client's registered email: {invoice.patient?.user?.email || "Not available"}
              </p>
            </div>
            
            <div>
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Service Bill Subject"
              />
            </div>

            <div>
              <Label>Custom Message (Optional)</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message to include with the service bill..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This message will be included in the email along with the service bill details.
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEmailSheet(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleEmailInvoice} 
                disabled={(!emailAddress && !invoice.patient?.user?.email) || isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}