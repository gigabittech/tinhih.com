import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  User, 
  Clock, 
  Reply,
  FileText,
  Paperclip
} from "lucide-react";
import { format } from "date-fns";

interface MessageCardProps {
  message: any;
  compact?: boolean;
}

export function MessageCard({ message, compact = false }: MessageCardProps) {
  const isUnread = !message.readBy?.includes(message.recipientId);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors ${isUnread ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
        <div className="flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={message.sender?.user?.profileImage} />
            <AvatarFallback className="text-sm bg-[#ffdd00] text-black">
              {message.sender?.user?.firstName?.[0]}{message.sender?.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">
              {message.sender?.user?.firstName} {message.sender?.user?.lastName}
            </h4>
            {isUnread && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 text-xs">
                New
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            {message.subject || message.content?.substring(0, 50)}...
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(message.createdAt), "MMM dd, h:mm a")}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm">
          <Reply className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${isUnread ? 'border-blue-200 dark:border-blue-800' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={message.sender?.user?.profileImage} />
              <AvatarFallback className="text-sm bg-[#ffdd00] text-black">
                {message.sender?.user?.firstName?.[0]}{message.sender?.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {message.sender?.user?.firstName} {message.sender?.user?.lastName}
                {isUnread && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    New
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {message.sender?.role === "practitioner" ? "Healthcare Provider" : "Staff Member"}
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(message.createdAt), "MMM dd, yyyy h:mm a")}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {message.subject && (
          <div>
            <h5 className="font-medium mb-1">Subject:</h5>
            <p className="text-sm text-muted-foreground">{message.subject}</p>
          </div>
        )}

        <div>
          <h5 className="font-medium mb-2">Message:</h5>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {message.content}
          </div>
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Attachments:</h5>
            <div className="space-y-2">
              {message.attachments.map((attachment: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{attachment.name}</span>
                  <Button variant="ghost" size="sm" className="ml-auto">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
