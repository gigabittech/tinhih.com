import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Heart, Shield, ArrowRight, ArrowLeft, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const medicalHistorySchema = z.object({
  // General health
  height: z.string().optional(),
  weight: z.string().optional(),
  bloodType: z.string().optional(),
  
  // Medical conditions
  chronicConditions: z.array(z.string()).optional(),
  otherChronicConditions: z.string().optional(),
  surgeries: z.array(z.string()).optional(),
  otherSurgeries: z.string().optional(),
  
  // Allergies
  allergies: z.array(z.string()).optional(),
  otherAllergies: z.string().optional(),
  allergySeverity: z.string().optional(),
  
  // Current medications
  currentMedications: z.array(z.string()).optional(),
  otherCurrentMedications: z.string().optional(),
  medicationDosages: z.string().optional(),
  
  // Family history
  familyHistory: z.array(z.string()).optional(),
  otherFamilyHistory: z.string().optional(),
  
  // Lifestyle
  smokingStatus: z.string().optional(),
  alcoholUse: z.string().optional(),
  exerciseFrequency: z.string().optional(),
  dietRestrictions: z.string().optional(),
  
  // Women's health (if applicable)
  isPregnant: z.boolean().optional(),
  pregnancyDetails: z.string().optional(),
  lastMenstrualPeriod: z.date().optional(),
  
  // Additional information
  additionalMedicalInfo: z.string().optional(),
});

type MedicalHistoryData = z.infer<typeof medicalHistorySchema>;

