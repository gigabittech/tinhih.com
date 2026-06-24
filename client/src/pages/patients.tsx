import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { PatientList } from "@/components/patients/patient-list";
import { PatientForm } from "@/components/patients/patient-form";
import { PatientDetail } from "@/components/patients/patient-detail";

export default function Patients() {
  const [location, setLocation] = useLocation();
  const { setPageInfo } = usePageTitle();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  const isPatient = user?.role === 'patient';
  const isPractitioner = user?.role === 'practitioner';

  // Check if we should show the form based on URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const action = urlParams.get('action');

  // Also check window.location.search as a fallback
  const windowUrlParams = new URLSearchParams(window.location.search);
  const windowAction = windowUrlParams.get('action');
  
  // Use window.location.search as the primary source for URL parameters
  const finalAction = windowAction || action;

  useEffect(() => {
    // Update page title based on current action/state and user role
    if (finalAction === 'view' || showDetail) {
      const title = isPatient ? "Patient Details" : "Client Details";
      setPageInfo(title, selectedPatient ? `${selectedPatient.user?.firstName} ${selectedPatient.user?.lastName}` : (isPatient ? "Patient Information" : "Client Information"));
    } else if (finalAction === 'new' || (showForm && !selectedPatient)) {
      const title = isPatient ? "New Patient" : "New Client";
      const description = isPatient ? "Add a new patient to your practice" : "Add a new client to your practice";
      setPageInfo(title, description);
    } else if (finalAction === 'edit' || (showForm && selectedPatient)) {
      const title = isPatient ? "Edit Patient" : "Edit Client";
      const description = selectedPatient ? `Editing ${selectedPatient.user?.firstName} ${selectedPatient.user?.lastName}` : (isPatient ? "Edit patient information" : "Edit client information");
      setPageInfo(title, description);
    } else {
      const title = isPatient ? "Patients" : "Clients";
      const description = isPatient ? "Manage patient records and information" : "Manage client records and information";
      setPageInfo(title, description);
    }
  }, [setPageInfo, finalAction, showDetail, showForm, selectedPatient, isPatient]);

  // Handle URL parameters for automatic form opening
  useEffect(() => {
    if (finalAction === 'new') {
      setSelectedPatient(null);
      setShowForm(true);
      setShowDetail(false);
    } else if (finalAction === 'edit') {
      // For edit, we need the patient ID from URL params
      const patientId = urlParams.get('id');
      if (patientId) {
        // TODO: Fetch patient data by ID if needed
        setShowForm(true);
        setShowDetail(false);
      }
    } else if (finalAction === 'view') {
      // For view, we need the patient ID from URL params
      const patientId = urlParams.get('id');
      if (patientId) {
        // TODO: Fetch patient data by ID if needed
        setShowDetail(true);
        setShowForm(false);
      }
    }
  }, [finalAction, urlParams, showForm]);

  // Handle initial URL parameters on mount
  useEffect(() => {
    if (finalAction === 'new') {
      setSelectedPatient(null);
      setShowForm(true);
      setShowDetail(false);
    }
  }, []); // Empty dependency array - runs only once on mount

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setShowForm(true);
    setLocation('/patients?action=new');
  };

  const handleEditPatient = (patient: any) => {
    setSelectedPatient(patient);
    setShowForm(true);
    setLocation(`/patients?action=edit&id=${patient.id}`);
  };

  const handleViewPatient = (patient: any) => {
    setSelectedPatient(patient);
    setShowDetail(true);
    setLocation(`/patients?action=view&id=${patient.id}`);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setShowDetail(false);
    setSelectedPatient(null);
    setLocation('/patients');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setShowDetail(false);
    setSelectedPatient(null);
    setLocation('/patients');
  };

  const handleEditFromDetail = () => {
    setShowDetail(false);
    setShowForm(true);
    setLocation(`/patients?action=edit&id=${selectedPatient.id}`);
  };

  const handleBackFromDetail = () => {
    setShowDetail(false);
    setSelectedPatient(null);
    setLocation('/patients');
  };

  const handleMessagePatient = (patient: any) => {
    // Navigate to messages page with the patient pre-selected
    setLocation('/messages?action=new&recipientId=' + patient.userId);
  };

  // Show detail view if action is view
  if (finalAction === 'view' || showDetail) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <PatientDetail
            patient={selectedPatient}
            onEdit={handleEditFromDetail}
            onBack={handleBackFromDetail}
            onMessage={user?.role === 'practitioner' ? () => handleMessagePatient(selectedPatient) : undefined}
          />
        </div>
      </div>
    );
  }

  // Show form if action is specified or showForm is true
  if (finalAction === 'new' || finalAction === 'edit' || showForm) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <PatientForm
            patient={selectedPatient}
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
        <PatientList 
          onNewPatient={handleNewPatient}
          onEditPatient={handleEditPatient}
          onViewPatient={handleViewPatient}
          onMessagePatient={handleMessagePatient}
        />
      </div>
    </div>
  );
}
