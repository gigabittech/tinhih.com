import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { usePageTitle } from "@/context/page-context";
import { useLocation } from "wouter";
import { Heart, Star, MessageSquare, CheckCircle, ArrowRight } from "lucide-react";


interface OnboardingData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Patient History
  wasPatient: boolean;
  patientId?: string;
  treatmentStartDate?: string;
  treatmentEndDate?: string;
  primaryCondition?: string;
  
  // Recovery Journey
  recoveryRating: number;
  recoveryChallenges: string[];
  recoverySuccesses: string[];
  recoveryJourney: string;
  
  // Service Feedback
  serviceRating: number;
  staffRating: number;
  facilityRating: number;
  communicationRating: number;
  
  // Detailed Feedback
  whatWorkedWell: string;
  whatCouldBeImproved: string;
  recommendations: string;
  
  // Community Engagement
  interestedInEvents: boolean;
  interestedInSupporting: boolean;
  preferredContactMethod: string;
  additionalComments: string;
}

export default function MemberOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    wasPatient: false,
    recoveryRating: 0,
    recoveryChallenges: [],
    recoverySuccesses: [],
    recoveryJourney: "",
    serviceRating: 0,
    staffRating: 0,
    facilityRating: 0,
    communicationRating: 0,
    whatWorkedWell: "",
    whatCouldBeImproved: "",
    recommendations: "",
    interestedInEvents: true,
    interestedInSupporting: true,
    preferredContactMethod: "email",
    additionalComments: ""
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { setPageInfo } = usePageTitle();

  useEffect(() => {
    document.title = "TiNHiH Community Member Onboarding";
    setPageInfo("Community Member Onboarding", "Join our community and share your journey");
    
    // Pre-fill with user data if available
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: (user as any).phone || ""
      }));
    }
  }, [setPageInfo, user]);

  const handleInputChange = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field: keyof OnboardingData, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName); // Email is pre-filled and read-only
      case 2:
        return formData.wasPatient !== undefined;
      case 3:
        return formData.wasPatient ? !!(formData.recoveryRating > 0 && formData.recoveryJourney.trim()) : true;
      case 4:
        return formData.wasPatient ? !!(formData.serviceRating > 0 && formData.whatWorkedWell.trim()) : true;
      case 5:
        return true; // Final step is optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast({
        title: "Please complete all required fields",
        description: "All fields marked with * are required",
        variant: "destructive"
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Client-side validation for treatment dates
      if (formData.treatmentStartDate && formData.treatmentEndDate) {
        const startDate = new Date(formData.treatmentStartDate);
        const endDate = new Date(formData.treatmentEndDate);
        
        if (endDate < startDate) {
          toast({
            title: "Invalid Dates",
            description: "Treatment end date cannot be before treatment start date",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }
      
      // Convert form data to ensure all dates are strings and clean up the data
      const submitData = {
        ...formData,
        // Ensure dates are strings or null - convert any Date objects to ISO strings
        treatmentStartDate: formData.treatmentStartDate ? ((formData.treatmentStartDate as any) instanceof Date ? (formData.treatmentStartDate as any).toISOString() : String(formData.treatmentStartDate)) : null,
        treatmentEndDate: formData.treatmentEndDate ? ((formData.treatmentEndDate as any) instanceof Date ? (formData.treatmentEndDate as any).toISOString() : String(formData.treatmentEndDate)) : null,
        // Ensure arrays are properly formatted
        recoveryChallenges: Array.isArray(formData.recoveryChallenges) ? formData.recoveryChallenges : [],
        recoverySuccesses: Array.isArray(formData.recoverySuccesses) ? formData.recoverySuccesses : [],
        // Ensure numbers are properly formatted
        recoveryRating: Number(formData.recoveryRating) || 0,
        serviceRating: Number(formData.serviceRating) || 0,
        staffRating: Number(formData.staffRating) || 0,
        facilityRating: Number(formData.facilityRating) || 0,
        communicationRating: Number(formData.communicationRating) || 0,
        // Ensure booleans are properly formatted
        wasPatient: Boolean(formData.wasPatient),
        interestedInEvents: Boolean(formData.interestedInEvents),
        interestedInSupporting: Boolean(formData.interestedInSupporting)
      };
      
      console.log("Submitting onboarding data:", submitData);
      console.log("Treatment start date type:", typeof submitData.treatmentStartDate, submitData.treatmentStartDate);
      console.log("Treatment end date type:", typeof submitData.treatmentEndDate, submitData.treatmentEndDate);
      
      const response = await api.post("/api/member/onboarding", submitData);
      
      if (response.success) {
        toast({
          title: "Welcome to the Community!",
          description: "Thank you for sharing your journey with us. You're now part of our community!",
        });
        
        // Redirect to member dashboard
        setLocation("/member");
      } else {
        throw new Error(response.error || "Failed to complete onboarding");
      }
    } catch (error: any) {
      console.error("Onboarding error:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to complete onboarding";
      if (error.message) {
        if (error.message.includes("Treatment end date cannot be before treatment start date")) {
          errorMessage = "Treatment end date cannot be before treatment start date. Please check your dates.";
        } else if (error.message.includes("Date")) {
          errorMessage = "There was an issue with date formatting. Please try again.";
        } else if (error.message.includes("string")) {
          errorMessage = "There was an issue with data formatting. Please check your inputs and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-red-500" />
          <span>Personal Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name <span className="text-red-500"> *</span></Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name <span className="text-red-500"> *</span></Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
        </div>
        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address <span className="text-red-500"> *</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled={true}
                      className="bg-gray-50 text-gray-600"
                      placeholder="Email address from registration"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <span>Patient History</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium">Were you previously a TiNHiH client? <span className="text-red-500"> *</span></Label>
          <RadioGroup
            value={formData.wasPatient.toString()}
            onValueChange={(value) => handleInputChange("wasPatient", value === "true")}
            className="mt-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="was-patient-yes" />
              <Label htmlFor="was-patient-yes">Yes, I received treatment/services at TiNHiH</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="was-patient-no" />
              <Label htmlFor="was-patient-no">No, I'm a community supporter or family member</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.wasPatient && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientId">Client ID (if known)</Label>
                <Input
                  id="patientId"
                  value={formData.patientId || ""}
                  onChange={(e) => handleInputChange("patientId", e.target.value)}
                  placeholder="Enter your TiNHiH client ID"
                />
              </div>
              <div>
                <Label htmlFor="primaryCondition">Primary Treatment Focus</Label>
                <Input
                  id="primaryCondition"
                  value={formData.primaryCondition || ""}
                  onChange={(e) => handleInputChange("primaryCondition", e.target.value)}
                  placeholder="e.g., Substance Use Disorder, Mental Health, Co-occurring"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="treatmentStartDate">Treatment Start Date</Label>
                <Input
                  id="treatmentStartDate"
                  type="date"
                  value={formData.treatmentStartDate || ""}
                  onChange={(e) => handleInputChange("treatmentStartDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="treatmentEndDate">Treatment End Date</Label>
                <Input
                  id="treatmentEndDate"
                  type="date"
                  value={formData.treatmentEndDate || ""}
                  onChange={(e) => handleInputChange("treatmentEndDate", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <span>Recovery Journey</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {formData.wasPatient ? (
          <>
            <div>
              <Label className="text-base font-medium">How would you rate your overall recovery experience? <span className="text-red-500"> *</span></Label>
              <div className="flex items-center space-x-2 mt-3">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={formData.recoveryRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleInputChange("recoveryRating", rating)}
                    className="w-10 h-10 p-0"
                  >
                    {rating}
                  </Button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {formData.recoveryRating > 0 ? `${formData.recoveryRating}/5` : "Select rating"}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">What were your biggest challenges during recovery?</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {[
                  "Withdrawal symptoms",
                  "Mental health issues",
                  "Family relationships",
                  "Financial stress",
                  "Social isolation",
                  "Employment challenges",
                  "Housing issues",
                  "Legal problems",
                  "Peer pressure",
                  "Relapse triggers"
                ].map((challenge) => (
                  <div key={challenge} className="flex items-center space-x-2">
                    <Checkbox
                      id={`challenge-${challenge}`}
                      checked={formData.recoveryChallenges.includes(challenge)}
                      onCheckedChange={(checked) => 
                        handleArrayChange("recoveryChallenges", challenge, checked as boolean)
                      }
                    />
                    <Label htmlFor={`challenge-${challenge}`} className="text-sm">
                      {challenge}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">What were your biggest successes during recovery?</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {[
                  "Achieved sobriety",
                  "Improved mental health",
                  "Rebuilt relationships",
                  "Found stable housing",
                  "Secured employment",
                  "Reconnected with family",
                  "Developed healthy habits",
                  "Helped others",
                  "Completed treatment program",
                  "Built support network",
                  "Found purpose in recovery"
                ].map((success) => (
                  <div key={success} className="flex items-center space-x-2">
                    <Checkbox
                      id={`success-${success}`}
                      checked={formData.recoverySuccesses.includes(success)}
                      onCheckedChange={(checked) => 
                        handleArrayChange("recoverySuccesses", success, checked as boolean)
                      }
                    />
                    <Label htmlFor={`success-${success}`} className="text-sm">
                      {success}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="recoveryJourney" className="text-base font-medium">
                Please share your TiNHiH recovery journey story <span className="text-red-500"> *</span>
              </Label>
              <Textarea
                id="recoveryJourney"
                value={formData.recoveryJourney}
                onChange={(e) => handleInputChange("recoveryJourney", e.target.value)}
                placeholder="Tell us about your journey with TiNHiH, what services helped you most, and how you're doing now. Your story can inspire others..."
                rows={6}
                className="mt-2"
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Welcome to Our Community!</h3>
            <p className="text-muted-foreground">
              We're glad you're interested in joining our community. Your support and engagement help us continue our mission.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span>Service Feedback</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {formData.wasPatient ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium">Overall Service Quality <span className="text-red-500"> *</span></Label>
                <div className="flex items-center space-x-2 mt-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={formData.serviceRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange("serviceRating", rating)}
                      className="w-10 h-10 p-0"
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium">Staff Support</Label>
                <div className="flex items-center space-x-2 mt-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={formData.staffRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange("staffRating", rating)}
                      className="w-10 h-10 p-0"
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium">Facility Quality</Label>
                <div className="flex items-center space-x-2 mt-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={formData.facilityRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange("facilityRating", rating)}
                      className="w-10 h-10 p-0"
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium">Communication</Label>
                <div className="flex items-center space-x-2 mt-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={formData.communicationRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange("communicationRating", rating)}
                      className="w-10 h-10 p-0"
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

              <div>
                <Label htmlFor="whatWorkedWell" className="text-base font-medium">
                  What TiNHiH services worked well for you? <span className="text-red-500"> *</span>
                </Label>
                <Textarea
                  id="whatWorkedWell"
                  value={formData.whatWorkedWell}
                  onChange={(e) => handleInputChange("whatWorkedWell", e.target.value)}
                  placeholder="Please share what TiNHiH services were most helpful (outpatient treatment, sober living, peer support, etc.)..."
                  rows={4}
                  className="mt-2"
                />
              </div>

            <div>
              <Label htmlFor="whatCouldBeImproved" className="text-base font-medium">
                What could be improved?
              </Label>
              <Textarea
                id="whatCouldBeImproved"
                value={formData.whatCouldBeImproved}
                onChange={(e) => handleInputChange("whatCouldBeImproved", e.target.value)}
                placeholder="Please share any suggestions for improvement..."
                rows={4}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="recommendations" className="text-base font-medium">
                Message to others seeking help
              </Label>
              <Textarea
                id="recommendations"
                value={formData.recommendations}
                onChange={(e) => handleInputChange("recommendations", e.target.value)}
                placeholder="What would you tell someone considering TiNHiH services? Your message could help others take the first step..."
                rows={4}
                className="mt-2"
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Community Engagement</h3>
            <p className="text-muted-foreground">
              We value your interest in our community and look forward to your participation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep5 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-red-500" />
          <span>Community Engagement</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium">How would you like to engage with the TiNHiH community?</Label>
          <div className="space-y-3 mt-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="interestedInEvents"
                checked={formData.interestedInEvents}
                onCheckedChange={(checked) => handleInputChange("interestedInEvents", checked)}
              />
              <Label htmlFor="interestedInEvents">
                I'm interested in attending recovery events and peer support activities
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="interestedInSupporting"
                checked={formData.interestedInSupporting}
                onCheckedChange={(checked) => handleInputChange("interestedInSupporting", checked)}
              />
              <Label htmlFor="interestedInSupporting">
                I'm interested in supporting TiNHiH's mission through donations or volunteering
              </Label>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
          <Select
            value={formData.preferredContactMethod}
            onValueChange={(value) => handleInputChange("preferredContactMethod", value)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select contact method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="text">Text Message</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="additionalComments" className="text-base font-medium">
            Additional Comments
          </Label>
          <Textarea
            id="additionalComments"
            value={formData.additionalComments}
            onChange={(e) => handleInputChange("additionalComments", e.target.value)}
            placeholder="Any additional thoughts, suggestions, or comments you'd like to share..."
            rows={4}
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );

  const steps = [
    { title: "Personal Info", component: renderStep1 },
    { title: "Patient History", component: renderStep2 },
    { title: "Recovery Journey", component: renderStep3 },
    { title: "Service Feedback", component: renderStep4 },
    { title: "Community Engagement", component: renderStep5 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold">Welcome to TiNHiH Community</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Join our recovery community and help others find hope and healing
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            "There is No Hero in Heroin" - Together we build a world where recovery is possible
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {steps.length}</span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#ffdd00] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {steps[currentStep - 1].component()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          {currentStep < steps.length ? (
            <Button onClick={handleNext} className="flex items-center space-x-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? "Submitting..." : "Complete Onboarding"}
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
