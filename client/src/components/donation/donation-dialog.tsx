import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, CreditCard, CheckCircle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentForm } from "./payment-form";
import { useAuth } from "@/context/auth-context";
import { getStripe } from "@/lib/stripe";

interface DonationDialogProps {
  children: React.ReactNode;
}

export function DonationDialog({ children }: DonationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  const predefinedAmounts = [10, 25, 50, 100, 250, 500];

  // Initialize Stripe once
  useEffect(() => {
    // Only load Stripe when dialog is opened
    if (isOpen) {
      setStripePromise(getStripe());
    }
  }, [isOpen]);

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
  };

  const handleDonation = async () => {
    if (!amount || parseFloat(amount) < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount ($1 minimum).",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    // Phone is optional for now
    // if (!phone.trim()) {
    //   toast({
    //     title: "Missing Information",
    //     description: "Please enter your phone number.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    const emailToUse = email || user?.email;
    if (!emailToUse) {
      toast({
        title: "Missing Information",
        description: "Please enter an email for the receipt.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await api.post("/api/donations/create-payment-intent", {
        amount: parseFloat(amount),
        email: emailToUse,
        firstName: fullName.split(' ')[0] || '',
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        phone: phone,
        description: "TiNHiH Portal Donation",
      });

      if (!response.success && !response.clientSecret) {
        throw new Error(response.error || "Failed to create payment intent");
      }

      setClientSecret(response.clientSecret);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Payment Error",
        description: err.message || "Failed to process donation.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsSuccess(false);
      setAmount("");
      setFullName("");
      setPhone("");
      setEmail("");
      setClientSecret(null);
    }, 3000);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setClientSecret(null);
      setAmount("");
      setFullName("");
      setPhone("");
      setEmail("");
      setIsSuccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        {isSuccess ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Your donation of ${amount} has been successfully processed.
            </p>
            <p className="text-xs text-muted-foreground">
              A receipt has been sent to your email address.
            </p>
          </div>
        ) : !clientSecret ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Heart className="w-6 h-6 text-[#ffdd00]" />
                Support TiNHiH Portal
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Your donation helps provide better healthcare services.
              </DialogDescription>
            </DialogHeader>

            {/* Amount selection */}
            <div className="space-y-3">
              <Label>Select Amount</Label>
              <div className="grid grid-cols-3 gap-2">
                {predefinedAmounts.map((a) => (
                  <Button
                    key={a}
                    variant={amount === a.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleAmountSelect(a)}
                  >
                    ${a}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>

            {/* Full Name Input */}
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <Label>Phone Number (Optional)</Label>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder={user?.email || "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Secure Notice */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Secure Payment</p>
                  <p className="text-xs text-muted-foreground">
                    Powered by Stripe - your payment information is safe.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleDonation}
              disabled={isProcessing || !amount}
              className="w-full bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black font-semibold"
            >
              {isProcessing ? "Processing..." : "Continue to Payment"}
            </Button>
          </>
        ) : (
          stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                amount={amount}
                email={email || user?.email || ""}
                fullName={fullName}
                phone={phone}
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onError={() => setClientSecret(null)}
              />
            </Elements>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
