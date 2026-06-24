import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Heart, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Shield,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  X,
  Users,
  Activity,
  Pill,
  Clock,
  Car,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function PatientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch patient data with onboarding information
  const { data: patientData, isLoading } = useQuery({
    queryKey: ['/api/patient/dashboard'],
    queryFn: () => api.get('/api/patient/dashboard'),
    enabled: !!user && user.role === 'patient'
  });

  const patient = patientData?.patient;
  const onboardingData = patient?.onboardingData || {};

  // Update onboarding data mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/api/patient/onboarding', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient/dashboard'] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSave = (updatedData: any) => {
    updateMutation.mutate(updatedData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
        <p className="text-muted-foreground">Please complete your onboarding first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
        <div>
                <CardTitle className="text-2xl">
                  {user?.firstName} {user?.lastName}
                  {onboardingData.personalInfo?.preferredName && (
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      ({onboardingData.personalInfo.preferredName})
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-base">
                  Patient ID: {patient.id.slice(0, 8)}...
                </CardDescription>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Onboarding Complete
                  </Badge>
                  {onboardingData.additionalInfo?.completedAt && (
                    <span className="text-sm text-muted-foreground">
                      Completed: {format(new Date(onboardingData.additionalInfo.completedAt), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
              </div>
        </div>
        <Button
              variant={isEditing ? "outline" : "default"}
          onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>
        </CardHeader>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span>{patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'MMM dd, yyyy') : 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span>{patient.gender || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{patient?.phone || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address:</span>
                  <span>{patient.address || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City:</span>
                  <span>{patient.city || onboardingData.personalInfo?.city || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State:</span>
                  <span>{patient.state || onboardingData.personalInfo?.state || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ZIP Code:</span>
                  <span>{patient.zipCode || onboardingData.personalInfo?.zipCode || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>
      </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{patient.medications?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Medications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{patient.allergies?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Allergies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{patient.medicalHistory?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Conditions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {onboardingData.consents?.hipaaConsent ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm text-muted-foreground">HIPAA Consent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recovery History Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                Recovery Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {onboardingData.recoveryHistory ? (
                <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Substance Use History</label>
                      <p className="mt-1">{onboardingData.recoveryHistory.substanceUseHistory || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Use Date</label>
                      <p className="mt-1">
                        {onboardingData.recoveryHistory.lastUseDate ? 
                          format(new Date(onboardingData.recoveryHistory.lastUseDate), 'MMM dd, yyyy') : 
                          'Not provided'
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previous Treatment</label>
                    <p className="mt-1">{onboardingData.recoveryHistory.previousTreatment || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Mental Health Conditions</label>
                    <p className="mt-1">{onboardingData.recoveryHistory.mentalHealthConditions || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Support Groups</label>
                    <p className="mt-1">{onboardingData.recoveryHistory.supportGroups || 'Not provided'}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Recovery history not available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical History Tab */}
        <TabsContent value="medical" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height:</span>
                  <span>{onboardingData.medicalHistory?.height || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weight:</span>
                  <span>{onboardingData.medicalHistory?.weight || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood Type:</span>
                  <span>{onboardingData.medicalHistory?.bloodType || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Chronic Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Chronic Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medicalHistory?.length > 0 ? (
                  <div className="space-y-2">
                    {patient.medicalHistory.map((condition: string, index: number) => (
                      <Badge key={index} variant="outline" className="mr-2 mb-2">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No chronic conditions recorded</p>
                )}
              </CardContent>
            </Card>
              </div>
              
          {/* Medications & Allergies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medications?.length > 0 ? (
                  <div className="space-y-2">
                    {patient.medications.map((medication: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{medication}</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No current medications</p>
                )}
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.allergies?.length > 0 ? (
                  <div className="space-y-2">
                    {patient.allergies.map((allergy: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-red-800">{allergy}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-800">No known allergies</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emergency Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Contact */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Primary Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p>{patient.emergencyContact || onboardingData.emergencyContacts?.primaryContactName || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p>{patient.emergencyPhone || onboardingData.emergencyContacts?.primaryContactPhone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                    <p>{onboardingData.emergencyContacts?.primaryContactRelationship || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Secondary Contact */}
              {onboardingData.emergencyContacts?.secondaryContactName && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Secondary Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p>{onboardingData.emergencyContacts.secondaryContactName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p>{onboardingData.emergencyContacts.secondaryContactPhone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                      <p>{onboardingData.emergencyContacts.secondaryContactRelationship}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Insurance & Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Insurance Status</label>
                  <p className="mt-1">
                    {onboardingData.insurance?.hasInsurance ? 'Has Insurance' : 'No Insurance'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Insurance Provider</label>
                  <p className="mt-1">{patient.insuranceProvider || onboardingData.insurance?.insuranceProvider || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Insurance Number</label>
                  <p className="mt-1">{patient.insuranceNumber || onboardingData.insurance?.insuranceNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Financial Status</label>
                  <p className="mt-1">{onboardingData.insurance?.financialStatus || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Communication Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${onboardingData.consents?.emailConsent ? 'text-green-600' : 'text-gray-400'}`}>
                    {onboardingData.consents?.emailConsent ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-muted-foreground">Email</div>
                      </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${onboardingData.consents?.smsConsent ? 'text-green-600' : 'text-gray-400'}`}>
                    {onboardingData.consents?.smsConsent ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-muted-foreground">SMS</div>
              </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${onboardingData.consents?.phoneConsent ? 'text-green-600' : 'text-gray-400'}`}>
                    {onboardingData.consents?.phoneConsent ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${onboardingData.consents?.mailConsent ? 'text-green-600' : 'text-gray-400'}`}>
                    {onboardingData.consents?.mailConsent ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-muted-foreground">Mail</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Preferred Contact Method</label>
                  <p className="mt-1">{onboardingData.additionalInfo?.preferredContactMethod || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Transportation Needs</label>
                  <p className="mt-1">{onboardingData.additionalInfo?.transportationNeeds || 'None'}</p>
                </div>
              <div>
                  <label className="text-sm font-medium text-muted-foreground">How Did You Hear About Us</label>
                  <p className="mt-1">{onboardingData.additionalInfo?.howDidYouHear || 'Not specified'}</p>
                      </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Interpreter Needs</label>
                  <p className="mt-1">{onboardingData.additionalInfo?.interpreterNeeds || 'None'}</p>
                  </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}