interface MedicalHistoryStepProps {
  data: any;
  onComplete: (data: MedicalHistoryData) => void;
  onBack: () => void;
  isLastStep: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function MedicalHistoryStep({ data, onComplete, onBack }: MedicalHistoryStepProps) {
  const form = useForm<MedicalHistoryData>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      height: data.height || '',
      weight: data.weight || '',
      bloodType: data.bloodType || '',
      chronicConditions: data.chronicConditions || [],
      otherChronicConditions: data.otherChronicConditions || '',
      surgeries: data.surgeries || [],
      otherSurgeries: data.otherSurgeries || '',
      allergies: data.allergies || [],
      otherAllergies: data.otherAllergies || '',
      allergySeverity: data.allergySeverity || '',
      currentMedications: data.currentMedications || [],
      otherCurrentMedications: data.otherCurrentMedications || '',
      medicationDosages: data.medicationDosages || '',
      familyHistory: data.familyHistory || [],
      otherFamilyHistory: data.otherFamilyHistory || '',
      smokingStatus: data.smokingStatus || '',
      alcoholUse: data.alcoholUse || '',
      exerciseFrequency: data.exerciseFrequency || '',
      dietRestrictions: data.dietRestrictions || '',
      isPregnant: data.isPregnant || false,
      pregnancyDetails: data.pregnancyDetails || '',
      lastMenstrualPeriod: data.lastMenstrualPeriod ? new Date(data.lastMenstrualPeriod) : undefined,
      additionalMedicalInfo: data.additionalMedicalInfo || '',
    },
  });

  const onSubmit = (formData: MedicalHistoryData) => {
    onComplete(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Medical History</h2>
        <p className="text-muted-foreground">
          Please provide your medical history to help us provide the best possible care.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Health Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Basic Health Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input placeholder={"e.g., 5'8\" or 172 cm"} {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 150 lbs or 68 kg" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Chronic Medical Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Chronic Medical Conditions</h3>
            
            <FormField
              control={form.control}
              name="chronicConditions"
              render={() => (
                <FormItem>
                  <FormLabel>Do you have any of the following conditions? (Check all that apply)</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'diabetes',
                      'hypertension',
                      'heart-disease',
                      'asthma',
                      'copd',
                      'arthritis',
                      'thyroid-disorder',
                      'kidney-disease',
                      'liver-disease',
                      'cancer',
                      'hiv-aids',
                      'hepatitis',
                      'other'
                    ].map((condition) => (
                      <FormField
                        key={condition}
                        control={form.control}
                        name="chronicConditions"
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

            {form.watch('chronicConditions')?.includes('other') && (
              <FormField
                control={form.control}
                name="otherChronicConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify other chronic conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any other chronic medical conditions..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Surgical History */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Surgical History</h3>
            
            <FormField
              control={form.control}
              name="surgeries"
              render={() => (
                <FormItem>
                  <FormLabel>Have you had any of the following surgeries? (Check all that apply)</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'appendectomy',
                      'cholecystectomy',
                      'hernia-repair',
                      'cardiac-surgery',
                      'orthopedic-surgery',
                      'c-section',
                      'hysterectomy',
                      'tonsillectomy',
                      'other'
                    ].map((surgery) => (
                      <FormField
                        key={surgery}
                        control={form.control}
                        name="surgeries"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={surgery}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(surgery)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, surgery])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== surgery
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {surgery.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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

            {form.watch('surgeries')?.includes('other') && (
              <FormField
                control={form.control}
                name="otherSurgeries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify other surgeries</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any other surgeries, including dates if known..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Allergies */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Allergies</h3>
            
            <FormField
              control={form.control}
              name="allergies"
              render={() => (
                <FormItem>
                  <FormLabel>Do you have allergies to any of the following? (Check all that apply)</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'penicillin',
                      'sulfa-drugs',
                      'aspirin',
                      'ibuprofen',
                      'latex',
                      'peanuts',
                      'shellfish',
                      'eggs',
                      'dairy',
                      'none'
                    ].map((allergy) => (
                      <FormField
                        key={allergy}
                        control={form.control}
                        name="allergies"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={allergy}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(allergy)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, allergy])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== allergy
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {allergy.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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

            {form.watch('allergies')?.includes('other') && (
              <FormField
                control={form.control}
                name="otherAllergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify other allergies</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any other allergies and their severity..."
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
              name="allergySeverity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity of Allergic Reactions</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mild">Mild (rash, itching)</SelectItem>
                      <SelectItem value="moderate">Moderate (swelling, difficulty breathing)</SelectItem>
                      <SelectItem value="severe">Severe (anaphylaxis)</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Current Medications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Current Medications</h3>
            
            <FormField
              control={form.control}
              name="currentMedications"
              render={() => (
                <FormItem>
                  <FormLabel>Are you currently taking any of the following? (Check all that apply)</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'blood-pressure-medication',
                      'diabetes-medication',
                      'thyroid-medication',
                      'cholesterol-medication',
                      'antidepressants',
                      'anti-anxiety-medication',
                      'pain-medication',
                      'birth-control',
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
                name="otherCurrentMedications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify other current medications</FormLabel>
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

            <FormField
              control={form.control}
              name="medicationDosages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication Dosages (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please list dosages for your medications if known..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Family History */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Family Medical History</h3>
            
            <FormField
              control={form.control}
              name="familyHistory"
              render={() => (
                <FormItem>
                  <FormLabel>Do any of your family members have any of the following? (Check all that apply)</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'diabetes',
                      'heart-disease',
                      'cancer',
                      'hypertension',
                      'mental-illness',
                      'substance-abuse',
                      'alcoholism',
                      'other'
                    ].map((condition) => (
                      <FormField
                        key={condition}
                        control={form.control}
                        name="familyHistory"
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

            {form.watch('familyHistory')?.includes('other') && (
              <FormField
                control={form.control}
                name="otherFamilyHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify other family medical history</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any other family medical conditions..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Lifestyle Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Lifestyle Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smokingStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Smoking Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select smoking status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="never">Never smoked</SelectItem>
                        <SelectItem value="former">Former smoker</SelectItem>
                        <SelectItem value="current">Current smoker</SelectItem>
                        <SelectItem value="occasional">Occasional smoker</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="alcoholUse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alcohol Use</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select alcohol use" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="occasional">Occasional</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="heavy">Heavy</SelectItem>
                        <SelectItem value="in-recovery">In recovery</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exerciseFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exercise frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="rarely">Rarely</SelectItem>
                        <SelectItem value="occasionally">Occasionally</SelectItem>
                        <SelectItem value="regularly">Regularly (2-3 times/week)</SelectItem>
                        <SelectItem value="frequently">Frequently (4+ times/week)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dietRestrictions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dietary Restrictions</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., vegetarian, gluten-free, etc." {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Women's Health (Conditional) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Women's Health (If Applicable)</h3>
            
            <FormField
              control={form.control}
              name="isPregnant"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Are you currently pregnant?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('isPregnant') && (
              <FormField
                control={form.control}
                name="pregnancyDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pregnancy Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide pregnancy details, including due date if known..."
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
              name="lastMenstrualPeriod"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Last Menstrual Period</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Additional Medical Information</h3>
            
            <FormField
              control={form.control}
              name="additionalMedicalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Is there anything else about your medical history we should know?</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional medical information that might be relevant to your care..."
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

