// import { useState, useEffect, useCallback } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Plus, MessageSquare, Reply, Send, Clock, Calendar, User, Search, Filter } from "lucide-react";
// import { format } from "date-fns";
// import { api } from "@/lib/api";
// import { useAuth } from "@/context/auth-context";
// import { useToast } from "@/hooks/use-toast";

// interface Message {
//   id: string;
//   senderId: string;
//   recipientId: string;
//   appointmentId?: string;
//   subject: string;
//   content: string;
//   messageType: string;
//   status: 'unread' | 'read' | 'archived';
//   isSystemMessage: boolean;
//   priority: string;
//   metadata?: any;
//   readAt?: string;
//   createdAt: string;
//   updatedAt: string;
//   sender?: {
//     id: string;
//     firstName: string;
//     lastName: string;
//     email: string;
//     role: string;
//   };
//   recipient?: {
//     id: string;
//     firstName: string;
//     lastName: string;
//     email: string;
//     role: string;
//   };
//   appointment?: {
//     id: string;
//     title: string;
//     appointmentDate: string;
//     status: string;
//   };
// }

// interface Conversation {
//   userId: string;
//   userName: string;
//   userRole: string;
//   lastMessage?: Message;
//   unreadCount: number;
// }

// export function ComprehensiveMessageList() {
//   const { user } = useAuth();
//   const { toast } = useToast();
//   const queryClient = useQueryClient();
  
//   const [selectedTab, setSelectedTab] = useState("conversations");
//   const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
//   const [newMessageDialog, setNewMessageDialog] = useState(false);
//   const [messageFilter, setMessageFilter] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [newMessageData, setNewMessageData] = useState({
//     recipientId: "",
//     subject: "",
//     content: "",
//     appointmentId: "",
//     messageType: "general",
//     priority: "normal"
//   });

//   // Fetch messages
//   const { data: messages, isLoading: messagesLoading } = useQuery({
//     queryKey: ["/api/messages", messageFilter],
//     queryFn: async () => {
//       const params = new URLSearchParams();
//       if (messageFilter !== "all") {
//         params.append("status", messageFilter);
//       }
//       const response = await api.get(`/api/messages?${params}`);
//       return response;
//     },
//   });

//   // Fetch unread count
//   const { data: unreadCount } = useQuery({
//     queryKey: ["/api/messages/unread-count"],
//     queryFn: async () => {
//       const response = await api.get("/api/messages/unread-count");
//       return response;
//     },
//   });

//   // Fetch patients and practitioners for new message
//   const { data: patients } = useQuery({
//     queryKey: ["/api/patients"],
//     queryFn: async () => {
//       const response = await api.get("/api/patients");
//       return response;
//     },
//   });

//   const { data: practitioners } = useQuery({
//     queryKey: ["/api/practitioners"],
//     queryFn: async () => {
//       const response = await api.get("/api/practitioners");
//       return response;
//     },
//   });

//   // Send message mutation
//   const sendMessageMutation = useMutation({
//     mutationFn: async (data: any) => {
//       const response = await api.post("/api/messages", data);
//       return response;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
//       setNewMessageDialog(false);
//       setNewMessageData({
//         recipientId: "",
//         subject: "",
//         content: "",
//         appointmentId: "",
//         messageType: "general",
//         priority: "normal"
//       });
//       toast({
//         title: "Message Sent",
//         description: "Your message has been sent successfully.",
//       });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to send message",
//         variant: "destructive",
//       });
//     },
//   });

//   // Mark as read mutation
//   const markAsReadMutation = useMutation({
//     mutationFn: async (messageId: string) => {
//       const response = await api.put(`/api/messages/${messageId}/read`);
//       return response;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
//     },
//   });

//   // Group messages into conversations
//   const conversations = useMemo(() => {
//     if (!messages) return [];

//     const conversationMap = new Map<string, Conversation>();
    
