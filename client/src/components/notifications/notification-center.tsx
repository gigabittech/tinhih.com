import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ThemedDropdownMenu as DropdownMenu,
  ThemedDropdownMenuContent as DropdownMenuContent,
  ThemedDropdownMenuItem as DropdownMenuItem,
  ThemedDropdownMenuSeparator as DropdownMenuSeparator,
  ThemedDropdownMenuTrigger as DropdownMenuTrigger,
} from "@/components/ui/themed-dropdown";
import {
  Bell,
  BellRing,
  Check,
  Archive,
  MoreHorizontal,
  Settings,
  Trash2,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  Sparkles,
  Zap,
  Shield,
  Calendar,
  MessageSquare,
  CreditCard,
  User,
  FileText,
  Volume2,
  VolumeX
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useMultiChannelWebSocket } from "@/hooks/use-multi-channel-websocket";
import { multiChannelWebSocket } from "@/lib/multi-channel-websocket";
import { useAuth } from "@/context/auth-context";
import { getWebSocketUrl } from "@/lib/config";

interface Notification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(() => {
    // Check if user has already interacted (persist across re-renders)
    return localStorage.getItem('notificationCenter_userInteracted') === 'true';
  });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for notification sound
  useEffect(() => {
    audioRef.current = new Audio('/tinhih-notification.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.5;


    // Preload the audio file
    audioRef.current.load();

    // Test if audio can be played
    // audioRef.current.addEventListener('canplaythrough', () => {
      
    // });

    audioRef.current.addEventListener('error', (error) => {
      console.error('NotificationCenter: Audio file failed to load:', error);
      console.error('NotificationCenter: Audio error details:', audioRef.current?.error);
    });

    audioRef.current.addEventListener('loadstart', () => {
    });

    audioRef.current.addEventListener('progress', () => {
    });

    audioRef.current.addEventListener('suspend', () => {
    });

    audioRef.current.addEventListener('abort', () => {
    });
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    
    if (isSoundEnabled && audioRef.current && hasUserInteracted) {
      try {
        // Reset audio to beginning
        audioRef.current.currentTime = 0;
        
        // Play the sound
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
            })
            .catch(error => {
              console.error('NotificationCenter: Could not play notification sound:', error);
              // Try to play again with a small delay
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(e => {
                    console.error('NotificationCenter: Second attempt to play sound failed:', e);
                  });
                }
              }, 100);
            });
        }
      } catch (error) {
        console.error('NotificationCenter: Error playing notification sound:', error);
      }
    }
  };

  // Check if we're on a telehealth session page
  const currentPath = window.location.pathname;
  const isTelehealthSession = currentPath.includes('/telehealth-session/');
  
  // Get token for WebSocket URL
  const token = localStorage.getItem("token");
      const notificationUrl = token ? getWebSocketUrl({ token, channel: 'notifications' }) : '';
  
  // Direct WebSocket connection for notifications (like messaging)
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize WebSocket connection for notifications
  useEffect(() => {
    if (!user || !token) return;

    setIsConnecting(true);

    // Add notifications channel (only if it doesn't exist)
    if (!multiChannelWebSocket.hasChannel('notifications')) {
      multiChannelWebSocket.addChannel({
        name: 'notifications',
        url: notificationUrl,
        autoReconnect: !isTelehealthSession,
        reconnectInterval: 3000,
        maxReconnectAttempts: 5
      });
    }

    // Connect to notifications channel
    multiChannelWebSocket.connectChannel('notifications').then(() => {
      setIsConnected(true);
      setIsConnecting(false);
    }).catch((error) => {
      console.error('NotificationCenter: WebSocket connection failed:', error);
      setIsConnecting(false);
    });

    // Set up message handlers
    multiChannelWebSocket.onMessage('notifications', (message) => {
      
      if (message.type === 'notification') {
        // Set new notification indicator immediately
        setHasNewNotifications(true);

        // Play notification sound immediately when WebSocket notification arrives
        playNotificationSound();

        // Update the notifications list immediately by adding the new notification
        queryClient.setQueryData(['/api/notifications'], (oldData: any) => {
          
          if (!oldData) return [message.data];
          
          // Check if notification already exists to prevent duplicates
          const existingNotification = oldData.find((n: any) => n.id === message.data.id);
          if (existingNotification) {
            return oldData;
          }
          
          const newData = [message.data, ...oldData];
          return newData;
        });

        // Update unread count immediately
        queryClient.setQueryData(['/api/notifications/unread-count'], (oldData: any) => {
          const currentCount = oldData?.count || 0;
          return { count: currentCount + 1 };
        });

        // Show browser notification if permission is granted
        if (Notification.permission === 'granted') {
          new Notification(message.data.title, {
            body: message.data.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: message.data.id,
            requireInteraction: message.data.priority === 'urgent' || message.data.priority === 'high',
            silent: !isSoundEnabled // Use browser's default sound if our sound is disabled
          });
        } else {
        }

        // Note: We don't need to invalidate/refetch since we're directly updating the cache
        // This prevents duplicate notifications and unnecessary API calls
      }
    });

    multiChannelWebSocket.onConnectionChange('notifications', (connected) => {
      setIsConnected(connected);
    });

    return () => {
      multiChannelWebSocket.disconnectChannel('notifications');
      multiChannelWebSocket.removeHandlers('notifications');
    };
  }, [user, token, isTelehealthSession]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Track user interaction for audio playback
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
      
      // Persist user interaction state to localStorage
      localStorage.setItem('notificationCenter_userInteracted', 'true');
      
      // Note: Audio context resume is not needed for HTMLAudioElement
      
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Clear new notification indicator when notification center is opened
  useEffect(() => {
    if (isOpen) {
      setHasNewNotifications(false);
    }
  }, [isOpen]);

  // Debug connection state changes
  useEffect(() => {
  }, [isConnected]);

  // Get notifications - only on mount, no polling since WebSocket handles real-time updates
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    refetchOnMount: true, // Only fetch on mount
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });


  // Get unread count - only on mount, no polling since WebSocket handles real-time updates
  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    refetchOnMount: true, // Only fetch on mount
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const unreadCount = (unreadData as { count?: number })?.count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}/read`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/notifications/mark-all-read', 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    }
  });

  // Archive notification mutation
  const archiveNotificationMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}/archive`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    }
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle different notification types
    if (notification.type === 'message_received') {
      setIsOpen(false);
      // Navigate to messages page
      window.location.href = '/messages';
    } else if (notification.actionUrl) {
      setIsOpen(false);
      // Navigation for other notification types
      window.location.href = notification.actionUrl;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment_created':
      case 'appointment_updated':
      case 'appointment_cancelled':
      case 'appointment_reminder':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'patient_registered':
      case 'patient_updated':
        return <User className="w-4 h-4 text-green-500" />;
      case 'clinical_note_created':
      case 'clinical_note_updated':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'invoice_created':
      case 'invoice_paid':
      case 'invoice_overdue':
        return <CreditCard className="w-4 h-4 text-orange-500" />;
      case 'message_received':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'telehealth_session_started':
      case 'telehealth_session_ended':
        return <Sparkles className="w-4 h-4 text-cyan-500" />;
      case 'system_update':
        return <Settings className="w-4 h-4 text-gray-500" />;
      case 'security_alert':
        return <Shield className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50/70 dark:hover:bg-red-950/30';
      case 'high':
        return 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50/70 dark:hover:bg-orange-950/30';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30';
      case 'low':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20 hover:bg-green-50/70 dark:hover:bg-green-950/30';
      default:
        return 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-950/20 hover:bg-gray-50/70 dark:hover:bg-gray-950/30';
    }
  };

  const formatNotificationTime = (dateString: string) => {
    // Parse the UTC timestamp from server and convert to local time
    const utcDate = new Date(dateString);
    return formatDistanceToNow(utcDate, { addSuffix: true });
  };

  const formatNotificationTimeFull = (dateString: string) => {
    // Parse UTC timestamp and format in local timezone
    const utcDate = new Date(dateString);
    return format(utcDate, 'MMM d, yyyy h:mm a');
  };

      return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative p-2 hover:bg-muted/50 transition-colors duration-200",
            hasNewNotifications && !isOpen && "animate-pulse"
          )}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-medium animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {/* New notification indicator - Red dot */}
          {hasNewNotifications && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}


        </Button>
      </SheetTrigger>

      <SheetContent className="w-96 sm:w-[600px] lg:w-[700px] max-w-[90vw]">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </div>
              </SheetTitle>
              {unreadCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="font-medium text-green-900 animate-pulse">
                    {unreadCount} unread
                  </Badge>
                  <span
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs p-0 cursor-pointer inline-flex items-center gap-1 hover:underline"
                  >
                    <Check className="w-3 h-3" />
                    Read All
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Sound toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  className="text-xs p-2"
                  title={isSoundEnabled ? "Disable notification sound" : "Enable notification sound"}
                >
                  {isSoundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>

                {/* Sound test button */}
                {/* <Button
                  variant="ghost"
                  size="sm"
                  onClick={playNotificationSound}
                  className="text-xs p-2"
                  title={hasUserInteracted ? "Test notification sound" : "Click anywhere first to enable sound"}
                  disabled={!isSoundEnabled || !hasUserInteracted}
                >
                  <Volume2 className={cn("w-3 h-3", (!isSoundEnabled || !hasUserInteracted) && "opacity-50")} />
                </Button> */}



                <Link href="/settings?tab=notifications" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Test button for debugging
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs whitespace-nowrap"
                  onClick={async () => {
                    console.log('NotificationCenter: Test button clicked');
                    try {
                      const response = await fetch('/api/notifications/test', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                      });
                      const result = await response.json();
                      console.log('NotificationCenter: Test notification result:', result);

                      if (result.success) {
                        console.log('NotificationCenter: Test notification created successfully');
                        
                        // Manually trigger notification update for immediate display
                        setHasNewNotifications(true);
                        playNotificationSound();
                        
                        // Force immediate refetch to get the latest data
                        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
                      } else {
                        console.error('NotificationCenter: Test notification failed:', result);
                      }
                    } catch (error) {
                      console.error('NotificationCenter: Error creating test notification:', error);
                    }
                  }}
                >
                  Test
                </Button>

                {/* Test message notification button 
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs whitespace-nowrap"
                  onClick={async () => {
                    console.log('NotificationCenter: Test message notification button clicked');
                    try {
                      const response = await fetch('/api/notifications/test-message', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                      });
                      const result = await response.json();
                      console.log('NotificationCenter: Test message notification result:', result);

                      if (result.success) {
                        console.log('NotificationCenter: Test message notification created successfully');
                        
                        // Manually trigger notification update for immediate display
                        setHasNewNotifications(true);
                        playNotificationSound();
                        
                        // Force immediate refetch to get the latest data
                        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
                      } else {
                        console.error('NotificationCenter: Test message notification failed:', result);
                      }
                    } catch (error) {
                      console.error('NotificationCenter: Error creating test message notification:', error);
                    }
                  }}
                >
                  Test Messa
                </Button> */}
              </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Stay updated with your latest activities and important updates.</p>
            {/* {hasNewNotifications && (
              <p className="text-xs text-green-600 font-medium animate-pulse">
                ✨ New notification received!
              </p>
            )} */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                isConnecting ? 'bg-yellow-500' : 
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className={
                isConnecting ? 'text-yellow-600' : 
                isConnected ? 'text-green-600' : 'text-red-600'
              }>
                {/* WebSocket: {
                  isConnecting ? 'Connecting...' : 
                  isConnected ? 'Connected' : 'Disconnected'
                } ({
                  isConnecting ? '🔄' : 
                  isConnected ? '✅' : '❌'
                }) */}
              </span>
              {/* <span className="text-xs text-gray-500">
                State: {isConnected ? 'true' : 'false'} {isConnecting ? '(connecting)' : ''}
              </span> */}
              {/* <button 
                onClick={() => {
                  console.log('NotificationCenter: Manual connection check');
                  console.log('NotificationCenter: isConnected state:', isConnected);
                  console.log('NotificationCenter: User ID:', user?.id);
                  // Check server connected clients
                  fetch('/api/notifications/debug-clients', {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  })
                    .then(res => res.json())
                    .then(data => {
                      console.log('NotificationCenter: Server connected clients:', data);
                    })
                    .catch(err => {
                      console.error('NotificationCenter: Error checking server clients:', err);
                    });
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Debug
              </button> */}
                {/* <button 
                  onClick={() => {
                    console.log('NotificationCenter: Testing sound manually');
                    console.log('NotificationCenter: Sound state - Enabled:', isSoundEnabled, 'User interacted:', hasUserInteracted, 'Audio ref:', !!audioRef.current);
                    console.log('NotificationCenter: Audio ready state:', audioRef.current?.readyState);
                    console.log('NotificationCenter: Audio paused:', audioRef.current?.paused);
                    playNotificationSound();
                  }}
                  className="text-xs text-green-600 hover:underline ml-2"
                >
                  Test Sound
                </button> */}
                {/* <button 
                  onClick={() => {
                    console.log('NotificationCenter: Testing direct audio play...');
                    if (audioRef.current) {
                      console.log('NotificationCenter: Direct audio test - src:', audioRef.current.src);
                      console.log('NotificationCenter: Direct audio test - ready state:', audioRef.current.readyState);
                      audioRef.current.currentTime = 0;
                      audioRef.current.play().then(() => {
                        console.log('NotificationCenter: Direct audio play successful!');
                      }).catch(error => {
                        console.error('NotificationCenter: Direct audio play failed:', error);
                      });
                    } else {
                      console.log('NotificationCenter: No audio ref available for direct test');
                    }
                  }}
                  className="text-xs text-blue-600 hover:underline ml-2"
                >
                  Direct Audio Test
                </button> */}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex space-x-4">
                    <div className="rounded-full bg-muted h-10 w-10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (notifications as Notification[]).length > 0 ? (
            <ScrollArea className="h-[calc(100vh-100px)]">
              <div className="py-2 space-y-3">
                {(notifications as Notification[]).map((notification: Notification, index: number) => (
                  <div key={notification.id}>
                    <div
                      className={cn(
                        "p-4 rounded-xl border-l-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] group backdrop-blur-sm",
                        getPriorityColor(notification.priority),
                        !notification.isRead && "shadow-md ring-1 ring-primary/20 dark:ring-primary/30"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 mt-1">
                            <div className="relative">
                              {getTypeIcon(notification.type)}
                              {!notification.isRead && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-start gap-2 mb-2 flex-wrap">
                              <h4 className={cn(
                                "text-[14px] font-medium break-words flex-1 min-w-0",
                                !notification.isRead ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {notification.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize px-2 py-0.5 border-primary/20 bg-primary/5 flex-shrink-0"
                              >
                                {notification.priority}
                              </Badge>
                            </div>

                            <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed break-words">
                              {notification.message}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground flex-wrap gap-2">
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                <span
                                  title={formatNotificationTimeFull(notification.createdAt)}
                                  className="font-medium text-[10px]"
                                >
                                  {formatNotificationTime(notification.createdAt)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {notification.type === 'message_received' && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    Click to view
                                  </span>
                                )}
                                <Badge variant="outline" className="text-[10px] capitalize bg-muted/50">
                                  {notification.type.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {!notification.isRead && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsReadMutation.mutate(notification.id);
                                }}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveNotificationMutation.mutate(notification.id);
                              }}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {index < (notifications as Notification[]).length - 1 && (
                      <Separator className="my-3 bg-border/50" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">No notifications yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                When you have new notifications, they'll appear here with real-time updates.
              </p>

            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}