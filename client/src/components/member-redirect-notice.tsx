import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function MemberRedirectNotice() {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Show welcome message only on first login, not on page reloads
    if (user?.role === 'member' && user?.id) {
      const welcomeShown = localStorage.getItem(`welcome-shown-${user.id}`);
      
      if (!welcomeShown) {
        const displayName = user.firstName || user.email?.split('@')[0] || 'Member';
        toast({
          title: `Welcome to TiNHiH Community, ${displayName}!`,
          description: "As a community member, you have access to events, quotes, donations, and the store. Use the navigation menu to explore.",
          duration: 5000,
        });
        
        // Mark that welcome has been shown for this user
        localStorage.setItem(`welcome-shown-${user.id}`, 'true');
      }
    }
  }, [user?.role, user?.id, toast]);

  return null; // This component doesn't render anything visible
}
