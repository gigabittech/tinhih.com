import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DollarSign, 
  Calendar, 
  User, 
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface InvoiceCardProps {
  invoice: any;
  compact?: boolean;
}

export function InvoiceCard({ invoice, compact = false }: InvoiceCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"><XCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"><FileText className="w-3 h-3 mr-1" />Sent</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={invoice.practitioner?.user?.profileImage} />
            <AvatarFallback className="text-sm bg-[#ffdd00] text-black">
              {invoice.practitioner?.user?.firstName?.[0]}{invoice.practitioner?.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">
              Invoice #{invoice.invoiceNumber}
            </h4>
            {getStatusBadge(invoice.status)}
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            Dr. {invoice.practitioner?.user?.firstName} {invoice.practitioner?.user?.lastName}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(invoice.createdAt), "MMM dd, yyyy")}</span>
            <DollarSign className="h-3 w-3 ml-2" />
            <span className="font-medium">${Number(invoice.total || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={invoice.practitioner?.user?.profileImage} />
              <AvatarFallback className="text-sm bg-[#ffdd00] text-black">
                {invoice.practitioner?.user?.firstName?.[0]}{invoice.practitioner?.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                Invoice #{invoice.invoiceNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Dr. {invoice.practitioner?.user?.firstName} {invoice.practitioner?.user?.lastName}
              </p>
            </div>
          </div>
          {getStatusBadge(invoice.status)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Created: {format(new Date(invoice.createdAt), "MMM dd, yyyy")}</span>
          </div>
          {invoice.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Due: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{invoice.practitioner?.specialization || "General"}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">${Number(invoice.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {invoice.description && (
          <div className="text-sm">
            <h5 className="font-medium mb-1">Description:</h5>
            <p className="text-muted-foreground">{invoice.description}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          {invoice.status !== "paid" && (
            <Button size="sm" className="flex-1 bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
