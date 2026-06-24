import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RecentDatePicker } from '@/components/ui/date-picker';
import { Heart, Shield, ArrowRight, ArrowLeft } from 'lucide-react';

const recoveryHistorySchema = z.object({
  // Primary substance use
  primarySubstance: z.string().min(1, 'Please select your primary substance of concern'),
  otherSubstances: z.array(z.string()).optional(),
  yearsOfUse: z.string().optional(),
  lastUseDate: z.date().optional(),
  
  // Recovery history
  previousTreatment: z.boolean(),
  previousTreatmentDetails: z.string().optional(),
  previousRehab: z.boolean(),
  previousRehabDetails: z.string().optional(),
  previousDetox: z.boolean(),
  previousDetoxDetails: z.string().optional(),
  
  // Mental health
  mentalHealthConditions: z.array(z.string()).optional(),
  otherMentalHealthConditions: z.string().optional(),
  currentMedications: z.array(z.string()).optional(),
  otherMedications: z.string().optional(),
  
  // Support systems
  supportSystem: z.string().min(1, 'Please describe your current support system'),
  familyInvolvement: z.boolean(),
  familyInvolvementDetails: z.string().optional(),
  
  // Goals and motivation
  recoveryGoals: z.string().min(1, 'Please describe your recovery goals'),
  motivationLevel: z.string().min(1, 'Please rate your motivation level'),
  barriersToRecovery: z.string().optional(),
  
  // Legal and employment
  legalIssues: z.boolean(),
  legalIssuesDetails: z.string().optional(),
  employmentStatus: z.string().optional(),
  employmentDetails: z.string().optional(),
  
  // Housing and stability
  housingStatus: z.string().optional(),
  housingDetails: z.string().optional(),
  transportation: z.string().optional(),
  
  // Additional information
  additionalInformation: z.string().optional(),
});

type RecoveryHistoryData = z.infer<typeof recoveryHistorySchema>;

