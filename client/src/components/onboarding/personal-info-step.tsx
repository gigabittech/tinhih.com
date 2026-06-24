import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateOfBirthPicker } from '@/components/ui/date-picker';
import { User, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  dateOfBirth: z.date({
    required_error: 'Please select your date of birth',
  }),
  gender: z.string().min(1, 'Please select your gender'),
  address: z.string().min(1, 'Please enter your address'),
  city: z.string().min(1, 'Please enter your city'),
  state: z.string().min(1, 'Please select your state'),
  zipCode: z.string().min(5, 'Please enter a valid ZIP code'),
  preferredName: z.string().optional(),
  maritalStatus: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContactName: z.string().min(1, 'Please enter emergency contact name'),
  emergencyContactPhone: z.string().min(10, 'Please enter a valid emergency contact phone number'),
  emergencyContactRelationship: z.string().min(1, 'Please specify relationship to emergency contact'),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoStepProps {
  data: any;
  existingData?: any;
  onComplete: (data: PersonalInfoData) => void;
  onBack: () => void;
  isLastStep: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function PersonalInfoStep({ data, existingData, onComplete, isEditing }: PersonalInfoStepProps) {
  const form = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: isEditing && existingData?.firstName ? existingData.firstName : data.firstName || '',
      lastName: isEditing && existingData?.lastName ? existingData.lastName : data.lastName || '',
      email: isEditing && existingData?.email ? existingData.email : data.email || '',
      phone: isEditing && existingData?.phone ? existingData.phone : data.phone || '',
      dateOfBirth: isEditing && existingData?.dateOfBirth ? new Date(existingData.dateOfBirth) : data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: isEditing && existingData?.gender ? existingData.gender : data.gender || '',
      address: isEditing && existingData?.address ? existingData.address : data.address || '',
      city: isEditing && existingData?.city ? existingData.city : data.city || '',
      state: isEditing && existingData?.state ? existingData.state : data.state || '',
      zipCode: isEditing && existingData?.zipCode ? existingData.zipCode : data.zipCode || '',
      preferredName: isEditing && existingData?.preferredName ? existingData.preferredName : data.preferredName || '',
      maritalStatus: isEditing && existingData?.maritalStatus ? existingData.maritalStatus : data.maritalStatus || '',
      occupation: isEditing && existingData?.occupation ? existingData.occupation : data.occupation || '',
      emergencyContactName: isEditing && existingData?.emergencyContactName ? existingData.emergencyContactName : data.emergencyContactName || '',
      emergencyContactPhone: isEditing && existingData?.emergencyContactPhone ? existingData.emergencyContactPhone : data.emergencyContactPhone || '',
      emergencyContactRelationship: isEditing && existingData?.emergencyContactRelationship ? existingData.emergencyContactRelationship : data.emergencyContactRelationship || '',
    },
  });

  const onSubmit = (formData: PersonalInfoData) => {
    onComplete(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Personal Information</h2>
        <p className="text-muted-foreground">
          Please provide your basic personal information. This helps us provide you with the best possible care.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your first name" 
                        {...field} 
                        className={form.formState.errors.firstName ? "error" : ""}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your last name" 
                        {...field} 
                        className={form.formState.errors.lastName ? "error" : ""}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="preferredName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Name (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="What would you like us to call you?" 
                      {...field} 
                      className={form.formState.errors.preferredName ? "error" : ""}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email address" 
                        {...field} 
                        className={form.formState.errors.email ? "error" : ""}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your phone number" 
                        {...field} 
                        className={form.formState.errors.phone ? "error" : ""}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DateOfBirthPicker
                        selected={field.value}
                        onChange={(date) => field.onChange(date)}
                        error={form.formState.errors.dateOfBirth?.message}
                        placeholder="Select your date of birth"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender <span className="text-red-600">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Address Information</h3>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address <span className="text-red-600">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your street address" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your city" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State <span className="text-red-600">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NV">Nevada</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                        <SelectItem value="UT">Utah</SelectItem>
                        <SelectItem value="OR">Oregon</SelectItem>
                        <SelectItem value="WA">Washington</SelectItem>
                        <SelectItem value="ID">Idaho</SelectItem>
                        <SelectItem value="MT">Montana</SelectItem>
                        <SelectItem value="WY">Wyoming</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="NM">New Mexico</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your ZIP code" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                        <SelectItem value="domestic-partnership">Domestic Partnership</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation</FormLabel>
                    <FormControl>
                      <Input placeholder="What do you do for work?" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Emergency Contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter emergency contact name" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter emergency contact phone" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="emergencyContactRelationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship to Emergency Contact <span className="text-red-600">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-6">
            <Button type="submit" className="flex items-center gap-2">
              Next Step
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

