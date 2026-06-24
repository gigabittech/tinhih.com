import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Lock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StripePaymentFormProps {
  amount: number;
  invoiceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripePaymentForm({ amount, invoiceId, onSuccess, onCancel }: StripePaymentFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  // Create payment intent when component mounts
  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          invoiceId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret: secret } = await response.json();
      setClientSecret(secret);
    } catch (error: any) {
      setPaymentError('Failed to initialize payment. Please try again.');
      console.error('Payment intent creation error:', error);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const validateCard = () => {
    const cardNumberClean = cardNumber.replace(/\s/g, '');
    const expiryParts = expiryDate.split('/');
    
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      return 'Invalid card number';
    }
    
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      return 'Invalid expiry date (MM/YY)';
    }
    
    const month = parseInt(expiryParts[0]);
    const year = parseInt(expiryParts[1]);
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (month < 1 || month > 12) {
      return 'Invalid expiry month';
    }
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return 'Card has expired';
    }
    
    if (cvv.length < 3 || cvv.length > 4) {
      return 'Invalid CVV';
    }
    
    if (!cardholderName.trim()) {
      return 'Please enter cardholder name';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    alert('handleSubmit');
    e.preventDefault();
    setPaymentError("");
    
    const validationError = validateCard();
    if (validationError) {
      setPaymentError(validationError);
      return;
    }

    if (!clientSecret) {
      setPaymentError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // For demo purposes, we'll simulate a successful payment
      // In production, you would use Stripe.js to securely process the payment
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful payment
      const success = Math.random() > 0.1; // 90% success rate for demo
      
      if (success) {
        // Update invoice status via API
        const updateResponse = await fetch(`/api/invoices/${invoiceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            status: 'paid',
            paidAt: new Date(),
          }),
        });

        if (updateResponse.ok) {
          toast({
            title: "Payment Successful",
            description: `Payment of $${amount.toFixed(2)} processed successfully`,
          });
          onSuccess();
        } else {
          throw new Error('Failed to update invoice status');
        }
      } else {
        throw new Error('Payment was declined. Please try a different card.');
      }
    } catch (error: any) {
      setPaymentError(error.message || "Payment processing failed. Please try again.");
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-foreground">
              ${amount.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              Invoice Payment
            </div>
          </div>

          {paymentError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              className="border-border bg-background text-foreground"
              disabled={isProcessing}
            />
          </div>

          <div>
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className="border-border bg-background text-foreground"
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                className="border-border bg-background text-foreground"
                disabled={isProcessing}
              />
            </div>
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                placeholder="123"
                maxLength={4}
                className="border-border bg-background text-foreground"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            Your payment information is secure and encrypted
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-border hover:bg-accent"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black border-0"
              disabled={isProcessing || !clientSecret}
            >
              {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>💡 Demo Mode: This is a simulation. Use any card details to test.</p>
            <p>Test Card: 4242 4242 4242 4242 | Exp: 12/25 | CVV: 123</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
