import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import tinhihLogo from "@/assets/tinhih-logo.svg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/auth-context";
import { AlertCircle, CheckCircle, Eye, EyeOff, User, Mail, Lock, ArrowRight, Shield, UserPlus, Stethoscope, Users, Heart } from "lucide-react";

// Enhanced Password strength indicator component
function PasswordStrengthIndicator({ password }: { password: string }) {
  const getPasswordStrength = (password: string) => {
    let score = 0;
    const requirements = [
      { test: password.length >= 8, label: "8+ characters", met: password.length >= 8 },
      { test: /[a-z]/.test(password), label: "Lowercase letter", met: /[a-z]/.test(password) },
      { test: /[A-Z]/.test(password), label: "Uppercase letter", met: /[A-Z]/.test(password) },
      { test: /\d/.test(password), label: "Number", met: /\d/.test(password) },
      { test: /[^A-Za-z0-9]/.test(password), label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
    ];

    score = requirements.filter(req => req.test).length;
    const percentage = (score / requirements.length) * 100;

    let strength = "Very Weak";
    let color = "text-red-600";
    let bgColor = "bg-red-500";

    if (percentage >= 80) {
      strength = "Strong";
      color = "text-emerald-600";
      bgColor = "bg-emerald-500";
    } else if (percentage >= 60) {
      strength = "Good";
      color = "text-yellow-600";
      bgColor = "bg-yellow-500";
    } else if (percentage >= 40) {
      strength = "Fair";
      color = "text-orange-600";
      bgColor = "bg-orange-500";
    } else if (percentage >= 20) {
      strength = "Weak";
      color = "text-red-600";
      bgColor = "bg-red-500";
    }

    return { score, percentage, strength, color, bgColor, requirements };
  };

  if (password.length === 0) return null;

  const { percentage, strength, color, bgColor, requirements } = getPasswordStrength(password);

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Password Strength</span>
        <span className={`text-sm font-medium ${color}`}>{strength}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className={`h-full transition-all duration-300 rounded-full ${bgColor}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      {/* Requirements Grid */}
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-200 ${
              req.met 
                ? 'bg-green-100 text-green-600' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {req.met ? (
                <CheckCircle className="w-2.5 h-2.5" />
              ) : (
                <div className="w-1 h-1 bg-current rounded-full"></div>
              )}
            </div>
            <span className={`font-medium transition-colors duration-200 ${
              req.met ? 'text-green-700' : 'text-muted-foreground'
            }`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  role: z.enum(["practitioner", "patient", "member"]),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  // Set page title
  useEffect(() => {
    document.title = "Create Account | TiNHiH Portal - Mental Health & Wellness Platform";
  }, []);

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "patient",
    },
  });

  const onRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    setRegisterError("");
    setRegisterSuccess(false);
    
    try {
      await register(data);
      setRegisterSuccess(true);
      // Clear form on success
      registerForm.reset();
      
      // Redirect based on role after successful registration
      setTimeout(() => {
        if (data.role === "member") {
          setLocation("/member/onboarding");
        } else {
          setLocation("/");
        }
      }, 1000); // Small delay to show success message
    } catch (error: any) {
      setRegisterError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg mx-auto">
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
            Join TiNHiH Portal
          </h1>
          <p className="text-muted-foreground text-base">Mental Health & Wellness Platform</p>
          <p className="text-muted-foreground/70 text-sm mt-2">Begin your journey to wellness</p>
        </div>

        <Card className="shadow-lg border bg-card">
          <CardHeader className="text-center pb-6 space-y-2">
            <CardTitle className="text-xl font-semibold text-foreground">Create Your Account</CardTitle>
            <p className="text-muted-foreground text-sm">
              Join our supportive mental health community
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            {/* Register Success Alert */}
            {registerSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Welcome to TiNHiH Portal! Redirecting to your dashboard...
                </AlertDescription>
              </Alert>
            )}
            
            {/* Register Error Alert */}
            {registerError && (
              <Alert variant="destructive" className="bg-red-50/10 text-red-500 border border-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {registerError.startsWith('<html>') ? 'Server Error' : registerError}
                </AlertDescription>
              </Alert>
            )}
            
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          First Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="First name" 
                            {...field}
                            disabled={isLoading}
                            className="h-11 bg-background border-input"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500"/>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          Last Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Last name" 
                            {...field}
                            disabled={isLoading}
                            className="h-11 bg-background border-input"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500"/>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        Email Address
                      </FormLabel>
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
                
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password" 
                            {...field}
                            disabled={isLoading}
                            className="h-11 bg-background border-input pr-10"
                            onChange={(e) => {
                              field.onChange(e);
                              setPassword(e.target.value);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <PasswordStrengthIndicator password={password} />
                      <FormMessage className="text-red-500"/>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        I am a...
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background border-input">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="patient">
                            <div className="flex items-center space-x-2">
                              <Heart className="h-4 w-4 text-pink-500" />
                              <span>Client - Seeking mental health support</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="practitioner">
                            <div className="flex items-center space-x-2">
                              <Stethoscope className="h-4 w-4 text-blue-500" />
                              <span>Provider - Mental Health Professional</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-purple-500" />
                              <span>Community Member - Support & Connect</span>
                            </div>
                          </SelectItem>
                          {/* <SelectItem value="staff">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-green-500" />
                              <span>Support Staff</span>
                            </div>
                          </SelectItem> */}
                        </SelectContent>
                      </Select>
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
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
            
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">Already have an account?</span>
              </div>
            </div>

            <div className="text-center">
              <Link 
                href="/login"
                className="inline-flex items-center justify-center w-full h-11 px-4 text-sm font-medium text-foreground bg-background border border-input hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
              >
                Sign In
              </Link>
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
