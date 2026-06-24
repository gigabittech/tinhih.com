import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { multiChannelWebSocket } from '@/lib/multi-channel-websocket';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useGlobalMessaging } from '@/hooks/useGlobalMessaging';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  appointmentId?: string;
  subject: string;
  content: string;
  messageType: 'general' | 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancellation' | 'appointment_reschedule' | 'pre_appointment_instructions' | 'follow_up_reminder' | 'emergency_notification' | 'system_notification';
  status: 'unread' | 'read' | 'archived';
  isSystemMessage: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
  readAt?: string;
  deliveredAt?: string;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  appointment?: {
    id: string;
    title: string;
    appointmentDate: string;
    status: string;
  };
}

export interface Conversation {
  userId: string;
  userName: string;
  userRole: string;
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  appointmentId?: string; // For appointment-based conversations
}

export interface SendMessageData {
  recipientId: string;
  subject: string;
  content: string;
  appointmentId?: string;
  messageType?: string;
  priority?: string;
}

export function useMessaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, typingUsers, sendTypingIndicator, isTyping, markAllMessagesAsRead, markMessagesAsDelivered } = useGlobalMessaging();

  // Global messaging hook handles all WebSocket connections and typing indicators

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages'],
    queryFn: async () => {
      const response = await api.get('/api/messages');
      return response;
    },
    enabled: !!user,
  });

  // Fetch unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['/api/messages/unread-count'],
    queryFn: async () => {
      const response = await api.get('/api/messages/unread-count');
      return response;
    },
    enabled: !!user,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await api.post('/api/messages', data);
      return response;
    },
    onSuccess: (message) => {
      // Immediately add the sent message to the local cache
      queryClient.setQueryData(['/api/messages'], (oldData: Message[] | undefined) => {
        if (!oldData) return [message];
        
        // Check if message already exists (to avoid duplicates)
        const exists = oldData.some(m => m.id === message.id);
        if (exists) return oldData;
        
        return [...oldData, message];
      });

      // Remove the duplicate setQueryData call that was causing issues

      // Invalidate queries to refresh data (as backup)
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      
      // Send real-time notification via WebSocket
      if (isConnected && user) {
        multiChannelWebSocket.sendMessage('messaging', {
          type: 'new_message',
          from: user.id,
          to: message.recipientId,
          data: { 
            timestamp: new Date(),
            messageId: message.id,
            content: message.content,
            subject: message.subject,
            appointmentId: message.appointmentId,
            messageType: message.messageType
          }
        } as any);
      }

      // Toast notification removed - no need to show success message
    },
    onError: (error: any) => {
      console.error('Message sending error:', error);
      
      // Show appropriate error messages based on error type
      if (error.status === 403) {
        // Permission errors - show specific message
        toast({
          title: 'Permission Denied',
          description: error.message || 'You do not have permission to send this message',
          variant: 'destructive',
        });
      } else if (error.status === 404) {
        // Recipient not found
        toast({
          title: 'Recipient Not Found',
          description: 'The recipient could not be found. Please check the recipient and try again.',
          variant: 'destructive',
        });
      } else if (error.status === 400) {
        // Validation errors
        toast({
          title: 'Invalid Message',
          description: error.message || 'Please check your message and try again',
          variant: 'destructive',
        });
      } else if (error.status === 401) {
        // Authentication errors - don't show toast, let API client handle logout
        console.log('Authentication error during message sending');
      } else {
        // Generic errors
        toast({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await api.patch(`/api/messages/${messageId}/read`);
      return response;
    },
    onSuccess: (_, messageId) => {
      // Update cache
      queryClient.setQueryData(['/api/messages'], (oldData: Message[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'read', readAt: new Date() }
            : msg
        );
      });

      // Invalidate queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });

      // Send read receipt via WebSocket
      if (isConnected && user) {
        const message = messages?.find((m: Message) => m.id === messageId);
        if (message) {
          multiChannelWebSocket.sendMessage('messaging', {
            type: 'message_read',
            from: user.id,
            to: message.senderId,
            data: { 
              timestamp: new Date(),
              messageId: messageId
            }
          } as any);
        }
      }
    },
  });

  // Bulk mark messages as read mutation
  const bulkMarkAsReadMutation = useMutation({
    mutationFn: async ({ senderId, appointmentId }: { senderId: string; appointmentId?: string }) => {
      const response = await api.post('/api/messages/bulk-mark-read', {
        senderId,
        appointmentId
      });
      return response;
    },
    onSuccess: (_, { senderId, appointmentId }) => {
      // Update cache to mark all messages from this sender as read
      queryClient.setQueryData(['/api/messages'], (oldData: Message[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(msg => {
          const isFromSender = msg.senderId === senderId && msg.recipientId === user?.id;
          const isSameConversation = appointmentId 
            ? msg.appointmentId === appointmentId 
            : !msg.appointmentId; // General conversation
          
          if (isFromSender && isSameConversation && msg.status === 'unread') {
            return { ...msg, status: 'read', readAt: new Date() };
          }
          return msg;
        });
      });

      // Invalidate queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });

      // Send bulk read receipt via WebSocket
      if (isConnected && user) {
        multiChannelWebSocket.sendMessage('messaging', {
          type: 'messages_read',
          from: user.id,
          to: senderId,
          data: { 
            timestamp: new Date(),
            senderId: user.id,
            appointmentId
          }
        } as any);
      }
    },
  });

  // Get conversations (grouped messages by sender and appointment)
  const conversations = useMemo(() => {
    if (!messages) return [];

    const conversationMap = new Map<string, Conversation>();
    
    messages.forEach((message: Message) => {
      const otherUserId = message.senderId === user?.id ? message.recipientId : message.senderId;
      const otherUser = message.senderId === user?.id ? message.recipient : message.sender;
      
      if (!otherUser) return;

      // Create conversation key: if appointment-based, use appointment ID, otherwise use user ID
      const conversationKey = message.appointmentId ? `appointment_${message.appointmentId}` : `user_${otherUserId}`;
      
      const existing = conversationMap.get(conversationKey);
      
      // Count unread messages for this conversation
      const unreadCount = messages.filter((m: Message) => {
        const mOtherUserId = m.senderId === user?.id ? m.recipientId : m.senderId;
        const mConversationKey = m.appointmentId ? `appointment_${m.appointmentId}` : `user_${mOtherUserId}`;
        return mConversationKey === conversationKey && 
               m.senderId === otherUserId && 
               m.recipientId === user?.id && 
               m.status === 'unread';
      }).length;

      if (existing) {
        // Update with latest message if this one is newer
        if (!existing.lastMessage || new Date(message.createdAt) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = message;
        }
        existing.unreadCount = unreadCount;
      } else {
        // Create conversation name based on type
        let conversationName = `${otherUser.firstName} ${otherUser.lastName}`;
        if (message.appointmentId && message.appointment) {
          conversationName += ` - ${message.appointment.title || 'Appointment'}`;
        }
        
        conversationMap.set(conversationKey, {
          userId: otherUserId,
          userName: conversationName,
          userRole: otherUser.role,
          lastMessage: message,
          unreadCount,
          isOnline: false, // TODO: Implement online status
          appointmentId: message.appointmentId // Add appointment ID for reference
        });
      }
    });

    return Array.from(conversationMap.values()).sort((a, b) => {
      // First priority: conversations with unread messages
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Second priority: if both have unread messages, sort by unread count (highest first)
      if (a.unreadCount > 0 && b.unreadCount > 0) {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
      }
      
      // Third priority: sort by latest message timestamp (newest first)
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });
  }, [messages, user?.id]);

  return {
    // Data
    messages,
    conversations,
    unreadCount: unreadCount?.count || 0,
    typingUsers,
    isConnected,
    
    // Loading states
    messagesLoading,
    isSending: sendMessageMutation.isPending,
    isMarkingRead: markAsReadMutation.isPending,
    isBulkMarkingRead: bulkMarkAsReadMutation.isPending,
    
    // Actions
    sendMessage: sendMessageMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    bulkMarkAsRead: bulkMarkAsReadMutation.mutate,
    markAllMessagesAsRead,
    markMessagesAsDelivered,
    sendTypingIndicator,
    
    // Utilities
    isTyping,
  };
}
