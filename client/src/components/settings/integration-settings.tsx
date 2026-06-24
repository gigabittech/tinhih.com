import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Video, 
  Monitor, 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  AlertTriangle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface Integration {
  id: string;
  provider: string;
  providerName: string;
  providerEmail: string;
  isActive: boolean;
  calendarSync: boolean;
  driveSync: boolean;
  autoCreateMeetings: boolean;
  createdAt: string;
}

const INTEGRATION_CONFIGS = {
  zoom: {
    name: "Zoom",
    description: "High-quality video conferencing with screen sharing",
    icon: Video,
    color: "bg-blue-500",
    features: ["HD Video", "Screen Share", "Recording", "Waiting Room"],
    setupUrl: "https://marketplace.zoom.us/develop/create",
  },
  teams: {
    name: "Microsoft Teams",
    description: "Enterprise-grade meetings with collaboration tools",
    icon: Users,
    color: "bg-purple-500",
    features: ["Video & Audio", "Chat", "File Sharing", "Transcription"],
    setupUrl: "https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/app-fundamentals-overview",
  },
  google_meet: {
    name: "Google Meet",
    description: "Simple and secure video meetings",
    icon: Monitor,
    color: "bg-green-500",
    features: ["Easy Join", "Mobile Support", "Live Captions", "Recording"],
    setupUrl: "https://developers.google.com/meet/api/guides/overview",
  },
};

export function IntegrationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  // Fetch user integrations
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["/api/user-integrations", user?.id],
    queryFn: async () => {
      const response = await api.get(`/api/user-integrations?userId=${user?.id}`);
      return response;
    },
    enabled: !!user?.id,
  });

  // Disconnect integration mutation
  const disconnectMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      await api.delete(`/api/user-integrations/${integrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-integrations"] });
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('integration-disconnected'));
      toast({
        title: "Integration disconnected",
        description: "The integration has been successfully disconnected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect integration",
        variant: "destructive",
      });
    },
  });

  // Toggle sync settings mutation
  const toggleSyncMutation = useMutation({
    mutationFn: async ({ integrationId, setting, value }: { integrationId: string; setting: string; value: boolean }) => {
      await api.patch(`/api/user-integrations/${integrationId}`, {
        [setting]: value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-integrations"] });
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('integration-connected'));
      toast({
        title: "Settings updated",
        description: "Integration settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleConnect = async (provider: string) => {
    setConnectingProvider(provider);
    
    try {
      // In a real implementation, this would redirect to OAuth flow
      // For now, we'll simulate the connection
      const config = INTEGRATION_CONFIGS[provider as keyof typeof INTEGRATION_CONFIGS];
      
      toast({
        title: "Connect to " + config.name,
        description: `Redirecting to ${config.name} authorization...`,
      });

      // Simulate OAuth redirect
      setTimeout(() => {
        setConnectingProvider(null);
        toast({
          title: "Connection successful",
          description: `Successfully connected to ${config.name}!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user-integrations"] });
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('integration-connected'));
      }, 2000);

    } catch (error: any) {
      setConnectingProvider(null);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to the platform",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = (integration: Integration) => {
    if (confirm(`Are you sure you want to disconnect from ${integration.providerName}?`)) {
      disconnectMutation.mutate(integration.id);
    }
  };

  const handleToggleSync = (integration: Integration, setting: string) => {
    const currentValue = integration[setting as keyof Integration] as boolean;
    toggleSyncMutation.mutate({
      integrationId: integration.id,
      setting,
      value: !currentValue,
    });
  };

  const getIntegrationStatus = (provider: string) => {
    return integrations.find((integration: Integration) => 
      integration.provider === provider && integration.isActive
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect your telehealth platforms to enable seamless video consultations.
        </p>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Connected Platforms
            </CardTitle>
            <CardDescription>
              Manage your connected telehealth platforms and sync settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.map((integration: Integration) => {
              const config = INTEGRATION_CONFIGS[integration.provider as keyof typeof INTEGRATION_CONFIGS];
              const IconComponent = config?.icon || Settings;
              
              return (
                <div key={integration.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config?.color} text-white`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{integration.providerName}</h3>
                        <p className="text-sm text-muted-foreground">{integration.providerEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-green-600 bg-green-50">
                        Connected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(integration)}
                        disabled={disconnectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Sync Settings */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Sync Settings</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Calendar Sync</p>
                          <p className="text-xs text-muted-foreground">
                            Sync appointments with {config?.name} calendar
                          </p>
                        </div>
                        <Button
                          variant={integration.calendarSync ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleSync(integration, "calendarSync")}
                          disabled={toggleSyncMutation.isPending}
                        >
                          {integration.calendarSync ? "Enabled" : "Disabled"}
                        </Button>
                      </div>

                      {integration.provider === "zoom" && (
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Auto-create Meetings</p>
                            <p className="text-xs text-muted-foreground">
                              Automatically create Zoom meetings for telehealth appointments
                            </p>
                          </div>
                          <Button
                            variant={integration.autoCreateMeetings ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleSync(integration, "autoCreateMeetings")}
                            disabled={toggleSyncMutation.isPending}
                          >
                            {integration.autoCreateMeetings ? "Enabled" : "Disabled"}
                          </Button>
                        </div>
                      )}

                      {integration.provider === "teams" && (
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Auto-create Teams Meetings</p>
                            <p className="text-xs text-muted-foreground">
                              Automatically create Teams meetings for telehealth appointments
                            </p>
                          </div>
                          <Button
                            variant={integration.teamsAutoCreateMeetings ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleSync(integration, "teamsAutoCreateMeetings")}
                            disabled={toggleSyncMutation.isPending}
                          >
                            {integration.teamsAutoCreateMeetings ? "Enabled" : "Disabled"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Available Platforms</CardTitle>
          <CardDescription>
            Connect your telehealth platforms to enable video consultations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(INTEGRATION_CONFIGS).map(([provider, config]) => {
              const IconComponent = config.icon;
              const isConnected = getIntegrationStatus(provider);
              const isConnecting = connectingProvider === provider;

              return (
                <Card key={provider} className="relative">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${config.color} text-white`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{config.name}</h3>
                        {isConnected && (
                          <Badge variant="secondary" className="text-green-600 bg-green-50">
                            Connected
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                      {config.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <h4 className="text-xs font-medium text-muted-foreground">Features:</h4>
                      <ul className="text-xs space-y-1">
                        {config.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      {!isConnected ? (
                        <Button
                          onClick={() => handleConnect(provider)}
                          disabled={isConnecting}
                          className="flex-1"
                        >
                          {isConnecting ? "Connecting..." : "Connect"}
                        </Button>
                      ) : (
                        <Button variant="outline" className="flex-1" disabled>
                          Connected
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(config.setupUrl, '_blank')}
                        title="View Documentation"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">About Integrations</h3>
              <p className="text-sm text-blue-800 mt-1">
                Connected platforms allow you to automatically create video meetings for telehealth appointments. 
                You can also sync your calendar and manage meeting settings directly from the platform.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
