import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

const soapNotesSchema = z.object({
  patientId: z.string().min(1, "Client is required"),
  practitionerId: z.string().min(1, "Recovery Specialist is required"),
  appointmentId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  subjective: z.string().min(1, "Subjective section is required"),
  objective: z.string().min(1, "Objective section is required"),
  assessment: z.string().min(1, "Assessment section is required"),
  plan: z.string().min(1, "Plan section is required"),
  additionalNotes: z.string().optional(),
});

type SoapNotesFormData = z.infer<typeof soapNotesSchema>;

interface SoapNotesFormProps {
  note?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SoapNotesForm({ note, onSuccess, onCancel }: SoapNotesFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!note;
  const isPractitioner = user?.role === 'practitioner';
  
  // Prevent patients from accessing this form
  if (user?.role === 'patient') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Patients cannot create or edit Recovery Notes. Please contact your practitioner.
          </p>
          <Button onClick={onCancel} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const form = useForm<SoapNotesFormData>({
    resolver: zodResolver(soapNotesSchema),
    defaultValues: {
      patientId: note?.patientId || "",
      practitionerId: note?.practitionerId || "",
      appointmentId: note?.appointmentId || null,
      title: note?.title || "",
      subjective: note?.subjective || "",
      objective: note?.objective || "",
      assessment: note?.assessment || "",
      plan: note?.plan || "",
      additionalNotes: note?.additionalNotes || "",
    },
  });

  // Set practitioner ID automatically for practitioners
  useEffect(() => {
    if (isPractitioner && !note?.practitionerId) {
      // For practitioners, set their own ID automatically
      const setPractitionerId = async () => {
        try {
          const response = await api.get("/api/practitioners");
          const currentPractitioner = response.find((p: any) => p.userId === user?.id);
          if (currentPractitioner) {
            form.setValue("practitionerId", currentPractitioner.id);
          }
        } catch (error) {
          console.error("Error setting practitioner ID:", error);
        }
      };
      setPractitionerId();
    }
  }, [isPractitioner, user?.id, note?.practitionerId, form]);

  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await api.get("/api/patients?limit=100");
      return response;
    },
  });

  // Fetch practitioners for selection
  const { data: practitioners } = useQuery({
    queryKey: ["/api/practitioners"],
    queryFn: async () => {
      const response = await api.get("/api/practitioners?limit=100");
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

  const createNoteMutation = useMutation({
    mutationFn: async (data: SoapNotesFormData) => {
      // Handle empty appointmentId
      const payload = {
        ...data,
        appointmentId: data.appointmentId || null,
      };
      return api.post("/api/clinical-notes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-notes"] });
      toast({
        title: "Success",
        description: "Recovery note created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create recovery note",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (data: SoapNotesFormData) => {
      // Handle empty appointmentId
      const payload = {
        ...data,
        appointmentId: data.appointmentId || null,
      };
      return api.put(`/api/clinical-notes/${note.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-notes"] });
      toast({
        title: "Success",
        description: "Recovery note updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update recovery note",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SoapNotesFormData) => {
    if (isEditing) {
      updateNoteMutation.mutate(data);
    } else {
      createNoteMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edit Recovery Note" : "New Recovery Note"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? "Update recovery session documentation" : "Document recovery session and treatment progress"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Client <span className="text-red-600">*</span></FormLabel>
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
                            >
                              {field.value
                                ? patients?.find((patient: any) => patient.id === field.value)?.user?.firstName + " " + patients?.find((patient: any) => patient.id === field.value)?.user?.lastName
                                : "Select client..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                                  <CommandItem className="w-full"
                                    key={patient.id}
                                    value={`${patient.user?.firstName} ${patient.user?.lastName} ${patient.user?.email || ""}`}
                                    onSelect={() => {
                                      form.setValue("patientId", patient.id);
                                      form.trigger("patientId"); // Trigger validation after setting value
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        patient.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
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

                <FormField
                  control={form.control}
                  name="practitionerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Recovery Specialist <span className="text-red-600">*</span></FormLabel>
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
                              >
                                {field.value
                                  ? practitioners?.find((practitioner: any) => practitioner.id === field.value)?.user?.firstName + " " + practitioners?.find((practitioner: any) => practitioner.id === field.value)?.user?.lastName
                                  : "Select recovery specialist..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                                        form.trigger("practitionerId"); // Trigger validation after setting value
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          practitioner.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Note Title <span className="text-red-600">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter note title" className="h-10 border-border/20 focus:border-border" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appointmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Related Appointment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="h-10 border-border/20 focus:border-border">
                            <SelectValue placeholder="Select appointment (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appointments?.map((appointment: any) => (
                            <SelectItem key={appointment.id} value={appointment.id}>
                              {appointment.title} - {new Date(appointment.appointmentDate).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* SOAP Documentation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                SOAP Documentation
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete the SOAP note sections below. All fields marked with <span className="text-red-600">*</span> are required.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="subjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">S</span>
                        Subjective <span className="text-red-600">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Patient's chief complaint, history of present illness, symptoms, and any relevant patient-reported information..."
                          className="min-h-[120px] resize-none border-border/20 focus:border-border text-muted"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-xs font-bold">O</span>
                        Objective <span className="text-red-600">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Physical examination findings, vital signs, test results, and any observable data..."
                          className="min-h-[120px] resize-none border-border/20 focus:border-border text-muted"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">A</span>
                        Assessment <span className="text-red-600">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Clinical diagnosis, impressions, differential diagnoses, and professional assessment..."
                          className="min-h-[120px] resize-none border-border/20 focus:border-border text-muted"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">P</span>
                        Plan <span className="text-red-600">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Treatment plan, medications, follow-up instructions, referrals, and next steps..."
                          className="min-h-[120px] resize-none border-border/20 focus:border-border text-muted"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center text-xs font-bold">+</span>
                        Additional Notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional observations, notes, or comments that don't fit into the SOAP categories..."
                          className="min-h-[100px] resize-none border-border/20 focus:border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600"/>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              className="px-8"
            >
              {createNoteMutation.isPending || updateNoteMutation.isPending
                ? "Saving..."
                : isEditing ? "Update Note" : "Create Note"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
