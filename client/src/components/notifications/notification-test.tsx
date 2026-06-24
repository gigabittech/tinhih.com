import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Video, Users } from "lucide-react";

export function NotificationTest() {
  const [patientUserId, setPatientUserId] = useState("");
  const [practitionerUserId, setPractitionerUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testTelehealthNotification = async () => {
    if (!patientUserId && !practitionerUserId) {
      toast({
        title: "Error",
        description: "Please provide at least one user ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('/api/test-telehealth-notification', 'POST', {
        patientUserId: patientUserId || undefined,
        practitionerUserId: practitionerUserId || undefined,
      });

      toast({
        title: "Success",
        description: `Created ${response.notifications.length} notification(s)`,
      });

      console.log("Test notifications created:", response);
    } catch (error: any) {
      console.error("Test notification error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test notification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testGeneralNotification = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/test-notification', 'POST', {
        type: 'system_update',
        data: { message: 'This is a test notification from the notification test component' },
      });

      toast({
        title: "Success",
        description: "Test notification created successfully",
      });

      console.log("Test notification created:", response);
    } catch (error: any) {
      console.error("Test notification error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test notification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Test
        </CardTitle>
        <CardDescription>
          Test the telehealth session notification system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="patientUserId">Patient User ID (optional)</Label>
          <Input
            id="patientUserId"
            value={patientUserId}
            onChange={(e) => setPatientUserId(e.target.value)}
            placeholder="Enter patient user ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="practitionerUserId">Practitioner User ID (optional)</Label>
          <Input
            id="practitionerUserId"
            value={practitionerUserId}
            onChange={(e) => setPractitionerUserId(e.target.value)}
            placeholder="Enter practitioner user ID"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={testTelehealthNotification}
            disabled={isLoading}
            className="flex-1"
          >
            <Video className="h-4 w-4 mr-2" />
            Test Telehealth Notification
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={testGeneralNotification}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            <Bell className="h-4 w-4 mr-2" />
            Test General Notification
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>• Provide user IDs to test specific user notifications</p>
          <p>• Leave empty to test with current user</p>
          <p>• Check the notification center to see results</p>
        </div>
      </CardContent>
    </Card>
  );
}
