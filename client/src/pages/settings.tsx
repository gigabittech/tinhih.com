import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { useTheme } from "@/context/theme-context";
import { usePageTitle } from "@/context/page-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Camera, 
  Key, 
  Smartphone, 
  Mail, 
  Upload, 
  Eye, 
  EyeOff,
  Settings as SettingsIcon,
  Check,
  X,
  Edit,
  Save,
  AlertCircle,
  Info,
  Calendar,
  Clock,
  Grid3X3,
  Link,
  ExternalLink,
  Zap,
  Video,
  Loader2
} from "lucide-react";
import { notificationService } from "@/lib/notification-service";
import { useAuth } from "@/context/auth-context";
import { IntegrationSettings } from "@/components/settings/integration-settings";
import { NotificationTest } from "@/components/notifications/notification-test";
import { getTimeZones } from "@vvo/tzdb";

interface SystemSettings {
  id: string;
  organizationName: string;
  organizationLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  language: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  workingDays: string[];
  allowWeekendBookings: boolean;
  defaultAppointmentDuration: number;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  appointmentReminderHours: number;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  requireTwoFactor: boolean;
  defaultTelehealthPlatform: string;
  telehealthBufferMinutes: number;
  allowRecording: boolean;
}

interface UserPreferences {
  id: string;
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  marketingEmails: boolean;
  calendarView: "month" | "week" | "day";
  showWeekends: boolean;
  workingHours: {
    start: string;
    end: string;
  };
  autoLogoutMinutes: number;
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  reducedMotion: boolean;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const { setPageInfo } = usePageTitle();
  const localQueryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const {
    theme,
    setTheme,
    highContrast,
    setHighContrast,
    reduceMotion,
    setReduceMotion,
    fontSize,
    setFontSize,
    calendarView,
    setCalendarView,
    showWeekends,
    setShowWeekends
  } = useTheme();

  const validTabs = ['profile', 'security', 'notifications', 'appearance', 'integrations'];
  const defaultTab = 'profile';
  
  // Tab state - will be updated by useEffect
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    profileImage: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // Profile image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Google settings modal state
  const [showGoogleSettings, setShowGoogleSettings] = useState(false);
  


  // State to force re-renders when time format changes
  const [timeFormatKey, setTimeFormatKey] = useState(0);

  // Helper function to format time based on user preference
  const formatTime = (hour: number, format: "12h" | "24h") => {
    if (format === "12h") {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      return `${displayHour}:00 ${period}`;
    } else {
      return `${hour.toString().padStart(2, '0')}:00`;
    }
  };




  


  // Integration settings state
  const [googleEmail, setGoogleEmail] = useState("");
  const [integrationSettings, setIntegrationSettings] = useState({
    google: {
      connected: false,
      email: "",
      calendarSync: false,
      driveSync: false,
      syncDirection: "bidirectional",
      syncFrequency: "realtime",
      syncEventTypes: ["appointments", "meetings"]
    },
    zoom: {
      connected: false,
      apiKey: "",
      apiSecret: "",
      autoCreateMeetings: false
    },
    teams: {
      connected: false,
      clientId: "",
      clientSecret: "",
      tenantId: "",
      autoCreateMeetings: false
    }
  });

