import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Mail,
  Shield,
  Crown
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";
import { AdminLayout } from "@/components/layout/admin-layout";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  permissions: string[];
  department: string | null;
  position: string | null;
  hireDate: string | null;
  firstLogin: boolean;
}

export default function AdminAdmins() {
  const { setPageInfo } = usePageTitle();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    permissions: [] as string[],
  });

  // Helper arrays
  const departments = [
    "Executive",
    "Operations",
    "Finance",
    "Human Resources",
    "IT",
    "Marketing",
    "Legal",
    "Compliance"
  ];

  const positions = [
    "Chief Executive Officer",
    "Chief Operating Officer",
    "Chief Financial Officer",
    "Chief Technology Officer",
    "Director",
    "Manager",
    "Senior Administrator",
    "Administrator",
    "Coordinator"
  ];

  const availablePermissions = [
    "user_management",
    "staff_management",
    "practitioner_management",
    "patient_management",
    "appointment_management",
    "billing_management",
    "clinical_notes_management",
    "telehealth_management",
    "system_settings",
    "reports_access",
    "admin_panel_access",
    "super_admin"
  ];

  // Fetch admins
  const fetchAdmins = async () => {
    try {
      const response = await api.get("/api/admin/admins");
      console.log("Admin API response:", response);
      setAdmins(response || []);
    } catch (error: any) {
      console.error("Failed to fetch admins:", error);
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive",
      });
      setAdmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPageInfo("Administrators", "Manage administrator accounts and permissions");
    fetchAdmins();
  }, [setPageInfo]);

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/api/admin/admins", data);
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: `Admin user created successfully. Temporary password: ${response.tempPassword}`,
      });
      setShowCreateDialog(false);
      resetForm();
      fetchAdmins();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    },
  });

  // Update admin mutation
  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.put(`/api/admin/admins/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin user updated successfully",
      });
      setShowEditDialog(false);
      resetForm();
      fetchAdmins();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin user",
        variant: "destructive",
      });
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/admin/admins/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin user deactivated successfully",
      });
      setShowDeleteDialog(false);
      fetchAdmins();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate admin user",
        variant: "destructive",
      });
    },
  });

  // Send welcome email mutation
  const sendWelcomeEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/api/admin/admins/${id}/send-welcome-email`);
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: `Welcome email sent. New password: ${response.tempPassword}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send welcome email",
        variant: "destructive",
      });
    },
  });

  const handleCreateAdmin = () => {
    createAdminMutation.mutate(formData);
  };

  const handleUpdateAdmin = () => {
    if (selectedAdmin) {
      updateAdminMutation.mutate({ id: selectedAdmin.id, data: formData });
    }
  };

  const handleDeleteAdmin = () => {
    if (selectedAdmin) {
      deleteAdminMutation.mutate(selectedAdmin.id);
    }
  };

  const handleSendWelcomeEmail = async (admin: Admin) => {
    if (!confirm(`Send welcome email to ${admin?.firstName || 'Unknown'} ${admin?.lastName || 'User'}?`)) return;
    sendWelcomeEmailMutation.mutate(admin.id);
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      permissions: [],
    });
    setSelectedAdmin(null);
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      firstName: admin?.firstName || "",
      lastName: admin?.lastName || "",
      email: admin?.email || "",
      phone: admin?.phone || "",
      department: admin?.department || "",
      position: admin?.position || "",
      permissions: admin?.permissions || [],
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowDeleteDialog(true);
  };

  const filteredAdmins = admins.filter(admin =>
    admin?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin?.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin?.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading admin users...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Crown className="w-8 h-8 text-primary" />
              Admin Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage system administrators and their permissions
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Administrator</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@tinhih.org"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department</Label>
                    <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Select value={formData.position} onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map(pos => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availablePermissions.map(permission => (
                      <div key={permission} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={permission}
                          checked={formData.permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          className="rounded"
                        />
                        <label htmlFor={permission} className="text-sm">
                          {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAdmin}
                    disabled={createAdminMutation.isPending}
                  >
                    {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search admins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admins List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System Administrators ({filteredAdmins.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAdmins.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm ? "No Admin Users Found" : "No Admin Users Found"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first administrator."}
                </p>
                <div className="text-xs text-muted-foreground mb-4">
                  Debug: Found {admins.length} total admins, {filteredAdmins.length} after filtering
                </div>
                {!searchTerm && (
                  <div className="space-y-2">
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Admin
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          const testAdmin = {
                            firstName: "Test",
                            lastName: "Admin",
                            email: "testadmin@tinhih.org",
                            phone: "+1 (555) 123-4567",
                            department: "IT",
                            position: "System Administrator",
                            permissions: ["super_admin", "admin_panel_access"]
                          };
                          await createAdminMutation.mutateAsync(testAdmin);
                        } catch (error) {
                          console.error("Failed to create test admin:", error);
                        }
                      }}
                      disabled={createAdminMutation.isPending}
                    >
                      {createAdminMutation.isPending ? "Creating..." : "Create Test Admin"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Crown className="w-5 h-5 text-primary" />
                      </div>
                                             <div>
                         <h3 className="font-medium text-foreground">
                           {admin?.firstName || 'Unknown'} {admin?.lastName || 'User'}
                         </h3>
                         <p className="text-sm text-muted-foreground">{admin?.email || 'No email'}</p>
                         <div className="flex items-center gap-2 mt-1">
                           {admin?.department && (
                             <Badge variant="secondary" className="text-xs">
                               {admin.department}
                             </Badge>
                           )}
                           {admin?.position && (
                             <Badge variant="outline" className="text-xs">
                               {admin.position}
                             </Badge>
                           )}
                           <Badge variant={admin?.isActive ? "default" : "secondary"} className="text-xs">
                             {admin?.isActive ? "Active" : "Inactive"}
                           </Badge>
                         </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendWelcomeEmail(admin)}
                        title="Send Welcome Email"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(admin)}
                        title="Edit Admin"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(admin)}
                        title="Deactivate Admin"
                        className="text-red-600 hover:text-red-700"
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

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Administrator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john.doe@tinhih.org"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Position</Label>
                  <Select value={formData.position} onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availablePermissions.map(permission => (
                    <div key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-${permission}`}
                        checked={formData.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded"
                      />
                      <label htmlFor={`edit-${permission}`} className="text-sm">
                        {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateAdmin}
                  disabled={updateAdminMutation.isPending}
                >
                  {updateAdminMutation.isPending ? "Updating..." : "Update Admin"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Administrator</DialogTitle>
              <DialogDescription>
                This action will prevent the administrator from accessing the system. They can be reactivated later if needed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to deactivate {selectedAdmin?.firstName || 'Unknown'} {selectedAdmin?.lastName || 'User'}? 
                This will prevent them from accessing the system.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteAdmin}
                  disabled={deleteAdminMutation.isPending}
                  variant="destructive"
                >
                  {deleteAdminMutation.isPending ? "Deactivating..." : "Deactivate"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
