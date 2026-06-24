import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Shield, Users, FileText, CheckCircle, ArrowRight, ArrowLeft, Edit, User, Calendar, Phone, MapPin, DollarSign, Home } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import tinhihLogo from '@/assets/tinhih-logo.svg';
import { format } from 'date-fns';

// Import onboarding steps
import { PersonalInfoStep } from '@/components/onboarding/personal-info-step';
import { RecoveryHistoryStep } from '@/components/onboarding/recovery-history-step';
import { MedicalHistoryStep } from '@/components/onboarding/medical-history-step';
import { EmergencyContactsStep } from '@/components/onboarding/emergency-contacts-step';
import { InsuranceStep } from '@/components/onboarding/insurance-step';
import { ConsentStep } from '@/components/onboarding/consent-step';
import { ReviewStep } from '@/components/onboarding/review-step';
import { log } from 'console';

const onboardingSteps = [
  { id: 'personal', title: 'Personal Information', component: PersonalInfoStep },
  { id: 'recovery', title: 'Recovery History', component: RecoveryHistoryStep },
  { id: 'medical', title: 'Medical History', component: MedicalHistoryStep },
  { id: 'emergency', title: 'Emergency Contacts', component: EmergencyContactsStep },
  { id: 'insurance', title: 'Insurance & Financial', component: InsuranceStep },
  { id: 'consent', title: 'Consent & Agreements', component: ConsentStep },
  { id: 'review', title: 'Review & Submit', component: ReviewStep },
];

