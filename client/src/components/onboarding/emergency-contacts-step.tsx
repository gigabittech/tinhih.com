import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Phone, User, Shield, AlertTriangle } from 'lucide-react';

const emergencyContactsSchema = z.object({
  // Primary emergency contact
  primaryContactName: z.string().min(1, 'Primary emergency contact name is required'),
  primaryContactPhone: z.string().min(10, 'Primary emergency contact phone is required'),
  primaryContactRelationship: z.string().min(1, 'Please specify relationship to primary contact'),
  primaryContactEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  
  // Secondary emergency contact
  secondaryContactName: z.string().optional(),
  secondaryContactPhone: z.string().optional(),
  secondaryContactRelationship: z.string().optional(),
  secondaryContactEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  
  // Additional contacts
  additionalContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
    email: z.string().optional(),
  })).optional(),
  
  // Emergency preferences
  emergencyPreferences: z.object({
    contactInEmergency: z.boolean().default(true),
    allowTreatment: z.boolean().default(true),
    allowTransportation: z.boolean().default(true),
    specialInstructions: z.string().optional(),
  }),
  
  // Healthcare proxy
  hasHealthcareProxy: z.boolean().default(false),
  healthcareProxyName: z.string().optional(),
  healthcareProxyPhone: z.string().optional(),
  healthcareProxyDocument: z.string().optional(),
});

type EmergencyContactsData = z.infer<typeof emergencyContactsSchema>;

interface EmergencyContactsStepProps {
  data: any;
  existingData?: any;
  onComplete: (data: EmergencyContactsData) => void;
  onBack: () => void;
  isLastStep: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function EmergencyContactsStep({ data, existingData, onComplete, onBack, isEditing }: EmergencyContactsStepProps) {
  const form = useForm<EmergencyContactsData>({
    resolver: zodResolver(emergencyContactsSchema),
    defaultValues: {
      primaryContactName: data.primaryContactName || '',
      primaryContactPhone: data.primaryContactPhone || '',
      primaryContactRelationship: data.primaryContactRelationship || '',
      primaryContactEmail: data.primaryContactEmail || '',
      secondaryContactName: data.secondaryContactName || '',
      secondaryContactPhone: data.secondaryContactPhone || '',
      secondaryContactRelationship: data.secondaryContactRelationship || '',
      secondaryContactEmail: data.secondaryContactEmail || '',
      additionalContacts: data.additionalContacts || [],
      emergencyPreferences: {
        contactInEmergency: data.emergencyPreferences?.contactInEmergency ?? true,
        allowTreatment: data.emergencyPreferences?.allowTreatment ?? true,
        allowTransportation: data.emergencyPreferences?.allowTransportation ?? true,
        specialInstructions: data.emergencyPreferences?.specialInstructions || '',
      },
      hasHealthcareProxy: data.hasHealthcareProxy || false,
      healthcareProxyName: data.healthcareProxyName || '',
      healthcareProxyPhone: data.healthcareProxyPhone || '',
      healthcareProxyDocument: data.healthcareProxyDocument || '',
    },
  });

  const onSubmit = (formData: EmergencyContactsData) => {
    onComplete(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Emergency Contacts</h2>
        <p className="text-muted-foreground">
          Please provide contact information for people we can reach in case of an emergency.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Primary Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Phone className="w-5 h-5 text-red-600 dark:text-red-400" />
              Primary Emergency Contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="primaryContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryContactRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship to You <span className="text-red-600">*</span></FormLabel>
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
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="primaryContactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Secondary Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Secondary Emergency Contact (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="secondaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="secondaryContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="secondaryContactRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship to You</FormLabel>
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
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="secondaryContactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Emergency Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Emergency Preferences
            </h3>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="emergencyPreferences.contactInEmergency"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Contact emergency contacts in case of emergency</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyPreferences.allowTreatment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow emergency medical treatment if I cannot consent</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyPreferences.allowTransportation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow emergency transportation to hospital if needed</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="emergencyPreferences.specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Emergency Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special instructions for emergency situations..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Healthcare Proxy */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Healthcare Proxy (Optional)
            </h3>
            
            <FormField
              control={form.control}
              name="hasHealthcareProxy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I have a healthcare proxy or advance directive</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('hasHealthcareProxy') && (
              <div className="space-y-4 pl-6 border-l-2 border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="healthcareProxyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Healthcare Proxy Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter proxy name" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="healthcareProxyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Healthcare Proxy Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter proxy phone" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="healthcareProxyDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your healthcare proxy document or advance directive..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          <div className="fgrid sm:flex justify-center  sm:justify-between gap-3 pt-6">
            <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-2 order-2 sm:order-1">
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button type="submit" className="flex items-center gap-2 order-1 sm:order-2">
              Next Step
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
