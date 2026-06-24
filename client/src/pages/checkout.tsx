import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";
import { useCartStore } from "@/store";
import { api } from "@/lib/api";
import {
  ShoppingCart,
  CreditCard,
  Truck,
  CheckCircle,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Lock,
  Shield,
  Clock,
  Package,
  MapPin,
  Mail,
  Phone,
  User,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface CheckoutForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'sepa_debit' | 'link' | 'cashapp' | 'amazon_pay';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name: string;
    email: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [isCardValid, setIsCardValid] = useState(false);
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'success'>('shipping');
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const paymentElementRef = useRef<any>(null);
  const paymentIntentIdRef = useRef<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [paymentIntentAmount, setPaymentIntentAmount] = useState<number>(0);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const previousTotalRef = useRef<number>(0);
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();

  // Get cart data from store
  const {
    items: cartItems,
    removeItem,
    updateQuantity,
    getTotal,
    getItemCount,
    clearCart
  } = useCartStore();



  // US States with codes
  const usStates = [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" }
  ];

  const [formData, setFormData] = useState<CheckoutForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    notes: ""
  });

  // Initialize Stripe
  useEffect(() => {
    const initStripe = async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripeInstance = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51Rg0kFPo6yeGKLGBjDqlMfASPp1hAhjZ6LnP78SmdmOgG4Fm1QG1BLh1htu2gWy5wbO0WBqLxoNkLZ4jW0PXbKx300cZu6Be8c");
        setStripe(stripeInstance);
      } catch (error) {
        console.error('Failed to load Stripe:', error);
        toast({
          title: "Payment System Error",
          description: "Unable to load payment system. Please refresh the page.",
          variant: "destructive"
        });
      }
    };

    initStripe();

    // Cleanup function for component unmount
    return () => {
      if (paymentElementRef.current) {
        try {
          paymentElementRef.current.unmount();
          paymentElementRef.current = null;
        } catch (error) {
          console.error('Error cleaning up payment element on unmount:', error);
        }
      }
    };
  }, [toast]);



  useEffect(() => {
    setPageInfo("Secure Checkout", "Complete your purchase securely");

    // Only redirect if cart is empty AND order is not complete
    if (cartItems.length === 0 && !orderComplete) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Please add items before checkout.",
        variant: "destructive"
      });
      setLocation("/store");
    }
  }, [setPageInfo, cartItems.length, orderComplete, toast, setLocation]);

  // Create payment intent when moving to payment step
  useEffect(() => {
    if (currentStep === 'payment' && !paymentIntent) {
      createPaymentIntent();
    }
  }, [currentStep, paymentIntent]);

  // Update payment intent when total amount changes (cart items or coupon)
  useEffect(() => {
    if (currentStep === 'payment' && paymentIntent) {
      const currentTotal = calculateTotal();
      
      // Only update if the total has actually changed
      if (Math.abs(currentTotal - previousTotalRef.current) > 0.01) {
        const updateIntent = async () => {
          try {
            setUpdatingPayment(true);
            if (appliedCoupon) {
              await updatePaymentIntentWithCoupon();
            } else {
              await updatePaymentIntentWithoutCoupon();
            }
          } catch (error) {
            console.error("Failed to update payment intent:", error);
          } finally {
            setUpdatingPayment(false);
          }
        };
        updateIntent();
      }
      
      // Update the previous total ref
      previousTotalRef.current = currentTotal;
    }
  }, [cartItems, appliedCoupon, currentStep, paymentIntent]);

  // Clean up Stripe Elements when leaving payment step
  useEffect(() => {
    // Only unmount when going back to shipping or when order is complete
    if (currentStep === 'shipping' && paymentElementRef.current) {
      try {
        paymentElementRef.current.unmount();
        paymentElementRef.current = null;
      } catch (error) {
        console.error('Error cleaning up payment element:', error);
      }
    }
  }, [currentStep]);

  // Initialize Stripe Elements when elements are ready
  useEffect(() => {
    if (elements && paymentIntent && currentStep === 'payment') {
      // Check if we need to recreate the payment element (new payment intent or no existing element)
      const shouldCreateElement = !paymentElementRef.current || paymentIntentIdRef.current !== paymentIntent.id;
      
      if (shouldCreateElement) {
        // Clean up existing payment element if it exists
        if (paymentElementRef.current) {
          try {
            paymentElementRef.current.unmount();
            paymentElementRef.current = null;
          } catch (error) {
            console.log('Error unmounting existing payment element:', error);
          }
        }

        // Create new payment element with card as default
        const paymentElement = elements.create('payment', {
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
            spacedAccordionItems: false
          },
          paymentMethodOrder: ['card', 'link', 'cashapp', 'amazon_pay'],
          defaultValues: {
            billingDetails: {
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
              phone: formData.phone,
              address: {
                line1: formData.address1,
                city: formData.city,
                state: formData.state,
                postal_code: formData.zipCode,
                country: formData.country
              }
            }
          }
        });

        // Mount the payment element with a small delay to ensure DOM is ready
        setTimeout(() => {
          const paymentElementContainer = document.getElementById('payment-element');
          if (paymentElementContainer && !paymentElementRef.current) {
            paymentElement.mount('#payment-element');
            paymentElementRef.current = paymentElement;
            paymentIntentIdRef.current = paymentIntent.id;

            // Listen for payment method changes
            paymentElement.on('change', (event: any) => {
              if (event.value && event.value.paymentMethod) {
                setPaymentMethod(event.value.paymentMethod);
              }

              // Use Stripe's server-side validation
              if (event.complete && !event.error) {
                setIsPaymentComplete(true);
                setPaymentError(null);

                // For card payments, rely on Stripe's validation
                if (event.value && event.value.paymentMethod && event.value.paymentMethod.type === 'card') {
                  // If Stripe says it's complete and no errors, the card is valid
                  setIsCardValid(true);
                } else {
                  // For non-card payment methods, no card validation needed
                  setIsCardValid(true);
                }
              } else {
                setIsPaymentComplete(false);
                setPaymentError(event.error?.message || null);

                // For card payments, if not complete or has errors, card is invalid
                if (event.value && event.value.paymentMethod && event.value.paymentMethod.type === 'card') {
                  setIsCardValid(false);
                }
              }
            });
          }
        }, 100);
      }
    }

    // Cleanup function
    return () => {
      if (paymentElementRef.current) {
        try {
          paymentElementRef.current.unmount();
          paymentElementRef.current = null;
          paymentIntentIdRef.current = null;
        } catch (error) {
          console.log('Error unmounting payment element:', error);
        }
      }
    };
  }, [elements, paymentIntent, currentStep]);

  // Update payment element billing details when form data changes
  useEffect(() => {
    if (paymentElementRef.current && currentStep === 'payment') {
      // Update the payment element's default values
      paymentElementRef.current.update({
        defaultValues: {
          billingDetails: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
            address: {
              line1: formData.address1,
              city: formData.city,
              state: formData.state,
              postal_code: formData.zipCode,
              country: formData.country
            }
          }
        }
      });
    }
  }, [formData.firstName, formData.lastName, formData.email, formData.phone, formData.address1, formData.city, formData.state, formData.zipCode, formData.country, currentStep]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      const response = await api.post("/api/store/create-payment-intent", {
        amount: Math.round(calculateTotal() * 100), // Convert to cents
        currency: 'usd',
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.retail_price || item.product.price,
          quantity: item.quantity
        }))
      });

      if (response.success) {
        setPaymentIntent(response.data);
        const amount = response.data.amount / 100; // Convert from cents to dollars
        setPaymentIntentAmount(amount);
        previousTotalRef.current = calculateTotal(); // Initialize the previous total

        // Initialize Stripe Elements
        if (stripe) {
          const elementsInstance = stripe.elements({
            clientSecret: response.data.client_secret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#ffdd00',
                colorBackground: '#ffffff',
                colorText: '#1f2937',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',
              },
            },
          });
          setElements(elementsInstance);
        }
      } else {
        throw new Error(response.error || "Failed to create payment intent");
      }
    } catch (error: any) {
      console.error("Payment intent error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive"
      });
      setCurrentStep('shipping');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentIntentWithCoupon = async () => {
    // Check if payment intent and coupon are available
    if (!paymentIntent || !appliedCoupon) {
      console.log("Payment intent or coupon not ready for update");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/api/store/update-payment-intent", {
        paymentIntentId: paymentIntent.id,
        couponId: appliedCoupon.id,
        newAmount: Math.round(calculateTotal() * 100),
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.retail_price || item.product.price,
          quantity: item.quantity
        }))
      });

      if (response.success) {
        // Update the payment intent with new data
        setPaymentIntent(response.data);
        setPaymentIntentAmount(response.data.amount / 100); // Convert from cents to dollars

        // Update the existing elements with new client secret
        if (elements) {
          elements.update({ clientSecret: response.data.client_secret });
        }

        toast({
          title: "Payment Updated",
          description: "Payment amount has been updated with your discount.",
        });
      } else {
        throw new Error(response.error || "Failed to update payment intent");
      }
    } catch (error: any) {
      console.error("Payment intent update error:", error);
      toast({
        title: "Update Error",
        description: error.message || "Failed to update payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentIntentWithoutCoupon = async () => {
    // Check if payment intent is available
    if (!paymentIntent) {
      console.log("Payment intent not ready for update");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/api/store/update-payment-intent", {
        paymentIntentId: paymentIntent.id,
        newAmount: Math.round(calculateTotal() * 100),
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.retail_price || item.product.price,
          quantity: item.quantity
        }))
      });

      if (response.success) {
        // Update the payment intent with new data
        setPaymentIntent(response.data);
        setPaymentIntentAmount(response.data.amount / 100); // Convert from cents to dollars

        // Update the existing elements with new client secret
        if (elements) {
          elements.update({ clientSecret: response.data.client_secret });
        }

        toast({
          title: "Payment Updated",
          description: "Payment amount has been updated.",
        });
      } else {
        throw new Error(response.error || "Failed to update payment intent");
      }
    } catch (error: any) {
      console.error("Payment intent update error:", error);
      toast({
        title: "Update Error",
        description: error.message || "Failed to update payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuantityChange = (productId: string | number, quantity: number, variant?: string) => {
    updateQuantity(productId, quantity, variant);
  };

  const handleRemoveItem = (productId: string | number, variant?: string) => {
    removeItem(productId, variant);
    toast({
      title: "Item Removed",
      description: "Item has been removed from your cart."
    });
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.product.retail_price || item.product.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal > 50 ? 0 : 5.99; // Free shipping over $50
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * 0.08; // 8% tax rate
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping();
    const tax = calculateTax();
    const discount = calculateDiscount();
    return subtotal + shipping + tax - discount;
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;

    // Handle Stripe coupon types
    if (appliedCoupon.amount_off) {
      // Fixed amount discount (in cents)
      return appliedCoupon.amount_off / 100;
    } else if (appliedCoupon.percent_off) {
      // Percentage discount
      return calculateSubtotal() * (appliedCoupon.percent_off / 100);
    }

    return 0;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      // Validate coupon with Stripe
      const response = await api.post("/api/store/validate-stripe-coupon", {
        code: couponCode.trim().toUpperCase(),
        amount: Math.round(calculateSubtotal() * 100) // Convert to cents for Stripe
      });

      if (response.success) {
        setAppliedCoupon(response.data);
        setCouponCode("");

        toast({
          title: "Coupon Applied!",
          description: response.data.description || "Discount applied to your order.",
        });
      } else {
        setCouponError(response.error || "Invalid coupon code");
      }
    } catch (error: any) {
      console.error("Coupon validation error:", error);
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);

    // If we're on the payment step, update the payment intent to remove coupon
    if (currentStep === 'payment' && paymentIntent) {
      updatePaymentIntentWithoutCoupon();
    }

    toast({
      title: "Coupon Removed",
      description: "Coupon has been removed from your order.",
    });
  };

  const handleNextStep = () => {
    if (currentStep === 'shipping') {
      // Validate shipping information
      if (!formData.firstName || !formData.lastName || !formData.email ||
        !formData.address1 || !formData.city || !formData.state || !formData.zipCode) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required shipping fields.",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      // Process payment and create order
      handlePaymentSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('shipping');
      // Reset payment validation when going back
      setIsPaymentComplete(false);
      setIsCardValid(false);
      setPaymentMethod(null);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!stripe || !elements || !paymentIntent) {
      toast({
        title: "Payment Error",
        description: "Payment system not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    // Show payment processing notification
    toast({
      title: "Processing Payment...",
      description: "Please wait while we process your payment securely.",
    });

    try {
      // Confirm payment without redirect
      const { error, paymentIntent: confirmedIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
              phone: formData.phone,
              address: {
                line1: formData.address1,
                line2: formData.address2,
                city: formData.city,
                state: formData.state,
                postal_code: formData.zipCode,
                country: formData.country,
              },
            },
          },
        },
      });

      if (error) {
        setPaymentError(error.message || 'Payment failed');
        toast({
          title: "Payment Failed",
          description: error.message || "There was an error processing your payment.",
          variant: "destructive"
        });
      } else if (confirmedIntent.status === 'succeeded') {
        // Show payment success notification
        toast({
          title: "✅ Payment Successful!",
          description: "Your payment has been processed successfully. Creating your order now...",
        });

        // Create order with payment information
        await createOrder(confirmedIntent.id);
        
        // Confirm payment and update order status
        await confirmPayment(confirmedIntent.id);
        
        // Move to success step
        setCurrentStep('success');
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentError(error.message || 'Payment failed');
      toast({
        title: "Payment Error",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const confirmPayment = async (paymentIntentId: string) => {
    try {
      
      const response = await api.post("/api/store/confirm-payment", {
        paymentIntentId: paymentIntentId
      });

      if (response.success) {
        toast({
          title: "✅ Payment Confirmed!",
          description: `Order #${response.data.orderNumber} payment status updated to paid.`,
        });
      } else {
        console.error('Payment confirmation failed:', response.error);
        // Don't show error to user since order was created successfully
      }
    } catch (error: any) {
      console.error("Payment confirmation error:", error);
      // Don't show error to user since order was created successfully
    }
  };

  const createOrder = async (paymentIntentId: string) => {
    try {
      // Show order creation notification
      toast({
        title: "Creating Order...",
        description: "Please wait while we process your order.",
      });

      const orderData = {
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.retail_price || item.product.price,
          quantity: item.quantity,
          variant: item.selectedVariant
        })),
        customer: formData,
        subtotal: calculateSubtotal(),
        shipping: calculateShipping(),
        tax: calculateTax(),
        discount: calculateDiscount(),
        couponId: appliedCoupon?.id,
        couponName: appliedCoupon?.name,
        total: calculateTotal(),
        paymentIntentId: paymentIntentId
      };

      const response = await api.post("/api/store/orders", orderData);

      if (response.success) {
        setOrderId(response.data.orderNumber);
        setOrderComplete(true);
        // Clear cart immediately
        // setTimeout(() => {
        //   toast({
        //     title: "🛒 Cart Cleared",
        //     description: "Your cart has been cleared after successful order placement.",
        //   });
        //   window.location.href = "/store";
        // }, 2000);
        
        // Show cart cleared notification

        // Show comprehensive success notification
        toast({
          title: "🎉 Order Created Successfully!",
          description: `Order #${response.data.orderNumber} has been created and confirmed. You will receive an email confirmation shortly.`,
        });

        // Show order details notification after a short delay
        setTimeout(() => {
          toast({
            title: "📦 Order Details",
            description: `Items: ${cartItems.length} | Total: $${calculateTotal().toFixed(2)} | Shipping: ${calculateShipping() === 0 ? 'Free' : `$${calculateShipping().toFixed(2)}`}`,
          });
        }, 2000);

        // Move to success step
        setCurrentStep('success');

        setTimeout(() => {
          clearCart();
        }, 2000);

      } else {
        throw new Error(response.error || "Failed to create order");
      }
    } catch (error: any) {
      console.error("Order creation error:", error);
      toast({
        title: "❌ Order Creation Failed",
        description: error.message || "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive"
      });
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2 text-foreground">Order Confirmed!</h1>
              <p className="text-muted-foreground mb-4">
                Thank you for your purchase. Your order has been successfully placed.
              </p>
              {orderId && (
                <p className="text-sm text-muted-foreground mb-6">
                  Order Number: <span className="font-mono text-foreground font-semibold">{orderId}</span>
                </p>
              )}
              <div className="space-x-4">
                <Button onClick={() => setLocation("/store")}>
                  Continue Shopping
                </Button>
                <Button variant="outline" onClick={() => setLocation("/member")}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="text-center">
            <CardContent className="p-8">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2 text-foreground">Your Cart is Empty</h1>
              <p className="text-muted-foreground mb-6">
                Add some items to your cart before proceeding to checkout.
              </p>
              <Button onClick={() => setLocation("/store")}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-4 sm:py-8 transition-colors duration-300"
      style={{ backgroundColor: `hsl(var(--background))` }}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="outline"
            onClick={() => setLocation("/store")}
            className="mb-3 sm:mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Store
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Secure Checkout</h1>
          <p className="text-muted-foreground mt-1">Complete your purchase securely</p>
        </div>

        {/* Checkout Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'shipping' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'shipping' ? 'bg-primary text-white border-primary' : 'border-muted-foreground'
                }`}>
                {currentStep === 'shipping' ? '1' : <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className="font-medium">Shipping</span>
            </div>
            <div className="w-16 h-px bg-muted-foreground"></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'payment' ? 'bg-primary text-white border-primary' : 'border-muted-foreground'
                }`}>
                {currentStep === 'payment' ? '2' : currentStep === 'success' ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <span className="font-medium">Payment</span>
            </div>
            <div className="w-16 h-px bg-muted-foreground"></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'success' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'success' ? 'bg-primary text-white border-primary' : 'border-muted-foreground'
                }`}>
                {currentStep === 'success' ? '3' : '3'}
              </div>
              <span className="font-medium">Success</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-[#ffdd00] to-yellow-400">
                    <ShoppingCart className="h-5 w-5 text-black" />
                  </div>
                  <span className="text-lg font-semibold">Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Items List */}
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const price = item.product.retail_price || item.product.price;
                    const image = item.product.images && item.product.images.length > 0 ? item.product.images[0] : '';
                    const totalItemPrice = price * item.quantity;

                    return (
                      <div key={`${item.product.id}_${item.selectedVariant}`} className="flex items-start space-x-3 lg:space-x-4 p-3 lg:p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex-shrink-0">
                          <img
                            src={image}
                            alt={item.product.name}
                            className="w-16 h-16 lg:w-20 lg:h-20 object-cover rounded-lg border shadow-sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm lg:text-base mb-1 line-clamp-2">
                            {item.product.name}
                          </h4>
                          <p className="text-xs lg:text-sm text-muted-foreground mb-2">
                            ${price.toFixed(2)} each
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 items-start">
                            <div className="flex items-center justify-center lg:justify-start space-x-1 lg:space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuantityChange(item.product.id, item.quantity - 1, item.selectedVariant)}
                                disabled={item.quantity <= 1 || currentStep === 'payment'}
                                className="w-6 h-6 p-0 border-border hover:border-[#ffdd00] hover:bg-[#ffdd00]/10"
                              >
                                <span className="text-sm lg:text-lg font-semibold"><Minus className="h-4 w-4 lg:h-5 lg:w-5" /></span>
                              </Button>
                              <span className="w-5 text-center text-foreground font-semibold text-sm lg:text-base">
                                {item.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuantityChange(item.product.id, item.quantity + 1, item.selectedVariant)}
                                disabled={currentStep === 'payment'}
                                className="w-6 h-6 p-0 border-border hover:border-[#ffdd00] hover:bg-[#ffdd00]/10"
                              >
                                <span className="text-sm lg:text-lg font-semibold"><Plus className="h-4 w-4 lg:h-5 lg:w-5" /></span>
                              </Button>
                            </div>

                            <div className="flex items-center justify-center lg:justify-end space-x-2 lg:space-x-3">
                              <span className="text-sm lg:text-base font-semibold text-foreground">
                                ${totalItemPrice.toFixed(2)}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveItem(item.product.id, item.selectedVariant)}
                                disabled={currentStep === 'payment'}
                                className="w-6 h-6 p-0 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                              </Button>
                            </div>
                          </div>

                          {/* Payment Validation Status for Card Payments */}
                          {paymentMethod && paymentMethod.type === 'card' && (
                            <div className="mt-3 space-y-2">
                              {!isPaymentComplete && !paymentError && (
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                                  <span>Complete your card information</span>
                                </div>
                              )}
                              {paymentError && (
                                <div className="flex items-center space-x-2 text-sm text-red-600">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span>{paymentError}</span>
                                </div>
                              )}
                              {isPaymentComplete && isCardValid && !paymentError && (
                                <div className="flex items-center space-x-2 text-sm text-green-600">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>Card information valid ✓</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Coupon Section */}
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Have a coupon?</h4>

                    {!appliedCoupon ? (
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            disabled={currentStep === 'payment'}
                            className="flex-1"
                            onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          />
                          <Button
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponCode.trim() || currentStep === 'payment'}
                            className="bg-[#ffdd00] hover:bg-yellow-400 text-black font-semibold px-4"
                          >
                            {couponLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            ) : (
                              "Apply"
                            )}
                          </Button>
                        </div>
                        {couponError && (
                          <p className="text-red-600 text-sm flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {couponError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-800 dark:text-green-200 font-medium">
                              {appliedCoupon.name || appliedCoupon.id}
                              {appliedCoupon.amount_off && ` - $${(appliedCoupon.amount_off / 100).toFixed(2)} OFF`}
                              {appliedCoupon.percent_off && ` - ${appliedCoupon.percent_off}% OFF`}
                            </span>
                          </div>
                          <Button
                            onClick={handleRemoveCoupon}
                            variant="ghost"
                            size="sm"
                            disabled={currentStep === 'payment'}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/30"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-foreground font-medium">Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}):</span>
                    <span className="text-foreground font-semibold">${calculateSubtotal().toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-foreground font-medium">Shipping:</span>
                    <span className={`font-semibold ${calculateShipping() === 0 ? 'text-green-600' : 'text-foreground'}`}>
                      {calculateShipping() === 0 ? "Free" : `$${calculateShipping().toFixed(2)}`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-foreground font-medium">Tax:</span>
                    <span className="text-foreground font-semibold">${calculateTax().toFixed(2)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-foreground font-medium">Discount ({appliedCoupon.name || appliedCoupon.id}):</span>
                      <span className="text-green-600 font-semibold">-${calculateDiscount().toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground font-bold text-lg">Total:</span>
                      <div className="flex items-center space-x-2">
                        {updatingPayment && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ffdd00]"></div>
                        )}
                        <span className="font-bold text-xl text-black bg-[#ffdd00] dark:bg-[#ffdd00] px-3 py-1 rounded-lg">
                          ${currentStep === 'payment' && paymentIntentAmount > 0 ? paymentIntentAmount.toFixed(2) : calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Savings Info */}
                  {calculateShipping() === 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                          Free shipping on orders over $50!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checkout Steps Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information */}
            {currentStep === 'shipping' && (
              <Card className="bg-foreground shadow-lg border-0 rounded">
                <CardHeader className="bg-gradient-to-r from-[#ffdd00]/30 to-[#ffdd00]/80 border-b">
                  <CardTitle className="flex items-center space-x-3 text-foreground">
                    <div className="p-2 rounded-lg bg-[#ffdd00]/80">
                      <MapPin className="h-5 w-5 text-[#334155]" />
                    </div>
                    <div>
                      <span className="text-lg font-semibold">Shipping Information</span>
                      <p className="text-sm text-muted-foreground mt-1">Where should we deliver your order?</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-foreground font-medium">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                        className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-foreground font-medium">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                        className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-foreground font-medium">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                        className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-foreground font-medium">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address1" className="text-foreground font-medium">Street Address *</Label>
                    <Input
                      id="address1"
                      value={formData.address1}
                      onChange={(e) => handleInputChange("address1", e.target.value)}
                      required
                      className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address2" className="text-foreground font-medium">Apartment, suite, etc. (optional)</Label>
                    <Input
                      id="address2"
                      value={formData.address2}
                      onChange={(e) => handleInputChange("address2", e.target.value)}
                      className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-foreground font-medium">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        required
                        className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-foreground font-medium">State *</Label>
                      <select
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        className="mt-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none  focus:ring-[#ffdd00] focus:border-[#ffdd00] bg-foreground placeholder:opacity-50"
                        required
                      >
                        <option value="">Select State</option>
                        {usStates.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-foreground font-medium">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange("zipCode", e.target.value)}
                        required
                        className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-foreground font-medium">Order Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Any special instructions or notes for your order..."
                      className="mt-1 bg-foreground border border-gray-300 dark:border-gray-600 focus:border-[#ffdd00] focus:ring-[#ffdd00]"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleNextStep}
                      size="lg"
                      className="bg-[#ffdd00]/80 hover:bg-[#ffdd00] text-black px-8"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ffdd00"></div>
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>Continue to Payment</span>
                          <CreditCard className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Payment Information */}
            {currentStep === 'payment' && (
              <Card className="bg-foreground shadow-lg border-0 dark:bg-foreground">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <CardTitle className="flex items-center space-x-3 text-foreground">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <span className="text-lg font-semibold">Payment Information</span>
                      <p className="text-sm text-muted-foreground mt-1">Secure payment powered by Stripe</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Security Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">Secure Payment</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      Your payment information is encrypted and secure. We never store your card details.
                    </p>
                  </div>

                  {/* Payment Form */}
                  {loading || !paymentIntent ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-muted-foreground">
                        {loading ? "Loading payment form..." : "Updating payment form..."}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-foreground font-medium">Payment Information</Label>
                        <div
                          key={`payment-element-${currentStep}`}
                          id="payment-element"
                          className="mt-1"
                        />
                        {paymentError && (
                          <p className="text-red-600 text-sm mt-2 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {paymentError}
                          </p>
                        )}
                      </div>

                      {/* Billing Address */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium text-foreground mb-3">Billing Address</h4>
                        <p className="text-sm text-muted-foreground">
                          {formData.firstName} {formData.lastName}<br />
                          {formData.address1}<br />
                          {formData.address2 && <>{formData.address2}<br /></>}
                          {formData.city}, {formData.state} {formData.zipCode}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button
                      onClick={handlePreviousStep}
                      variant="outline"
                      size="lg"
                      className="px-8"
                    >
                      Back to Shipping
                    </Button>
                    <Button
                      onClick={handleNextStep}
                      size="lg"
                      className={`px-8 ${
                        // For card payments, check if payment is complete and card is valid
                        paymentMethod && paymentMethod.type === 'card'
                          ? (isPaymentComplete && isCardValid
                            ? 'bg-[#ffdd00] hover:bg-yellow-400 text-black'
                            : 'bg-gray-400 text-gray-600 cursor-not-allowed')
                          : 'bg-[#ffdd00]/80 hover:bg-[#ffdd00] text-[#1f2937]'
                        }`}
                      disabled={
                        loading ||
                        updatingPayment ||
                        !elements ||
                        !!(paymentMethod && paymentMethod.type === 'card' && (!isPaymentComplete || !isCardValid))
                      }
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          <span>Loading...</span>
                        </div>
                      ) : updatingPayment ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          <span>Updating Payment...</span>
                        </div>
                      ) : paymentMethod && paymentMethod.type === 'card' && !isPaymentComplete ? (
                        "Complete Card Info"
                      ) : paymentMethod && paymentMethod.type === 'card' && paymentError ? (
                        "Fix Card Errors"
                      ) : (
                        `Pay $${paymentIntentAmount > 0 ? paymentIntentAmount.toFixed(2) : calculateTotal().toFixed(2)}`
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Success */}
            {currentStep === 'success' && (
              <Card className="bg-card shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 border-b">
                  <CardTitle className="flex items-center space-x-3 text-foreground">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <span className="text-lg font-semibold">Order Successful!</span>
                      <p className="text-sm text-muted-foreground mt-1">Thank you for your purchase</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="text-center space-y-4">
                    <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 w-16 h-16 mx-auto flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">Payment Successful!</h3>
                      <p className="text-muted-foreground mb-4">
                        Your order has been placed successfully. You will receive a confirmation email shortly.
                      </p>
                      {orderId && (
                        <div className="bg-muted/50 rounded-lg p-4 mb-4">
                          <p className="text-sm text-muted-foreground">Order Number:</p>
                          <p className="font-semibold text-foreground">{orderId}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center space-x-4">
                      <Button
                        onClick={() => setLocation("/store")}
                        variant="outline"
                        size="lg"
                      >
                        Continue Shopping
                      </Button>
                      <Button
                        onClick={() => setLocation("/member/orders")}
                        size="lg"
                        className="bg-[#ffdd00] hover:bg-yellow-400 text-black"
                      >
                        View Orders
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Trust Indicators Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-foreground">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">
                Your payment information is encrypted and secure
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-foreground">Fast Shipping</h3>
              <p className="text-sm text-muted-foreground">
                Free shipping on orders over $50
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-foreground">Quality Guarantee</h3>
              <p className="text-sm text-muted-foreground">
                30-day return policy on all items
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

