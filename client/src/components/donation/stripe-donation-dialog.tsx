import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, CreditCard, DollarSign, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { getStripe } from "@/lib/stripe"; // ✅ DRY

const donationAmounts = [
  { value: "10", label: "$10", description: "Supports one patient session" },
  { value: "25", label: "$25", description: "Helps with community events" },
  { value: "50", label: "$50", description: "Funds wellness programs" },
  { value: "100", label: "$100", description: "Major impact on healthcare" },
  { value: "custom", label: "Custom Amount", description: "Choose your own amount" },
];

interface StripeDonationDialogProps {
  children: React.ReactNode;
  className?: string;
}

export function StripeDonationDialog({ children, className }: StripeDonationDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("25");
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleDonation = async () => {
    if (!amount || (amount === "custom" && !customAmount)) {
      toast({ title: "Error", description: "Please select or enter a donation amount", variant: "destructive" });
      return;
    }

    const donationAmount = amount === "custom" ? parseFloat(customAmount) : parseFloat(amount);
    if (donationAmount < 1) {
      toast({ title: "Error", description: "Minimum donation amount is $1", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/donations/create-payment-intent", {
        amount: donationAmount * 100, // Stripe expects cents
        currency: "usd",
        description: `TiNHiH Portal Donation - $${donationAmount}`,
      });

      const stripe = await getStripe(); // ✅ Single instance
      if (!stripe) throw new Error("Stripe failed to load");

      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId,
      });

      if (error) {
        toast({ title: "Payment Error", description: error.message, variant: "destructive" });
      } else {
        setSuccess(true);
        toast({ title: "Thank You!", description: "Redirecting to secure payment..." });
      }
    } catch (error: any) {
      console.error("Donation error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to process donation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span>Donation Successful!</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You for Your Support!</h3>
            <p className="text-gray-600">
              Your donation of ${amount === "custom" ? customAmount : amount} helps provide better healthcare services.
            </p>
            <Button onClick={() => setOpen(false)} className="bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={className}>{children}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-red-500" />
            <span>Support TiNHiH Community</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Donation Amount Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Donation Amount</Label>
            <div className="grid grid-cols-2 gap-3">
              {donationAmounts.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    amount === option.value ? "border-[#ffdd00] bg-[#ffdd00]/10" : "border-gray-200 hover:border-[#ffdd00]/50"
                  }`}
                  onClick={() => setAmount(option.value)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-lg font-bold text-gray-900 mb-1">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          {amount === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Custom Amount ($)</Label>
              <Input
                id="custom-amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="border-gray-300 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
              />
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-2 mb-2">
            <CreditCard className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Secure Payment via Stripe</span>
          </div>

          {/* Donation Summary */}
          <div className="bg-[#ffdd00]/10 rounded-lg p-4 border border-[#ffdd00]/20 flex justify-between">
            <span className="font-medium text-gray-900">Total Donation:</span>
            <span className="text-xl font-bold text-gray-900">${amount === "custom" ? customAmount || "0" : amount}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleDonation}
              disabled={loading || (amount === "custom" && !customAmount)}
              className="flex-1 bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Donate Now</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
