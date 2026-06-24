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
import { 
  Users2, 
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
  RefreshCw,
  MessageSquare,
  Star,
  Award
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";

interface Member {
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
  onboardingData: {
    recoveryJourney?: {
      startDate?: string;
      sobrietyDate?: string;
      supportGroups?: string[];
      treatmentHistory?: string[];
    };
    feedback?: {
      serviceRating?: number;
      improvementSuggestions?: string;
      wouldRecommend?: boolean;
    };
    communityParticipation?: {
      eventsAttended?: number;
      volunteerHours?: number;
      mentorshipProvided?: boolean;
    };
  };
}

export default function AdminMembers() {
  const { setPageInfo } = usePageTitle();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
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
    isActive: true
  });

  const [createFormData, setCreateFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    setPageInfo("Community Members", "Manage community member accounts");
    fetchMembers();
  }, [setPageInfo]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/admin/members");
      // Handle both direct array response and { success: true, data: [...] } format
      const membersData = response?.data || response || [];
      setMembers(membersData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch community members",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (member: Member) => {
    setSelectedMember(member);
    setShowDetailsDialog(true);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      phone: member.user.phone || "",
      isActive: member.user.isActive
    });
    setShowEditDialog(true);
  };

  const handleCreateMember = async () => {
    // Validate form
    if (!createFormData.firstName || !createFormData.lastName || !createFormData.email || !createFormData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (createFormData.password !== createFormData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (createFormData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      await api.post("/api/admin/members", {
        firstName: createFormData.firstName,
        lastName: createFormData.lastName,
        email: createFormData.email,
        phone: createFormData.phone,
        password: createFormData.password
      });
      
      toast({
        title: "Success",
        description: "Community member created successfully"
      });
      
      // Reset form and close dialog
      setCreateFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
      });
      setShowCreateDialog(false);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create community member",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    
    try {
      setIsUpdating(true);
      await api.put(`/api/admin/members/${selectedMember.id}`, formData);
      toast({
        title: "Success",
        description: "Community member updated successfully"
      });
      setShowEditDialog(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update community member",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteMember = (member: Member) => {
    setSelectedMember(member);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMember = async () => {
    if (!selectedMember) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/admin/members/${selectedMember.id}`);
      toast({
        title: "Success",
        description: "Community member deactivated successfully"
      });
      setShowDeleteDialog(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to deactivate community member",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.user.phone && member.user.phone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && member.user.isActive) ||
      (statusFilter === "inactive" && !member.user.isActive);

    return matchesSearch && matchesStatus;
  });

  const memberStats = {
    total: members.length,
    active: members.filter(m => m.user.isActive).length,
    inactive: members.filter(m => !m.user.isActive).length,
    recent: members.filter(m => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(m.user.createdAt) >= weekAgo;
    }).length,
    volunteers: members.filter(m => m.onboardingData?.communityParticipation?.volunteerHours && m.onboardingData.communityParticipation.volunteerHours > 0).length,
    mentors: members.filter(m => m.onboardingData?.communityParticipation?.mentorshipProvided).length
  };

  const getSobrietyDuration = (sobrietyDate: string | undefined) => {
    if (!sobrietyDate) return "Not specified";
    const today = new Date();
    const sobriety = new Date(sobrietyDate);
    const diffTime = Math.abs(today.getTime() - sobriety.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}${days > 0 ? `, ${days} day${days > 1 ? 's' : ''}` : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  };

  const getServiceRating = (rating: number | undefined) => {
    if (!rating) return "Not rated";
    return `${rating}/5 ${"⭐".repeat(rating)}`;
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Community Member Management</h1>
              <p className="text-muted-foreground mt-1">Manage TiNHiH community members and their engagement</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-[#ffdd00] text-black hover:bg-[#ffdd00]/90"
              >
                <Users2 className="w-4 h-4 mr-2" />
                Create Member
              </Button>
              <Button variant="outline" onClick={fetchMembers} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                    <p className="text-2xl font-bold">{memberStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">{memberStats.active}</p>
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
                    <p className="text-2xl font-bold">{memberStats.recent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-pink-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Volunteers</p>
                    <p className="text-2xl font-bold">{memberStats.volunteers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mentors</p>
                    <p className="text-2xl font-bold">{memberStats.mentors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">
                      {members.length > 0 
                        ? (members.reduce((sum, m) => sum + (m.onboardingData?.feedback?.serviceRating || 0), 0) / 
                           members.filter(m => m.onboardingData?.feedback?.serviceRating).length).toFixed(1)
                        : "N/A"
                      }
                    </p>
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
                  <Label htmlFor="search">Search Members</Label>
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
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle>Community Members ({filteredMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading community members...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No community members found matching your criteria</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Users2 className="w-5 h-5 text-purple-600" />
                          <Badge variant={member.user.isActive ? "default" : "secondary"}>
                            {member.user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {member.onboardingData?.communityParticipation?.mentorshipProvided && (
                            <Badge variant="outline" className="text-purple-600 border-purple-600">
                              <Award className="w-3 h-3 mr-1" />
                              Mentor
                            </Badge>
                          )}
                          {member.onboardingData?.communityParticipation?.volunteerHours && member.onboardingData.communityParticipation.volunteerHours > 0 && (
                            <Badge variant="outline" className="text-pink-600 border-pink-600">
                              <Heart className="w-3 h-3 mr-1" />
                              Volunteer
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {member.user.email}
                            </span>
                            {member.user.phone && (
                              <span className="flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {member.user.phone}
                              </span>
                            )}
                            {member.onboardingData?.recoveryJourney?.sobrietyDate && (
                              <span className="flex items-center">
                                <Star className="w-3 h-3 mr-1" />
                                {getSobrietyDuration(member.onboardingData.recoveryJourney.sobrietyDate)}
                              </span>
                            )}
                            {member.onboardingData?.feedback?.serviceRating && (
                              <span className="flex items-center">
                                <Star className="w-3 h-3 mr-1" />
                                {getServiceRating(member.onboardingData.feedback.serviceRating)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(member)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMember(member)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(member)}
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

        {/* Create Member Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Community Member</DialogTitle>
              <DialogDescription>
                Add a new community member to the TiNHiH portal
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
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="createLastName">Last Name *</Label>
                  <Input
                    id="createLastName"
                    value={createFormData.lastName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="createEmail">Email *</Label>
                <Input
                  id="createEmail"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <Label htmlFor="createPhone">Phone</Label>
                <Input
                  id="createPhone"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number (optional)"
                />
              </div>

              <div>
                <Label htmlFor="createPassword">Password *</Label>
                <Input
                  id="createPassword"
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password (min 6 characters)"
                />
              </div>

              <div>
                <Label htmlFor="createConfirmPassword">Confirm Password *</Label>
                <Input
                  id="createConfirmPassword"
                  type="password"
                  value={createFormData.confirmPassword}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateMember} 
                  disabled={isCreating}
                  className="bg-[#ffdd00] text-black hover:bg-[#ffdd00]/90"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Member'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Member Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Community Member Details</DialogTitle>
              <DialogDescription>
                Detailed information about this community member
              </DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm mt-1">
                      {selectedMember.user.firstName} {selectedMember.user.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm mt-1">{selectedMember.user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm mt-1">{selectedMember.user.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={selectedMember.user.isActive ? "default" : "secondary"} className="mt-1">
                      {selectedMember.user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {/* Recovery Journey */}
                {selectedMember.onboardingData?.recoveryJourney && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Recovery Journey</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedMember.onboardingData.recoveryJourney.startDate && (
                        <div>
                          <Label className="text-sm font-medium">Recovery Start Date</Label>
                          <p className="text-sm mt-1">
                            {new Date(selectedMember.onboardingData.recoveryJourney.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {selectedMember.onboardingData.recoveryJourney.sobrietyDate && (
                        <div>
                          <Label className="text-sm font-medium">Sobriety Date</Label>
                          <p className="text-sm mt-1">
                            {new Date(selectedMember.onboardingData.recoveryJourney.sobrietyDate).toLocaleDateString()}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              ({getSobrietyDuration(selectedMember.onboardingData.recoveryJourney.sobrietyDate)})
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedMember.onboardingData.recoveryJourney.supportGroups && selectedMember.onboardingData.recoveryJourney.supportGroups.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Support Groups</Label>
                        <div className="mt-1 space-y-1">
                          {selectedMember.onboardingData.recoveryJourney.supportGroups.map((group, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Community Participation */}
                {selectedMember.onboardingData?.communityParticipation && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Community Participation</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedMember.onboardingData.communityParticipation.eventsAttended !== undefined && (
                        <div>
                          <Label className="text-sm font-medium">Events Attended</Label>
                          <p className="text-sm mt-1">{selectedMember.onboardingData.communityParticipation.eventsAttended}</p>
                        </div>
                      )}
                      {selectedMember.onboardingData.communityParticipation.volunteerHours !== undefined && (
                        <div>
                          <Label className="text-sm font-medium">Volunteer Hours</Label>
                          <p className="text-sm mt-1">{selectedMember.onboardingData.communityParticipation.volunteerHours}</p>
                        </div>
                      )}
                    </div>
                    {selectedMember.onboardingData.communityParticipation.mentorshipProvided && (
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Provides mentorship to others</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback */}
                {selectedMember.onboardingData?.feedback && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Service Feedback</h4>
                    {selectedMember.onboardingData.feedback.serviceRating && (
                      <div>
                        <Label className="text-sm font-medium">Service Rating</Label>
                        <p className="text-sm mt-1">{getServiceRating(selectedMember.onboardingData.feedback.serviceRating)}</p>
                      </div>
                    )}
                    {selectedMember.onboardingData.feedback.wouldRecommend !== undefined && (
                      <div>
                        <Label className="text-sm font-medium">Would Recommend</Label>
                        <Badge variant={selectedMember.onboardingData.feedback.wouldRecommend ? "default" : "secondary"} className="mt-1">
                          {selectedMember.onboardingData.feedback.wouldRecommend ? "Yes" : "No"}
                        </Badge>
                      </div>
                    )}
                    {selectedMember.onboardingData.feedback.improvementSuggestions && (
                      <div>
                        <Label className="text-sm font-medium">Improvement Suggestions</Label>
                        <p className="text-sm mt-1">{selectedMember.onboardingData.feedback.improvementSuggestions}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Account Created</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedMember.user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Login</Label>
                    <p className="text-sm mt-1">
                      {selectedMember.user.lastLoginAt 
                        ? new Date(selectedMember.user.lastLoginAt).toLocaleString()
                        : "Never"
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Community Member</DialogTitle>
              <DialogDescription>
                Update basic member information
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
                <Button onClick={handleUpdateMember} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Member'
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
              <DialogTitle>Deactivate Community Member</DialogTitle>
              <DialogDescription>
                This action will prevent the community member from accessing the system. They can be reactivated later if needed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to deactivate {selectedMember?.user.firstName} {selectedMember?.user.lastName}? 
                This will prevent them from accessing the community portal.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={confirmDeleteMember}
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
      </div>
    </AdminLayout>
  );
}
