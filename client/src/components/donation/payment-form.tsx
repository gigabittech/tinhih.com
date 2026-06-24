import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, CreditCard, DollarSign, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";



interface PaymentFormProps {
  amount: string;
  email: string;
  fullName?: string;
  phone?: string;
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ amount, email, fullName, phone, clientSecret, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        onError(stripeError.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description: stripeError.message || "There was an error processing your payment.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful - now confirm with our backend
        try {
          const confirmResponse = await api.post("/api/donations/confirm", {
            paymentIntentId: paymentIntent.id
          });
          
          if (confirmResponse.success) {
            toast({
              title: "Thank You!",
              description: `Your donation of $${amount} has been successfully processed.`,
            });
            onSuccess();
          } else {
            throw new Error(confirmResponse.error || "Failed to confirm donation");
          }
        } catch (confirmError: any) {
          console.error("Donation confirmation error:", confirmError);
          setError("Payment succeeded but failed to update donation record");
          onError("Payment succeeded but failed to update donation record");
          toast({
            title: "Partial Success",
            description: "Payment processed but there was an issue updating your donation record. Please contact support.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setError(error.message || "Payment failed");
      onError(error.message || "Payment failed");
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Methods */}
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Card>
          <CardContent className="p-4">
            <PaymentElement />
          </CardContent>
        </Card>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Payment Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-medium">${amount}</span>
            </div>
            {fullName && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="font-medium">{fullName}</span>
              </div>
            )}
            {phone && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Phone:</span>
                <span className="font-medium">{phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="font-medium">{email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black font-semibold"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
            Processing Payment...
          </>
        ) : (
          <>
            <Heart className="w-4 h-4 mr-2" />
            Complete Donation ${amount}
          </>
        )}
      </Button>

      {/* Security Notice */}
      <p className="text-xs text-muted-foreground text-center">
        Your payment is secure and encrypted. You'll receive a receipt via email.
      </p>
    </form>
  );
}
