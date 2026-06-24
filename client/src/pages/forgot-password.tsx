import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import tinhihLogo from "@/assets/tinhih-logo.svg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  // Set page title
  useEffect(() => {
    document.title = "Reset Password | TiNHiH Portal - Mental Health & Wellness Platform";
  }, []);

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);
    setUserNotFound(false);
    
    try {
      await forgotPassword(data.email);
      setForgotPasswordSuccess(true);
      setSentToEmail(data.email);
      // Clear form on success
      forgotPasswordForm.reset();
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send password reset email. Please try again.";
      setForgotPasswordError(errorMessage);
      
      // Check if user was not found
      if (errorMessage.includes("No account found")) {
        setUserNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 ">
              <img 
                src={tinhihLogo} 
                alt="TiNHiH Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            TiNHiH Portal
          </h1>
          <p className="text-muted-foreground text-base">Mental Health & Wellness Platform</p>
          <p className="text-muted-foreground/70 text-sm mt-2">We're here to help you recover your account</p>
        </div>

        <Card className="shadow-lg border bg-card">
          <CardHeader className="text-center pb-6 space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Link 
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <CardTitle className="text-xl font-semibold text-foreground">Reset Password</CardTitle>
            </div>
            <p className="text-muted-foreground text-sm">
              Enter your email and we'll send you a secure reset link
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            {/* Forgot Password Success Alert */}
            {forgotPasswordSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div>
                    <p className="font-medium mb-1">Reset email sent!</p>
                    <p className="text-sm">
                      Check your email at <span className="font-medium">{sentToEmail}</span> for reset instructions. 
                      The link expires in 1 hour.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Forgot Password Error Alert */}
            {forgotPasswordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {forgotPasswordError}
                </AlertDescription>
              </Alert>
            )}

            {/* User Not Found - Helpful Actions */}
            {userNotFound && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Account not found?</h4>
                <p className="text-sm text-blue-700 mb-3">
                  If you don't have an account yet, you can create one to start your mental health journey.
                </p>
                <Link 
                  href="/register"
                  className="inline-flex items-center px-4 py-2 bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black text-sm font-medium rounded-md transition-colors"
                >
                  Create New Account
                </Link>
              </div>
            )}
            
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email" 
                          {...field}
                          disabled={isLoading}
                          className="h-11 bg-background border-input"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500"/>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black font-medium" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span>Sending reset email...</span>
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="text-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">Other options</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link 
                  href="/login"
                  className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-foreground bg-background border border-input hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register"
                  className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-foreground bg-background border border-input hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TiNHiH Portal - Mental Health & Wellness Platform
          </p>
        </div>
      </div>
    </div>
  );
}
