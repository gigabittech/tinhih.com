import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Clock,
  DollarSign,
  Receipt,
  Smartphone,
  Wallet,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DemoPaymentNotice } from "./demo-payment-notice";

// Lazy load Stripe to avoid initialization on app startup
let stripePromise: Promise<any> | null = null;

const getStripePromise = () => {
  if (stripePromise) {
    return stripePromise;
  }
  
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51Rg0kFPo6yeGKLGBjDqlMfASPp1hAhjZ6LnP78SmdmOgG4Fm1QG1BLh1htu2gWy5wbO0WBqLxoNkLZ4jW0PXbKx300cZu6Be8c";
  console.log('Stripe key loaded:', stripeKey ? 'Present' : 'Missing');
  if (!stripeKey) {
    console.warn('Stripe public key not found. Payment features will be disabled.');
    return null;
  }
  console.log('Initializing Stripe with key:', stripeKey.substring(0, 20) + '...');
  stripePromise = loadStripe(stripeKey);
  return stripePromise;
};

interface PaymentFormProps {
  invoice: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PaymentFormProps {
  invoice: any;
  onSuccess: () => void;
  onCancel: () => void;
}

// Main payment form component
export function PaymentForm({ invoice, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing`,
          payment_method_data: {
            billing_details: {
              name: `${invoice.patient?.user?.firstName} ${invoice.patient?.user?.lastName}`,
              email: invoice.patient?.user?.email,
            },
          },
        },
        redirect: 'if_required'
              });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent) {
        console.log('Payment intent status:', paymentIntent.status);
        console.log('Payment intent details:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          last_payment_error: paymentIntent.last_payment_error
        });
        
        // Log all possible statuses to understand what we're getting
        console.log('Payment intent full object:', JSON.stringify(paymentIntent, null, 2));
        
        if (paymentIntent.status === 'succeeded') {
          console.log('Payment succeeded, processing through new payment flow...');
          try {
            // Step 1: Process the payment
            console.log('Step 1: Processing payment...');
            const processResponse = await apiRequest(`/api/payments/process`, 'POST', {
              paymentIntentId: paymentIntent.id,
              invoiceId: invoice.id
            });
            
            if (!processResponse.ok) {
              throw new Error('Failed to process payment');
            }
            
            console.log('Step 1: Payment processed successfully');
            
            // Step 2: Confirm the payment
            console.log('Step 2: Confirming payment...');
            const confirmResponse = await apiRequest(`/api/payments/confirm`, 'POST', {
              paymentIntentId: paymentIntent.id,
              invoiceId: invoice.id
            });
            
            if (!confirmResponse.ok) {
              throw new Error('Failed to confirm payment');
            }
            
            console.log('Step 2: Payment confirmed successfully');
            
            // Step 3: Verify the payment
            console.log('Step 3: Verifying payment...');
            const verifyResponse = await apiRequest(`/api/payments/verify`, 'POST', {
              paymentIntentId: paymentIntent.id
            });
            
            if (!verifyResponse.ok) {
              throw new Error('Failed to verify payment');
            }
            
            const verifyData = await verifyResponse.json();
            console.log('Step 3: Payment verification data:', verifyData);
            
            if (verifyData.status === 'succeeded') {
              // Step 4: Update invoice only after successful verification
              console.log('Step 4: Updating invoice...');
              const updateResponse = await apiRequest(`/api/invoices/${invoice.id}`, 'PUT', {
                status: 'paid',
                paidAt: new Date(),
                stripePaymentIntentId: paymentIntent.id,
              });
              
              console.log('Step 4: Invoice updated successfully');
              
              // Reset retry count on success
              setRetryCount(0);
              
              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
              queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
              
              toast({
                title: "Payment Successful",
                description: "Your payment has been processed and verified successfully.",
              });
              onSuccess();
            } else {
              throw new Error(`Payment verification failed. Status: ${verifyData.status}`);
            }
          } catch (paymentError) {
            console.error('Payment processing failed:', paymentError);
            toast({
              title: "Payment Error",
              description: "Payment processing failed. Please try again or contact support.",
              variant: "destructive",
            });
          }
        } else if (paymentIntent.status === 'requires_action') {
          console.log('Payment requires action (3D Secure, etc.)');
          toast({
            title: "Payment Requires Action",
            description: "Your payment requires additional authentication. Please complete the verification.",
          });
        } else if (paymentIntent.status === 'processing') {
          console.log('Payment is processing, waiting for completion...');
          // Wait a moment and then check the payment status again
          setTimeout(async () => {
            try {
              const verifyResponse = await apiRequest(`/api/payments/verify`, 'POST', {
                paymentIntentId: paymentIntent.id
              });
              
              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                console.log('Payment verification after processing:', verifyData);
                
                if (verifyData.status === 'succeeded') {
                  // Payment succeeded, follow the complete flow
                  try {
                    // Step 1: Process the payment
                    await apiRequest(`/api/payments/process`, 'POST', {
                      paymentIntentId: paymentIntent.id,
                      invoiceId: invoice.id
                    });
                    
                    // Step 2: Confirm the payment
                    await apiRequest(`/api/payments/confirm`, 'POST', {
                      paymentIntentId: paymentIntent.id,
                      invoiceId: invoice.id
                    });
                    
                    // Step 3: Update invoice
                    await apiRequest(`/api/invoices/${invoice.id}`, 'PUT', {
                      status: 'paid',
                      paidAt: new Date(),
                      stripePaymentIntentId: paymentIntent.id,
                    });
                    
                    queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
                    
                    toast({
                      title: "Payment Successful",
                      description: "Your payment has been processed successfully.",
                    });
                    onSuccess();
                  } catch (error) {
                    console.error('Error completing payment flow:', error);
                    toast({
                      title: "Payment Error",
                      description: "Payment processing failed. Please contact support.",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "Payment Processing",
                    description: `Payment status: ${verifyData.status}. Please wait for confirmation.`,
                  });
                }
              }
            } catch (error) {
              console.error('Error checking payment status:', error);
            }
          }, 2000);
        } else if (paymentIntent.status === 'requires_payment_method') {
          console.error('Payment requires payment method - incomplete payment');
          
          // Retry logic for incomplete payments
          if (retryCount < 2) {
            setRetryCount(prev => prev + 1);
            toast({
              title: "Payment Incomplete",
              description: `Payment method not provided. Retrying... (${retryCount + 1}/3)`,
              variant: "destructive",
            });
            
            // Clear the form and retry
            setTimeout(() => {
              if (elements) {
                const cardElement = elements.getElement('card');
                if (cardElement) {
                  cardElement.clear();
                }
              }
            }, 1000);
          } else {
            toast({
              title: "Payment Failed",
              description: "Payment method was not provided after multiple attempts. Please check your payment details and try again.",
              variant: "destructive",
            });
            
            // Cancel the current payment intent and allow retry
            try {
              await apiRequest(`/api/payments/cancel`, 'POST', {
                paymentIntentId: paymentIntent.id
              });
            } catch (cancelError) {
              console.error('Failed to cancel payment intent:', cancelError);
            }
          }
        } else if (paymentIntent.status === 'canceled') {
          console.error('Payment was canceled');
          toast({
            title: "Payment Canceled",
            description: "The payment was canceled. Please try again.",
            variant: "destructive",
          });
        } else if (paymentIntent.status === 'requires_confirmation') {
          console.log('Payment requires confirmation, following complete flow...');
          try {
            // Step 1: Process the payment
            await apiRequest(`/api/payments/process`, 'POST', {
              paymentIntentId: paymentIntent.id,
              invoiceId: invoice.id
            });
            
            // Step 2: Confirm the payment
            await apiRequest(`/api/payments/confirm`, 'POST', {
              paymentIntentId: paymentIntent.id,
              invoiceId: invoice.id
            });
            
            // Step 3: Verify the payment
            const verifyResponse = await apiRequest(`/api/payments/verify`, 'POST', {
              paymentIntentId: paymentIntent.id
            });
            
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              if (verifyData.status === 'succeeded') {
                // Step 4: Update invoice
                await apiRequest(`/api/invoices/${invoice.id}`, 'PUT', {
                  status: 'paid',
                  paidAt: new Date(),
                  stripePaymentIntentId: paymentIntent.id,
                });
                
                queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
                queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
                
                toast({
                  title: "Payment Successful",
                  description: "Your payment has been processed successfully.",
                });
                onSuccess();
              } else {
                throw new Error(`Payment verification failed. Status: ${verifyData.status}`);
              }
            } else {
              throw new Error('Failed to verify payment');
            }
          } catch (error) {
            console.error('Error confirming payment:', error);
            toast({
              title: "Payment Error",
              description: "Failed to confirm payment. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          console.log('Payment intent status (other):', paymentIntent.status);
          console.log('Payment intent other status details:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          });
          toast({
            title: "Payment Processing",
            description: `Payment status: ${paymentIntent.status}. Please wait for confirmation.`,
          });
        }
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Demo Notice */}
      <DemoPaymentNotice />
      
      {/* Invoice Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="w-5 h-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Invoice:</span>
              <span className="font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Patient:</span>
              <span className="font-medium">
                {invoice.patient?.user?.firstName} {invoice.patient?.user?.lastName}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount:</span>
              <span className="text-primary">${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
          <CardDescription>
            Choose your preferred payment method. All transactions are secure and encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stripe Payment Element */}
            <div className="space-y-2">
              <Label>Payment Details</Label>
              <div className="border rounded-lg p-4">
                <PaymentElement 
                  options={{
                    layout: 'tabs',
                    paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
                  }}
                />
              </div>
            </div>

            {/* Payment Note */}
            <div className="space-y-2">
              <Label htmlFor="payment-note">Payment Note (Optional)</Label>
              <Textarea
                id="payment-note"
                placeholder="Add any notes about this payment..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Retry Notice */}
            {retryCount > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Payment attempt {retryCount}/3. Please ensure your payment details are correct.
                  </p>
                </div>
              </div>
            )}

            {/* Security Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">Secure Payment Processing</p>
                  <p className="text-xs text-blue-700">
                    Your payment information is encrypted and processed securely through Stripe. 
                    We never store your card details on our servers.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!stripe || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Confirm Payment - ${Number(invoice.total).toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payment Methods Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Accepted Payment Methods</h4>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                <span>Credit & Debit Cards</span>
              </div>
              <div className="flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                <span>Apple Pay</span>
              </div>
              <div className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                <span>Google Pay</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StripePaymentWrapperProps {
  invoice: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripePaymentWrapper({ invoice, onSuccess, onCancel }: StripePaymentWrapperProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Create payment intent function
  const createPaymentIntent = async () => {
    try {
      console.log('Creating payment intent for invoice:', invoice.id, 'Amount:', invoice.total);
      
      const response = await apiRequest('/api/payments/create-intent', 'POST', {
        invoiceId: invoice.id,
        amount: Number(invoice.total) * 100, // Convert to cents
        currency: 'usd'
      });

      const data = await response.json();
      console.log('Payment intent response:', data);
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        console.log('Payment intent created successfully');
      } else {
        throw new Error('Failed to create payment intent - no client secret returned');
      }
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      
      // Retry logic for initialization failures
      if (retryCount < 2 && (error.message.includes('network') || error.message.includes('timeout'))) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Retrying Payment Initialization",
          description: `Attempt ${retryCount + 1}/3. Please wait...`,
        });
        
        // Retry after a short delay
        setTimeout(() => {
          createPaymentIntent();
        }, 2000);
        return;
      }
      
      setError(error.message || 'Failed to initialize payment');
      toast({
        title: "Payment Error",
        description: `Failed to initialize payment: ${error.message}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if Stripe is available
  const stripePromise = getStripePromise();
  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <div className="text-amber-600 mb-4">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Payment Processing Unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">
            Stripe payment processing is not configured. Please contact support.
          </p>
        </div>
        <Button onClick={onCancel} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

    useEffect(() => {
    // Create payment intent when component mounts (when modal opens)
    createPaymentIntent();
  }, [invoice.id, invoice.total, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Initializing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Payment initialization failed</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={onCancel} variant="outline">
            Go Back
          </Button>
          <Button 
            onClick={() => {
              setError("");
              setLoading(true);
              setRetryCount(0);
              createPaymentIntent();
            }}
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Setting up payment...</p>
        </div>
      </div>
    );
  }

  console.log('Rendering Stripe Elements with client secret:', clientSecret ? 'Present' : 'Missing');
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm 
        invoice={invoice} 
        onSuccess={onSuccess} 
        onCancel={onCancel} 
      />
    </Elements>
  );
}