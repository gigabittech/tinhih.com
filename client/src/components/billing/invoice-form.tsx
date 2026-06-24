import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, User, Stethoscope, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const invoiceSchema = z.object({
  patientId: z.string().min(1, "Client is required"),
  practitionerId: z.string().min(1, "Recovery Specialist is required"),
  appointmentId: z.string().optional(),
  amount: z.string().min(1, "Service amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Service amount must be a positive number",
  }),
  tax: z.string().optional().default("0"),
  description: z.string().min(1, "Service description is required"),
  dueDate: z.date().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPractitioner = user?.role === 'practitioner';
  const isEditing = !!invoice;

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patientId: invoice?.patientId || "",
      practitionerId: invoice?.practitionerId || "",
      appointmentId: invoice?.appointmentId || "none",
      amount: invoice?.amount || "",
      tax: invoice?.tax || "0",
      description: invoice?.description || "",
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : undefined,
    },
  });

  // Fetch patients for selection
  const { data: patients, isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await api.get("/api/patients?limit=100");
      console.log("Patients data:", response);
      return response;
    },
  });

  // Fetch practitioners for selection
  const { data: practitioners, isLoading: practitionersLoading, error: practitionersError } = useQuery({
    queryKey: ["/api/practitioners"],
    queryFn: async () => {
      const response = await api.get("/api/practitioners?limit=100");
      console.log("Practitioners data:", response);
      return response;
    },
  });

  // Fetch appointments for the selected patient
  const selectedPatientId = form.watch("patientId");
  const { data: appointments } = useQuery({
    queryKey: ["/api/appointments", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const response = await api.get(`/api/appointments?patientId=${selectedPatientId}&limit=50`);
      return response;
    },
    enabled: !!selectedPatientId,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const amount = Number(data.amount);
      const tax = Number(data.tax);
      const total = amount + tax;

      const payload = {
        ...data,
        appointmentId: data.appointmentId && data.appointmentId !== "none" ? data.appointmentId : null,
        amount: amount.toString(),
        tax: tax.toString(),
        total: total.toString(),
        dueDate: data.dueDate ? data.dueDate : null,
      };

      return api.post("/api/invoices", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Service bill created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service bill",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const amount = Number(data.amount);
      const tax = Number(data.tax);
      const total = amount + tax;

      const payload = {
        ...data,
        appointmentId: data.appointmentId && data.appointmentId !== "none" ? data.appointmentId : null,
        amount: amount.toString(),
        tax: tax.toString(),
        total: total.toString(),
        dueDate: data.dueDate ? data.dueDate : null,
      };

      return api.put(`/api/invoices/${invoice.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Service bill updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service bill",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    if (isEditing) {
      updateInvoiceMutation.mutate(data);
    } else {
      createInvoiceMutation.mutate(data);
    }
  };

  const isLoading = createInvoiceMutation.isPending || updateInvoiceMutation.isPending;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Selection */}
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Client *
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between h-10 border-border/20 focus:border-border",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={patientsLoading}
                            >
                              {field.value
                                ? patients?.find((patient: any) => patient.id === field.value)?.user?.firstName + " " + patients?.find((patient: any) => patient.id === field.value)?.user?.lastName
                                : "Select client..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search clients..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>No client found.</CommandEmpty>
                              <CommandGroup>
                                {patients?.map((patient: any) => (
                                  <CommandItem
                                    key={patient.id}
                                    value={`${patient.user?.firstName} ${patient.user?.lastName} ${patient.user?.email || ""}`}
                                    onSelect={() => {
                                      form.setValue("patientId", patient.id);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-base text-sm">
                                        {patient.user?.firstName} {patient.user?.lastName}
                                      </span>
                                      {patient.user?.email && (
                                        <span className="text-xs text-muted-foreground">
                                          {patient.user.email}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                {/* Recovery Specialist Selection */}
                <FormField
                  control={form.control}
                  name="practitionerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-1">
                        <Stethoscope className="w-4 h-4" />
                        Recovery Specialist *
                      </FormLabel>
                      {isPractitioner ? (
                        // For practitioners, show their name as read-only
                        <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                          <span className="text-sm font-medium">
                            {practitioners?.find((practitioner: any) => practitioner.id === field.value)?.user?.firstName} {practitioners?.find((practitioner: any) => practitioner.id === field.value)?.user?.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">(You)</span>
                        </div>
                      ) : (
                        // For admin/staff, allow selection
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between h-10 border-border/20 focus:border-border",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={practitionersLoading}
                              >
                                {field.value
                                  ? practitioners?.find((practitioner: any) => practitioner.id === field.value)?.user?.firstName + " " + practitioners?.find((practitioner: any) => practitioner.id === field.value)?.user?.lastName
                                  : "Select recovery specialist..."}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search recovery specialists..." className="h-9" />
                              <CommandList>
                                <CommandEmpty>No recovery specialist found.</CommandEmpty>
                                <CommandGroup>
                                  {practitioners?.map((practitioner: any) => (
                                    <CommandItem
                                      key={practitioner.id}
                                      value={`${practitioner.user?.firstName} ${practitioner.user?.lastName} ${practitioner.user?.email || ""}`}
                                      onSelect={() => {
                                        form.setValue("practitionerId", practitioner.id);
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-base text-sm">
                                          {practitioner.user?.firstName} {practitioner.user?.lastName}
                                        </span>
                                        {practitioner.user?.email && (
                                          <span className="text-xs text-muted-foreground">
                                            {practitioner.user.email}
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              </div>

              {/* Appointment Selection */}
              <FormField
                control={form.control}
                name="appointmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Linked Recovery Session (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a recovery session..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No session linked</SelectItem>
                        {appointments?.map((appointment: any) => (
                          <SelectItem key={appointment.id} value={appointment.id}>
                            {appointment.title} - {format(new Date(appointment.appointmentDate), "MMM dd, yyyy 'at' h:mm a")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Service Description <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the recovery service provided..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600"/>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Service Amount <span className="text-red-600">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Tax Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Due Date</FormLabel>
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
                                <span>Select due date</span>
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(Number(form.watch("amount") || 0) + Number(form.watch("tax") || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update Service Bill" : "Create Service Bill"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}