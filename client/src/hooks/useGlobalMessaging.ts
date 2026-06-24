import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { multiChannelWebSocket } from '@/lib/multi-channel-websocket';
import { useToast } from '@/hooks/use-toast';
import { getWebSocketUrl } from '@/lib/config';

export function useGlobalMessaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const originalTitleRef = useRef<string>('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Store original document title
  useEffect(() => {
    originalTitleRef.current = document.title;
  }, []);

  // Initialize audio for message notifications
  useEffect(() => {
    audioRef.current = new Audio('/tinhih-notification.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.5;
  }, []);

  // Function to play notification sound
  const playNotificationSound = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }
  };

  // Function to update document title with unread count
  const updateDocumentTitle = useCallback((count: number) => {
    if (count > 0) {
      document.title = `(${count}) ${originalTitleRef.current}`;
    } else {
      document.title = originalTitleRef.current;
    }
  }, []);

  // Fetch initial unread count and listen for changes
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/messages/unread-count', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
          updateDocumentTitle(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();

    // Listen for unread count query changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[0] === '/api/messages/unread-count') {
        const count = event.query.state.data?.count || 0;
        setUnreadCount(count);
        updateDocumentTitle(count);
      }
    });

    return unsubscribe;
  }, [user, updateDocumentTitle, queryClient]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    
    switch (message.type) {
      case 'new_message':
        // Invalidate messages query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
        
        // Show toast notification and play sound for new message (only if not from current user)
        if (message.data.from !== user?.id) {
          // Get sender name from the message data
          const senderName = message.data.senderName || 'Someone';
          toast({
            title: 'New Message',
            description: `${senderName} sent you a new message`,
          });
          // Play notification sound
          playNotificationSound();
          
          // Update unread count and document title
          setUnreadCount(prev => {
            const newCount = prev + 1;
            updateDocumentTitle(newCount);
            return newCount;
          });
        }
        break;

      case 'message_read':
        // Update message status in cache
        queryClient.setQueryData(['/api/messages'], (oldData: any[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(msg => 
            msg.id === message.data.messageId 
              ? { ...msg, status: 'read', readAt: message.data.timestamp, deliveryStatus: 'read', deliveredAt: message.data.timestamp }
              : msg
          );
        });
        
        // Also invalidate the messages query to ensure UI updates
        queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
        
        // Update unread count when messages are read
        setUnreadCount(prev => {
          const newCount = Math.max(0, prev - 1);
          updateDocumentTitle(newCount);
          return newCount;
        });
        break;

      case 'message_delivered':
        // Update message delivery status in cache
        queryClient.setQueryData(['/api/messages'], (oldData: any[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(msg => 
            msg.id === message.data.messageId 
              ? { ...msg, deliveryStatus: 'delivered', deliveredAt: message.data.timestamp }
              : msg
          );
        });
        
        // Invalidate the messages query to ensure UI updates
        queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
        break;

      case 'typing_start':
        setTypingUsers(prev => new Set(prev).add(message.data.from));
        break;

      case 'typing_stop':
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(message.data.from);
          return newSet;
        });
        break;
    }
  }, [queryClient, user?.id, toast, updateDocumentTitle]);

  // Function to mark messages as delivered when user is online
  const markMessagesAsDelivered = useCallback((messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    // Mark each message as delivered via API
    messageIds.forEach(async (messageId) => {
      try {
        await fetch(`/api/messages/${messageId}/delivered`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      } catch (error) {
        console.error('Failed to mark message as delivered:', error);
      }
    });
  }, [user]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((recipientId: string, isTyping: boolean) => {
    if (!multiChannelWebSocket.isChannelConnected('messaging') || !user) return;

    // Clear existing timeout
    const existingTimeout = typingTimeoutRef.current.get(recipientId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (isTyping) {
      // Send typing start
      multiChannelWebSocket.sendMessage('messaging', {
        type: 'typing_start',
        from: user.id,
        to: recipientId,
        data: { timestamp: new Date() }
      } as any);

      // Set timeout to stop typing indicator
      const timeout = setTimeout(() => {
        multiChannelWebSocket.sendMessage('messaging', {
          type: 'typing_stop',
          from: user.id,
          to: recipientId,
          data: { timestamp: new Date() }
        } as any);
        typingTimeoutRef.current.delete(recipientId);
      }, 3000);

      typingTimeoutRef.current.set(recipientId, timeout);
    } else {
      // Send typing stop immediately
      multiChannelWebSocket.sendMessage('messaging', {
        type: 'typing_stop',
        from: user.id,
        to: recipientId,
        data: { timestamp: new Date() }
      } as any);
      typingTimeoutRef.current.delete(recipientId);
    }
  }, [user]);

  // Initialize global WebSocket connection for messaging
  useEffect(() => {
    if (!user) return;

    // Add messaging channel (only if it doesn't exist)
    if (!multiChannelWebSocket.hasChannel('messaging')) {
      multiChannelWebSocket.addChannel({
        name: 'messaging',
        url: getWebSocketUrl({
          token: localStorage.getItem('token') || '',
          userId: user.id,
          channel: 'messaging'
        }),
        autoReconnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 5
      });
    }

    // Connect to messaging channel
    multiChannelWebSocket.connectChannel('messaging').then(() => {
      // Mark all sent messages as delivered when user comes online
      const currentMessages = queryClient.getQueryData(['/api/messages']) as any[] | undefined;
      if (currentMessages) {
        const sentMessages = currentMessages.filter(msg => 
          msg.senderId === user.id && 
          msg.deliveryStatus === 'sent'
        );
        if (sentMessages.length > 0) {
          markMessagesAsDelivered(sentMessages.map(msg => msg.id));
        }
      }
    }).catch((error) => {
      console.error('Global messaging WebSocket connection failed:', error);
    });

    // Set up message handlers
    multiChannelWebSocket.onMessage('messaging', handleWebSocketMessage);

    // Cleanup function
    return () => {
      // Don't disconnect on unmount since this is global
      // Only remove handlers
      multiChannelWebSocket.removeHandlers('messaging');
      // Restore original document title
      document.title = originalTitleRef.current;
    };
  }, [user, handleWebSocketMessage, markMessagesAsDelivered, queryClient]);

  // Function to mark all messages from a specific sender as read
  const markAllMessagesAsRead = useCallback((senderId: string) => {
    if (!user) return;

    // Get current messages from cache
    const currentMessages = queryClient.getQueryData(['/api/messages']) as any[] | undefined;
    if (!currentMessages) return;

    // Find all unread messages from this sender
    const unreadMessages = currentMessages.filter(msg => 
      msg.status === 'unread' && 
      msg.senderId === senderId && 
      msg.recipientId === user.id
    );

    // Mark each message as read
    unreadMessages.forEach(message => {
      // Update cache immediately
      queryClient.setQueryData(['/api/messages'], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'read', readAt: new Date(), deliveryStatus: 'read', deliveredAt: new Date() }
            : msg
        );
      });

      // Send read receipt via WebSocket
      if (multiChannelWebSocket.isChannelConnected('messaging')) {
        multiChannelWebSocket.sendMessage('messaging', {
          type: 'message_read',
          from: user.id,
          to: senderId,
          data: { 
            timestamp: new Date(),
            messageId: message.id
          }
        } as any);
      }
    });

    // Invalidate queries to ensure UI updates
    queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
  }, [user, queryClient]);

  return {
    isConnected: multiChannelWebSocket.isChannelConnected('messaging'),
    unreadCount,
    typingUsers,
    sendTypingIndicator,
    isTyping: (userId: string) => typingUsers.has(userId),
    markAllMessagesAsRead,
    markMessagesAsDelivered
  };
}
