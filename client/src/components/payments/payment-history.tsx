import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  Calendar, 
  DollarSign,
  Receipt,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface PaymentHistoryProps {
  patientId?: string;
  invoiceId?: string;
}

export function PaymentHistory({ patientId, invoiceId }: PaymentHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("succeeded");
  const [dateFilter, setDateFilter] = useState("all");

  // Fetch payment history
  const handleDownloadReceipt = async (payment: any) => {
      // Generate Zoho-style receipt HTML with TiNHiH branding
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - TiNHiH Portal</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #f8fafc;
          padding: 40px 20px;
          line-height: 1.6;
        }
        
        .receipt-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .header {
          padding: 40px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .company-info {
          flex: 1;
        }
        
        .logo {
          width: 80px;
          height: 80px;
          background: #ffdd00;
          border: 3px solid #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          position: relative;
        }
        
        .logo::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: conic-gradient(from 0deg, #ffdd00, #ffdd00, #ffdd00, #ffdd00, #ffdd00);
          border-radius: 50%;
          z-index: -1;
        }
        
        .logo-text {
          font-size: 14px;
          font-weight: bold;
          color: #000;
          text-align: center;
          line-height: 1.2;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .company-full-name {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 4px;
        }
        
        .company-address {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.4;
        }
        
        .receipt-title {
          text-align: right;
          flex: 1;
        }
        
        .receipt-title h1 {
          font-size: 48px;
          font-weight: 700;
          color: #1f2937;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .main-content {
          padding: 40px;
        }
        
        .billing-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        
        .bill-to {
          background: #f9fafb;
          padding: 20px;
          border-radius: 6px;
        }
        
        .bill-to h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        
        .bill-to p {
          font-size: 14px;
          color: #4b5563;
          margin-bottom: 8px;
        }
        
        .receipt-details {
          background: #f9fafb;
          padding: 20px;
          border-radius: 6px;
        }
        
        .receipt-details h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        
        .receipt-details p {
          font-size: 14px;
          color: #4b5563;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }
        
        .receipt-details .label {
          font-weight: 500;
        }
        
        .receipt-details .value {
          font-weight: 600;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .items-table th {
          background: #1f2937;
          color: white;
          padding: 15px 12px;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .items-table td {
          padding: 15px 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        
        .items-table .description {
          font-weight: 500;
          color: #1f2937;
        }
        
        .items-table .amount {
          font-weight: 600;
          color: #1f2937;
          text-align: right;
        }
        
        .summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }
        
        .summary-table {
          width: 300px;
        }
        
        .summary-table tr {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .summary-table tr:last-child {
          border-bottom: none;
          font-weight: 700;
          font-size: 16px;
          background: #f3f4f6;
          padding: 12px;
          border-radius: 4px;
        }
        
        .summary-table .label {
          color: #6b7280;
        }
        
        .summary-table .value {
          font-weight: 600;
          color: #1f2937;
        }
        
        .notes-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        
        .notes, .terms {
          background: #f9fafb;
          padding: 20px;
          border-radius: 6px;
        }
        
        .notes h3, .terms h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        
        .notes p, .terms p {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
        }
        
        .footer {
          border-top: 1px solid #e5e7eb;
          padding: 30px 40px;
          text-align: center;
          background: #f9fafb;
        }
        
        .footer-text {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 10px;
        }
        
        .footer-brand {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        
        @media print {
          body { background: white; padding: 0; }
          .receipt-container { box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="header-content">
            <div class="company-info">
              <div class="logo">
                <div class="logo-text">
                  TINHIH<br>
                  <span style="font-size: 8px;">RECOVERY</span><br>
                  <span style="font-size: 8px;">SUPPORT</span><br>
                  <span style="font-size: 8px;">EMPOWERMENT</span><br>
                  <span style="font-size: 8px;">HEALING</span><br>
                  <span style="font-size: 8px;">HOPE</span>
                </div>
              </div>
              <div class="company-name">TiNHiH Portal</div>
              <div class="company-full-name">TiNHiH Foundation</div>
              <div class="company-address">441 W Sahara Ave, Las Vegas, NV 89102, U.S.A.</div>
            </div>
            <div class="receipt-title">
              <h1>Receipt</h1>
            </div>
          </div>
        </div>
        
        <div class="main-content">
          <div class="billing-section">
            <div class="bill-to">
              <h3>Bill To:</h3>
              <p>Your Client's Company</p>
              <p>Client's Address</p>
              <p>City, State Zip</p>
              <p>U.S.A.</p>
            </div>
            <div class="receipt-details">
              <h3>Receipt Details:</h3>
              <p>
                <span class="label">Receipt#:</span>
                <span class="value">RECEIPT-${payment.id.slice(-8).toUpperCase()}</span>
              </p>
              <p>
                <span class="label">Receipt Date:</span>
                <span class="value">${new Date(payment.created_at).toLocaleDateString('en-US', { 
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              </p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: center;">TAX</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="description">${payment.invoice?.description || 'Healthcare Services'}</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">$${Number(payment.amount).toFixed(2)}</td>
                <td style="text-align: center;">0%</td>
                <td class="amount">$${Number(payment.amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary">
            <table class="summary-table">
              <tr>
                <td class="label">Sub Total</td>
                <td class="value">$${Number(payment.amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="label">TAX (0%)</td>
                <td class="value">$0.00</td>
              </tr>
              <tr>
                <td class="label">TOTAL</td>
                <td class="value">${payment.currency?.toUpperCase() || 'USD'} ${Number(payment.amount).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div class="notes-section">
            <div class="notes">
              <h3>Notes</h3>
              <p>Thank you for your payment to TiNHiH Portal Healthcare. This receipt serves as proof of your transaction.</p>
            </div>
            <div class="terms">
              <h3>Terms & Conditions</h3>
              <p>Please keep this receipt for your records. For questions, contact us at support@tinhih.com</p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-text">Crafted with ease using</div>
          <div class="footer-brand">TiNHiH Portal</div>
          <div class="footer-text">Visit tinhih.com to access professional healthcare services</div>
        </div>
      </div>
    </body>
    </html>
  `;

    // Create and download receipt as PDF using jsPDF
    try {
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      
      // Create PDF document
      const doc = new jsPDF();
      
      // Add content to PDF with Zoho-style formatting
      doc.setFontSize(28);
      doc.setTextColor(31, 41, 55); // Dark gray
      doc.text('TiNHiH Portal', 20, 25);
      
      doc.setFontSize(14);
      doc.setTextColor(107, 114, 128); // Gray
      doc.text('TiNHiH Foundation', 20, 35);
      doc.text('441 W Sahara Ave, Las Vegas, NV 89102, U.S.A.', 20, 42);
      
      // Receipt title on the right
      doc.setFontSize(36);
      doc.setTextColor(31, 41, 55);
      doc.text('RECEIPT', 190, 30, { align: 'right' });
      
      // Bill To section
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Bill To:', 20, 60);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('Your Client\'s Company', 20, 70);
      doc.text('Client\'s Address', 20, 77);
      doc.text('City, State Zip', 20, 84);
      doc.text('U.S.A.', 20, 91);
      
      // Receipt details on the right
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Receipt Details:', 190, 60, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Receipt#: RECEIPT-${payment.id.slice(-8).toUpperCase()}`, 190, 70, { align: 'right' });
      doc.text(`Receipt Date: ${new Date(payment.created_at).toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`, 190, 77, { align: 'right' });
      
      // Items table header
      doc.setFillColor(31, 41, 55);
      doc.rect(20, 110, 170, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('Item Description', 25, 120);
      doc.text('Qty', 100, 120);
      doc.text('Rate', 130, 120);
      doc.text('TAX', 160, 120);
      doc.text('Amount', 190, 120, { align: 'right' });
      
      // Items table content
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 125, 170, 15, 'F');
      doc.setTextColor(31, 41, 55);
      doc.text(payment.invoice?.description || 'Healthcare Services', 25, 135);
      doc.text('1', 100, 135);
      doc.text(`$${Number(payment.amount).toFixed(2)}`, 130, 135);
      doc.text('0%', 160, 135);
      doc.text(`$${Number(payment.amount).toFixed(2)}`, 190, 135, { align: 'right' });
      
      // Summary table
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Sub Total', 120, 160);
      doc.text(`$${Number(payment.amount).toFixed(2)}`, 190, 160, { align: 'right' });
      
      doc.text('TAX (0%)', 120, 170);
      doc.text('$0.00', 190, 170, { align: 'right' });
      
      // Total with highlight
      doc.setFillColor(243, 244, 246);
      doc.rect(110, 175, 100, 15, 'F');
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('TOTAL', 120, 185);
      doc.text(`${payment.currency?.toUpperCase() || 'USD'} ${Number(payment.amount).toFixed(2)}`, 190, 185, { align: 'right' });
      
      // Notes section
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Notes:', 20, 210);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('Thank you for your payment to TiNHiH Portal Healthcare.', 20, 220);
      doc.text('This receipt serves as proof of your transaction.', 20, 227);
      
      // Terms section
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Terms & Conditions:', 120, 210);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('Please keep this receipt for your records.', 120, 220);
      doc.text('For questions, contact us at support@tinhih.com', 120, 227);
      
      // Footer
      doc.setDrawColor(229, 231, 235);
      doc.line(20, 250, 190, 250);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('Crafted with ease using TiNHiH Portal', 105, 260, { align: 'center' });
      doc.text('Visit tinhih.com to access professional healthcare services', 105, 267, { align: 'center' });
      
      // Save PDF
      doc.save(`receipt-${payment.id}.pdf`);
    } catch (error) {
      console.error('PDF generation failed, falling back to HTML:', error);
      // Fallback to HTML download
      const blob = new Blob([receiptHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${payment.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const { data: allPayments = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/patient/payment-history'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patient/payment-history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
  });

  // Filter payments based on search, status, and invoice (if specified)
  const payments = allPayments.filter((payment: any) => {
    const matchesSearch = searchTerm === "" || 
      payment.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    // If invoiceId is provided, only show payments for that specific invoice
    const matchesInvoice = !invoiceId || payment.invoice?.id === invoiceId;
    
    return matchesSearch && matchesStatus && matchesInvoice;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case "refunded":
        return <Badge className="bg-orange-100 text-orange-800"><RefreshCw className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getPaymentMethodInfo = (paymentMethod: any) => {
    if (!paymentMethod) return { icon: CreditCard, text: "Unknown" };
    
    // Handle string payment method (from our API)
    if (typeof paymentMethod === 'string') {
      switch (paymentMethod) {
        case "stripe":
          return {
            icon: CreditCard,
            text: "Credit Card (Stripe)"
          };
        case "manual":
          return {
            icon: CreditCard,
            text: "Manual Payment"
          };
        default:
          return {
            icon: CreditCard,
            text: paymentMethod || "Card"
          };
      }
    }
    
    // Handle object payment method (from Stripe)
    switch (paymentMethod.type) {
      case "card":
        return {
          icon: CreditCard,
          text: `•••• •••• •••• ${paymentMethod.card?.last4 || "****"} (${paymentMethod.card?.brand?.toUpperCase() || "CARD"})`
        };
      case "apple_pay":
        return {
          icon: CreditCard,
          text: "Apple Pay"
        };
      case "google_pay":
        return {
          icon: CreditCard,
          text: "Google Pay"
        };
      default:
        return {
          icon: CreditCard,
          text: paymentMethod.type || "Card"
        };
    }
  };

  const calculateTotals = () => {
    const completedPayments = payments.filter((p: any) => p.status === "succeeded");
    const totalAmount = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalRefunded = payments
      .filter((p: any) => p.status === "refunded")
      .reduce((sum: number, p: any) => sum + Number(p.refunded_amount || 0), 0);
    
    return {
      totalPayments: completedPayments.length,
      totalAmount,
      totalRefunded,
      netAmount: totalAmount - totalRefunded
    };
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact for Modal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs font-medium">Total Payments</p>
                <p className="text-lg font-bold">{totals.totalPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs font-medium">Total Amount</p>
                <p className="text-lg font-bold">${totals.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-xs font-medium">Refunded</p>
                <p className="text-lg font-bold">${totals.totalRefunded.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-xs font-medium">Net Amount</p>
                <p className="text-lg font-bold">${totals.netAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {invoiceId ? 'Invoice Payment History' : 'Payment History'}
          </CardTitle>
          <CardDescription>
            {invoiceId 
              ? 'View payment transactions for this specific invoice'
              : 'View all payment transactions and their details'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={invoiceId ? "Search payment details..." : "Search by invoice number, patient name..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="succeeded">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Payment List */}
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No payment history found</p>
              </div>
            ) : (
              payments.map((payment: any) => {
                const paymentMethodInfo = getPaymentMethodInfo(payment.payment_method);
                const PaymentIcon = paymentMethodInfo.icon;
                
                return (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                            <PaymentIcon className="w-4 h-4 text-primary" />
                          </div>
                          
                          <div>
                            <p className="font-medium text-sm">
                              Payment for Invoice #{payment.invoice?.invoiceNumber || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {paymentMethodInfo.text}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(payment.created_at), "MMM dd, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-base font-semibold">
                            ${Number(payment.amount).toFixed(2)}
                          </p>
                          <div className="mt-1">
                            {getStatusBadge(payment.status)}
                          </div>
                          
                          {payment.status === "succeeded" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-1 h-7 text-xs"
                              onClick={() => handleDownloadReceipt(payment)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {payment.failure_message && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700">
                            <XCircle className="w-4 h-4 inline mr-1" />
                            {payment.failure_message}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}