//     messages.forEach((message: Message) => {
//       const otherUserId = message.senderId === user?.id ? message.recipientId : message.senderId;
//       const otherUser = message.senderId === user?.id ? message.recipient : message.sender;
      
//       if (!otherUser) return;

//       const existing = conversationMap.get(otherUserId);
//       const unreadCount = messages.filter(m => 
//         m.senderId === otherUserId && 
//         m.recipientId === user?.id && 
//         m.status === 'unread'
//       ).length;

//       if (existing) {
//         if (!existing.lastMessage || new Date(message.createdAt) > new Date(existing.lastMessage.createdAt)) {
//           existing.lastMessage = message;
//         }
//         existing.unreadCount = unreadCount;
//       } else {
//         conversationMap.set(otherUserId, {
//           userId: otherUserId,
//           userName: `${otherUser.firstName} ${otherUser.lastName}`,
//           userRole: otherUser.role,
//           lastMessage: message,
//           unreadCount,
//         });
//       }
//     });

//     return Array.from(conversationMap.values()).sort((a, b) => {
//       if (!a.lastMessage && !b.lastMessage) return 0;
//       if (!a.lastMessage) return 1;
//       if (!b.lastMessage) return -1;
//       return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
//     });
//   }, [messages, user?.id]);

//   // Filter conversations by search term
//   const filteredConversations = conversations.filter(conv =>
//     conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     conv.lastMessage?.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     conv.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // Get messages for selected conversation
//   const conversationMessages = useMemo(() => {
//     if (!selectedConversation || !messages) return [];
    
//     return messages.filter((message: Message) => {
//       const otherUserId = message.senderId === user?.id ? message.recipientId : message.senderId;
//       return otherUserId === selectedConversation;
//     }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
//   }, [selectedConversation, messages, user?.id]);

//   const handleSendMessage = () => {
//     if (!newMessageData.recipientId || !newMessageData.subject || !newMessageData.content) {
//       toast({
//         title: "Missing Information",
//         description: "Please fill in all required fields.",
//         variant: "destructive",
//       });
//       return;
//     }

//     sendMessageMutation.mutate({
//       ...newMessageData,
//       senderId: user?.id,
//     });
//   };

//   const handleMessageClick = (message: Message) => {
//     if (message.status === 'unread' && message.recipientId === user?.id) {
//       markAsReadMutation.mutate(message.id);
//     }
//   };

//   const getMessageTypeIcon = (messageType: string) => {
//     switch (messageType) {
//       case 'appointment_confirmation':
//       case 'appointment_reminder':
//       case 'appointment_cancellation':
//       case 'appointment_reschedule':
//         return <Calendar className="w-4 h-4" />;
//       case 'emergency_notification':
//         return <Clock className="w-4 h-4 text-red-500" />;
//       case 'system_notification':
//         return <MessageSquare className="w-4 h-4 text-blue-500" />;
//       default:
//         return <MessageSquare className="w-4 h-4" />;
//     }
//   };

//   const getPriorityColor = (priority: string) => {
//     switch (priority) {
//       case 'urgent':
//         return 'bg-red-100 text-red-800';
//       case 'high':
//         return 'bg-orange-100 text-orange-800';
//       case 'low':
//         return 'bg-gray-100 text-gray-800';
//       default:
//         return 'bg-blue-100 text-blue-800';
//     }
//   };

