import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, Settings, CheckCircle, Users, Bell, Shield, Globe, Palette,
  AlertCircle, Loader2, Clock, UserCheck, Mail, Phone, CalendarDays,
  Zap, MessageSquare, FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

const bookingSettingsSchema = z.object({
  isPublicBookingEnabled: z.boolean(),
  requireApproval: z.boolean(),
  allowDirectBooking: z.boolean(),
  showProfile: z.boolean(),
  showSpecialty: z.boolean(),
  showConsultationFee: z.boolean(),
  advanceBookingDays: z.coerce.number().min(1).max(365),
  maxBookingsPerDay: z.coerce.number().min(1).max(50),
  bufferTime: z.coerce.number().min(0).max(60),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  reminderHours: z.coerce.number().min(1).max(168),
  requirePhoneVerification: z.boolean(),
  requireEmailVerification: z.boolean(),
  customMessage: z.string().default(''),
  cancellationPolicy: z.string().default(''),
});

type BookingSettingsFormData = z.infer<typeof bookingSettingsSchema>;

interface BookingSettingsProps {
  onClose?: () => void;
}

export function BookingSettings({ onClose }: BookingSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentSettings, isLoading, error } = useQuery({
    queryKey: ['booking-settings'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/practitioner/booking-settings');
        return response;
      } catch (error) {
        console.error('Failed to fetch booking settings:', error);
        return {
          isPublicBookingEnabled: true,
          requireApproval: true,
          allowDirectBooking: false,
          showProfile: true,
          showSpecialty: true,
          showConsultationFee: true,
          advanceBookingDays: 30,
          maxBookingsPerDay: 10,
          bufferTime: 15,
          emailNotifications: true,
          smsNotifications: false,
          reminderHours: 24,
          requirePhoneVerification: false,
          requireEmailVerification: true,
          cancellationPolicy: '24 hours notice required for cancellation',
          customMessage: 'Welcome to my booking page. I\'m looking forward to helping you with your healthcare needs.',
        };
      }
    },
    enabled: !!user,
    retry: 1,
  });

  const form = useForm<BookingSettingsFormData>({
    resolver: zodResolver(bookingSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      isPublicBookingEnabled: true,
      requireApproval: true,
      allowDirectBooking: false,
      showProfile: true,
      showSpecialty: true,
      showConsultationFee: true,
      advanceBookingDays: 30,
      maxBookingsPerDay: 10,
      bufferTime: 15,
      emailNotifications: true,
      smsNotifications: false,
      reminderHours: 24,
      requirePhoneVerification: false,
      requireEmailVerification: true,
      cancellationPolicy: '24 hours notice required for cancellation',
      customMessage: 'Welcome to my booking page. I\'m looking forward to helping you with your healthcare needs.',
    }
  });

  React.useEffect(() => {
    if (currentSettings) {
      console.log('Resetting form with current settings:', currentSettings);
      form.reset(currentSettings);
    }
  }, [currentSettings, form]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: BookingSettingsFormData) => {
      try {
        const response = await api.post('/api/practitioner/booking-settings', data);
        return response.data;
      } catch (error: any) {
        console.error('Failed to save booking settings:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-settings'] });
      toast({
        title: "Settings Saved Successfully! 🎉",
        description: "Your booking settings have been updated and are now active.",
      });
      if (onClose) {
        onClose();
      }
    },
    onError: (error: any) => {
      console.error('Save settings error:', error);
      toast({
        title: "Failed to Save Settings",
        description: error.message || "Failed to save booking settings",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: BookingSettingsFormData) => {
    console.log('Form submitted with data:', data);
    const processedData = {
      ...data,
      advanceBookingDays: Number(data.advanceBookingDays) || 30,
      maxBookingsPerDay: Number(data.maxBookingsPerDay) || 10,
      bufferTime: Number(data.bufferTime) || 15,
      reminderHours: Number(data.reminderHours) || 24,
    };
    saveSettingsMutation.mutate(processedData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Loading Settings</h3>
                <p className="text-sm text-muted-foreground">Preparing your booking configuration...</p>
          </div>
        </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold">Loading Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">Unable to load your settings. Using default configuration.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
            </Button>
          </div>
        </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
              <h1 className="text-2xl font-semibold">Booking Settings</h1>
              <p className="text-muted-foreground">Configure your public booking experience</p>
        </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <UserCheck className="h-3 w-3 mr-1" />
            Professional
          </Badge>
          <Badge variant={form.watch('isPublicBookingEnabled') ? "default" : "secondary"}>
                {form.watch('isPublicBookingEnabled') ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </>
                )}
            </Badge>
        </div>
      </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="customization">Custom</TabsTrigger>
                </TabsList>
            
            {/* General Settings */}
                <TabsContent value="general" className="space-y-6 mt-6">
                  
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                        Public Booking Access
                  </CardTitle>
                  <CardDescription>
                        Control how patients can access your booking page
                  </CardDescription>
                </CardHeader>
                    <CardContent className="space-y-4">
                      
                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Enable Public Booking</h4>
                          <p className="text-sm text-muted-foreground">Allow patients to book appointments through your public link</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="isPublicBookingEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Require Approval</h4>
                          <p className="text-sm text-muted-foreground">Review before confirming appointments</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="requireApproval"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                      <Separator />

                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Direct Booking</h4>
                          <p className="text-sm text-muted-foreground">Auto-confirm appointments</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="allowDirectBooking"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Profile Visibility
                  </CardTitle>
                  <CardDescription>
                        Choose what information to display on your booking page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                      
                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Profile Information</h4>
                          <p className="text-sm text-muted-foreground">Show your basic profile details</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="showProfile"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                  checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                      <Separator />

                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Specialty</h4>
                          <p className="text-sm text-muted-foreground">Display your medical specialty</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="showSpecialty"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                  checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                      <Separator />

                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Consultation Fee</h4>
                          <p className="text-sm text-muted-foreground">Show your consultation pricing</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="showConsultationFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                  checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

                {/* Appointments Settings */}
                <TabsContent value="appointments" className="space-y-6 mt-6">
                  
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Booking Rules & Availability
                  </CardTitle>
                  <CardDescription>
                    Configure how far in advance patients can book and other restrictions
                  </CardDescription>
                </CardHeader>
                    <CardContent className="space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="advanceBookingDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Booking (Days)</FormLabel>
                          <FormControl>
                                 <input 
                              type="number" 
                              min="1"
                              max="365"
                              placeholder="30"
                                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                   value={field.value || ''}
                              onChange={(e) => {
                                     console.log('Advance booking onChange triggered:', e.target.value);
                                     field.onChange(e.target.value);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                               <p className="text-sm text-muted-foreground">How many days in advance patients can book</p>
                          <FormMessage className="text-red-600"/>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxBookingsPerDay"
                      render={({ field }) => (
                        <FormItem>
                               <FormLabel>Max Daily Bookings</FormLabel>
                          <FormControl>
                                 <input 
                              type="number" 
                              min="1"
                              max="50"
                              placeholder="10"
                                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                   value={field.value || ''}
                              onChange={(e) => {
                                     console.log('Max bookings onChange triggered:', e.target.value);
                                     field.onChange(e.target.value);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                               <p className="text-sm text-muted-foreground">Maximum appointments per day</p>
                          <FormMessage className="text-red-600"/>
                        </FormItem>
                      )}
                    />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="bufferTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buffer Time (Minutes)</FormLabel>
                          <FormControl>
                                 <input 
                              type="number" 
                              min="0"
                              max="60"
                              placeholder="15"
                                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                   value={field.value || ''}
                              onChange={(e) => {
                                     console.log('Buffer time onChange triggered:', e.target.value);
                                     field.onChange(e.target.value);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                               <p className="text-sm text-muted-foreground">Time between appointments</p>
                          <FormMessage className="text-red-600"/>
                        </FormItem>
                      )}
                    />

                  <FormField
                    control={form.control}
                           name="reminderHours"
                    render={({ field }) => (
                      <FormItem>
                               <FormLabel>Reminder Hours</FormLabel>
                        <FormControl>
                                 <input 
                                   type="number" 
                                   min="1"
                                   max="168"
                                   placeholder="24"
                                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={field.value || ''}
                            onChange={(e) => {
                                     console.log('Reminder hours onChange triggered:', e.target.value);
                              field.onChange(e.target.value);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                               <p className="text-sm text-muted-foreground">Send notifications before appointments</p>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                      </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
                <TabsContent value="notifications" className="space-y-6 mt-6">
                  
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about new bookings and reminders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                      
                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">Receive email alerts for new bookings</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                      <Separator />

                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">SMS Notifications</h4>
                          <p className="text-sm text-muted-foreground">Receive text message alerts</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="smsNotifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
                <TabsContent value="security" className="space-y-6 mt-6">
                  
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security & Verification
                  </CardTitle>
                  <CardDescription>
                    Configure security measures to protect your booking system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                      
                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Email Verification</h4>
                          <p className="text-sm text-muted-foreground">Verify patient email addresses</p>
                    </div>
                    <FormField
                      control={form.control}
                          name="requireEmailVerification"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                      <Separator />

                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <h4 className="font-medium">Phone Verification</h4>
                          <p className="text-sm text-muted-foreground">Verify patient phone numbers</p>
                    </div>
                    <FormField
                      control={form.control}
                          name="requirePhoneVerification"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
                </TabsContent>

                {/* Customization */}
                <TabsContent value="customization" className="space-y-6 mt-6">

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                        Customization & Branding
                  </CardTitle>
                  <CardDescription>
                        Add custom messages and policies to your booking page
                  </CardDescription>
                </CardHeader>
                    <CardContent className="space-y-6">
                      
                  <FormField
                    control={form.control}
                    name="customMessage"
                        render={({ field }) => {
                          console.log('Custom message field value:', field.value);
                          return (
                      <FormItem>
                        <FormLabel>Custom Welcome Message</FormLabel>
                        <FormControl>
                                <textarea 
                            placeholder="Welcome to my booking page. I'm looking forward to helping you with your healthcare needs..."
                            rows={4}
                                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    console.log('Custom message onChange triggered:', e.target.value);
                                    field.onChange(e.target.value);
                                  }}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                />
                              </FormControl>
                              <p className="text-sm text-muted-foreground">This message will appear at the top of your booking page</p>
                              <FormMessage className="text-red-600"/>
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="cancellationPolicy"
                        render={({ field }) => {
                          console.log('Cancellation policy field value:', field.value);
                          return (
                            <FormItem>
                              <FormLabel>Cancellation Policy</FormLabel>
                              <FormControl>
                                <textarea 
                                  placeholder="Enter your cancellation policy..."
                                  rows={3}
                                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={field.value || ''}
                            onChange={(e) => {
                                    console.log('Cancellation policy onChange triggered:', e.target.value);
                              field.onChange(e.target.value);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                              <p className="text-sm text-muted-foreground">This will be displayed to patients during booking</p>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                          );
                        }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline"
                  onClick={onClose}
                >
                  Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                )}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </div>
    </div>
  );
} 
