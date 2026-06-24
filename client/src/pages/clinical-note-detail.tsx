import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/context/page-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Edit, Calendar, User, Stethoscope, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";

export default function ClinicalNoteDetail() {
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Extract note ID from URL
  const noteId = location.split('/').pop();
  
  // Fetch the specific clinical note
  const { data: note, isLoading, error } = useQuery({
    queryKey: ["/api/clinical-notes", noteId],
    queryFn: async () => {
      const response = await api.get(`/api/clinical-notes/${noteId}`);
      return response;
    },
    enabled: !!noteId,
  });

  useEffect(() => {
    if (note) {
      setPageInfo(
        note.title || "Recovery Note", 
        `Recovery note for ${note.patient?.user?.firstName} ${note.patient?.user?.lastName}`
      );
    } else {
      setPageInfo("Recovery Note", "Loading recovery note details...");
    }
  }, [setPageInfo, note]);

  const handleBack = () => {
    setLocation('/clinical-notes');
  };

  const handleEdit = () => {
    setLocation(`/clinical-notes?action=edit&id=${noteId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading recovery note...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Recovery Note Not Found</h3>
                <p className="text-muted-foreground mb-4">The recovery note you're looking for doesn't exist or you don't have permission to view it.</p>
                <Button onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Recovery Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Recovery Notes
          </Button>
          
          {(user?.role === 'admin' || user?.role === 'staff' || 
            (user?.role === 'practitioner' && note.practitioner?.userId === user?.id)) && (
            <Button onClick={handleEdit} className="gap-2">
              <Edit className="w-4 h-4" />
              Edit Note
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Title and Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    {note.title}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(note.createdAt), "EEEE, MMMM dd, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(note.createdAt), "h:mm a")}
                    </div>
                  </div>
                </div>
                {note.appointment && (
                  <Badge variant="secondary" className="text-xs">
                    Linked to Appointment
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Client
                  </label>
                  <p className="text-foreground font-medium">
                    {note.patient?.user?.firstName} {note.patient?.user?.lastName}
                  </p>
                  {note.patient?.user?.email && (
                    <p className="text-sm text-muted-foreground">{note.patient.user.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="w-4 h-4" />
                    Recovery Specialist
                  </label>
                  <p className="text-foreground font-medium">
                    {note.practitioner?.user?.firstName} {note.practitioner?.user?.lastName}
                  </p>
                  {note.practitioner?.user?.email && (
                    <p className="text-sm text-muted-foreground">{note.practitioner.user.email}</p>
                  )}
                </div>
              </div>
              
              {note.appointment && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Linked Appointment</label>
                  <p className="text-foreground">
                    {note.appointment.title} - {format(new Date(note.appointment.appointmentDate), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SOAP Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Recovery Session Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subjective */}
              {note.subjective && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Subjective (S)
                  </label>
                  <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-blue-500">
                    <p className="text-foreground whitespace-pre-wrap">{note.subjective}</p>
                  </div>
                </div>
              )}

              {/* Objective */}
              {note.objective && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Objective (O)
                  </label>
                  <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-green-500">
                    <p className="text-foreground whitespace-pre-wrap">{note.objective}</p>
                  </div>
                </div>
              )}

              {/* Assessment */}
              {note.assessment && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Assessment (A)
                  </label>
                  <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-yellow-500">
                    <p className="text-foreground whitespace-pre-wrap">{note.assessment}</p>
                  </div>
                </div>
              )}

              {/* Plan */}
              {note.plan && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Plan (P)
                  </label>
                  <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-red-500">
                    <p className="text-foreground whitespace-pre-wrap">{note.plan}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          {(note.medications || note.allergies || note.vitalSigns || note.labResults) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {note.medications && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Medications</label>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-foreground whitespace-pre-wrap">{note.medications}</p>
                    </div>
                  </div>
                )}

                {note.allergies && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Allergies</label>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-foreground whitespace-pre-wrap">{note.allergies}</p>
                    </div>
                  </div>
                )}

                {note.vitalSigns && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Vital Signs</label>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-foreground whitespace-pre-wrap">{note.vitalSigns}</p>
                    </div>
                  </div>
                )}

                {note.labResults && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Lab Results</label>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-foreground whitespace-pre-wrap">{note.labResults}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {note.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-foreground whitespace-pre-wrap">{note.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
            <div>
              <p>Created: {format(new Date(note.createdAt), "MMM dd, yyyy 'at' h:mm a")}</p>
              {note.updatedAt && note.updatedAt !== note.createdAt && (
                <p>Last updated: {format(new Date(note.updatedAt), "MMM dd, yyyy 'at' h:mm a")}</p>
              )}
            </div>
            <div className="text-right">
              <p>Note ID: {note.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
