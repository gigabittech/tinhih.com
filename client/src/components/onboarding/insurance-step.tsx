import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, CreditCard, DollarSign, Shield, FileText } from 'lucide-react';

const insuranceSchema = z.object({
  // Insurance information
  hasInsurance: z.boolean().default(false),
  insuranceProvider: z.string().optional(),
  insuranceGroupNumber: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  insurancePolicyHolder: z.string().optional(),
  insurancePolicyHolderDOB: z.string().optional(),
  insuranceRelationship: z.string().optional(),
  
  // Secondary insurance
  hasSecondaryInsurance: z.boolean().default(false),
  secondaryInsuranceProvider: z.string().optional(),
  secondaryInsuranceGroupNumber: z.string().optional(),
  secondaryInsuranceMemberId: z.string().optional(),
  
  // Financial information
  financialStatus: z.string().optional(),
  incomeLevel: z.string().optional(),
  employmentStatus: z.string().optional(),
  employerName: z.string().optional(),
  
  // Payment preferences
  paymentMethod: z.string().optional(),
  preferredPaymentDay: z.string().optional(),
  autoPay: z.boolean().default(false),
  
  // Sliding scale/financial assistance
  needsFinancialAssistance: z.boolean().default(false),
  financialAssistanceReason: z.string().optional(),
  householdSize: z.string().optional(),
  monthlyIncome: z.string().optional(),
  
  // Additional information
  additionalFinancialInfo: z.string().optional(),
});

type InsuranceData = z.infer<typeof insuranceSchema>;

interface InsuranceStepProps {
  data: any;
  existingData?: any;
  onComplete: (data: InsuranceData) => void;
  onBack: () => void;
  isLastStep: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function InsuranceStep({ data, existingData, onComplete, onBack, isEditing }: InsuranceStepProps) {
  const form = useForm<InsuranceData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      hasInsurance: data.hasInsurance || false,
      insuranceProvider: data.insuranceProvider || '',
      insuranceGroupNumber: data.insuranceGroupNumber || '',
      insuranceMemberId: data.insuranceMemberId || '',
      insurancePolicyHolder: data.insurancePolicyHolder || '',
      insurancePolicyHolderDOB: data.insurancePolicyHolderDOB || '',
      insuranceRelationship: data.insuranceRelationship || '',
      hasSecondaryInsurance: data.hasSecondaryInsurance || false,
      secondaryInsuranceProvider: data.secondaryInsuranceProvider || '',
      secondaryInsuranceGroupNumber: data.secondaryInsuranceGroupNumber || '',
      secondaryInsuranceMemberId: data.secondaryInsuranceMemberId || '',
      financialStatus: data.financialStatus || '',
      incomeLevel: data.incomeLevel || '',
      employmentStatus: data.employmentStatus || '',
      employerName: data.employerName || '',
      paymentMethod: data.paymentMethod || '',
      preferredPaymentDay: data.preferredPaymentDay || '',
      autoPay: data.autoPay || false,
      needsFinancialAssistance: data.needsFinancialAssistance || false,
      financialAssistanceReason: data.financialAssistanceReason || '',
      householdSize: data.householdSize || '',
      monthlyIncome: data.monthlyIncome || '',
      additionalFinancialInfo: data.additionalFinancialInfo || '',
    },
  });

  const onSubmit = (formData: InsuranceData) => {
    onComplete(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Insurance & Financial Information</h2>
        <p className="text-muted-foreground">
          Please provide your insurance and financial information. TiNHiH Foundation offers sliding scale fees and financial assistance.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Primary Insurance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Primary Insurance
            </h3>
            
            <FormField
              control={form.control}
              name="hasInsurance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I have health insurance</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('hasInsurance') && (
              <div className="space-y-4 pl-6 border-l-2 border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="insuranceProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Blue Cross Blue Shield" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="insuranceMemberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter member ID" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="insuranceGroupNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter group number" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="insurancePolicyHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Holder Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter policy holder name" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="insurancePolicyHolderDOB"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Holder Date of Birth</FormLabel>
                        <FormControl>
                          <Input placeholder="MM/DD/YYYY" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="insuranceRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship to Policy Holder</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="self">Self</SelectItem>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Secondary Insurance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Secondary Insurance (Optional)</h3>
            
            <FormField
              control={form.control}
              name="hasSecondaryInsurance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I have secondary insurance</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('hasSecondaryInsurance') && (
              <div className="space-y-4 pl-6 border-l-2 border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="secondaryInsuranceProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Insurance Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter provider name" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondaryInsuranceMemberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Member ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter member ID" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="secondaryInsuranceGroupNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Group Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group number" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              Financial Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="financialStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Financial Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stable">Financially Stable</SelectItem>
                        <SelectItem value="struggling">Financially Struggling</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="homeless">Homeless</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="incomeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual Income Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select income level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="under-13000">Under $15,000</SelectItem>
                        <SelectItem value="13000-23000">$15,000 - $25,000</SelectItem>
                        <SelectItem value="23000-33000">$25,000 - $35,000</SelectItem>
                        <SelectItem value="33000-30000">$35,000 - $50,000</SelectItem>
                        <SelectItem value="30000-73000">$50,000 - $75,000</SelectItem>
                        <SelectItem value="over-73000">Over $75,000</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
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
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
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
                name="employerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter employer name" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Financial Assistance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Financial Assistance
            </h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>TiNHiH Foundation offers sliding scale fees and financial assistance</strong> to ensure that cost is never a barrier to receiving the care you need. We are committed to making recovery accessible to everyone.
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="needsFinancialAssistance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I would like to apply for financial assistance or sliding scale fees</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('needsFinancialAssistance') && (
              <div className="space-y-4 pl-6 border-l-2 border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="householdSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Household Size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select household size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 person</SelectItem>
                            <SelectItem value="2">2 people</SelectItem>
                            <SelectItem value="3">3 people</SelectItem>
                            <SelectItem value="4">4 people</SelectItem>
                            <SelectItem value="5">5 people</SelectItem>
                            <SelectItem value="6+">6+ people</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Household Income</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter monthly income" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-600"/>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="financialAssistanceReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Financial Assistance</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please describe your current financial situation and why you need assistance..."
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

          {/* Payment Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Payment Preferences</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit-card">Credit Card</SelectItem>
                        <SelectItem value="debit-card">Debit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="money-order">Money Order</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="preferredPaymentDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Payment Day</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1st">1st of month</SelectItem>
                        <SelectItem value="15th">15th of month</SelectItem>
                        <SelectItem value="end-of-month">End of month</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="no-preference">No preference</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="autoPay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I would like to set up automatic payments</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Additional Financial Information</h3>
            
            <FormField
              control={form.control}
              name="additionalFinancialInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Is there anything else about your financial situation we should know?</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information that might help us provide appropriate financial assistance..."
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
