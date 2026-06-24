import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { 
  Package, 
  Calendar, 
  DollarSign, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  Eye,
  Download
} from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MemberOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching orders for user:', user?.id, user?.email);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        status: selectedStatus
      });

      const response = await api.get(`/api/store/orders?${params}`);
      
      console.log('Orders API response:', response);
      
      if (response.success) {
        setOrders(response.orders);
        setTotalPages(response.pagination.totalPages);
        console.log('Orders fetched:', response.orders.length, 'orders');
      } else {
        throw new Error(response.error || "Failed to fetch orders");
      }
    } catch (error: any) {
      console.error("Fetch orders error:", error);
      toast({
        title: "Error",
        description: "Failed to load your orders. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus, toast, user?.id, user?.email]);

  useEffect(() => {
    setPageInfo("Order History", "View your past store orders");
    fetchOrders();
  }, [setPageInfo, fetchOrders]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/30";
      case "processing":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/30";
      case "shipped":
        return "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/30";
      case "delivered":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800/30";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/30";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <Package className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="outline"
            onClick={() => setLocation("/member")}
            className="mb-3 sm:mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Order History</h1>
              <p className="text-muted-foreground mt-1">
                View and track your past store orders
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button onClick={() => setLocation("/store")}>
                <Package className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter("all")}
              >
                All Orders
              </Button>
              <Button
                variant={selectedStatus === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter("pending")}
              >
                Pending
              </Button>
              <Button
                variant={selectedStatus === "processing" ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter("processing")}
              >
                Processing
              </Button>
              <Button
                variant={selectedStatus === "shipped" ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter("shipped")}
              >
                Shipped
              </Button>
              <Button
                variant={selectedStatus === "delivered" ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter("delivered")}
              >
                Delivered
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">No orders found</h3>
              <p className="text-muted-foreground mb-6">
                {selectedStatus === "all" 
                  ? "You haven't placed any orders yet." 
                  : `No ${selectedStatus} orders found.`
                }
              </p>
              <Button onClick={() => setLocation("/store")}>
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-[#ffdd00] to-yellow-400">
                        <Package className="h-5 w-5 text-black" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          Order #{order.orderNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getStatusColor(order.status)} border`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </Badge>
                      <Badge variant="outline" className="font-mono">
                        ${Number(order.total).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Order Items */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-foreground mb-3">Items Ordered</h4>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × ${Number(item.price).toFixed(2)} each
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              ${(Number(item.price) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Order Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="text-foreground">${Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shipping:</span>
                          <span className="text-foreground">
                            {Number(order.shipping) === 0 ? "Free" : `$${Number(order.shipping).toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax:</span>
                          <span className="text-foreground">${Number(order.tax).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-border pt-2">
                          <span className="text-foreground">Total:</span>
                          <span className="text-foreground">${Number(order.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Order Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Status:</span>
                          <Badge variant="outline" className="text-xs">
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fulfillment:</span>
                          <Badge variant="outline" className="text-xs">
                            {order.fulfillmentStatus}
                          </Badge>
                        </div>
                        {order.trackingNumber && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tracking:</span>
                            <span className="text-foreground font-mono text-xs">
                              {order.trackingNumber}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items:</span>
                          <span className="text-foreground">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Shipping Details</h4>
                      <div className="space-y-2 text-sm">
                        {order.shippingAddress && (
                          <>
                            <div className="text-foreground font-medium">
                              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                            </div>
                            <div className="text-muted-foreground">
                              {order.shippingAddress.address1}
                              {order.shippingAddress.address2 && (
                                <div>{order.shippingAddress.address2}</div>
                              )}
                            </div>
                            <div className="text-muted-foreground">
                              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                            </div>
                            <div className="text-muted-foreground">
                              {order.shippingAddress.country}
                            </div>
                            <div className="text-muted-foreground">
                              📧 {order.shippingAddress.email}
                            </div>
                            <div className="text-muted-foreground">
                              📞 {order.shippingAddress.phone}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        toast({
                          title: "Order Details",
                          description: `Order #${order.orderNumber} - ${order.items.length} items, Total: $${Number(order.total).toFixed(2)}`,
                        });
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {order.trackingUrl && (
                      <Button 
                        variant="outline" 
                        className="flex-1 sm:flex-none"
                        onClick={() => window.open(order.trackingUrl, '_blank')}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Track Package
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        toast({
                          title: "Invoice Download",
                          description: "Invoice download feature coming soon!",
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
