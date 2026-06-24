import { ThemedCard, ThemedCardContent, ThemedCardHeader, ThemedCardTitle } from "@/components/ui/themed-card";
import { ThemedButton } from "@/components/ui/themed-button";
import { UserPlus, CalendarPlus, FileText, Receipt, User, Calendar, FileText as FileTextIcon, CreditCard, MessageSquare, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const getActions = () => {
    const isPatient = user?.role === "patient";
    const isPractitioner = user?.role === "practitioner";
    const isAdmin = user?.role === "admin";
    const isStaff = user?.role === "staff";

    if (isPatient) {
      return [
        {
          title: "My Profile",
          description: "View and edit profile",
          icon: User,
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
          onClick: () => setLocation("/profile"),
        },
        {
          title: "Book Appointment",
          description: "Schedule with practitioner",
          icon: CalendarPlus,
          iconBg: "bg-secondary/10",
          iconColor: "text-secondary",
          onClick: () => setLocation("/appointments?action=new"),
        },
        {
          title: "My Records",
          description: "View medical records",
          icon: FileTextIcon,
          iconBg: "bg-purple-100",
          iconColor: "text-purple-600",
          onClick: () => setLocation("/medical-records"),
        },
        {
          title: "Messages",
          description: "Contact healthcare team",
          icon: MessageSquare,
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          onClick: () => setLocation("/messages"),
        },
      ];
    }

    if (isPractitioner) {
      return [
        {
          title: "New Patient",
          description: "Add patient record",
          icon: UserPlus,
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
          onClick: () => setLocation("/patients?action=new"),
        },
        {
          title: "Schedule",
          description: "Book appointment",
          icon: CalendarPlus,
          iconBg: "bg-secondary/10",
          iconColor: "text-secondary",
          onClick: () => setLocation("/appointments?action=new"),
        },
        {
          title: "Write Notes",
          description: "Clinical documentation",
          icon: FileText,
          iconBg: "bg-purple-100",
          iconColor: "text-purple-600",
          onClick: () => setLocation("/clinical-notes?action=new"),
        },
        {
          title: "Create Invoice",
          description: "Generate billing",
          icon: Receipt,
          iconBg: "bg-yellow-100",
          iconColor: "text-yellow-600",
          onClick: () => setLocation("/billing?action=new"),
        },
      ];
    }

    // Admin and Staff actions
    return [
      {
        title: "New Patient",
        description: "Add patient record",
        icon: UserPlus,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        onClick: () => setLocation("/patients?action=new"),
      },
      {
        title: "Schedule",
        description: "Book appointment",
        icon: CalendarPlus,
        iconBg: "bg-secondary/10",
        iconColor: "text-secondary",
        onClick: () => setLocation("/appointments?action=new"),
      },
      {
        title: "Write Notes",
        description: "Clinical documentation",
        icon: FileText,
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        onClick: () => setLocation("/clinical-notes?action=new"),
      },
      {
        title: "Create Invoice",
        description: "Generate billing",
        icon: Receipt,
        iconBg: "bg-yellow-100",
        iconColor: "text-yellow-600",
        onClick: () => setLocation("/billing?action=new"),
      },
    ];
  };

  const actions = getActions();

  return (
    <ThemedCard className={`rounded-xl ${className}`}>
      <ThemedCardHeader>
        <ThemedCardTitle>Quick Actions</ThemedCardTitle>
      </ThemedCardHeader>
      <ThemedCardContent>
        <div className="space-y-3">
          {actions.map((action, index) => (
            <ThemedButton
              key={index}
              variant="ghost"
              className="w-full justify-start p-3 h-auto"
              onClick={action.onClick}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors duration-300"
                style={{ backgroundColor: `hsl(var(--primary) / 0.1)` }}
              >
                <action.icon 
                  className="w-5 h-5 transition-colors duration-300"
                  style={{ color: `hsl(var(--primary))` }}
                />
              </div>
              <div className="text-left">
                <p 
                  className="font-medium transition-colors duration-300"
                  style={{ color: `hsl(var(--foreground))` }}
                >
                  {action.title}
                </p>
                <p 
                  className="text-sm transition-colors duration-300"
                  style={{ color: `hsl(var(--muted-foreground))` }}
                >
                  {action.description}
                </p>
              </div>
            </ThemedButton>
          ))}
        </div>
      </ThemedCardContent>
    </ThemedCard>
  );
}
