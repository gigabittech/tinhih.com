import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, FileText, Heart, Shield, Users, Phone, Mail, MapPin, Calendar, AlertTriangle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewStepProps {
  data: any;
  existingData?: any;
  onComplete: (data: any) => void;
  onBack: () => void;
  isLastStep: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function ReviewStep({ data, existingData, onBack, onSubmit, isSubmitting, isEditing }: ReviewStepProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatArray = (arr: string[]) => {
    if (!arr || arr.length === 0) return 'None';
    return arr.join(', ');
  };

  const formatBoolean = (value: boolean) => {
    return value ? 'Yes' : 'No';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Review Your Information</h2>
        <p className="text-muted-foreground">
          Please review all the information you've provided. You can go back to make changes if needed.
        </p>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-foreground">{data.firstName} {data.lastName}</p>
              </div>
              {data.preferredName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Preferred Name</label>
                  <p className="text-foreground">{data.preferredName}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground">{data.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-foreground">{data.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="text-foreground">{formatDate(data.dateOfBirth)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gender</label>
                <p className="text-foreground">{data.gender}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-foreground">{data.address}, {data.city}, {data.state} {data.zipCode}</p>
            </div>
          </CardContent>
        </Card>

        {/* Recovery History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
              Recovery History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Substance</label>
                <p className="text-foreground">{data.primarySubstance}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Years of Use</label>
                <p className="text-foreground">{data.yearsOfUse || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Use Date</label>
              <p className="text-foreground">{formatDate(data.lastUseDate)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Recovery Goals</label>
              <p className="text-foreground">{data.recoveryGoals}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Motivation Level</label>
              <p className="text-foreground">{data.motivationLevel}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Support System</label>
              <p className="text-foreground">{data.supportSystem}</p>
            </div>
          </CardContent>
        </Card>

        {/* Medical History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Height</label>
                <p className="text-foreground">{data.height || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Weight</label>
                <p className="text-foreground">{data.weight || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Blood Type</label>
                <p className="text-foreground">{data.bloodType || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Chronic Conditions</label>
              <p className="text-foreground">{formatArray(data.chronicConditions)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Allergies</label>
              <p className="text-foreground">{formatArray(data.allergies)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Medications</label>
              <p className="text-foreground">{formatArray(data.currentMedications)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-red-600 dark:text-red-400" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Primary Emergency Contact</label>
              <p className="text-foreground">{data.primaryContactName} - {data.primaryContactPhone}</p>
              <p className="text-sm text-muted-foreground">Relationship: {data.primaryContactRelationship}</p>
            </div>
            {data.secondaryContactName && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Secondary Emergency Contact</label>
                <p className="text-foreground">{data.secondaryContactName} - {data.secondaryContactPhone}</p>
                <p className="text-sm text-muted-foreground">Relationship: {data.secondaryContactRelationship}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance & Financial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              Insurance & Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Insurance Status</label>
              <p className="text-foreground">{formatBoolean(data.hasInsurance)}</p>
            </div>
            {data.hasInsurance && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Insurance Provider</label>
                <p className="text-foreground">{data.insuranceProvider}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Financial Status</label>
              <p className="text-foreground">{data.financialStatus || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Needs Financial Assistance</label>
              <p className="text-foreground">{formatBoolean(data.needsFinancialAssistance)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Consents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Consents & Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">HIPAA Consent</label>
                <Badge variant={data.hipaaConsent ? "default" : "destructive"}>
                  {formatBoolean(data.hipaaConsent)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Treatment Consent</label>
                <Badge variant={data.treatmentConsent ? "default" : "destructive"}>
                  {formatBoolean(data.treatmentConsent)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Financial Consent</label>
                <Badge variant={data.financialConsent ? "default" : "destructive"}>
                  {formatBoolean(data.financialConsent)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">No-Show Policy</label>
                <Badge variant={data.noShowPolicyConsent ? "default" : "destructive"}>
                  {formatBoolean(data.noShowPolicyConsent)}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Communication Preferences</label>
              <div className="flex gap-2 mt-1">
                {data.emailConsent && <Badge variant="outline">Email</Badge>}
                {data.smsConsent && <Badge variant="outline">SMS</Badge>}
                {data.phoneConsent && <Badge variant="outline">Phone</Badge>}
                {data.mailConsent && <Badge variant="outline">Mail</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Confirmation */}
      <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <CheckCircle className="w-5 h-5" />
            Ready to Submit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-800 dark:text-yellow-200 mb-4">
            By clicking "Submit Onboarding", you confirm that all the information provided is accurate and complete to the best of your knowledge.
          </p>
          <div className="bg-card p-4 rounded-lg border border-yellow-300 dark:border-yellow-700">
            <p className="text-sm text-foreground">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Your information will be reviewed by our intake team</li>
              <li>• You'll receive a welcome email with next steps</li>
              <li>• Our team will contact you within 24-48 hours to schedule your first appointment</li>
              <li>• You'll have access to your patient portal to manage your care</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:flex justify-center  sm:justify-between gap-3 pt-6">
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-2 order-2 sm:order-1">
          <ArrowLeft className="w-4 h-4" />
          Go Back & Edit
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isSubmitting}
          className="flex items-center gap-2 order-1 sm:order-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Submit Onboarding
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