  // OAuth integrations query
  const { data: oauthIntegrations = [], refetch: refetchIntegrations } = useQuery({
    queryKey: ["/api/oauth/integrations"],
    queryFn: async () => {
      const response = await apiRequest("/api/oauth/integrations");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  // Fetch user preferences
  const { data: fetchedPreferences, refetch: refetchPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/user-preferences"],
    queryFn: async (): Promise<any> => {
      console.log("Fetching user preferences...");
      const response = await apiRequest("/api/user-preferences", "GET");
      console.log("User preferences response:", response);
      const data = await response.json();
      console.log("User preferences data:", data);
      console.log("User preferences data type:", typeof data);
      console.log("User preferences data keys:", Object.keys(data || {}));
      console.log("DEBUG - Raw API response data:", JSON.stringify(data, null, 2));
      return data;
    },
    enabled: !!user,
  });

  // Use fetched preferences directly instead of complex state management
  const userPreferences = fetchedPreferences ? {
    // Email notifications
    emailAppointments: fetchedPreferences.emailAppointments ?? true,
    emailPatientUpdates: fetchedPreferences.emailPatientUpdates ?? true,
    emailClinicalNotes: fetchedPreferences.emailClinicalNotes ?? false,
    emailBilling: fetchedPreferences.emailBilling ?? true,
    emailMessages: fetchedPreferences.emailMessages ?? true,
    emailTelehealth: fetchedPreferences.emailTelehealth ?? true,
    emailSystem: fetchedPreferences.emailSystem ?? true,
    emailSecurity: fetchedPreferences.emailSecurity ?? true,

    // Browser/Push notifications
    browserAppointments: fetchedPreferences.browserAppointments ?? true,
    browserPatientUpdates: fetchedPreferences.browserPatientUpdates ?? false,
    browserClinicalNotes: fetchedPreferences.browserClinicalNotes ?? false,
    browserBilling: fetchedPreferences.browserBilling ?? true,
    browserMessages: fetchedPreferences.browserMessages ?? true,
    browserTelehealth: fetchedPreferences.browserTelehealth ?? true,
    browserSystem: fetchedPreferences.browserSystem ?? false,
    browserSecurity: fetchedPreferences.browserSecurity ?? true,

    // SMS notifications
    smsAppointments: fetchedPreferences.smsAppointments ?? false,
    smsUrgentOnly: fetchedPreferences.smsUrgentOnly ?? true,

    // General preferences
    quietHoursEnabled: fetchedPreferences.quietHoursEnabled ?? false,
    quietHoursStart: fetchedPreferences.quietHoursStart ?? "22:00",
    quietHoursEnd: fetchedPreferences.quietHoursEnd ?? "08:00",

    // Calendar display preferences
    calendarStartHour: fetchedPreferences.calendarStartHour ?? 8,
    calendarEndHour: fetchedPreferences.calendarEndHour ?? 18,
    timeSlotDuration: fetchedPreferences.timeSlotDuration ?? 30,
    timeFormat: fetchedPreferences.timeFormat ?? "12h",
    timezone: fetchedPreferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendarView: fetchedPreferences.calendarView ?? "week",
    showWeekends: fetchedPreferences.showWeekends ?? true
  } : {
    // Default values when data is loading
    emailAppointments: true,
    emailPatientUpdates: true,
    emailClinicalNotes: false,
    emailBilling: true,
    emailMessages: true,
    emailTelehealth: true,
    emailSystem: true,
    emailSecurity: true,
    browserAppointments: true,
    browserPatientUpdates: false,
    browserClinicalNotes: false,
    browserBilling: true,
    browserMessages: true,
    browserTelehealth: true,
    browserSystem: false,
    browserSecurity: true,
    smsAppointments: false,
    smsUrgentOnly: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    calendarStartHour: 8,
    calendarEndHour: 18,
    timeSlotDuration: 30,
    timeFormat: "12h",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendarView: "week",
    showWeekends: true
  };



  // Update user preferences mutation
  const updatePreferences = useMutation({
    mutationFn: (preferences: any) => {
      console.log("Updating user preferences:", preferences);
      return apiRequest("/api/user-preferences", "PUT", preferences);
    },
    onSuccess: (response, variables) => {
      console.log("User preferences updated successfully:", response);
      
      // Update the query cache with the new data
      localQueryClient.setQueryData(["/api/user-preferences"], (oldData: any) => {
        return {
          ...oldData,
          ...variables
        };
      });
      
      toast({
        title: "Preferences updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to update user preferences:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  // Update integration settings mutation
  const updateIntegrationSettings = useMutation({
    mutationFn: ({ provider, settings }: { provider: string; settings: any }) => 
      apiRequest(`/api/oauth/integrations/${provider}/settings`, "PUT", settings),
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your integration settings have been saved successfully.",
      });
      refetchIntegrations();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update integration settings",
        variant: "destructive",
      });
    },
  });

  // Disconnect OAuth integration mutation
  const disconnectIntegration = useMutation({
    mutationFn: (provider: string) => apiRequest(`/api/oauth/integrations/${provider}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Integration disconnected",
        description: "The integration has been disconnected successfully.",
      });
      refetchIntegrations();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect integration",
        variant: "destructive",
      });
    },
  });

  // Set initial page title based on current tab
  useEffect(() => {
    const tabTitles = {
      profile: { title: "Profile Settings", subtitle: "Manage your personal information and account details" },
      security: { title: "Security Settings", subtitle: "Manage your password and two-factor authentication" },
      notifications: { title: "Notification Settings", subtitle: "Choose how you want to be notified" },
      appearance: { title: "Appearance Settings", subtitle: "Customize your interface and accessibility options" },
      integrations: { title: "Integration Settings", subtitle: "Connect your external services and platforms" }
    };
    
    const tabInfo = tabTitles[activeTab as keyof typeof tabTitles] || tabTitles.profile;
    setPageInfo(tabInfo.title, tabInfo.subtitle);
  }, [setPageInfo, activeTab]);

  // Listen for URL changes and sync tab state
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      
      if (validTabs.includes(urlTab || '')) {
        setActiveTab(urlTab!);
      } else {
        setActiveTab(defaultTab);
      }
    };

    // Initial check
    handleUrlChange();

    // Listen for browser navigation (back/forward)
    window.addEventListener('popstate', handleUrlChange);
    
    // Listen for wouter location changes
    const handleLocationChange = () => {
      setTimeout(handleUrlChange, 0); // Defer to next tick
    };
    
    // Check for URL changes periodically (fallback)
    const interval = setInterval(handleUrlChange, 500);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(interval);
    };
  }, [validTabs, defaultTab]);

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Update URL with tab parameter using wouter's setLocation
    const currentPath = window.location.pathname;
    const newUrl = `${currentPath}?tab=${newTab}`;
    setLocation(newUrl);
    
    // Update page title based on active tab
    const tabTitles = {
      profile: { title: "Profile Settings", subtitle: "Manage your personal information and account details" },
      security: { title: "Security Settings", subtitle: "Manage your password and two-factor authentication" },
      notifications: { title: "Notification Settings", subtitle: "Choose how you want to be notified" },
      appearance: { title: "Appearance Settings", subtitle: "Customize your interface and accessibility options" },
      integrations: { title: "Integration Settings", subtitle: "Connect your external services and platforms" }
    };
    
    const tabInfo = tabTitles[newTab as keyof typeof tabTitles] || tabTitles.profile;
    setPageInfo(tabInfo.title, tabInfo.subtitle);
  };

  // Initialize profile data from user
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: (user as any).phone || "",
        profileImage: (user as any).profileImage || "",
      });
      setTwoFactorEnabled((user as any).twoFactorEnabled || false);
    }
  }, [user]);

  // Update integration settings based on OAuth data
  console.log('OAuth integrations:', oauthIntegrations);
  useEffect(() => {
    const googleIntegration = oauthIntegrations.find((integration: any) => integration.provider === 'google');
    const zoomIntegration = oauthIntegrations.find((integration: any) => integration.provider === 'zoom');
    const teamsIntegration = oauthIntegrations.find((integration: any) => integration.provider === 'teams');
    
    setIntegrationSettings(prev => ({
      ...prev,
      google: {
        ...prev.google,
        connected: !!googleIntegration,
        email: googleIntegration?.providerEmail || "",
        calendarSync: googleIntegration?.calendarSync || false,
        driveSync: googleIntegration?.driveSync || false,
        syncDirection: googleIntegration?.syncDirection || "bidirectional",
        syncFrequency: googleIntegration?.syncFrequency || "realtime",
        syncEventTypes: googleIntegration?.syncEventTypes ? googleIntegration.syncEventTypes.split(',') : ["appointments", "meetings"],
      },
      zoom: {
        ...prev.zoom,
        connected: !!zoomIntegration,
        autoCreateMeetings: zoomIntegration?.autoCreateMeetings || false,
      },
      teams: {
        ...prev.teams,
        connected: !!teamsIntegration,
        autoCreateMeetings: teamsIntegration?.teamsAutoCreateMeetings || false,
      }
    }));
  }, [oauthIntegrations]);



  // Check for success/error messages in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'google_connected') {
      toast({
        title: "Google Connected!",
        description: "Your Google account has been successfully connected.",
      });
      refetchIntegrations();
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('integration-connected'));
      // Clean up URL
      const newUrl = window.location.pathname + '?tab=integrations';
      window.history.replaceState({}, '', newUrl);
    }

    if (error === 'oauth_failed') {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Google account. Please try again.",
        variant: "destructive",
      });
      // Clean up URL
      const newUrl = window.location.pathname + '?tab=integrations';
      window.history.replaceState({}, '', newUrl);
    }

    if (error === 'oauth_not_configured') {
      toast({
        title: "OAuth Not Configured",
        description: "Google OAuth is not configured on the server. Please contact your administrator.",
        variant: "destructive",
      });
      // Clean up URL
      const newUrl = window.location.pathname + '?tab=integrations';
      window.history.replaceState({}, '', newUrl);
    }

    if (error === 'no_authorization_code') {
      toast({
        title: "Authorization Failed",
        description: "No authorization code received from Google. Please try again.",
        variant: "destructive",
      });
      // Clean up URL
      const newUrl = window.location.pathname + '?tab=integrations';
      window.history.replaceState({}, '', newUrl);
    }
  }, [toast, refetchIntegrations]);

  // Mutations
  const updateProfile = useMutation({
    mutationFn: (data: any) => apiRequest("/api/auth/profile", "PUT", data),
    onSuccess: async () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditingProfile(false);
      localQueryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Refresh user data to update context
      try {
        const userResponse = await api.get("/api/auth/me");
        if (userResponse.user) {
          setUser(userResponse.user);
        }
      } catch (error) {
        console.log("Failed to refresh user data after profile update:", error);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: (data: any) => apiRequest("/api/auth/change-password", "PUT", data),
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const toggleTwoFactor = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("/api/auth/two-factor", "PUT", { enabled }),
    onSuccess: (data: any) => {
      toast({
        title: data.enabled ? "2FA enabled" : "2FA disabled",
        description: data.message,
      });
      setTwoFactorEnabled(data.enabled);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update 2FA settings",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.firstName || !profileData.lastName || !profileData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateProfile.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    changePassword.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 8MB)
      if (file.size > 8 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 8MB.",
          variant: "destructive",
        });
        return;
      }

      setUploadingImage(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          
          const response = await api.post("/api/auth/upload-profile-image", {
            imageData,
            fileName: file.name
          });

          if (response.success) {
            setProfileData(prev => ({
              ...prev,
              profileImage: imageData
            }));
            
            // Update user context immediately
            if (user) {
              const updatedUser = { ...user, profileImage: imageData };
              setUser(updatedUser);
              
              // Also refresh user data from server to ensure consistency
              try {
                const userResponse = await api.get("/api/auth/me");
                if (userResponse.user) {
                  setUser(userResponse.user);
                }
              } catch (error) {
                console.log("Failed to refresh user data:", error);
                // Continue with local update if server refresh fails
              }
            }

            toast({
              title: "Success",
              description: "Profile image uploaded successfully.",
            });
          }
        } catch (error: any) {
          let errorMessage = "Failed to upload image.";
          
          if (error.response?.status === 413) {
            errorMessage = "Image file is too large. Please select a smaller image (max 8MB).";
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          toast({
            title: "Upload failed",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setUploadingImage(false);
        }
      };

      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file.",
          variant: "destructive",
        });
        setUploadingImage(false);
      };

      reader.readAsDataURL(file);
    }
  };

  // Handle Google OAuth connection
  const handleGoogleConnect = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to connect integrations.",
        variant: "destructive",
      });
      return;
    }

    // Show loading state
    toast({
      title: "Connecting to Google...",
      description: "Redirecting to Google OAuth...",
    });

    // Frontend and backend are on same domain, redirect directly to backend route
    try {
      console.log('Redirecting to Google OAuth for user ID:', user.id);
      const googleAuthUrl = `/auth/google?state=${user.id}`;
      console.log('Google OAuth URL:', googleAuthUrl);
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error("Error redirecting to Google OAuth:", error);
      toast({
        title: "Error",
        description: "Failed to redirect to Google OAuth. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle OAuth integration disconnect
  const handleDisconnectIntegration = (provider: string) => {
    disconnectIntegration.mutate(provider);
  };

  const handlePreferenceChange = (key: string, value: boolean) => {
    const updatedPreferences = { ...userPreferences, [key]: value };
    updatePreferences.mutate(updatedPreferences);
  };

  const handleIntegrationSettingChange = (provider: string, setting: string, value: boolean) => {
    // Update local state immediately for better UX
    setIntegrationSettings(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider as keyof typeof prev],
        [setting]: value
      }
    }));

    // Send update to server
    const settings: any = {};
    if (provider === 'google') {
      if (setting === 'calendarSync') settings.calendarSync = value;
      if (setting === 'driveSync') settings.driveSync = value;
      if (setting === 'syncDirection') settings.syncDirection = value;
      if (setting === 'syncFrequency') settings.syncFrequency = value;
      if (setting === 'syncEventTypes') settings.syncEventTypes = Array.isArray(value) ? value.join(',') : value;
    } else if (provider === 'zoom') {
      if (setting === 'autoCreateMeetings') settings.autoCreateMeetings = value;
    } else if (provider === 'teams') {
      if (setting === 'autoCreateMeetings') settings.teamsAutoCreateMeetings = value;
    }

    updateIntegrationSettings.mutate({ provider, settings });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account settings and preferences</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            
            {/* Enhanced Tab Navigation */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-2 border border-blue-100 dark:border-blue-800/30">
              <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-1.5 rounded-lg shadow-sm">
                <TabsTrigger 
                  value="profile" 
                  className="flex items-center space-x-2 data-[state=active]:bg-[#ffdd00] data-[state=active]:text-black data-[state=active]:shadow-md data-[state=active]:font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:bg-[#ffdd00]/80"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="flex items-center space-x-2 data-[state=active]:bg-[#ffdd00] data-[state=active]:text-black data-[state=active]:shadow-md data-[state=active]:font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:bg-[#ffdd00]/80"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="flex items-center space-x-2 data-[state=active]:bg-[#ffdd00] data-[state=active]:text-black data-[state=active]:shadow-md data-[state=active]:font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:bg-[#ffdd00]/80"
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="appearance" 
                  className="flex items-center space-x-2 data-[state=active]:bg-[#ffdd00] data-[state=active]:text-black data-[state=active]:shadow-md data-[state=active]:font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:bg-[#ffdd00]/80"
                >
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Appearance</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="integrations" 
                  className="flex items-center space-x-2 data-[state=active]:bg-[#ffdd00] data-[state=active]:text-black data-[state=active]:shadow-md data-[state=active]:font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:bg-[#ffdd00]/80"
                >
                  <Link className="w-4 h-4" />
                  <span className="hidden sm:inline">Integrations</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                
                {/* Profile Picture Section */}
                <Card className="lg:col-span-1">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-lg">Profile Picture</CardTitle>
                    <CardDescription>Update your profile photo</CardDescription>
              </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="relative inline-block">
                      <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                        <AvatarImage src={profileData.profileImage} />
                        <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getInitials(profileData.firstName, profileData.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                        <Camera className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="profile-image-upload"
                      />
                      <label htmlFor="profile-image-upload">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="cursor-pointer"
                          disabled={uploadingImage}
                          asChild
                        >
                          <span>
                            {uploadingImage ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {profileData.profileImage ? "Change Image" : "Upload Image"}
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max 5MB.
                      </p>
                  </div>
                  </CardContent>
                </Card>

                {/* Profile Information */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                      <CardTitle className="text-lg">Personal Information</CardTitle>
                      <CardDescription>Update your personal details</CardDescription>
                    </div>
                    <Button
                      variant={isEditingProfile ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="ml-auto"
                    >
                      {isEditingProfile ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-medium">
                            First Name {isEditingProfile && <span className="text-destructive"><span className="text-red-600">*</span></span>}
                          </Label>
                          {isEditingProfile ? (
                            <Input
                              id="firstName"
                              value={profileData.firstName}
                              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                              placeholder="Enter your first name"
                            />
                          ) : (
                            <div className="px-3 py-2 text-sm bg-muted/30 rounded-md border border-border/50">
                              {profileData.firstName || "Not provided"}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-medium">
                            Last Name {isEditingProfile && <span className="text-destructive"><span className="text-red-600">*</span></span>}
                          </Label>
                          {isEditingProfile ? (
                            <Input
                              id="lastName"
                              value={profileData.lastName}
                              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                              placeholder="Enter your last name"
                            />
                          ) : (
                            <div className="px-3 py-2 text-sm bg-muted/30 rounded-md border border-border/50">
                              {profileData.lastName || "Not provided"}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email Address {isEditingProfile && <span className="text-destructive"><span className="text-red-600">*</span></span>}
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <div className="pl-10 px-3 py-2 text-sm bg-muted/30 rounded-md border border-border/50">
                            {profileData.email || "Not provided"}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <Info className="w-3 h-3 mr-1 text-[#ffdd00]" />
                          Email cannot be changed. Contact support if needed.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          {isEditingProfile ? (
                            <Input
                              id="phone"
                              type="tel"
                              value={profileData.phone}
                              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                              className="pl-10"
                              placeholder="Enter your phone number"
                            />
                          ) : (
                            <div className="pl-10 px-3 py-2 text-sm bg-muted/30 rounded-md border border-border/50">
                              {profileData.phone || "Not provided"}
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditingProfile && (
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditingProfile(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={updateProfile.isPending}
                            className="min-w-[100px] bg-[#ffdd00] text-black"
                          >
                            {updateProfile.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2 " />
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </form>
              </CardContent>
            </Card>

                {/* Account Status */}
                <Card className="lg:col-span-3">
              <CardHeader>
                    <CardTitle className="text-lg">Account Information</CardTitle>
                    <CardDescription>Your account status and details</CardDescription>
              </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Account Role</Label>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="capitalize">
                            {user?.role || "User"}
                          </Badge>
                  </div>
                </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Member Since</Label>
                        <p className="text-sm font-medium">
                          {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Account Status</Label>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-600">Active</span>
                </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                
                {/* Change Password */}
            <Card>
              <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Key className="w-5 h-5 mr-2" />
                      Change Password
                </CardTitle>
                    <CardDescription>Update your account password</CardDescription>
              </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            placeholder="Enter current password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          >
                            {showPasswords.current ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                  </div>

                  <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder="Enter new password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          >
                            {showPasswords.new ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                  </div>
                </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="Confirm new password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          >
                            {showPasswords.confirm ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                </div>
                      </div>

                      <div className="pt-4">
                        <Button 
                          type="submit" 
                          disabled={changePassword.isPending}
                          className="w-full"
                        >
                          {changePassword.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              Changing Password...
                            </>
                          ) : (
                            "Change Password"
                          )}
                        </Button>
                      </div>
                    </form>
              </CardContent>
            </Card>

                {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Two-Factor Authentication
                      <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Coming soon
                      </Badge>
                </CardTitle>
                    <CardDescription>Add an extra layer of security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">Enable 2FA</p>
                        <p className="text-sm text-muted-foreground">
                          Protect your account with two-factor authentication (coming soon)
                    </p>
                  </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Coming soon
                        </span>
                  <Switch
                          checked={twoFactorEnabled}
                          onCheckedChange={(checked) => toggleTwoFactor.mutate(checked)}
                          disabled={true}
                  />
                      </div>
                </div>

                    <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                        <Clock className="w-4 h-4" />
                        <p className="text-sm font-medium">Two-factor authentication coming soon</p>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        We're working on implementing 2FA for enhanced account security
                      </p>
                    </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 relative">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                  {updatePreferences.isPending && (
                    <div className="flex items-center space-x-2 text-sm text-yellow-600 absolute w-full z-50 bg-white/90 backdrop-blur-sm">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving preferences...</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Email Notifications Section */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Mail className="w-5 h-5 mr-2" />
                        Email Notifications
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                            <p className="font-medium">Appointments</p>
                            <p className="text-sm text-muted-foreground">Appointment updates and reminders</p>
                  </div>
                          <Switch 
                            checked={userPreferences.emailAppointments}
                            onCheckedChange={(checked) => handlePreferenceChange('emailAppointments', checked)}
                            disabled={updatePreferences.isPending}
                          />
                    </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Patient Updates</p>
                            <p className="text-sm text-muted-foreground">Patient registration and updates</p>
                          </div>
                        <Switch 
                            checked={userPreferences.emailPatientUpdates}
                            onCheckedChange={(checked) => handlePreferenceChange('emailPatientUpdates', checked)}
                          disabled={updatePreferences.isPending}
                        />
                    </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Recovery Notes</p>
                            <p className="text-sm text-muted-foreground">New Recovery Notes and updates</p>
                          </div>
                          <Switch 
                            checked={userPreferences.emailClinicalNotes}
                            onCheckedChange={(checked) => handlePreferenceChange('emailClinicalNotes', checked)}
                            disabled={updatePreferences.isPending}
                          />
                  </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                            <p className="font-medium">Billing</p>
                            <p className="text-sm text-muted-foreground">Invoice and payment notifications</p>
                    </div>
                          <Switch 
                            checked={userPreferences.emailBilling}
                            onCheckedChange={(checked) => handlePreferenceChange('emailBilling', checked)}
                            disabled={updatePreferences.isPending}
                          />
                      </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Messages</p>
                            <p className="text-sm text-muted-foreground">New messages and communications</p>
                          </div>
                        <Switch 
                            checked={userPreferences.emailMessages}
                            onCheckedChange={(checked) => handlePreferenceChange('emailMessages', checked)}
                          disabled={updatePreferences.isPending}
                        />
                    </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Telehealth</p>
                            <p className="text-sm text-muted-foreground">Telehealth session notifications</p>
                          </div>
                          <Switch 
                            checked={userPreferences.emailTelehealth}
                            onCheckedChange={(checked) => handlePreferenceChange('emailTelehealth', checked)}
                            disabled={updatePreferences.isPending}
                          />
                  </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                            <p className="font-medium">System Updates</p>
                            <p className="text-sm text-muted-foreground">System maintenance and updates</p>
                        </div>
                          <Switch 
                            checked={userPreferences.emailSystem}
                            onCheckedChange={(checked) => handlePreferenceChange('emailSystem', checked)}
                            disabled={updatePreferences.isPending}
                          />
                    </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Security Alerts</p>
                            <p className="text-sm text-muted-foreground">Security and account alerts</p>
                          </div>
                        <Switch 
                            checked={userPreferences.emailSecurity}
                            onCheckedChange={(checked) => handlePreferenceChange('emailSecurity', checked)}
                          disabled={updatePreferences.isPending}
                        />
                        </div>
                      </div>
                    </div>

                    {/* Browser Notifications Section */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Browser Notifications
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                            <p className="font-medium">Appointments</p>
                            <p className="text-sm text-muted-foreground">Appointment updates and reminders</p>
                        </div>
                          <Switch 
                            checked={userPreferences.browserAppointments}
                            onCheckedChange={(checked) => handlePreferenceChange('browserAppointments', checked)}
                            disabled={updatePreferences.isPending}
                          />
                      </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Patient Updates</p>
                            <p className="text-sm text-muted-foreground">Patient registration and updates</p>
                          </div>
                        <Switch 
                            checked={userPreferences.browserPatientUpdates}
                            onCheckedChange={(checked) => handlePreferenceChange('browserPatientUpdates', checked)}
                          disabled={updatePreferences.isPending}
                        />
                      </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Recovery Notes</p>
                            <p className="text-sm text-muted-foreground">New Recovery Notes and updates</p>
                          </div>
                          <Switch 
                            checked={userPreferences.browserClinicalNotes}
                            onCheckedChange={(checked) => handlePreferenceChange('browserClinicalNotes', checked)}
                            disabled={updatePreferences.isPending}
                          />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                            <p className="font-medium">Billing</p>
                            <p className="text-sm text-muted-foreground">Invoice and payment notifications</p>
                        </div>
                          <Switch 
                            checked={userPreferences.browserBilling}
                            onCheckedChange={(checked) => handlePreferenceChange('browserBilling', checked)}
                            disabled={updatePreferences.isPending}
                          />
                      </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Messages</p>
                            <p className="text-sm text-muted-foreground">New messages and communications</p>
                          </div>
                        <Switch 
                            checked={userPreferences.browserMessages}
                            onCheckedChange={(checked) => handlePreferenceChange('browserMessages', checked)}
                          disabled={updatePreferences.isPending}
                        />
                      </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Telehealth</p>
                            <p className="text-sm text-muted-foreground">Telehealth session notifications</p>
                          </div>
                          <Switch 
                            checked={userPreferences.browserTelehealth}
                            onCheckedChange={(checked) => handlePreferenceChange('browserTelehealth', checked)}
                            disabled={updatePreferences.isPending}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">System Updates</p>
                            <p className="text-sm text-muted-foreground">System maintenance and updates</p>
                          </div>
                          <Switch 
                            checked={userPreferences.browserSystem}
                            onCheckedChange={(checked) => handlePreferenceChange('browserSystem', checked)}
                            disabled={updatePreferences.isPending}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">Security Alerts</p>
                            <p className="text-sm text-muted-foreground">Security and account alerts</p>
                          </div>
                          <Switch 
                            checked={userPreferences.browserSecurity}
                            onCheckedChange={(checked) => handlePreferenceChange('browserSecurity', checked)}
                            disabled={updatePreferences.isPending}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SMS Notifications Section (Coming Soon) */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Smartphone className="w-5 h-5 mr-2 text-muted-foreground" />
                        SMS Notifications
                        <Badge variant="secondary" className="ml-2  p-2 rounded-lg bg-yellow-50 border border-[#ffdd00] text-black">Coming Soon</Badge>
                      </h3>
                      
                      <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border/50">
                        <p className="text-sm text-muted-foreground">
                          SMS notifications will be available in a future update. This feature will allow you to receive 
                          important notifications via text message.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Test Tab */}
            <TabsContent value="notification-test" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notification Testing
                  </CardTitle>
                  <CardDescription>Test the notification system for telehealth sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <NotificationTest />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Theme and Display Settings */}
                <div className="space-y-6">
                
                {/* Theme Settings */}
              <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Palette className="w-5 h-5 mr-2" />
                      Theme Settings
                  </CardTitle>
                    <CardDescription>Choose your preferred color scheme</CardDescription>
                </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Color Theme</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {/* Light Theme */}
                          <div 
                              className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:scale-105 ${theme === 'light'
                                ? 'border-[#ffdd00] bg-[#ffdd00]/5' 
                                : 'border-border hover:border-border/80'
                            }`}
                            onClick={() => setTheme('light')}
                          >
                    <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300"></div>
                                <span className="text-sm font-medium">Light</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1 h-8">
                                <div className="bg-white border rounded"></div>
                                <div className="bg-gray-100 rounded"></div>
                                <div className="bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            {theme === 'light' && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                    </div>

                          {/* Dark Theme */}
                          <div 
                              className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:scale-105 ${theme === 'dark'
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-border/80'
                            }`}
                            onClick={() => setTheme('dark')}
                          >
                    <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-600"></div>
                                <span className="text-sm font-medium">Dark</span>
                    </div>
                              <div className="grid grid-cols-3 gap-1 h-8">
                                <div className="bg-gray-800 rounded"></div>
                                <div className="bg-gray-700 rounded"></div>
                                <div className="bg-gray-600 rounded"></div>
                              </div>
                            </div>
                            {theme === 'dark' && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-black" />
                              </div>
                            )}
                  </div>

                          {/* Auto Theme */}
                          <div 
                              className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:scale-105 ${theme === 'auto'
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-border/80'
                            }`}
                            onClick={() => setTheme('auto')}
                          >
                  <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-white to-gray-800 border-2 border-gray-400"></div>
                                <span className="text-sm font-medium">Auto</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1 h-8">
                                <div className="bg-gradient-to-r from-white to-gray-800 rounded"></div>
                                <div className="bg-gradient-to-r from-gray-100 to-gray-700 rounded"></div>
                                <div className="bg-gradient-to-r from-gray-200 to-gray-600 rounded"></div>
                              </div>
                            </div>
                            {theme === 'auto' && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-black" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Auto theme follows your system preference
                        </p>
                      </div>
                  </div>
                </CardContent>
              </Card>

                {/* Display Settings */}
              <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Globe className="w-5 h-5 mr-2" />
                      Display Settings
                  </CardTitle>
                    <CardDescription>Customize display and accessibility</CardDescription>
                </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Eye className="w-4 h-4 text-primary" />
                            <p className="font-medium">High Contrast</p>
                    </div>
                          <p className="text-sm text-muted-foreground">
                            Increase contrast for better visibility
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium ${highContrast ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {highContrast ? 'On' : 'Off'}
                          </span>
                          <Switch
                            checked={highContrast}
                            onCheckedChange={setHighContrast}
                      />
                    </div>
                  </div>

                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="w-4 h-4 text-primary" />
                            <p className="font-medium">Reduce Motion</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Minimize animations and transitions
                      </p>
                    </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium ${reduceMotion ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {reduceMotion ? 'On' : 'Off'}
                          </span>
                    <Switch
                            checked={reduceMotion}
                            onCheckedChange={setReduceMotion}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Font Size</Label>
                        <Select 
                          value={fontSize} 
                          onValueChange={(value: 'small' | 'medium' | 'large') => setFontSize(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
                </CardContent>
              </Card>
              
                </div>
                
                {/* Calendar Settings */}
                <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Calendar Settings
                  </CardTitle>
                  <CardDescription>Configure your calendar view and scheduling preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Default Calendar View */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Default Calendar View</Label>
                      <Select 
                        value={calendarView} 
                        onValueChange={(value: 'month' | 'week' | 'day') => setCalendarView(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Month View</SelectItem>
                          <SelectItem value="week">Week View</SelectItem>
                          <SelectItem value="day">Day View</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose your preferred default calendar view
                      </p>
                    </div>

                    {/* Show Weekends */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Grid3X3 className="w-4 h-4 text-primary" />
                          <p className="font-medium">Show Weekends</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Display Saturday and Sunday in calendar views
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-medium ${showWeekends ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {showWeekends ? 'On' : 'Off'}
                        </span>
                        <Switch
                          checked={showWeekends}
                          onCheckedChange={setShowWeekends}
                        />
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Working Hours</Label>
                        
                        {/* Debug: Show current values */}

                        

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Start Time</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Select
                                key={`start-${userPreferences.timeFormat}-${timeFormatKey}`}
                                value={userPreferences.calendarStartHour?.toString() ?? "8"}
                                // Debug: Log the actual value being used
                                
                                onValueChange={(value) => {
                                  const hour = parseInt(value);
                                  updatePreferences.mutate({ ...userPreferences, calendarStartHour: hour });
                                }}
                              >
                                <SelectTrigger className="pl-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const hour = i;
                                    const displayHour = userPreferences.timeFormat === "12h"
                                      ? hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      : hour;
                                    const ampm = userPreferences.timeFormat === "12h"
                                      ? hour >= 12 ? "PM" : "AM"
                                      : "";
                                    const label = userPreferences.timeFormat === "12h"
                                      ? `${displayHour}${ampm}`
                                      : `${hour.toString().padStart(2, '0')}:00`;
                                    return (
                                      <SelectItem key={hour} value={hour.toString()}>
                                        {label}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">End Time</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                                        <Select
                                key={`end-${userPreferences.timeFormat}-${timeFormatKey}`}
                              value={userPreferences.calendarEndHour?.toString() ?? "18"}
                              // Debug: Log the actual value being used
                              onOpenChange={() => console.log('DEBUG - End Time Select value:', userPreferences.calendarEndHour?.toString() ?? "18")}
                              onValueChange={(value) => {
                                const hour = parseInt(value);
                                updatePreferences.mutate({ ...userPreferences, calendarEndHour: hour });
                              }}
                            >
                                <SelectTrigger className="pl-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const hour = i;
                                    const displayHour = userPreferences.timeFormat === "12h"
                                      ? hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      : hour;
                                    const ampm = userPreferences.timeFormat === "12h"
                                      ? hour >= 12 ? "PM" : "AM"
                                      : "";
                                    const label = userPreferences.timeFormat === "12h"
                                      ? `${displayHour}${ampm}`
                                      : `${hour.toString().padStart(2, '0')}:00`;
                                    return (
                                      <SelectItem key={hour} value={hour.toString()}>
                                        {label}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set your standard working hours for appointment scheduling
                      </p>
                    </div>

                                            {/* Time Slot Duration */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Time Slot Duration</Label>
                        

                          <Select 
                          value={(userPreferences.timeSlotDuration ?? 30).toString()}
                          onValueChange={(value) => updatePreferences.mutate({ ...userPreferences, timeSlotDuration: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="45">45 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="90">1.5 hours</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Default duration for new appointments
                          </p>
                        </div>

                        {/* Time Format */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Time Format</Label>
                        

                          <Select 
                          value={userPreferences.timeFormat ?? "12h"}
                          onValueChange={(value) => {
                            updatePreferences.mutate({ ...userPreferences, timeFormat: value as "12h" | "24h" });
                            setTimeFormatKey(prev => prev + 1); // Force re-render of time inputs
                          }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                              <SelectItem value="24h">24-hour</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Display format for time in calendar and appointments
                          </p>
                        </div>

                      {/* Timezone */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Timezone</Label>
                        <Select
                          value={userPreferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
                          onValueChange={(value) => {
                            updatePreferences.mutate({ ...userPreferences, timezone: value });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <div className="p-2">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Select your timezone:</div>
                            </div>
                            {(() => {
                              const timezones = getTimeZones();
                              const grouped: { [key: string]: Array<{ value: string; label: string }> } = {
                                'Popular': [],
                                'North America': [],
                                'Europe': [],
                                'Asia': [],
                                'Oceania': [],
                                'Africa': [],
                                'Other': []
                              };
                              
                              const popularTimezones = [
                                'UTC',
                                'America/New_York',
                                'Europe/London',
                                'Asia/Tokyo',
                                'Asia/Dhaka',
                                'Asia/Kolkata',
                                'Australia/Sydney'
                              ];
                              
                              timezones.forEach(tz => {
                                const timezoneOption = {
                                  value: tz.name,
                                  label: `(GMT${tz.currentTimeOffsetInMinutes >= 0 ? '+' : '-'}${Math.abs(Math.floor(tz.currentTimeOffsetInMinutes / 60)).toString().padStart(2, '0')}:${Math.abs(tz.currentTimeOffsetInMinutes % 60).toString().padStart(2, '0')}) ${tz.name}`
                                };
                                
                                if (popularTimezones.includes(tz.name)) {
                                  grouped['Popular'].push(timezoneOption);
                                } else if (tz.name.startsWith('America/')) {
                                  grouped['North America'].push(timezoneOption);
                                } else if (tz.name.startsWith('Europe/')) {
                                  grouped['Europe'].push(timezoneOption);
                                } else if (tz.name.startsWith('Asia/')) {
                                  grouped['Asia'].push(timezoneOption);
                                } else if (tz.name.startsWith('Australia/') || tz.name.startsWith('Pacific/')) {
                                  grouped['Oceania'].push(timezoneOption);
                                } else if (tz.name.startsWith('Africa/')) {
                                  grouped['Africa'].push(timezoneOption);
                                } else {
                                  grouped['Other'].push(timezoneOption);
                                }
                              });
                              
                              return Object.entries(grouped).map(([groupName, timezones]) => (
                                <div key={groupName}>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                                    {groupName}
                                  </div>
                                  {timezones.map((timezone) => (
                                    <SelectItem key={timezone.value} value={timezone.value} className="text-xs">
                                      {timezone.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Your timezone for displaying appointment times and calendar
                        </p>
                    </div>

                    {/* Industry Standard Settings */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Industry Standards</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">Buffer Time</p>
                            <p className="text-xs text-muted-foreground">
                              Add buffer time between appointments
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Industry Standard
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">Advance Booking</p>
                            <p className="text-xs text-muted-foreground">
                              Allow bookings up to 30 days in advance
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Industry Standard
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">Cancellation Policy</p>
                            <p className="text-xs text-muted-foreground">
                              24-hour cancellation notice required
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Industry Standard
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-8">
            
            {/* Enhanced Header */}
            <div className="text-center space-y-3 pb-6 border-b border-gray-100">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
                <Link className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-muted-foreground">Integrations</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                When you integrate any service, you're enabling professional features for your clients and enhancing your practice's capabilities
              </p>
            </div>

            {/* Integration Services Grid */}
            <div className="grid gap-8 lg:grid-cols-2">
              
              {/* Google Workspace */}
              <Card className="group relative overflow-hidden border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
               <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-9 h-9">
                            <path fill="#fbbd00" d="M120 256c0-25.367 6.989-49.13 19.131-69.477v-86.308H52.823C18.568 144.703 0 198.922 0 256s18.568 111.297 52.823 155.785h86.308v-86.308C126.989 305.13 120 281.367 120 256z" />
                            <path fill="#0f9d58" d="m256 392-60 60 60 60c57.079 0 111.297-18.568 155.785-52.823v-86.216h-86.216C305.044 385.147 281.181 392 256 392z" />
                            <path fill="#31aa52" d="m139.131 325.477-86.308 86.308a260.085 260.085 0 0 0 22.158 25.235C123.333 485.371 187.62 512 256 512V392c-49.624 0-93.117-26.72-116.869-66.523z" />
                            <path fill="#3c79e6" d="M512 256a258.24 258.24 0 0 0-4.192-46.377l-2.251-12.299H256v120h121.452a135.385 135.385 0 0 1-51.884 55.638l86.216 86.216a260.085 260.085 0 0 0 25.235-22.158C485.371 388.667 512 324.38 512 256z" />
                            <path fill="#cf2d48" d="m352.167 159.833 10.606 10.606 84.853-84.852-10.606-10.606C388.668 26.629 324.381 0 256 0l-60 60 60 60c36.326 0 70.479 14.146 96.167 39.833z" />
                            <path fill="#eb4132" d="M256 120V0C187.62 0 123.333 26.629 74.98 74.98a259.849 259.849 0 0 0-22.158 25.235l86.308 86.308C162.883 146.72 206.376 120 256 120z" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Google</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300 text-accent-foreground">Calendar & Meeting</CardDescription>
                        {updateIntegrationSettings.isPending && (
                          <div className="flex items-center space-x-2 text-xs text-blue-600 mt-1">
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={integrationSettings.google.connected ? "default" : "secondary"} className="text-sm font-medium">
                      {integrationSettings.google.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  {integrationSettings.google.connected ? (
                    <>
                      {/* Connected Account Information */}
                     
                      <div className="space-y-4">
                        {/* Connected Account Info */}
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">Connected to Google</p>
                              <p className="text-xs text-gray-600  text-accent-foreground">{integrationSettings.google.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">Calendar Sync</p>
                            <p className="text-xs text-gray-600  text-accent-foreground mt-1">Sync appointments with Google Calendar</p>
                          </div>
                          <Switch
                            checked={integrationSettings.google.calendarSync}
                            onCheckedChange={(checked) => handleIntegrationSettingChange('google', 'calendarSync', checked)}
                            disabled={updateIntegrationSettings.isPending}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 opacity-60">
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-sm text-gray-900">Drive Sync</p>
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                                Coming Soon
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 text-accent-foreground mt-1">Store documents in Google Drive</p>
                          </div>
                          <Switch
                            checked={false}
                            disabled={true}
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-4">
                        <Button 
                          onClick={() => setShowGoogleSettings(true)}
                          variant="outline" 
                          className="flex-1 h-11 font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Manage Settings
                        </Button>
                        <Button 
                          onClick={() => handleDisconnectIntegration('google')}
                          variant="ghost" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-11 font-medium"
                          disabled={disconnectIntegration.isPending}
                        >
                          {disconnectIntegration.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              Disconnecting...
                            </>
                          ) : (
                            "Disconnect"
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Professional Note */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800/30 mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                              Professional Meeting & Calendar Management
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Automatically sync meetings and calendar with Google for professional client experience.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleGoogleConnect}
                        className="w-full h-12 bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Link className="w-5 h-5 mr-3" />
                        Connect Google
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>



              {/* Zoom Meetings */}
              <Card className="group relative overflow-hidden border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-9 h-9">
                            <path fill="#4a8cff" d="M0 131.07v187.51c.17 42.4 34.8 76.52 77.03 76.35h273.31c7.77 0 14.02-6.25 14.02-13.85v-187.5c-.17-42.4-34.79-76.53-77.03-76.36H14.02C6.25 117.22 0 123.47 0 131.07zm381.76 73.15 112.84-82.44c9.8-8.1 17.4-6.08 17.4 8.62v251.35c0 16.73-9.29 14.7-17.4 8.62L381.76 308.1z" />
                            <path fill="#3a76f0" d="m-4496 938.35 5.76 23.28a231.455 231.455 0 0 0-64.32 26.59l-12.32-20.56a255.163 255.163 0 0 1 70.88-29.31zm117.12 23.28a231.705 231.705 0 0 1 64.32 26.59l12.4-20.56a255.174 255.174 0 0 0-70.96-29.31zm-274.88 92.91a254.526 254.526 0 0 0-29.32 70.87l23.28 5.76a231.243 231.243 0 0 1 26.6-64.31zm-10.2 97.55-23.72-3.6a256.84 256.84 0 0 0 0 76.71l23.72-3.6a232.705 232.705 0 0 1 0-69.51zm349.4 233.38a231.543 231.543 0 0 1-64.24 26.6l5.76 23.28a255.126 255.126 0 0 0 70.8-29.32zm109.4-163.87 23.72 3.6a256.84 256.84 0 0 0 0-76.71l-23.72 3.6c3.47 22.98 3.47 46.53 0 69.51zm-4.16 20.92a231.908 231.908 0 0 1-26.6 64.32l20.56 12.4a255.376 255.376 0 0 0 29.32-70.96zm-190.48 173.75a233.502 233.502 0 0 1-69.53 0l-3.59 23.72c25.43 3.84 51.29 3.84 76.72 0zm151.99-91.79a232.576 232.576 0 0 1-49.15 49.11l14.24 19.32a256.562 256.562 0 0 0 54.24-54.08zm-49.15-324.38a233.046 233.046 0 0 1 49.15 49.16l19.33-14.4a256.745 256.745 0 0 0-54.08-54.08zm-324.36 49.16a232.859 232.859 0 0 1 49.16-49.16l-14.4-19.32a256.276 256.276 0 0 0-54.08 54.08zm385.4 17.6a231.357 231.357 0 0 1 26.6 64.23l23.28-5.76a255.242 255.242 0 0 0-29.32-70.79zm-233.41-109.39c23.05-3.47 46.48-3.47 69.53 0l3.6-23.72a256.907 256.907 0 0 0-76.72 0zm-139.67 441.8-49.56 11.56 11.56-49.56-23.36-5.48-11.56 49.56c-4.06 17.3 11.54 32.89 28.84 28.84l49.52-11.36zm-56.36-64.87 23.36 5.43 8-34.35a230.507 230.507 0 0 1-25.8-62.96l-23.28 5.76a254.073 254.073 0 0 0 23.6 60.84zm77.64 59.99 5.44 23.36 25.28-5.88a254.073 254.073 0 0 0 60.84 23.6l5.76-23.28a231.047 231.047 0 0 1-62.8-25.96zm-28.81-308.09c-36.59 66.25-34.31 147.14 5.97 211.22l-20 85.31 85.32-20c74.83 47.13 171.29 41.79 240.46-13.32s95.93-147.93 66.7-231.39c-59.28-169.3-292.25-187.9-378.45-31.82z" />
                            <path fill="#e73d76" d="M-3632.44 1137.31c142.96-49.28 92.44-211.16 106.92-206.34 93.59 45.76 198.84 145.6 198.84 295.36 0 114.82-89.02 216.32-218.4 216.32-114.77 5.2-212.03-83.57-217.23-198.35-5.41-119 105.74-205.79 105.74-184.37.99 12.2 11.35 77.38 24.13 77.38z" />
                            <path fill="#178cc8" d="M-2691.65 1017.87c76.8 4.51 121.77 38.29 126.14 69.82 2.13 20.62-11.57 36.65-35.35 36.65-34.74 0-38.28-46.3-98.1-46.3-26.97 0-49.75 11.22-49.75 35.55 0 50.84 191.65 21.31 191.65 133.26 0 64.53-51.65 106.81-128.75 106.81-67.81 0-135.97-30.74-135.63-83.67.12-15.97 12.02-30.62 27.88-30.62 39.94 0 39.57 59.33 103.16 59.33 44.59 0 59.82-24.34 59.82-41.3 0-61.25-192.78-23.69-192.78-138.89 0-62.35 51.22-105.35 131.71-100.64zm42.06 403.05c123.03 74.37 267.08-68 189.81-192.33 28.85-164.81-115.36-305.83-278.27-275.54-122.71-74.76-267.39 67.13-190.44 191.7-29.38 163.57 114.01 307.61 278.9 276.17z" />
                            <path fill="#10658f" d="M-2148.34 1442.86h105.65v-341.33h-105.65zm274.55-179.17c0-47.98 22.09-76.58 64.38-76.58 38.85 0 57.51 27.44 57.51 76.58v179.18l105.17-.01v-216.11c0-91.43-51.83-135.64-124.2-135.64-72.4 0-102.86 56.4-102.86 56.4v-45.98h-101.35v341.33h101.35v-179.17zm-222.22-206.85c34.5 0 62.47-28.22 62.47-63 0-34.77-27.97-62.97-62.47-62.97-34.52 0-62.48 28.2-62.48 62.97 0 34.78 27.96 63 62.48 63z" />
                            <path d="M-5239.92 1594.94c.02 7.81 2.31 120.68 120.76 127.72 0 32.55.03 56.15.03 87.21-8.97.52-77.97-4.49-120.93-42.8l-.13 169.78c1.63 117.84-85.08 189.54-198.44 164.78-195.46-58.47-130.51-348.37 65.75-317.34 0 93.59.05-.03.05 93.59-81.07-11.93-108.19 55.51-86.65 103.81 19.61 43.96 100.34 53.5 128.49-8.53 3.19-12.14 4.79-25.98 4.79-41.52v-337.13z" fill="#000000" />
                          <g fillRule="nonzero">
                              <path fill="#d0272c" d="M-4469.99 1933.14c-13.44 70.49-29.86 138.07-78.5 173.37-15.02-106.54 22.04-186.55 39.25-271.5-29.34-49.39 3.53-148.79 65.42-124.29 76.15 30.12-65.95 183.63 29.44 202.8 99.6 20.01 140.26-172.81 78.51-235.51-89.24-90.55-259.76-2.07-238.79 127.57 5.1 31.69 37.84 41.3 13.08 85.04-57.11-12.66-74.15-57.7-71.96-117.76 3.53-98.29 88.32-167.11 173.36-176.63 107.56-12.04 208.5 39.48 222.44 140.65 15.69 114.2-48.55 237.87-163.55 228.98-31.18-2.43-44.26-17.87-68.7-32.72z" />
                              <path fill="#5a3e85" d="m-3756.02 1594.51-33.39 89.04v356.14h122.38v66.82h66.81l66.75-66.82h100.14l133.56-133.51v-311.67zm44.49 44.49h367.26v244.88l-77.92 77.92h-122.4l-66.73 66.73v-66.73h-100.21zm122.42 222.65h44.52V1728.1h-44.52zm122.41 0h44.51V1728.1h-44.51z" />
                              <path fill="#3caf41" d="M-2698.74 1733.62c-11.72.21-21.62 10.19-21.41 21.58.21 11.81 9.93 21.04 21.98 20.9 12.08-.15 21.24-9.48 21.13-21.54-.1-11.83-9.77-21.16-21.7-20.94zm150.41 136.23c-9.29-.07-17.18 7.54-17.56 16.93-.4 10.03 7.4 18.28 17.33 18.3 9.61.03 17.2-7.23 17.55-16.8.37-10.05-7.43-18.36-17.32-18.43zm-92.53 18.41c.38-10.01-7.67-18.41-17.7-18.45-9.92-.04-18.24 8.47-17.89 18.33.32 9.43 8.26 17.05 17.77 17.06 9.49.01 17.45-7.4 17.82-16.94zm109.84 164.41c-14.63-1.53-30.01 6.91-45.31 8.48-46.63 4.77-88.4-8.23-122.85-40.08-65.51-60.59-56.15-153.5 19.64-203.15 67.36-44.13 166.15-29.42 213.64 31.81 41.45 53.43 36.58 124.36-14.02 169.25-23.61 20.95-13.71 27.63-7.57 51.97-13.6-6.06-28.68-16.73-43.53-18.28zm-302.83-319.04c-11.95-.36-21.78 8.78-22.13 20.56-.35 11.94 8.78 21.5 20.82 21.81 11.93.3 21.94-8.84 22.38-20.47.44-11.59-9.66-21.57-21.07-21.9zm72.22 213.69c-18.57-2.3-35.48-4.83-52.48-6.27-5.87-.49-12.84.21-17.82 3.02-16.51 9.32-32.34 19.84-51.1 31.56 3.44-15.57 5.67-29.2 9.62-42.32 2.9-9.63 1.55-15-7.33-21.28-115.1-81.26-78.79-230.75 49.97-272.81 100.32-32.78 226.22 24.88 236.57 135.64-96.71 5.05-176.11 70.06-167.43 172.46z" />
                              <path fill="#1e1b1e" d="M-2014.21 1705.12c79.75 0 144.4 65.1 144.4 145.39 0 80.3-64.65 145.39-144.4 145.39s-144.4-65.09-144.4-145.39c0-80.29 64.65-145.39 144.4-145.39zm230.6 8.52c39.88 0 72.2 61.27 72.2 136.87.13 18.22-7.61 136.88-72.19 136.88-39.88 0-72.21-61.3-72.21-136.88s32.33-136.87 72.2-136.87zm111.61 14.25c14.02 0 25.39 54.9 25.39 122.62 0 67.7-11.37 122.62-25.39 122.62-14.03 0-25.39-54.9-25.39-122.62s11.36-122.62 25.39-122.62z" />
                              <path fill="#e01e5a" d="M-1229.55 1594.85c-28.14 0-51.13 22.99-51.13 51.13s22.99 51.13 51.13 51.13h51.14v-51.13c0-28.14-22.65-51.13-51.14-51.13zm-187.02 323.95c0 28.14 22.99 51.13 51.13 51.13s51.13-22.99 51.13-51.13v-51.13h-51.13c-28.48 0-51.13 22.99-51.13 51.13zm136.23 0v136.58c0 28.14 23 51.13 51.14 51.13s51.13-22.99 51.13-51.13V1918.8c0-28.14-22.99-51.13-51.13-51.13-28.49 0-51.14 22.99-51.14 51.13zm187.03 187.71c28.14 0 51.13-22.99 51.13-51.13s-22.99-51.13-51.13-51.13h-51.13v51.13c0 28.14 22.99 51.13 51.13 51.13zm136.24-136.58c28.14 0 51.13-22.99 51.13-51.13s-22.99-51.13-51.13-51.13h-136.24c-28.14 0-51.13 22.99-51.13 51.13s22.99 51.13 51.13 51.13zm51.13-187.71c0-28.14-22.99-51.13-51.13-51.13s-51.14 22.99-51.14 51.13v51.13h51.14c28.14.35 51.13-22.65 51.13-51.13zm-136.24 0v-136.58c0-28.14-22.99-51.13-51.13-51.13s-51.13 22.99-51.13 51.13v136.58c0 28.14 22.99 51.13 51.13 51.13 28.48.35 51.13-22.65 51.13-51.13zm-187.37-51.13h-135.89c-28.14 0-51.13 22.99-51.13 51.13s22.99 51.13 51.13 51.13h136.24c28.14 0 51.13-22.99 51.13-51.13-.34-28.14-22.99-51.13-51.48-51.13z" />
                              <path fill="#23b7ec" d="m-909.22 1020.7-80.97 408.28s-11.33 28.31-42.47 14.72l-187.72-143.67c25.23-22.69 220.97-198.65 229.52-206.63 13.23-12.35 5.03-19.7-10.36-10.36l-289.11 183.59-111.54-37.55s-17.55-6.22-19.25-19.81 19.82-20.95 19.82-20.95l454.71-178.38s37.37-16.42 37.37 10.76z" />
                          </g>
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                          Zoom Meetings
                          <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Coming soon
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300 text-accent-foreground">Video conferencing</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrationSettings.zoom.connected ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">API Key</Label>
                          <Input
                            type="password"
                            value={integrationSettings.zoom.apiKey}
                            onChange={(e) => setIntegrationSettings({
                              ...integrationSettings,
                              zoom: { ...integrationSettings.zoom, apiKey: e.target.value }
                            })}
                            placeholder="Enter Zoom API Key"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">API Secret</Label>
                          <Input
                            type="password"
                            value={integrationSettings.zoom.apiSecret}
                            onChange={(e) => setIntegrationSettings({
                              ...integrationSettings,
                              zoom: { ...integrationSettings.zoom, apiSecret: e.target.value }
                            })}
                            placeholder="Enter Zoom API Secret"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Auto-create meetings</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 text-accent-foreground">Create Zoom links for telehealth</p>
                          </div>
                          <Switch
                            checked={integrationSettings.zoom.autoCreateMeetings}
                            onCheckedChange={(checked) => handleIntegrationSettingChange('zoom', 'autoCreateMeetings', checked)}
                            disabled={updateIntegrationSettings.isPending}
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button variant="outline" className="flex-1">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Manage Settings
                        </Button>
                        <Button variant="ghost" className="text-red-600 hover:text-red-700">
                          Disconnect
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically create Zoom meetings for telehealth sessions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Microsoft Teams */}
              <Card className="group relative overflow-hidden border border-gray-200 hover:border-purple-200 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-9 h-9">
                            <path fill="#464eb8" d="M84.025 35.881c5.797 0 10.513-4.729 10.513-10.54-.577-13.983-20.45-13.979-21.026 0 0 5.811 4.717 10.54 10.513 10.54z" />
                            <path fill="#464eb8" d="M90.958 38.71H51.61v-3.68c.784.139 1.605.232 2.467.268.093.001.186-.006.279-.007a15.5 15.5 0 0 0 1.063-.053c.12-.011.239-.021.357-.035.403-.045.801-.104 1.193-.181.024-.005.05-.008.074-.012a14.377 14.377 0 0 0 5.167-2.17 14.504 14.504 0 0 0 3.693-3.615c.26-.341.497-.697.718-1.061.021-.036.044-.07.065-.107.17-.287.32-.584.466-.884.064-.13.13-.26.19-.392.154-.345.296-.696.421-1.053l.032-.088c1.427-4.208.774-9.156-1.676-12.856a14.476 14.476 0 0 0-2.268-2.574c-.176-.153-.344-.314-.529-.457a14.41 14.41 0 0 0-3.567-2.159 12.49 12.49 0 0 0-1.347-.493c-.264-.081-.538-.141-.808-.207-.239-.058-.475-.121-.717-.166-.2-.038-.405-.062-.607-.092-.352-.05-.704-.096-1.06-.121-.122-.009-.245-.012-.368-.018a14.095 14.095 0 0 0-1.088-.007c-2.08.121-3.926.558-5.543 1.24-.33.149-.664.294-.975.47-3.242 1.766-5.722 4.772-6.867 8.293a15.274 15.274 0 0 0-.187 8.129l.02.076.097.345c.039.137.085.273.128.409.039.11.08.219.121.329H8.774a5.168 5.168 0 0 0-5.162 5.162v37.672a5.168 5.168 0 0 0 5.162 5.162h20.122c.026.118.059.232.087.349 2.77 10.899 12.463 18.607 23.917 18.885 9.503-.231 17.666-5.721 21.753-13.592.061.022.124.038.185.059 10.182 3.851 21.752-4.229 21.546-15.131V44.122c.001-2.984-2.434-5.412-5.426-5.412z" />
                            <path fill="#7b83eb" d="M77.444 44.232c.069-2.971-2.287-5.448-5.251-5.521H50.761a1.43 1.43 0 0 0-1.429 1.433v29.095a2.433 2.433 0 0 1-2.428 2.433H30.199a1.429 1.429 0 0 0-1.399 1.721c2.367 11.561 12.248 19.837 24.1 20.126 13.856-.34 24.866-11.914 24.544-25.767zM54.077 35.298c.093.001.186-.006.279-.007.358-.005.713-.023 1.064-.053.12-.011.239-.021.357-.035.402-.045.801-.104 1.193-.181l.074-.013a14.377 14.377 0 0 0 5.167-2.17 14.508 14.508 0 0 0 3.694-3.615c.26-.341.497-.697.718-1.061.021-.036.044-.07.065-.107.17-.287.32-.585.466-.884.064-.13.13-.259.19-.392.154-.345.297-.696.421-1.053l.032-.088c1.427-4.208.774-9.157-1.676-12.856a14.476 14.476 0 0 0-2.268-2.574c-.176-.153-.344-.314-.529-.457a14.41 14.41 0 0 0-3.567-2.159A12.49 12.49 0 0 0 58.41 7.1c-.264-.081-.538-.14-.808-.207-.239-.058-.475-.121-.717-.166-.2-.038-.404-.062-.607-.092-.352-.05-.704-.096-1.06-.121-.122-.009-.245-.012-.367-.018a15.179 15.179 0 0 0-1.088-.005c-2.08.121-3.926.557-5.543 1.24-.33.149-.664.294-.975.47-3.242 1.767-5.723 4.773-6.867 8.294a15.274 15.274 0 0 0-.187 8.129l.02.076.097.345c.039.137.085.273.128.409.06.171.123.34.187.51h-.027c1.775 4.977 6.268 9.029 13.481 9.334z" />
                            <path fill="#464eb8" d="M46.448 25.783H8.774a5.168 5.168 0 0 0-5.162 5.162v37.672a5.168 5.168 0 0 0 5.162 5.162h37.674a5.167 5.167 0 0 0 5.161-5.162V30.945a5.166 5.166 0 0 0-5.161-5.162z" />
                            <path fill="#ffffff" d="M37.109 36.271h-19.28c-.771 0-1.395.625-1.395 1.396v3.514c0 .771.624 1.396 1.395 1.396h6.22v19.575c0 .771.624 1.396 1.395 1.396h4.134c.771 0 1.395-.625 1.395-1.396V42.577h6.136c.771 0 1.395-.625 1.395-1.396v-3.514c0-.771-.624-1.396-1.395-1.396z" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                          Microsoft Teams
                          <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Coming soon
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300 text-accent-foreground">Collaboration & meetings</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrationSettings.teams.connected ? (
                    <>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <Label className="text-sm font-medium">Client ID</Label>
                          <Input
                            type="text"
                            value={integrationSettings.teams.clientId}
                            onChange={(e) => setIntegrationSettings({
                              ...integrationSettings,
                              teams: { ...integrationSettings.teams, clientId: e.target.value }
                            })}
                            placeholder="Enter Microsoft Client ID"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Client Secret</Label>
                          <Input
                            type="password"
                            value={integrationSettings.teams.clientSecret}
                            onChange={(e) => setIntegrationSettings({
                              ...integrationSettings,
                              teams: { ...integrationSettings.teams, clientSecret: e.target.value }
                            })}
                            placeholder="Enter Microsoft Client Secret"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tenant ID</Label>
                          <Input
                            type="text"
                            value={integrationSettings.teams.tenantId}
                            onChange={(e) => setIntegrationSettings({
                              ...integrationSettings,
                              teams: { ...integrationSettings.teams, tenantId: e.target.value }
                            })}
                            placeholder="Enter Microsoft Tenant ID"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Auto-create meetings</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 text-accent-foreground">Create Teams links for telehealth</p>
                          </div>
                          <Switch
                            checked={integrationSettings.teams.autoCreateMeetings}
                            onCheckedChange={(checked) => setIntegrationSettings({
                              ...integrationSettings,
                              teams: { ...integrationSettings.teams, autoCreateMeetings: checked }
                            })}
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button variant="outline" className="flex-1">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Manage Settings
                        </Button>
                        <Button variant="ghost" className="text-red-600 hover:text-red-700">
                          Disconnect
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically create Teams meetings for telehealth sessions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
      </Tabs>
        </div>
      </div>

      {/* Google Settings Modal */}
      <Dialog open={showGoogleSettings} onOpenChange={setShowGoogleSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
              </div>
              <span>Google Workspace Settings</span>
            </DialogTitle>
            <DialogDescription>
              Manage your Google Workspace integration settings and sync preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Account Information */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-green-900">Connected Account</h3>
                  <p className="text-sm text-green-700">{integrationSettings.google.email || "nayem@gigabit.agency"}</p>
                </div>
              </div>
            </div>

            {/* Calendar Sync Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Calendar Sync</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-accent-foreground">Sync appointments with Google Calendar</p>
                </div>
                <Switch
                  checked={integrationSettings.google.calendarSync}
                  onCheckedChange={(checked) => handleIntegrationSettingChange('google', 'calendarSync', checked)}
                  disabled={updateIntegrationSettings.isPending}
                />
              </div>
              
              {integrationSettings.google.calendarSync && (
                <div className="ml-6 space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Sync Direction</Label>
                    <Select 
                      value={integrationSettings.google.syncDirection} 
                      onValueChange={(value) => handleIntegrationSettingChange('google', 'syncDirection', value)}
                      disabled={updateIntegrationSettings.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose sync direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bidirectional">Bidirectional (both ways)</SelectItem>
                        <SelectItem value="one_way_to_google">Portal → Google Calendar</SelectItem>
                        <SelectItem value="one_way_from_google">Google Calendar → Portal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Sync Frequency</Label>
                    <Select 
                      value={integrationSettings.google.syncFrequency} 
                      onValueChange={(value) => handleIntegrationSettingChange('google', 'syncFrequency', value)}
                      disabled={updateIntegrationSettings.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose sync frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Every hour</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="manual">Manual sync only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Event Types</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="appointments" 
                          checked={integrationSettings.google.syncEventTypes.includes('appointments')}
                          onCheckedChange={(checked) => {
                            const newEventTypes = checked 
                              ? [...integrationSettings.google.syncEventTypes, 'appointments']
                              : integrationSettings.google.syncEventTypes.filter(type => type !== 'appointments');
                            handleIntegrationSettingChange('google', 'syncEventTypes', newEventTypes);
                          }}
                          disabled={updateIntegrationSettings.isPending}
                        />
                        <Label htmlFor="appointments" className="text-sm">Appointments</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="meetings" 
                          checked={integrationSettings.google.syncEventTypes.includes('meetings')}
                          onCheckedChange={(checked) => {
                            const newEventTypes = checked 
                              ? [...integrationSettings.google.syncEventTypes, 'meetings']
                              : integrationSettings.google.syncEventTypes.filter(type => type !== 'meetings');
                            handleIntegrationSettingChange('google', 'syncEventTypes', newEventTypes);
                          }}
                          disabled={updateIntegrationSettings.isPending}
                        />
                        <Label htmlFor="meetings" className="text-sm">Meetings</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="reminders" 
                          checked={integrationSettings.google.syncEventTypes.includes('reminders')}
                          onCheckedChange={(checked) => {
                            const newEventTypes = checked 
                              ? [...integrationSettings.google.syncEventTypes, 'reminders']
                              : integrationSettings.google.syncEventTypes.filter(type => type !== 'reminders');
                            handleIntegrationSettingChange('google', 'syncEventTypes', newEventTypes);
                          }}
                          disabled={updateIntegrationSettings.isPending}
                        />
                        <Label htmlFor="reminders" className="text-sm">Reminders</Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drive Sync Settings */}
            <div className="space-y-4 opacity-60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Drive Sync</h3>
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                      Coming Soon
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-accent-foreground">Store documents in Google Drive</p>
                </div>
                <Switch
                  checked={false}
                  disabled={true}
                />
              </div>
              
              {/* Drive Sync settings are disabled - Coming Soon */}
              <div className="ml-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-gray-600">Drive Sync will be available in a future update</span>
                </div>
                <p className="text-xs text-gray-500">This feature will allow you to automatically sync documents, images, and other files with your Google Drive account.</p>
              </div>
            </div>

            {/* Privacy & Permissions */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Privacy & Permissions</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-800">Calendar access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-800">Drive access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-800">Profile information</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button 
                onClick={() => {
                  toast({
                    title: "Settings saved",
                    description: "Your Google Workspace settings have been updated.",
                  });
                  setShowGoogleSettings(false);
                }}
                className="flex-1"
              >
                Save Settings
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowGoogleSettings(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}