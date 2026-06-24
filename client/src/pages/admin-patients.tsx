import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  UserCheck, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Calendar, 
  FileText,
  Phone,
  MapPin,
  Heart,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";

interface Patient {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  medicalHistory: string[];
  allergies: string[];
  medications: string[];
  onboardingData: any;
}

export default function AdminPatients() {
  const { setPageInfo } = usePageTitle();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    isActive: true,
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    emergencyContact: "",
    emergencyPhone: "",
    insuranceProvider: "",
    insuranceNumber: "",
    medicalHistory: [] as string[],
    allergies: [] as string[],
    medications: [] as string[]
  });

  const [createFormData, setCreateFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    emergencyContact: "",
    emergencyPhone: "",
    insuranceProvider: "",
    insuranceNumber: "",
    medicalHistory: [] as string[],
    allergies: [] as string[],
    medications: [] as string[]
  });

  useEffect(() => {
    setPageInfo("Patients", "Manage patient accounts and profiles");
    fetchPatients();
  }, [setPageInfo]);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/admin/patients");
      setPatients(response || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch patients",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetailsDialog(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      firstName: patient.user.firstName,
      lastName: patient.user.lastName,
      email: patient.user.email,
      phone: patient.user.phone || "",
      isActive: patient.user.isActive,
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).split('T')[0] : "",
      gender: patient.gender || "",
      address: patient.address || "",
      city: patient.city || "",
      state: patient.state || "",
      zipCode: patient.zipCode || "",
      emergencyContact: patient.emergencyContact || "",
      emergencyPhone: patient.emergencyPhone || "",
      insuranceProvider: patient.insuranceProvider || "",
      insuranceNumber: patient.insuranceNumber || "",
      medicalHistory: patient.medicalHistory || [],
      allergies: patient.allergies || [],
      medications: patient.medications || []
    });
    setShowEditDialog(true);
  };

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return;
    
    try {
      setIsUpdating(true);
      await api.put(`/api/admin/patients/${selectedPatient.id}`, formData);
      toast({
        title: "Success",
        description: "Patient updated successfully"
      });
      setShowEditDialog(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update patient",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDeleteDialog(true);
  };

  const confirmDeletePatient = async () => {
    if (!selectedPatient) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/admin/patients/${selectedPatient.id}`);
      toast({
        title: "Success",
        description: "Patient deactivated successfully"
      });
      setShowDeleteDialog(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to deactivate patient",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreatePatient = async () => {
    try {
      setIsCreating(true);
      
      // Prepare the data for patient creation
      const patientData = {
        user: {
          firstName: createFormData.firstName,
          lastName: createFormData.lastName,
          email: createFormData.email,
          phone: createFormData.phone,
          role: "patient"
        },
        patient: {
          dateOfBirth: createFormData.dateOfBirth || null,
          gender: createFormData.gender || null,
          address: createFormData.address || null,
          city: createFormData.city || null,
          state: createFormData.state || null,
          zipCode: createFormData.zipCode || null,
          emergencyContact: createFormData.emergencyContact || null,
          emergencyPhone: createFormData.emergencyPhone || null,
          insuranceProvider: createFormData.insuranceProvider || null,
          insuranceNumber: createFormData.insuranceNumber || null,
          medicalHistory: createFormData.medicalHistory,
          allergies: createFormData.allergies,
          medications: createFormData.medications
        }
      };

      await api.post("/api/patients", patientData);
      
      toast({
        title: "Success",
        description: "Patient created successfully. A welcome email with login credentials has been sent to the patient."
      });
      
      setShowCreateDialog(false);
      setCreateFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        emergencyContact: "",
        emergencyPhone: "",
        insuranceProvider: "",
        insuranceNumber: "",
        medicalHistory: [],
        allergies: [],
        medications: []
      });
      fetchPatients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create patient",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.user.phone && patient.user.phone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && patient.user.isActive) ||
      (statusFilter === "inactive" && !patient.user.isActive);

    return matchesSearch && matchesStatus;
  });

  const patientStats = {
    total: patients.length,
    active: patients.filter(p => p.user.isActive).length,
    inactive: patients.filter(p => !p.user.isActive).length,
    recent: patients.filter(p => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(p.user.createdAt) >= weekAgo;
    }).length
  };

  const getAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return "N/A";
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Patient Management</h1>
              <p className="text-muted-foreground mt-1">Manage patient accounts and information</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={fetchPatients} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Patient
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                    <p className="text-2xl font-bold">{patientStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Patients</p>
                    <p className="text-2xl font-bold">{patientStats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Inactive Patients</p>
                    <p className="text-2xl font-bold">{patientStats.inactive}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">New This Week</p>
                    <p className="text-2xl font-bold">{patientStats.recent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search Patients</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patients</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patients List */}
          <Card>
            <CardHeader>
              <CardTitle>Patients ({filteredPatients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading patients...</span>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No patients found matching your criteria</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-5 h-5 text-blue-600" />
                          <Badge variant={patient.user.isActive ? "default" : "secondary"}>
                            {patient.user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient.user.firstName} {patient.user.lastName}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {patient.user.email}
                            </span>
                            {patient.user.phone && (
                              <span className="flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {patient.user.phone}
                              </span>
                            )}
                            {patient.dateOfBirth && (
                              <span className="flex items-center">
                                <Heart className="w-3 h-3 mr-1" />
                                Age: {getAge(patient.dateOfBirth)}
                              </span>
                            )}
                            {patient.city && patient.state && (
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {patient.city}, {patient.state}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(patient)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPatient(patient)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePatient(patient)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Patient Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Patient Details</DialogTitle>
              <DialogDescription>
                Detailed information about this patient
              </DialogDescription>
            </DialogHeader>
            {selectedPatient && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm mt-1">
                      {selectedPatient.user.firstName} {selectedPatient.user.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm mt-1">{selectedPatient.user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm mt-1">{selectedPatient.user.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={selectedPatient.user.isActive ? "default" : "secondary"} className="mt-1">
                      {selectedPatient.user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {selectedPatient.dateOfBirth && (
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedPatient.dateOfBirth).toLocaleDateString()} 
                      (Age: {getAge(selectedPatient.dateOfBirth)})
                    </p>
                  </div>
                )}

                {selectedPatient.gender && (
                  <div>
                    <Label className="text-sm font-medium">Gender</Label>
                    <p className="text-sm mt-1">{selectedPatient.gender}</p>
                  </div>
                )}

                {(selectedPatient.address || selectedPatient.city || selectedPatient.state) && (
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm mt-1">
                      {[selectedPatient.address, selectedPatient.city, selectedPatient.state, selectedPatient.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}

                {(selectedPatient.emergencyContact || selectedPatient.emergencyPhone) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Emergency Contact</Label>
                      <p className="text-sm mt-1">{selectedPatient.emergencyContact || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Emergency Phone</Label>
                      <p className="text-sm mt-1">{selectedPatient.emergencyPhone || "Not provided"}</p>
                    </div>
                  </div>
                )}

                {(selectedPatient.insuranceProvider || selectedPatient.insuranceNumber) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Insurance Provider</Label>
                      <p className="text-sm mt-1">{selectedPatient.insuranceProvider || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Insurance Number</Label>
                      <p className="text-sm mt-1">{selectedPatient.insuranceNumber || "Not provided"}</p>
                    </div>
                  </div>
                )}

                {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Medical History</Label>
                    <div className="mt-1 space-y-1">
                      {selectedPatient.medicalHistory.map((item, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Allergies</Label>
                    <div className="mt-1 space-y-1">
                      {selectedPatient.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="mr-1">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPatient.medications && selectedPatient.medications.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Current Medications</Label>
                    <div className="mt-1 space-y-1">
                      {selectedPatient.medications.map((medication, index) => (
                        <Badge key={index} variant="secondary" className="mr-1">
                          {medication}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Account Created</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedPatient.user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Login</Label>
                    <p className="text-sm mt-1">
                      {selectedPatient.user.lastLoginAt 
                        ? new Date(selectedPatient.user.lastLoginAt).toLocaleString()
                        : "Never"
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Patient Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
              <DialogDescription>
                Update patient information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="insuranceNumber">Insurance Number</Label>
                  <Input
                    id="insuranceNumber"
                    value={formData.insuranceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, insuranceNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active Account</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePatient} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Patient'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Patient</DialogTitle>
              <DialogDescription>
                This action will prevent the patient from accessing the system. They can be reactivated later if needed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to deactivate {selectedPatient?.user.firstName} {selectedPatient?.user.lastName}? 
                This will prevent them from accessing the system.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={confirmDeletePatient}
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deactivating...
                    </>
                  ) : (
                    'Deactivate'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Patient Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Patient</DialogTitle>
              <DialogDescription>
                Add a new patient to the system. A secure password will be automatically generated and sent to the patient via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="createFirstName">First Name *</Label>
                  <Input
                    id="createFirstName"
                    value={createFormData.firstName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="createLastName">Last Name *</Label>
                  <Input
                    id="createLastName"
                    value={createFormData.lastName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="createEmail">Email *</Label>
                  <Input
                    id="createEmail"
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="createPhone">Phone</Label>
                  <Input
                    id="createPhone"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="createDateOfBirth">Date of Birth</Label>
                <Input
                  id="createDateOfBirth"
                  type="date"
                  value={createFormData.dateOfBirth}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="createGender">Gender</Label>
                <Select value={createFormData.gender} onValueChange={(value) => setCreateFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="createAddress">Address</Label>
                <Input
                  id="createAddress"
                  value={createFormData.address}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="createCity">City</Label>
                  <Input
                    id="createCity"
                    value={createFormData.city}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="createState">State</Label>
                  <Input
                    id="createState"
                    value={createFormData.state}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="createZipCode">ZIP Code</Label>
                  <Input
                    id="createZipCode"
                    value={createFormData.zipCode}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="createEmergencyContact">Emergency Contact</Label>
                  <Input
                    id="createEmergencyContact"
                    value={createFormData.emergencyContact}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="createEmergencyPhone">Emergency Phone</Label>
                  <Input
                    id="createEmergencyPhone"
                    value={createFormData.emergencyPhone}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="createInsuranceProvider">Insurance Provider</Label>
                  <Input
                    id="createInsuranceProvider"
                    value={createFormData.insuranceProvider}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="createInsuranceNumber">Insurance Number</Label>
                  <Input
                    id="createInsuranceNumber"
                    value={createFormData.insuranceNumber}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, insuranceNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePatient} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Patient'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
