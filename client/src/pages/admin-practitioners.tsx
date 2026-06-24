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
import { Stethoscope, Plus, Search, Edit, Trash2, UserCheck, UserX, Mail, Calendar, DollarSign } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";

interface Practitioner {
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
  licenseNumber: string | null;
  specialty: string | null;
  qualifications: string[];
  bio: string | null;
  consultationFee: string | null;
  bookingLink: string | null;
}

export default function AdminPractitioners() {
  const { setPageInfo } = usePageTitle();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showWelcomeEmailDialog, setShowWelcomeEmailDialog] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    licenseNumber: "",
    specialty: "",
    qualifications: [] as string[],
    bio: "",
    consultationFee: "",
    isActive: true
  });

  const specialties = [
    "Addiction Counseling",
    "Mental Health Therapy",
    "Substance Abuse Treatment",
    "Family Therapy",
    "Group Therapy",
    "Trauma Therapy",
    "Cognitive Behavioral Therapy",
    "Dialectical Behavior Therapy",
    "Motivational Interviewing",
    "Recovery Coaching",
    "Peer Support",
    "Case Management"
  ];

  const qualificationOptions = [
    "Licensed Professional Counselor (LPC)",
    "Licensed Clinical Social Worker (LCSW)",
    "Licensed Marriage and Family Therapist (LMFT)",
    "Licensed Clinical Psychologist",
    "Certified Addiction Counselor (CAC)",
    "Certified Alcohol and Drug Counselor (CADC)",
    "Master's in Social Work (MSW)",
    "Master's in Counseling",
    "Doctorate in Psychology",
    "Certified Peer Recovery Specialist",
    "Certified Recovery Coach",
    "Certified Case Manager"
  ];

  useEffect(() => {
    setPageInfo("Practitioners", "Manage practitioner accounts and profiles");
    fetchPractitioners();
  }, [setPageInfo]);

  const fetchPractitioners = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/admin/practitioners");
      setPractitioners(response || []);
    } catch (error) {
      console.error("Failed to fetch practitioners:", error);
      toast({
        title: "Error",
        description: "Failed to load practitioners",
        variant: "destructive"
      });
      setPractitioners([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePractitioner = async () => {
    try {
      setIsCreating(true);
      const response = await api.post("/api/admin/practitioners", formData);
      toast({
        title: "Success",
        description: `Practitioner created successfully! Temporary password: ${response.tempPassword}`
      });
      setShowCreateDialog(false);
      resetForm();
      fetchPractitioners();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create practitioner",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdatePractitioner = async () => {
    if (!selectedPractitioner) return;
    
    try {
      setIsUpdating(true);
      await api.put(`/api/admin/practitioners/${selectedPractitioner.id}`, formData);
      toast({
        title: "Success",
        description: "Practitioner updated successfully"
      });
      setShowEditDialog(false);
      setSelectedPractitioner(null);
      resetForm();
      fetchPractitioners();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update practitioner",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePractitioner = async (practitionerId: string) => {
    setSelectedPractitioner(practitioners.find(p => p.id === practitionerId) || null);
    setShowDeleteDialog(true);
  };

  const confirmDeletePractitioner = async () => {
    if (!selectedPractitioner) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/admin/practitioners/${selectedPractitioner.id}`);
      toast({
        title: "Success",
        description: "Practitioner deactivated successfully"
      });
      setShowDeleteDialog(false);
      setSelectedPractitioner(null);
      fetchPractitioners();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to deactivate practitioner",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPractitioner = (practitioner: Practitioner) => {
    setSelectedPractitioner(practitioner);
    setFormData({
      firstName: practitioner.user.firstName,
      lastName: practitioner.user.lastName,
      email: practitioner.user.email,
      phone: practitioner.user.phone || "",
      licenseNumber: practitioner.licenseNumber || "",
      specialty: practitioner.specialty || "",
      qualifications: practitioner.qualifications || [],
      bio: practitioner.bio || "",
      consultationFee: practitioner.consultationFee || "",
      isActive: practitioner.user.isActive
    });
    setShowEditDialog(true);
  };

  const handleSendWelcomeEmail = async (practitioner: Practitioner) => {
    setSelectedPractitioner(practitioner);
    setShowWelcomeEmailDialog(true);
  };

  const confirmSendWelcomeEmail = async () => {
    if (!selectedPractitioner) return;
    
    try {
      setIsSendingEmail(true);
      const response = await api.post(`/api/admin/practitioners/${selectedPractitioner.id}/send-welcome-email`);
      toast({
        title: "Success",
        description: `Welcome email sent to ${selectedPractitioner.user.firstName} ${selectedPractitioner.user.lastName}`
      });
      setShowWelcomeEmailDialog(false);
      setSelectedPractitioner(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send welcome email",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      licenseNumber: "",
      specialty: "",
      qualifications: [],
      bio: "",
      consultationFee: "",
      isActive: true
    });
  };

  const toggleQualification = (qualification: string) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.includes(qualification)
        ? prev.qualifications.filter(q => q !== qualification)
        : [...prev.qualifications, qualification]
    }));
  };

  const filteredPractitioners = (practitioners || []).filter(practitioner => 
    practitioner.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    practitioner.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    practitioner.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (practitioner.specialty && practitioner.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (practitioner.licenseNumber && practitioner.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activePractitionersCount = practitioners.filter(practitioner => practitioner.user.isActive).length;
  const inactivePractitionersCount = practitioners.filter(practitioner => !practitioner.user.isActive).length;

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Practitioner Management</h1>
              <p className="text-muted-foreground mt-1">Manage recovery specialists and their profiles</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Practitioner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Practitioner</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name <span className="text-red-600">*</span></Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name <span className="text-red-600">*</span></Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        placeholder="Enter license number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Select value={formData.specialty} onValueChange={(value) => setFormData(prev => ({ ...prev, specialty: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          {specialties.map(specialty => (
                            <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
                    <Input
                      id="consultationFee"
                      type="number"
                      step="0.01"
                      value={formData.consultationFee}
                      onChange={(e) => setFormData(prev => ({ ...prev, consultationFee: e.target.value }))}
                      placeholder="Enter consultation fee"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Enter practitioner bio"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active Account</Label>
                  </div>

                  <div>
                    <Label>Qualifications</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                      {qualificationOptions.map(qualification => (
                        <div key={qualification} className="flex items-center space-x-2">
                          <Switch
                            id={qualification}
                            checked={formData.qualifications.includes(qualification)}
                            onCheckedChange={() => toggleQualification(qualification)}
                          />
                          <Label htmlFor={qualification} className="text-sm">
                            {qualification}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                              <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePractitioner}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  'Create Practitioner'
                )}
              </Button>
            </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Practitioners</CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{practitioners.length}</div>
                <p className="text-xs text-muted-foreground">All recovery specialists</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Practitioners</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activePractitionersCount}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive Practitioners</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inactivePractitionersCount}</div>
                <p className="text-xs text-muted-foreground">Deactivated accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Specialties</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(practitioners.map(p => p.specialty).filter(Boolean)).size}</div>
                <p className="text-xs text-muted-foreground">Active specialties</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search practitioners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Practitioners Table */}
          <Card>
            <CardHeader>
              <CardTitle>Practitioners</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading practitioners...</p>
                </div>
              ) : filteredPractitioners.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Contact</th>
                        <th className="text-left py-3 px-4 font-medium">Specialty</th>
                        <th className="text-left py-3 px-4 font-medium">License</th>
                        <th className="text-left py-3 px-4 font-medium">Fee</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPractitioners.map((practitioner) => (
                        <tr key={practitioner.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">
                                {practitioner.user.firstName} {practitioner.user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {practitioner.qualifications.length} qualifications
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="text-sm">{practitioner.user.email}</div>
                              {practitioner.user.phone && (
                                <div className="text-sm text-muted-foreground">{practitioner.user.phone}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {practitioner.specialty || "Not specified"}
                          </td>
                          <td className="py-3 px-4">
                            {practitioner.licenseNumber || "Not provided"}
                          </td>
                          <td className="py-3 px-4">
                            {practitioner.consultationFee ? `$${practitioner.consultationFee}` : "Not set"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={practitioner.user.isActive ? "default" : "secondary"}>
                              {practitioner.user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditPractitioner(practitioner)}
                                title="Edit Practitioner"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleSendWelcomeEmail(practitioner)}
                                title="Send Welcome Email"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeletePractitioner(practitioner.id)}
                                title="Deactivate Practitioner"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No practitioners found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Practitioner</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name <span className="text-red-600">*</span></Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name <span className="text-red-600">*</span></Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editEmail">Email <span className="text-red-600">*</span></Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editLicenseNumber">License Number</Label>
                <Input
                  id="editLicenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  placeholder="Enter license number"
                />
              </div>
              <div>
                <Label htmlFor="editSpecialty">Specialty</Label>
                <Select value={formData.specialty} onValueChange={(value) => setFormData(prev => ({ ...prev, specialty: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map(specialty => (
                      <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="editConsultationFee">Consultation Fee ($)</Label>
              <Input
                id="editConsultationFee"
                type="number"
                step="0.01"
                value={formData.consultationFee}
                onChange={(e) => setFormData(prev => ({ ...prev, consultationFee: e.target.value }))}
                placeholder="Enter consultation fee"
              />
            </div>

            <div>
              <Label htmlFor="editBio">Bio</Label>
              <Textarea
                id="editBio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Enter practitioner bio"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="editIsActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="editIsActive">Active Account</Label>
            </div>

            <div>
              <Label>Qualifications</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                {qualificationOptions.map(qualification => (
                  <div key={qualification} className="flex items-center space-x-2">
                    <Switch
                      id={`edit-${qualification}`}
                      checked={formData.qualifications.includes(qualification)}
                      onCheckedChange={() => toggleQualification(qualification)}
                    />
                    <Label htmlFor={`edit-${qualification}`} className="text-sm">
                      {qualification}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePractitioner}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  'Update Practitioner'
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
            <DialogTitle>Deactivate Practitioner</DialogTitle>
            <DialogDescription>
              This action will prevent the practitioner from accessing the system. They can be reactivated later if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to deactivate {selectedPractitioner?.user.firstName} {selectedPractitioner?.user.lastName}? 
              This will prevent them from accessing the system.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDeletePractitioner}
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

      {/* Welcome Email Confirmation Dialog */}
      <Dialog open={showWelcomeEmailDialog} onOpenChange={setShowWelcomeEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Welcome Email</DialogTitle>
            <DialogDescription>
              This will generate a new temporary password and send it to the practitioner's email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Send a welcome email to {selectedPractitioner?.user.firstName} {selectedPractitioner?.user.lastName}? 
              This will generate a new temporary password and send it to their email address.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowWelcomeEmailDialog(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmSendWelcomeEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
