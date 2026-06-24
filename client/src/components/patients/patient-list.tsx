import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, Edit, Phone, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";

interface PatientListProps {
  onNewPatient: () => void;
  onEditPatient: (patient: any) => void;
  onViewPatient: (patient: any) => void;
  onMessagePatient?: (patient: any) => void;
}

export function PatientList({ onNewPatient, onEditPatient, onViewPatient, onMessagePatient }: PatientListProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: patientsData, isLoading } = useQuery({
    queryKey: ["/api/patients", { limit, offset: page * limit, search: debouncedSearch }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const response = await fetch(`/api/patients?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      return {
        patients: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0,
        hasMore: Array.isArray(data) ? data.length === limit : false
      };
    },
  });

  const patients = patientsData?.patients || [];
  const hasMore = patientsData?.hasMore || false;

  const getPatientInitials = (patient: any) => {
    const firstName = patient?.user?.firstName || "";
    const lastName = patient?.user?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return "N/A";
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 p-4 border rounded-lg border-border">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPatient = user?.role === 'patient';
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{isPatient ? "Patients" : "Clients"}</CardTitle>
          {!isPatient && user?.role !== 'practitioner' && (
            <Button onClick={onNewPatient}>
              <Plus className="w-4 h-4 mr-2" />
              {isPatient ? "New Patient" : "New Client"}
            </Button>
          )}
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={isPatient ? "Search patients..." : "Search clients..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {patients && patients.length > 0 ? (
          <div className="space-y-4">
            {patients.map((patient: any) => (
              <div key={patient.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-medium text-sm">
                    {getPatientInitials(patient)}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-foreground">
                      {patient.user?.firstName} {patient.user?.lastName}
                    </h3>
                    {patient.user?.isActive && (
                      <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        Active
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span>Age: {calculateAge(patient.dateOfBirth)}</span>
                    {patient.gender && <span>• {patient.gender}</span>}
                    {patient.user?.email && (
                      <div className="flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {patient.user.email}
                      </div>
                    )}
                    {patient.user?.phone && (
                      <div className="flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {patient.user.phone}
                      </div>
                    )}
                  </div>
                  
                  {patient.insuranceProvider && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Insurance: {patient.insuranceProvider}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Registered: {format(new Date(patient.createdAt), "MMM dd, yyyy")}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewPatient(patient)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {user?.role === 'practitioner' && onMessagePatient && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onMessagePatient(patient)}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  )}
                  {user?.role !== 'practitioner' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditPatient(patient)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <Button 
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={!patients || patients.length < limit}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {isPatient ? "No patients found" : "No clients found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {debouncedSearch 
                ? "Try adjusting your search terms" 
                : isPatient 
                  ? "Get started by adding your first patient"
                  : user?.role === 'practitioner'
                    ? "No clients are currently assigned to you"
                    : "Get started by adding your first client"
              }
            </p>
            {!isPatient && user?.role !== 'practitioner' && (
              <Button onClick={onNewPatient}>
                <Plus className="w-4 h-4 mr-2" />
                {isPatient ? "Add First Patient" : "Add First Client"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
