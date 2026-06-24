import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Info,
  Warning,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";

interface NotificationCardProps {
  notification: any;
  compact?: boolean;
}

export function NotificationCard({ notification, compact = false }: NotificationCardProps) {
  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "appointment":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      case "billing":
        return <CreditCard className="h-4 w-4 text-orange-600" />;
      case "medical":
        return <User className="h-4 w-4 text-purple-600" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Low</Badge>;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">
              {notification.title}
            </h4>
            {!notification.read && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 text-xs">
                New
              </Badge>
            )}
            {getPriorityBadge(notification.priority)}
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(notification.createdAt), "MMM dd, h:mm a")}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm">
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${!notification.read ? 'border-blue-200 dark:border-blue-800' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {getNotificationIcon(notification.type)}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {notification.title}
                {!notification.read && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    New
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {notification.type} Notification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getPriorityBadge(notification.priority)}
            <div className="text-sm text-muted-foreground">
              {format(new Date(notification.createdAt), "MMM dd, yyyy h:mm a")}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h5 className="font-medium mb-2">Message:</h5>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
        </div>

        {notification.actionUrl && (
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              View Details
            </Button>
            {!notification.read && (
              <Button size="sm" className="bg-[#ffdd00] hover:bg-[#ffdd00]/90 text-black">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Read
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