interface RecoveryHistoryStepProps {
  data: any;
  existingData?: any;
  onComplete: (data: RecoveryHistoryData) => void;
  onBack: () => void;
  isLastStep: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function RecoveryHistoryStep({ data, existingData, onComplete, onBack, isEditing }: RecoveryHistoryStepProps) {
  const form = useForm<RecoveryHistoryData>({
    resolver: zodResolver(recoveryHistorySchema),
    defaultValues: {
      primarySubstance: isEditing && existingData?.primarySubstance ? existingData.primarySubstance : data.primarySubstance || '',
      otherSubstances: isEditing && existingData?.otherSubstances ? existingData.otherSubstances : data.otherSubstances || [],
      yearsOfUse: isEditing && existingData?.yearsOfUse ? existingData.yearsOfUse : data.yearsOfUse || '',
      lastUseDate: isEditing && existingData?.lastUseDate ? new Date(existingData.lastUseDate) : data.lastUseDate ? new Date(data.lastUseDate) : undefined,
      previousTreatment: isEditing && existingData?.previousTreatment !== undefined ? existingData.previousTreatment : data.previousTreatment || false,
      previousTreatmentDetails: isEditing && existingData?.previousTreatmentDetails ? existingData.previousTreatmentDetails : data.previousTreatmentDetails || '',
      previousRehab: isEditing && existingData?.previousRehab !== undefined ? existingData.previousRehab : data.previousRehab || false,
      previousRehabDetails: isEditing && existingData?.previousRehabDetails ? existingData.previousRehabDetails : data.previousRehabDetails || '',
      previousDetox: isEditing && existingData?.previousDetox !== undefined ? existingData.previousDetox : data.previousDetox || false,
      previousDetoxDetails: isEditing && existingData?.previousDetoxDetails ? existingData.previousDetoxDetails : data.previousDetoxDetails || '',
      mentalHealthConditions: isEditing && existingData?.mentalHealthConditions ? existingData.mentalHealthConditions : data.mentalHealthConditions || [],
      otherMentalHealthConditions: isEditing && existingData?.otherMentalHealthConditions ? existingData.otherMentalHealthConditions : data.otherMentalHealthConditions || '',
      currentMedications: isEditing && existingData?.currentMedications ? existingData.currentMedications : data.currentMedications || [],
      otherMedications: isEditing && existingData?.otherMedications ? existingData.otherMedications : data.otherMedications || '',
      supportSystem: isEditing && existingData?.supportSystem ? existingData.supportSystem : data.supportSystem || '',
      familyInvolvement: isEditing && existingData?.familyInvolvement !== undefined ? existingData.familyInvolvement : data.familyInvolvement || false,
      familyInvolvementDetails: isEditing && existingData?.familyInvolvementDetails ? existingData.familyInvolvementDetails : data.familyInvolvementDetails || '',
      recoveryGoals: isEditing && existingData?.recoveryGoals ? existingData.recoveryGoals : data.recoveryGoals || '',
      motivationLevel: isEditing && existingData?.motivationLevel ? existingData.motivationLevel : data.motivationLevel || '',
      barriersToRecovery: isEditing && existingData?.barriersToRecovery ? existingData.barriersToRecovery : data.barriersToRecovery || '',
      legalIssues: isEditing && existingData?.legalIssues !== undefined ? existingData.legalIssues : data.legalIssues || false,
      legalIssuesDetails: isEditing && existingData?.legalIssuesDetails ? existingData.legalIssuesDetails : data.legalIssuesDetails || '',
      employmentStatus: isEditing && existingData?.employmentStatus ? existingData.employmentStatus : data.employmentStatus || '',
      employmentDetails: isEditing && existingData?.employmentDetails ? existingData.employmentDetails : data.employmentDetails || '',
      housingStatus: isEditing && existingData?.housingStatus ? existingData.housingStatus : data.housingStatus || '',
      housingDetails: isEditing && existingData?.housingDetails ? existingData.housingDetails : data.housingDetails || '',
      transportation: isEditing && existingData?.transportation ? existingData.transportation : data.transportation || '',
      additionalInformation: isEditing && existingData?.additionalInformation ? existingData.additionalInformation : data.additionalInformation || '',
    },
  });

  const onSubmit = (formData: RecoveryHistoryData) => {
    onComplete(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Recovery History</h2>
        <p className="text-muted-foreground">
          This information helps us understand your journey and provide the most appropriate care and support.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Substance Use History */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
              Substance Use History
            </h3>
            
            <FormField
              control={form.control}
              name="primarySubstance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Substance of Concern <span className="text-red-600">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary substance" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="alcohol">Alcohol</SelectItem>
                      <SelectItem value="heroin">Heroin</SelectItem>
                      <SelectItem value="fentanyl">Fentanyl</SelectItem>
                      <SelectItem value="methamphetamine">Methamphetamine</SelectItem>
                      <SelectItem value="cocaine">Cocaine</SelectItem>
                      <SelectItem value="marijuana">Marijuana</SelectItem>
                      <SelectItem value="prescription-opioids">Prescription Opioids</SelectItem>
                      <SelectItem value="benzodiazepines">Benzodiazepines</SelectItem>
                      <SelectItem value="stimulants">Stimulants (Adderall, Ritalin, etc.)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearsOfUse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Use</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 5 years" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastUseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RecentDatePicker
                        selected={field.value}
                        onChange={(date) => field.onChange(date)}
                        error={form.formState.errors.lastUseDate?.message}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Previous Treatment History */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Previous Treatment History</h3>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="previousTreatment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Have you received treatment for substance use before?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              {form.watch('previousTreatment') && (
                <FormField
                  control={form.control}
                  name="previousTreatmentDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Please describe your previous treatment experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the type of treatment, when it occurred, and how it went..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="previousRehab"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Have you been to residential rehabilitation before?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              {form.watch('previousRehab') && (
                <FormField
                  control={form.control}
                  name="previousRehabDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Please describe your rehabilitation experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="When, where, and how long was your stay..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="previousDetox"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Have you been through medical detoxification before?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              {form.watch('previousDetox') && (
                <FormField
                  control={form.control}
                  name="previousDetoxDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Please describe your detoxification experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="When, where, and what substances..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {/* Mental Health */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Mental Health</h3>
            
            <FormField
              control={form.control}
              name="mentalHealthConditions"
              render={() => (
                <FormItem>
                  <FormLabel>Mental Health Conditions (Check all that apply)</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'depression',
                      'anxiety',
                      'bipolar-disorder',
                      'ptsd',
                      'adhd',
                      'schizophrenia',
                      'eating-disorder',
                      'ocd',
                      'borderline-personality',
                      'other'
                    ].map((condition) => (
                      <FormField
                        key={condition}
                        control={form.control}
                        name="mentalHealthConditions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={condition}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(condition)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, condition])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== condition
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {condition.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            {form.watch('mentalHealthConditions')?.includes('other') && (
              <FormField
                control={form.control}
                name="otherMentalHealthConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify other mental health conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any other mental health conditions..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="currentMedications"
              render={() => (
                <FormItem>
                  <FormLabel>Current Medications (Check all that apply)</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'antidepressants',
                      'anti-anxiety',
                      'mood-stabilizers',
                      'antipsychotics',
                      'adhd-medication',
                      'sleep-medication',
                      'pain-medication',
                      'other'
                    ].map((medication) => (
                      <FormField
                        key={medication}
                        control={form.control}
                        name="currentMedications"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={medication}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(medication)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, medication])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== medication
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {medication.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            {form.watch('currentMedications')?.includes('other') && (
              <FormField
                control={form.control}
                name="otherMedications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify other medications</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List any other medications you are currently taking..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Support System */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Support System</h3>
            
            <FormField
              control={form.control}
              name="supportSystem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe your current support system <span className="text-red-600">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Who supports you in your recovery? (family, friends, support groups, etc.)"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="familyInvolvement"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Would you like family members to be involved in your treatment?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('familyInvolvement') && (
              <FormField
                control={form.control}
                name="familyInvolvementDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please describe how you would like family to be involved</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What role would you like family to play in your recovery?"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Recovery Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Recovery Goals</h3>
            
            <FormField
              control={form.control}
              name="recoveryGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are your primary recovery goals? <span className="text-red-600">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What do you hope to achieve in your recovery journey?"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivationLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How would you rate your motivation for recovery? <span className="text-red-600">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select motivation level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="very-high">Very High - I'm fully committed to recovery</SelectItem>
                      <SelectItem value="high">High - I'm motivated but have some concerns</SelectItem>
                      <SelectItem value="moderate">Moderate - I want to change but feel uncertain</SelectItem>
                      <SelectItem value="low">Low - I'm not sure if I'm ready</SelectItem>
                      <SelectItem value="very-low">Very Low - I'm here because someone else wants me to be</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="barriersToRecovery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What barriers do you anticipate in your recovery?</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What challenges do you think you might face?"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Legal and Employment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Legal and Employment Status</h3>
            
            <FormField
              control={form.control}
              name="legalIssues"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Do you have any current legal issues related to substance use?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('legalIssues') && (
              <FormField
                control={form.control}
                name="legalIssuesDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please describe your legal situation</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any legal issues, court dates, or requirements..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="employmentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Employment Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employment status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time employed</SelectItem>
                      <SelectItem value="part-time">Part-time employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employmentDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your work situation, any workplace accommodations needed..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Housing and Transportation */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Housing and Transportation</h3>
            
            <FormField
              control={form.control}
              name="housingStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Housing Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select housing status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="own-home">Own home</SelectItem>
                      <SelectItem value="rent">Renting</SelectItem>
                      <SelectItem value="family-home">Living with family</SelectItem>
                      <SelectItem value="sober-living">Sober living facility</SelectItem>
                      <SelectItem value="homeless">Homeless</SelectItem>
                      <SelectItem value="temporary">Temporary housing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="housingDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Housing Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your living situation, any housing needs..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transportation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transportation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transportation method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="own-vehicle">Own vehicle</SelectItem>
                      <SelectItem value="public-transport">Public transportation</SelectItem>
                      <SelectItem value="family-transport">Family provides transportation</SelectItem>
                      <SelectItem value="walking">Walking</SelectItem>
                      <SelectItem value="ride-sharing">Ride sharing (Uber, Lyft)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Additional Information</h3>
            
            <FormField
              control={form.control}
              name="additionalInformation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Is there anything else you'd like us to know?</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information that might be helpful for your care..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
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