//   if (messagesLoading) {
//     return (
//       <Card>
//         <CardContent className="p-6">
//           <div className="space-y-4">
//             {Array.from({ length: 5 }).map((_, i) => (
//               <div key={i} className="animate-pulse">
//                 <div className="flex items-center space-x-4 p-4 border rounded-lg">
//                   <div className="w-12 h-12 bg-slate-300 rounded-full"></div>
//                   <div className="flex-1 space-y-2">
//                     <div className="h-4 bg-slate-300 rounded w-1/3"></div>
//                     <div className="h-3 bg-slate-300 rounded w-2/3"></div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </CardContent>
//       </Card>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-2">
//               <CardTitle>Messages</CardTitle>
//               {unreadCount?.count > 0 && (
//                 <Badge variant="destructive">{unreadCount.count} unread</Badge>
//               )}
//             </div>
//             <Dialog open={newMessageDialog} onOpenChange={setNewMessageDialog}>
//               <DialogTrigger asChild>
//                 <Button>
//                   <Plus className="w-4 h-4 mr-2" />
//                   New Message
//                 </Button>
//               </DialogTrigger>
//               <DialogContent className="max-w-2xl">
//                 <DialogHeader>
//                   <DialogTitle>Send New Message</DialogTitle>
//                 </DialogHeader>
//                 <div className="space-y-4">
//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <label className="text-sm font-medium">Recipient</label>
//                       <Select 
//                         value={newMessageData.recipientId} 
//                         onValueChange={(value) => setNewMessageData(prev => ({ ...prev, recipientId: value }))}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select recipient" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {user?.role === 'admin' || user?.role === 'staff' ? (
//                             <>
//                               {patients?.map((patient: any) => (
//                                 <SelectItem key={patient.id} value={patient.userId}>
//                                   {patient.user.firstName} {patient.user.lastName} (Patient)
//                                 </SelectItem>
//                               ))}
//                               {practitioners?.map((practitioner: any) => (
//                                 <SelectItem key={practitioner.id} value={practitioner.userId}>
//                                   Dr. {practitioner.user.firstName} {practitioner.user.lastName} (Practitioner)
//                                 </SelectItem>
//                               ))}
//                             </>
//                           ) : user?.role === 'practitioner' ? (
//                             patients?.map((patient: any) => (
//                               <SelectItem key={patient.id} value={patient.userId}>
//                                 {patient.user.firstName} {patient.user.lastName}
//                               </SelectItem>
//                             ))
//                           ) : (
//                             practitioners?.map((practitioner: any) => (
//                               <SelectItem key={practitioner.id} value={practitioner.userId}>
//                                 Dr. {practitioner.user.firstName} {practitioner.user.lastName}
//                               </SelectItem>
//                             ))
//                           )}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <div>
//                       <label className="text-sm font-medium">Message Type</label>
//                       <Select 
//                         value={newMessageData.messageType} 
//                         onValueChange={(value) => setNewMessageData(prev => ({ ...prev, messageType: value }))}
//                       >
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="general">General</SelectItem>
//                           <SelectItem value="appointment_confirmation">Appointment Confirmation</SelectItem>
//                           <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
//                           <SelectItem value="appointment_cancellation">Appointment Cancellation</SelectItem>
//                           <SelectItem value="appointment_reschedule">Appointment Reschedule</SelectItem>
//                           <SelectItem value="pre_appointment_instructions">Pre-Appointment Instructions</SelectItem>
//                           <SelectItem value="follow_up_reminder">Follow-up Reminder</SelectItem>
//                           <SelectItem value="emergency_notification">Emergency Notification</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   </div>
//                   <div>
//                     <label className="text-sm font-medium">Subject</label>
//                     <Input 
//                       value={newMessageData.subject}
//                       onChange={(e) => setNewMessageData(prev => ({ ...prev, subject: e.target.value }))}
//                       placeholder="Message subject"
//                     />
//                   </div>
//                   <div>
//                     <label className="text-sm font-medium">Priority</label>
//                     <Select 
//                       value={newMessageData.priority} 
//                       onValueChange={(value) => setNewMessageData(prev => ({ ...prev, priority: value }))}
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="low">Low</SelectItem>
//                         <SelectItem value="normal">Normal</SelectItem>
//                         <SelectItem value="high">High</SelectItem>
//                         <SelectItem value="urgent">Urgent</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div>
//                     <label className="text-sm font-medium">Message</label>
//                     <Textarea 
//                       value={newMessageData.content}
//                       onChange={(e) => setNewMessageData(prev => ({ ...prev, content: e.target.value }))}
//                       placeholder="Type your message..."
//                       rows={4}
//                     />
//                   </div>
//                   <div className="flex justify-end space-x-2">
//                     <Button variant="outline" onClick={() => setNewMessageDialog(false)}>
//                       Cancel
//                     </Button>
//                     <Button 
//                       onClick={handleSendMessage}
//                       disabled={sendMessageMutation.isPending}
//                     >
//                       {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
//                     </Button>
//                   </div>
//                 </div>
//               </DialogContent>
//             </Dialog>
//           </div>
//         </CardHeader>
//       </Card>