export default function PatientOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Check for existing onboarding data
  const { data: patientData, isLoading: patientLoading } = useQuery({
    queryKey: ['/api/patient/dashboard'],
    queryFn: () => api.get('/api/patient/dashboard'),
    enabled: !!user && user.role === 'patient'
  });

  const existingOnboardingData = patientData?.patient?.onboardingData;

  // Check if patient has completed comprehensive onboarding
  // This means they have onboarding data with multiple sections filled out
  const hasCompletedOnboarding = existingOnboardingData &&
    Object.keys(existingOnboardingData).length > 0 &&
    (existingOnboardingData.personalInfo ||
      existingOnboardingData.recoveryHistory ||
      existingOnboardingData.medicalHistory ||
      existingOnboardingData.emergencyContacts ||
      existingOnboardingData.insurance ||
      existingOnboardingData.city || // Check for direct properties
      existingOnboardingData.email ||
      existingOnboardingData.phone);

  useEffect(() => {
    document.title = "Patient Onboarding | TiNHiH Foundation - Recovery Portal";
  }, []);

  const handleStepComplete = (stepData: any) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Initialize onboarding data with existing data when editing
  useEffect(() => {
    if (isEditing && existingOnboardingData && Object.keys(existingOnboardingData).length > 0) {
      setOnboardingData(existingOnboardingData);
    }
  }, [isEditing, existingOnboardingData]);

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/api/patient/onboarding', onboardingData);
      toast({
        title: "Onboarding Complete",
        description: "Welcome to TiNHiH Foundation! Your information has been submitted successfully.",
      });
      setLocation('/');
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const CurrentStepComponent = onboardingSteps[currentStep].component;


  // Component to display existing onboarding data
  const ExistingOnboardingData = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Card className="mb-8 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle className="w-8 h-8" />
            Onboarding Already Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 dark:text-green-300 mb-6">
            Welcome back! We found your existing onboarding information. You can review your data below or edit it if needed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{user?.firstName} {user?.lastName}</span>
                </div>
                {existingOnboardingData?.preferredName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preferred Name:</span>
                    <span>{existingOnboardingData.preferredName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{existingOnboardingData?.email || user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{existingOnboardingData?.phone || 'Not provided'}</span>
                </div>
                {existingOnboardingData?.city && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{existingOnboardingData.city}, {existingOnboardingData.state}</span>
                  </div>
                )}
                {existingOnboardingData?.gender && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="capitalize">{existingOnboardingData.gender}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recovery History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  Recovery History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {existingOnboardingData?.primarySubstance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Substance:</span>
                    <span className="text-sm capitalize">{existingOnboardingData.primarySubstance}</span>
                  </div>
                )}
                {existingOnboardingData?.yearsOfUse && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Years of Use:</span>
                    <span className="text-sm">{existingOnboardingData.yearsOfUse}</span>
                  </div>
                )}
                {existingOnboardingData?.lastUseDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Use:</span>
                    <span className="text-sm">{format(new Date(existingOnboardingData.lastUseDate), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {existingOnboardingData?.previousRehab && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Previous Rehab:</span>
                    <span className="text-sm">{existingOnboardingData.previousRehab ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {existingOnboardingData?.mentalHealthConditions && existingOnboardingData.mentalHealthConditions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mental Health:</span>
                    <span className="text-sm">{existingOnboardingData.mentalHealthConditions.join(', ')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {existingOnboardingData?.primaryContactName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Contact:</span>
                    <span className="text-sm">{existingOnboardingData.primaryContactName}</span>
                  </div>
                )}
                {existingOnboardingData?.primaryContactPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-sm">{existingOnboardingData.primaryContactPhone}</span>
                  </div>
                )}
                {existingOnboardingData?.primaryContactRelationship && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relationship:</span>
                    <span className="text-sm capitalize">{existingOnboardingData.primaryContactRelationship}</span>
                  </div>
                )}
                {existingOnboardingData?.secondaryContactName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Secondary Contact:</span>
                    <span className="text-sm">{existingOnboardingData.secondaryContactName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insurance & Financial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Insurance & Financial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insurance Status:</span>
                  <span className="text-sm">
                    {existingOnboardingData?.hasInsurance ? 'Has Insurance' : 'No Insurance'}
                  </span>
                </div>
                {existingOnboardingData?.insuranceProvider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="text-sm">{existingOnboardingData.insuranceProvider}</span>
                  </div>
                )}
                {existingOnboardingData?.insuranceMemberId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member ID:</span>
                    <span className="text-sm">{existingOnboardingData.insuranceMemberId}</span>
                  </div>
                )}
                {existingOnboardingData?.financialStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Financial Status:</span>
                    <span className="text-sm capitalize">{existingOnboardingData.financialStatus}</span>
                  </div>
                )}
                {existingOnboardingData?.incomeLevel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Income Level:</span>
                    <span className="text-sm">{existingOnboardingData.incomeLevel}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Onboarding Data Available:</strong> Your information has been successfully stored and is ready for use.
            </p>
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Information
            </Button>
            <Button

              onClick={() => setLocation('/')}
            >
              Go to Portal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Show loading state
  if (patientLoading || !patientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your information...</p>
        </div>
      </div>
    );
  }

  // Show existing onboarding data if completed and not editing
  if (hasCompletedOnboarding && !isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
        {/* Header */}
        <div className="bg-background shadow-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={tinhihLogo} alt="TiNHiH Foundation" className="h-12 w-auto" />
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold text-foreground">TiNHiH Foundation</h1>
                  <p className="text-sm text-muted-foreground">Patient Onboarding Portal</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
        <ExistingOnboardingData />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
      {/* Header */}
      <div className="bg-background shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={tinhihLogo} alt="TiNHiH Foundation" className="h-12 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold text-foreground">TiNHiH Foundation</h1>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? 'Edit Onboarding Information' : 'Patient Onboarding Portal'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {onboardingSteps.length}</p>
                <Progress value={progress} className="w-32 mt-2" />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome Message */}
        {currentStep === 0 && (
          <Card className="mb-8 border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                <Heart className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                Welcome to TiNHiH Foundation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg text-muted-foreground">
                Thank you for choosing TiNHiH Foundation for your recovery journey. We're here to support you every step of the way.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-foreground">Confidential & Secure</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-foreground">Community Support</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-foreground">Comprehensive Care</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {onboardingSteps[currentStep].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent
              data={onboardingData}
              existingData={existingOnboardingData}
              onComplete={handleStepComplete}
              onBack={handleStepBack}
              isLastStep={currentStep === onboardingSteps.length - 1}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isEditing={isEditing}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-end mt-6">
          {/* <Button
            variant="outline"
            onClick={handleStepBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button> */}

          <div className="text-sm text-muted-foreground">
            {currentStep + 1} of {onboardingSteps.length} steps
          </div>
        </div>
      </div>
    </div>
  );
}

