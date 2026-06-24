import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SoapNotesForm } from "@/components/clinical/soap-notes-form";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Plus, FileText, Search, Edit, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";

export default function RecoveryNotes() {
  const { setPageInfo } = usePageTitle();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [viewingNote, setViewingNote] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Check if user can create Recovery Notes
  const canCreateNotes = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'practitioner';
  const isPatient = user?.role === 'patient';

  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const action = urlParams.get('action');
  const viewNoteId = urlParams.get('view');

  // Also check window.location.search as a fallback
  const windowUrlParams = new URLSearchParams(window.location.search);
  const windowAction = windowUrlParams.get('action');
  const windowViewNoteId = windowUrlParams.get('view');
  
  // Use window.location.search as the primary source for URL parameters
  const finalAction = windowAction || action;
  const finalViewNoteId = windowViewNoteId || viewNoteId;

  useEffect(() => {
    if (finalAction === 'new' || (showForm && !editingNote)) {
      setPageInfo("New Recovery Note", "Document recovery session and treatment progress");
    } else if (finalAction === 'edit' || (showForm && editingNote)) {
      setPageInfo("Edit Recovery Note", "Update recovery session documentation");
    } else {
      const pageTitle = isPatient ? "My Recovery Notes" : "Recovery Notes";
      const pageSubtitle = isPatient 
        ? "View your recovery session documentation" 
        : "Review and create recovery documentation";
      setPageInfo(pageTitle, pageSubtitle);
    }
  }, [setPageInfo, finalAction, showForm, editingNote, isPatient]);

  // Handle URL parameters for automatic form opening
  useEffect(() => {
    if (finalAction === 'new') {
      if (!canCreateNotes) {
        // Redirect patients away from new note form
        setLocation('/clinical-notes');
        return;
      }
      setShowForm(true);
      setEditingNote(null);
    } else if (finalAction === 'edit') {
      // For edit, we need the note ID from URL params
      const noteId = urlParams.get('id');
      if (noteId) {
        // TODO: Fetch note data by ID if needed
        setShowForm(true);
      }
    }
  }, [finalAction, urlParams, showForm, canCreateNotes, setLocation]);

  // Handle initial URL parameters on mount
  useEffect(() => {
    if (finalAction === 'new') {
      if (!canCreateNotes) {
        // Redirect patients away from new note form
        setLocation('/clinical-notes');
        return;
      }
      setShowForm(true);
      setEditingNote(null);
    }
  }, [canCreateNotes, setLocation]); // Empty dependency array - runs only once on mount

  // Fetch Recovery Notes
  const { data: clinicalNotes, isLoading } = useQuery({
    queryKey: ["/api/clinical-notes", searchTerm, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("limit", "10");
      params.append("offset", ((currentPage - 1) * 10).toString());
      
      const response = await api.get(`/api/clinical-notes?${params.toString()}`);
      return response;
    },
  });

  // Handle view parameter to open a specific note
  useEffect(() => {
    if (finalViewNoteId && clinicalNotes) {
      const noteToView = clinicalNotes.find((note: any) => note.id === finalViewNoteId);
      if (noteToView) {
        setViewingNote(noteToView);
      }
    }
  }, [finalViewNoteId, clinicalNotes]);

  const handleNewNote = () => {
    if (!canCreateNotes) {
      return; // Patients cannot create notes
    }
    setShowForm(true);
    setEditingNote(null);
    setLocation('/clinical-notes?action=new');
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingNote(null);
    setLocation('/clinical-notes');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingNote(null);
    setLocation('/clinical-notes');
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setShowForm(true);
    setLocation('/clinical-notes?action=edit');
  };

  const handleViewNote = (note: any) => {
    setLocation(`/clinical-notes/${note.id}`);
  };

  if (finalAction === 'new' || finalAction === 'edit' || showForm) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <SoapNotesForm
            note={editingNote}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isPatient ? "My Recovery Notes" : "Recovery Notes"}</CardTitle>
              {canCreateNotes && (
                <Button onClick={handleNewNote}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Recovery Note
                </Button>
              )}
            </div>
            
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search recovery notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading Recovery Notes...</p>
              </div>
            ) : !clinicalNotes || clinicalNotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {isPatient ? "No recovery notes yet" : "No Recovery Notes yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isPatient 
                    ? "Your recovery notes will appear here once created by your practitioner"
                    : "Start documenting patient consultations and treatments"
                  }
                </p>
                {canCreateNotes && (
                  <Button onClick={handleNewNote}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Note
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {clinicalNotes.map((note: any) => (
                  <div key={note.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-foreground">{note.title}</h3>
                          {note.appointment && (
                            <Badge variant="secondary" className="text-xs">
                              Linked to Appointment
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium">Patient:</span> {note.patient?.user?.firstName} {note.patient?.user?.lastName}
                          <span className="mx-2">•</span>
                          <span className="font-medium">Practitioner:</span> Dr. {note.practitioner?.user?.firstName} {note.practitioner?.user?.lastName}
                        </div>
                        
                        <div className="text-sm text-muted-foreground/70">
                          {format(new Date(note.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                        </div>
                        
                        {note.subjective && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            <span className="font-medium">S:</span> {note.subjective.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewNote(note)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canCreateNotes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNote(note)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Note Dialog */}
        <Dialog open={!!viewingNote} onOpenChange={(open) => {
          if (!open) {
            setViewingNote(null);
            // Clear the view parameter from URL when dialog is closed
            if (finalViewNoteId) {
              setLocation('/clinical-notes');
            }
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-border pb-4">
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {viewingNote?.title}
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                Clinical note created on {viewingNote && format(new Date(viewingNote.createdAt), "EEEE, MMMM dd, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>
            
            {viewingNote && (
              <div className="space-y-6 pt-4">
                {/* Basic Information Card */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Patient</label>
                        <p className="text-foreground font-medium">
                          {viewingNote.patient?.user?.firstName} {viewingNote.patient?.user?.lastName}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Practitioner</label>
                        <p className="text-foreground font-medium">
                          Dr. {viewingNote.practitioner?.user?.firstName} {viewingNote.practitioner?.user?.lastName}
                        </p>
                      </div>
                    </div>
                    
                    {viewingNote.appointment && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Related Appointment</label>
                        <p className="text-foreground font-medium">
                          {viewingNote.appointment.title} - {format(new Date(viewingNote.appointment.appointmentDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* SOAP Documentation Card */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      SOAP Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Subjective */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">S</span>
                        <h4 className="font-semibold text-foreground">Subjective</h4>
                      </div>
                      <div className="pl-8">
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {viewingNote.subjective}
                        </p>
                      </div>
                    </div>

                    {/* Objective */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-xs font-bold">O</span>
                        <h4 className="font-semibold text-foreground">Objective</h4>
                      </div>
                      <div className="pl-8">
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {viewingNote.objective}
                        </p>
                      </div>
                    </div>

                    {/* Assessment */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">A</span>
                        <h4 className="font-semibold text-foreground">Assessment</h4>
                      </div>
                      <div className="pl-8">
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {viewingNote.assessment}
                        </p>
                      </div>
                    </div>

                    {/* Plan */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">P</span>
                        <h4 className="font-semibold text-foreground">Plan</h4>
                      </div>
                      <div className="pl-8">
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {viewingNote.plan}
                        </p>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    {viewingNote.additionalNotes && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center text-xs font-bold">+</span>
                          <h4 className="font-semibold text-foreground">Additional Notes</h4>
                        </div>
                        <div className="pl-8">
                          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {viewingNote.additionalNotes}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Last updated: {format(new Date(viewingNote.updatedAt || viewingNote.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                  </div>
                  <div className="flex items-center gap-2">
                    {canCreateNotes && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingNote(null);
                          handleEditNote(viewingNote);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Note
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingNote(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