//       {/* Main Content */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Conversations/Message List */}
//         <div className="lg:col-span-1">
//           <Card>
//             <CardHeader>
//               <Tabs value={selectedTab} onValueChange={setSelectedTab}>
//                 <TabsList className="grid w-full grid-cols-2">
//                   <TabsTrigger value="conversations">Conversations</TabsTrigger>
//                   <TabsTrigger value="messages">All Messages</TabsTrigger>
//                 </TabsList>
//               </Tabs>
              
//               <div className="flex items-center space-x-2 mt-4">
//                 <div className="relative flex-1">
//                   <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
//                   <Input
//                     placeholder="Search messages..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="pl-8"
//                   />
//                 </div>
//                 <Select value={messageFilter} onValueChange={setMessageFilter}>
//                   <SelectTrigger className="w-32">
//                     <Filter className="w-4 h-4" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">All</SelectItem>
//                     <SelectItem value="unread">Unread</SelectItem>
//                     <SelectItem value="read">Read</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </CardHeader>
//             <CardContent>
//               <TabsContent value="conversations" className="space-y-2">
//                 {filteredConversations.map((conversation) => (
//                   <div
//                     key={conversation.userId}
//                     className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
//                       selectedConversation === conversation.userId ? 'bg-accent border-primary' : ''
//                     }`}
//                     onClick={() => setSelectedConversation(conversation.userId)}
//                   >
//                     <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
//                       <span className="text-primary-foreground font-medium text-sm">
//                         {conversation.userName.split(' ').map(n => n[0]).join('')}
//                       </span>
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center justify-between">
//                         <h4 className="font-medium text-sm truncate">{conversation.userName}</h4>
//                         {conversation.unreadCount > 0 && (
//                           <Badge variant="destructive" className="text-xs">
//                             {conversation.unreadCount}
//                           </Badge>
//                         )}
//                       </div>
//                       {conversation.lastMessage && (
//                         <p className="text-xs text-muted-foreground truncate">
//                           {conversation.lastMessage.subject}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </TabsContent>
              
//               <TabsContent value="messages" className="space-y-2">
//                 {messages?.map((message: Message) => (
//                   <div
//                     key={message.id}
//                     className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
//                       message.status === 'unread' ? 'bg-blue-50 border-blue-200' : ''
//                     }`}
//                     onClick={() => handleMessageClick(message)}
//                   >
//                     <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
//                       <span className="text-primary-foreground font-medium text-xs">
//                         {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
//                       </span>
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center justify-between">
//                         <h4 className="font-medium text-sm truncate">{message.subject}</h4>
//                         <div className="flex items-center space-x-1">
//                           {getMessageTypeIcon(message.messageType)}
//                           <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
//                             {message.priority}
//                           </Badge>
//                         </div>
//                       </div>
//                       <p className="text-xs text-muted-foreground truncate">
//                         {message.content}
//                       </p>
//                       <p className="text-xs text-muted-foreground">
//                         {format(new Date(message.createdAt), "MMM dd, h:mm a")}
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </TabsContent>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Conversation Detail */}
//         <div className="lg:col-span-2">
//           <Card>
//             <CardHeader>
//               <CardTitle>
//                 {sele