import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ThemedDropdownMenu as DropdownMenu,
  ThemedDropdownMenuContent as DropdownMenuContent,
  ThemedDropdownMenuItem as DropdownMenuItem,
  ThemedDropdownMenuLabel as DropdownMenuLabel,
  ThemedDropdownMenuSeparator as DropdownMenuSeparator,
  ThemedDropdownMenuTrigger as DropdownMenuTrigger,
} from "@/components/ui/themed-dropdown";
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronUp,
  Key,
  Bell,
  Palette,
  Shield,
  Loader2
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface UserMenuProps {
  user: any;
  logout: () => Promise<void>;
  isLoggingOut?: boolean;
}

function getUserInitials(firstName?: string, lastName?: string) {
  if (!firstName && !lastName) return "U";
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
}

export function UserMenu({ user, logout, isLoggingOut = false }: UserMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const handleNavigateToTab = (tab: string) => {
    setDropdownOpen(false);
    setLocation(`/settings?tab=${tab}`);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full  p-0 h-auto hover:bg-muted/50 dark:hover:bg-muted/30 rounded-lg transition-all duration-200 border border-transparent hover:border-border/50"
          >
            <div className="flex items-center space-x-3 w-full p-3">
              <Avatar className="w-11 h-11 border-2 border-primary/30 ring-2 ring-black/50 shadow-md">
                <AvatarImage src={user?.profileImage} />
                <AvatarFallback className="bg-gradient-to-br from-[#ffdd00] to-yellow/80 text-black font-bold text-sm">
                  {user ? getUserInitials(user.firstName, user.lastName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || "User" : "User"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 capitalize font-medium"
                  >
                    {user?.role || "Role"}
                  </Badge>
                </div>
              </div>
              <ChevronUp className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-64 ml-4 mb-2" 
          side="top" 
          align="start"
        >
          <DropdownMenuLabel className="font-normal p-3">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10 border-2 border-primary/30 shadow-md">
                <AvatarImage src={user?.profileImage} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-black dark:text-white font-bold text-sm">
                  {user ? getUserInitials(user.firstName, user.lastName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || "User" : "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user?.email}
                </p>
                <Badge 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 capitalize font-medium mt-1 w-fit"
                >
                  {user?.role || "Role"}
                </Badge>
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleNavigateToTab('profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigateToTab('security')}>
            <Key className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigateToTab('notifications')}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigateToTab('appearance')}>
            <Palette className="mr-2 h-4 w-4" />
            <span>Appearance</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleNavigateToTab('profile')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>System Settings</span>
          </DropdownMenuItem>
          
          {user?.role === 'admin' && (
            <DropdownMenuItem onClick={() => {
              setDropdownOpen(false);
              setLocation('/admin');
            }}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin Panel</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}