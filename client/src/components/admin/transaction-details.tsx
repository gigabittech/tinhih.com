import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar,
  User,
  Stethoscope,
  Mail,
  Phone,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

interface TransactionDetailsProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetails({ transaction, open, onOpenChange }: TransactionDetailsProps) {
  const { toast } = useToast();

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

  const handleResendInvoice = async () => {
    if (!transaction) return;
    
    try {
      await api.post(`/api/invoices/${transaction.id}/send-email`);
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

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details - {transaction.invoiceNumber}</DialogTitle>
        </DialogHeader>
        
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
                    <span className="font-mono">{transaction.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created:</span>
                    <span>{format(new Date(transaction.createdAt), "PPP")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Updated:</span>
                    <span>{format(new Date(transaction.updatedAt), "PPP")}</span>
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
                    <span>${parseFloat(transaction.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tax:</span>
                    <span>${parseFloat(transaction.tax).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${parseFloat(transaction.total).toFixed(2)}</span>
                  </div>
                  {transaction.stripePaymentIntentId && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="font-medium">Payment ID:</span>
                        <span className="font-mono text-sm">{transaction.stripePaymentIntentId}</span>
                      </div>
                    </>
                  )}
                  {transaction.paymentMethod && (
                    <div className="flex justify-between">
                      <span className="font-medium">Payment Method:</span>
                      <span className="flex items-center">
                        <CreditCard className="w-4 h-4 mr-1" />
                        {transaction.paymentMethod}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {transaction.status === 'sent' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Invoice Actions</h3>
                      <p className="text-sm text-muted-foreground">Manage this invoice</p>
                    </div>
                    <Button onClick={handleResendInvoice}>
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
                    <p className="text-lg">{transaction.patient.user.firstName} {transaction.patient.user.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {transaction.patient.user.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-lg flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {transaction.patient.user.phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Client ID</label>
                    <p className="text-lg font-mono text-sm">{transaction.patient.id}</p>
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
                    <p className="text-lg">{transaction.practitioner.user.firstName} {transaction.practitioner.user.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {transaction.practitioner.user.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-lg flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {transaction.practitioner.user.phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Practitioner ID</label>
                    <p className="text-lg font-mono text-sm">{transaction.practitioner.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointment" className="space-y-6">
            {transaction.appointment ? (
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
                      <p className="text-lg">{transaction.appointment.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                      <p className="text-lg">{format(new Date(transaction.appointment.appointmentDate), "PPP 'at' p")}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Duration</label>
                      <p className="text-lg">{transaction.appointment.duration} minutes</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Appointment ID</label>
                      <p className="text-lg font-mono text-sm">{transaction.appointment.id}</p>
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
      </DialogContent>
    </Dialog>
  );
}
