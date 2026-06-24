import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Plus,
	MessageSquare,
	Search,
	Send,
	Clock,
	Calendar,
	User,
	Phone,
	Mail,
	AlertCircle,
	CheckCircle,
	Circle,
	MoreVertical,
	Paperclip,
	Smile,
	Volume2,
	VolumeX,
	ArrowLeft,
	Check,
	ChevronsUpDown
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useMessaging, type Message, type Conversation } from "@/hooks/use-messaging";
import { api } from "@/lib/api";

import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ComprehensiveMessageList() {
	const { user } = useAuth();

	const {
		messages,
		conversations,
		unreadCount,
		isConnected,
		messagesLoading,
		isSending,
		sendMessage,
		markAsRead,
		bulkMarkAsRead,
		markAllMessagesAsRead,
		markMessagesAsDelivered,
		sendTypingIndicator,
		isTyping
	} = useMessaging();

	const [, setLocation] = useLocation();

	const handleBack = () => {
		setLocation("/");
	};

	const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
	const [messageText, setMessageText] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [activeTab, setActiveTab] = useState("conversations");
	const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
	const [isSoundEnabled, setIsSoundEnabled] = useState(true);
	const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
	const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
	
	// Mobile responsive states
	const [isMobileView, setIsMobileView] = useState(false);
	const [showConversations, setShowConversations] = useState(true);
	
	const [newMessageData, setNewMessageData] = useState({
		recipientId: "",
		subject: "",
		content: "",
		messageType: "general" as "general" | "appointment_confirmation" | "appointment_reminder" | "appointment_cancellation" | "appointment_reschedule" | "pre_appointment_instructions" | "follow_up_reminder" | "emergency_notification" | "system_notification",
		priority: "normal" as const,
		appointmentId: undefined as string | undefined
	});
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const previousMessageCountRef = useRef<number>(0);
	const markedAsReadRef = useRef<Set<string>>(new Set());

	// Fetch allowed recipients for new message based on user role
	const { data: allowedRecipients, isLoading: recipientsLoading } = useQuery({
		queryKey: ["/api/messages/allowed-recipients"],
		queryFn: async () => {
			const response = await api.get("/api/messages/allowed-recipients");
			console.log("Fetched allowed recipients:", response);
			return response;
		},
		enabled: !!user,
	});

	// Fetch appointments for linking to messages
	const { data: appointments, isLoading: appointmentsLoading } = useQuery({
		queryKey: ["/api/appointments", user?.role],
		queryFn: async () => {
			// Use patient-specific endpoint for patients, general endpoint for others
			const endpoint = user?.role === 'patient' ? '/api/patient/appointments' : '/api/appointments';
			const response = await api.get(endpoint);
			return response;
		},
		enabled: !!user,
	});

	// Initialize audio for message notifications
	useEffect(() => {
		audioRef.current = new Audio('/tinhih-notification.mp3');
		audioRef.current.preload = 'auto';
		audioRef.current.volume = 0.5;
	}, []);

	// Function to play notification sound
	const playNotificationSound = async () => {
		if (audioRef.current && isSoundEnabled) {
			try {
				await audioRef.current.play();
			} catch (error) {
				console.error('Failed to play notification sound:', error);
			}
		}
	};

	// Auto-scroll to bottom and play sound when new messages arrive
	useEffect(() => {
		if (messages && messages.length > previousMessageCountRef.current && previousMessageCountRef.current > 0) {

			// Check if the new message is from another user (not the current user)
			const newMessages = messages.slice(previousMessageCountRef.current);
			const hasIncomingMessage = newMessages.some((msg: Message) => msg.senderId !== user?.id);

			newMessages.some((msg: Message) => {
				console.log("msg", msg);
				console.log("user?.id", user?.id);
				console.log("msg.senderId !== user?.id", msg.senderId !== user?.id);
				console.log("senderId", msg.senderId);
				msg.senderId !== user?.id
			})

			if (hasIncomingMessage) {
				// Only play sound for incoming messages, not sent messages
				playNotificationSound();

				// Mark incoming messages as delivered if user is online
				const incomingMessages = newMessages.filter((msg: Message) => msg.senderId !== user?.id);
				if (incomingMessages.length > 0 && isConnected) {
					markMessagesAsDelivered(incomingMessages.map((msg: Message) => msg.id));
				}
			}
		}

			// Update previous count
	previousMessageCountRef.current = messages?.length || 0;

	// Auto-scroll to bottom
	messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, user?.id, isConnected, markMessagesAsDelivered]);

	// Check for mobile view
	useEffect(() => {
		const checkMobileView = () => {
			setIsMobileView(window.innerWidth < 768); // md breakpoint
		};
		
		checkMobileView();
		window.addEventListener('resize', checkMobileView);
		
		return () => window.removeEventListener('resize', checkMobileView);
	}, []);



	// Handle back button for mobile
	const handleMobileBack = () => {
		setShowConversations(true);
		setSelectedConversation(null);
	};



	// Handle typing indicator
	useEffect(() => {
		if (selectedConversation && textareaRef.current) {
			let typingTimeout: NodeJS.Timeout;

			const handleInput = () => {
				sendTypingIndicator(selectedConversation.userId, true);

				// Clear existing timeout
				if (typingTimeout) {
					clearTimeout(typingTimeout);
				}

				// Set timeout to stop typing indicator after 3 seconds
				typingTimeout = setTimeout(() => {
					sendTypingIndicator(selectedConversation.userId, false);
				}, 3000);
			};

			const handleBlur = () => {
				sendTypingIndicator(selectedConversation.userId, false);
				if (typingTimeout) {
					clearTimeout(typingTimeout);
				}
			};

			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === 'Enter' && !e.shiftKey) {
					sendTypingIndicator(selectedConversation.userId, false);
					if (typingTimeout) {
						clearTimeout(typingTimeout);
					}
				}
			};

			textareaRef.current.addEventListener('input', handleInput);
			textareaRef.current.addEventListener('blur', handleBlur);
			textareaRef.current.addEventListener('keydown', handleKeyDown);

			return () => {
				if (textareaRef.current) {
					textareaRef.current.removeEventListener('input', handleInput);
					textareaRef.current.removeEventListener('blur', handleBlur);
					textareaRef.current.removeEventListener('keydown', handleKeyDown);
				}
				if (typingTimeout) {
					clearTimeout(typingTimeout);
				}
			};
		}
	}, [selectedConversation, sendTypingIndicator]);

	// Track online users via API
	useEffect(() => {
		if (!isConnected) return;

		const checkOnlineStatus = async () => {
			try {
				const response = await api.get("/api/websocket/online-users");
				const onlineUserIds = new Set(response as string[]);
				setOnlineUsers(onlineUserIds);
			} catch (error) {
				console.error("Error fetching online users:", error);
			}
		};

		checkOnlineStatus();
		const interval = setInterval(checkOnlineStatus, 10000); // Check every 10 seconds

		return () => clearInterval(interval);
	}, [isConnected]);

	// Filter conversations based on search with deduplication
	const filteredConversations = conversations
		// Remove duplicates based on userId
		.filter((conv, index, self) =>
			index === self.findIndex(c => c.userId === conv.userId)
		)
		.filter(conv =>
			conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			conv.lastMessage?.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
			conv.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
		);

	// Get messages for selected conversation with deduplication
	const conversationMessages = messages?.filter((msg: Message) => {
		// If conversation is appointment-based, filter by appointment ID
		if (selectedConversation?.appointmentId) {
			return msg.appointmentId === selectedConversation.appointmentId;
		}
		// Otherwise, filter by user ID (general conversation)
		return (msg.senderId === selectedConversation?.userId && msg.recipientId === user?.id) ||
			(msg.senderId === user?.id && msg.recipientId === selectedConversation?.userId);
	})
		// Remove duplicates based on message ID
		.filter((msg: Message, index: number, self: Message[]) =>
			index === self.findIndex(m => m.id === msg.id)
		)
		.sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) || [];

	// Mark messages as read when conversation is viewed
	useEffect(() => {
		if (selectedConversation && conversationMessages.length > 0) {
			// Check if we've already marked this conversation as read
			const conversationKey = selectedConversation.userId;
			if (markedAsReadRef.current.has(conversationKey)) {
				return; // Already marked as read, skip
			}

			// Find unread messages in this conversation
			const unreadMessages = conversationMessages.filter((msg: Message) =>
				msg.status === 'unread' &&
				msg.senderId === selectedConversation.userId &&
				msg.recipientId === user?.id
			);

			if (unreadMessages.length > 0) {
				// Mark all unread messages in this conversation as read
				markAllMessagesAsRead(selectedConversation.userId);
				// Mark this conversation as processed
				markedAsReadRef.current.add(conversationKey);
			}
		}
	}, [selectedConversation, user?.id, markAllMessagesAsRead]);

	// Clear marked as read set when user changes
	useEffect(() => {
		markedAsReadRef.current.clear();
	}, [user?.id]);

	// Handle sending message
	const handleSendMessage = () => {
		if (!messageText.trim() || !selectedConversation) return;

		// Optimistically add message to UI
		const optimisticMessage: Message = {
			id: `temp-${Date.now()}`,
			senderId: user?.id || '',
			recipientId: selectedConversation.userId,
			subject: "Message",
			content: messageText.trim(),
			messageType: selectedConversation.appointmentId ? "appointment_confirmation" : "general",
			status: 'read',
			isSystemMessage: false,
			priority: "normal",
			deliveryStatus: 'sent',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			sender: {
				id: user?.id || '',
				firstName: user?.firstName || '',
				lastName: user?.lastName || '',
				email: user?.email || '',
				role: user?.role || ''
			},
			recipient: {
				id: selectedConversation.userId,
				firstName: selectedConversation.userName.split(' ')[0] || '',
				lastName: selectedConversation.userName.split(' ')[1] || '',
				email: '',
				role: selectedConversation.userRole
			},
			appointmentId: selectedConversation.appointmentId || undefined
		};

		// Add optimistic message to local state
		const tempMessageText = messageText.trim();
		setMessageText("");

		sendMessage({
			recipientId: selectedConversation.userId,
			subject: "Message",
			content: tempMessageText,
			messageType: selectedConversation.appointmentId ? "appointment_confirmation" : "general",
			priority: "normal",
			appointmentId: selectedConversation.appointmentId || undefined
		});
	};

	// Handle key press in textarea
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Mark conversation as read and delivered
	const handleConversationSelect = async (conversation: Conversation) => {
		setSelectedConversation(conversation);
		
		// Handle mobile view navigation
		if (isMobileView) {
			setShowConversations(false);
		}
		setMarkingAsRead(conversation.userId);

		// Clear the marked as read set for this conversation to allow new messages to be marked
		markedAsReadRef.current.delete(conversation.userId);

		// Find all unread messages from this specific conversation (considering appointmentId)
		const unreadMessages = messages?.filter((msg: Message) =>
			msg.status === 'unread' &&
			msg.senderId === conversation.userId &&
			msg.recipientId === user?.id &&
			msg.appointmentId === conversation.appointmentId // Only mark messages from this specific conversation
		) || [];

		if (unreadMessages.length > 0) {
			// Use bulk mark as read to mark all messages from this conversation as read
			bulkMarkAsRead({
				senderId: conversation.userId,
				appointmentId: conversation.appointmentId
			});

			// Also mark messages as delivered if they're still in 'sent' status
			const sentMessages = messages?.filter((msg: Message) =>
				msg.deliveryStatus === 'sent' &&
				msg.senderId === conversation.userId &&
				msg.recipientId === user?.id &&
				msg.appointmentId === conversation.appointmentId // Only mark messages from this specific conversation
			) || [];

			if (sentMessages.length > 0) {
				// Mark messages as delivered
				markMessagesAsDelivered(sentMessages.map((msg: Message) => msg.id));
			}

			// Mark this conversation as processed
			markedAsReadRef.current.add(conversation.userId);
		}

		// Clear loading state after a short delay
		setTimeout(() => {
			setMarkingAsRead(null);
		}, 500);
	};

	// Get message priority color
	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'urgent': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
			case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20';
			case 'normal': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
			case 'low': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50';
			default: return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
		}
	};

	// Get message type icon
	const getMessageTypeIcon = (messageType: string) => {
		switch (messageType) {
			case 'appointment_confirmation':
			case 'appointment_reminder':
			case 'appointment_cancellation':
			case 'appointment_reschedule':
				return <Calendar className="w-4 h-4" />;
			case 'emergency_notification':
				return <AlertCircle className="w-4 h-4 text-red-500" />;
			case 'system_notification':
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			default:
				return <MessageSquare className="w-4 h-4" />;
		}
	};

	// Helper function to check if a user is online via WebSocket
	const isUserOnline = (userId: string): boolean => {
		return onlineUsers.has(userId);
	};

	// Helper function to format message timestamps (UTC to local)
	const formatMessageTime = (utcTimestamp: string) => {
		const localDate = new Date(utcTimestamp);
		return format(localDate, "MMM dd, yyyy 'at' HH:mm");
	};

	const formatMessageTimeShort = (utcTimestamp: string) => {
		const localDate = new Date(utcTimestamp);
		return format(localDate, "HH:mm");
	};

	// Function to render message status indicators (WhatsApp-like)
	const renderMessageStatus = (message: Message) => {
		if (message.senderId !== user?.id) return null; // Only show for own messages

		switch (message.deliveryStatus) {
			case 'sent':
				return <CheckCircle className="w-3 h-3 text-gray-400" />;
			case 'delivered':
				return <CheckCircle className="w-3 h-3 text-blue-500" />;
			case 'read':
				return <CheckCircle className="w-3 h-3 text-[#ffdd00] ring-1 rounded-full ring-black p-0" fill="#000" />;
			default:
				return <CheckCircle className="w-3 h-3 text-gray-400" />;
		}
	};

	if (messagesLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="animate-pulse">
								<div className="flex items-center space-x-4 p-4 border rounded-lg">
									<div className="w-12 h-12 bg-slate-300 rounded-full"></div>
									<div className="flex-1 space-y-2">
										<div className="h-4 bg-slate-300 rounded w-1/3"></div>
										<div className="h-3 bg-slate-300 rounded w-2/3"></div>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="flex h-full max:h-[calc(100vh-80px)]">

			{/* Left Sidebar - Conversations */}
			<div className={cn(
				"border-r bg-background flex flex-col",
				isMobileView ? "w-full" : "w-82",
				isMobileView && !showConversations && "hidden"
			)}>
				<div className="mt-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleBack}
						className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="w-4 h-4" />
						Go back
					</Button>
				</div>
				<div className="p-2 border-b">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-lg font-semibold">Messages</h2>
						</div>

						<div className="flex items-center justify-between space-x-2">
							<Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
								{isConnected ? "Online" : "Offline"}
							</Badge>
							{/* {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )} */}
							{/* <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className="h-8 w-8 p-0"
                title={isSoundEnabled ? "Disable sound" : "Enable sound"}
              >
                {isSoundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button> */}
							<Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
								<DialogTrigger asChild>
									<Button size="sm" className="size-6">
										<Plus className="w-4 h-4" />
									</Button>
								</DialogTrigger>
								<DialogContent className="max-w-2xl">
									<DialogHeader>
										<DialogTitle>Send New Message</DialogTitle>
										<DialogDescription>Let's make a message</DialogDescription>
									</DialogHeader>
									<div className="space-y-4">
										{/* For Admin/Staff: Show searchable recipient selection */}
										{(user?.role === 'admin' || user?.role === 'staff') && (
											<div className="grid grid-cols-2 gap-4">
												<div>
													<label className="text-sm font-medium">Recipient</label>
													<Popover>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																role="combobox"
																className="w-full justify-between"
															>
																{newMessageData.recipientId
																	? allowedRecipients?.find((recipient: any) => recipient.id === newMessageData.recipientId)?.displayName
																	: "Select recipient..."}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-full p-0">
															<Command>
																<CommandInput placeholder="Search recipients by name or email..." />
																<CommandList>
																	<CommandEmpty>No recipients found.</CommandEmpty>
																	<CommandGroup>
																		{recipientsLoading ? (
																			<CommandItem disabled>Loading recipients...</CommandItem>
																		) : allowedRecipients && allowedRecipients.length > 0 ? (
																			allowedRecipients.map((recipient: any, index: number) => (
																				<CommandItem
																					key={`recipient-admin-${recipient.id}-${index}`}
																					value={recipient.displayName}
																					onSelect={() => {
																						setNewMessageData(prev => ({ ...prev, recipientId: recipient.id }));
																					}}
																				>
																					<Check
																						className={cn(
																							"mr-2 h-4 w-4",
																							newMessageData.recipientId === recipient.id ? "opacity-100" : "opacity-0"
																						)}
																					/>
																					{recipient.displayName}
																				</CommandItem>
																			))
																		) : (
																			<CommandItem disabled>No recipients available</CommandItem>
																		)}
																	</CommandGroup>
																</CommandList>
															</Command>
														</PopoverContent>
													</Popover>
												</div>
												<div>
													<label className="text-sm font-medium">Message Type</label>
													<Select
														value={newMessageData.messageType}
														onValueChange={(value: any) => setNewMessageData(prev => ({ ...prev, messageType: value }))}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="general">General</SelectItem>
															<SelectItem value="appointment_confirmation">Appointment Confirmation</SelectItem>
															<SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
															<SelectItem value="appointment_cancellation">Appointment Cancellation</SelectItem>
															<SelectItem value="appointment_reschedule">Appointment Reschedule</SelectItem>
															<SelectItem value="pre_appointment_instructions">Pre-Appointment Instructions</SelectItem>
															<SelectItem value="follow_up_reminder">Follow-up Reminder</SelectItem>
															<SelectItem value="emergency_notification">Emergency Notification</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>
										)}

										{/* For Practitioner/Patient: Show searchable appointment-based messaging */}
										{(user?.role === 'practitioner' || user?.role === 'patient') && (
											<div>
												<label className="text-sm font-medium">Select Appointment to Message About</label>
												<Popover>
													<PopoverTrigger asChild>
														<Button
															variant="outline"
															role="combobox"
															className="w-full justify-between"
														>
															{newMessageData.appointmentId
																? (() => {
																	const appointment = appointments?.find((apt: any) => apt.id === newMessageData.appointmentId);
																	if (appointment) {
																		const otherParty = user?.role === 'practitioner'
																			? appointment.patient
																			: appointment.practitioner;
																		return `${appointment.title} - ${format(new Date(appointment.appointmentDate), "MMM dd, yyyy HH:mm")}${otherParty?.user ? ` (${otherParty.user.firstName} ${otherParty.user.lastName})` : ''}`;
																	}
																	return "Select appointment...";
																})()
																: "Select an appointment to start conversation"}
															<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-full p-0">
														<Command>
															<CommandInput placeholder="Search appointments by title, date, or participant name..." />
															<CommandList>
																<CommandEmpty>No appointments found.</CommandEmpty>
																<CommandGroup>
																	{appointmentsLoading ? (
																		<CommandItem disabled>Loading appointments...</CommandItem>
																	) : appointments && appointments.length > 0 ? (
																		appointments.map((appointment: any) => {
																			const otherParty = user?.role === 'practitioner'
																				? appointment.patient
																				: appointment.practitioner;
																			const displayText = `${appointment.title} - ${format(new Date(appointment.appointmentDate), "MMM dd, yyyy HH:mm")}${otherParty?.user ? ` (${otherParty.user.firstName} ${otherParty.user.lastName})` : ''}`;

																			return (
																				<CommandItem
																					key={appointment.id}
																					value={displayText}
																					onSelect={() => {
																						if (appointment) {
																							// Set recipient based on user role
																							if (user?.role === 'practitioner') {
																								// Practitioner messaging patient
																								setNewMessageData(prev => ({
																									...prev,
																									appointmentId: appointment.id,
																									recipientId: appointment.patient?.userId || '',
																									messageType: 'appointment_confirmation'
																								}));
																							} else if (user?.role === 'patient') {
																								// Patient messaging practitioner
																								setNewMessageData(prev => ({
																									...prev,
																									appointmentId: appointment.id,
																									recipientId: appointment.practitioner?.userId || '',
																									messageType: 'appointment_confirmation'
																								}));
																							}
																						}
																					}}
																				>
																					<Check
																						className={cn(
																							"mr-2 h-4 w-4",
																							newMessageData.appointmentId === appointment.id ? "opacity-100" : "opacity-0"
																						)}
																					/>
																					{displayText}
																				</CommandItem>
																			);
																		})
																	) : (
																		<CommandItem disabled>No appointments found</CommandItem>
																	)}
																</CommandGroup>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>

												{newMessageData.appointmentId && newMessageData.appointmentId !== 'none' && newMessageData.appointmentId !== 'loading' && newMessageData.appointmentId !== 'no-appointments' && (
													<div className="mt-2 p-3 bg-muted/50 rounded-lg">
														<p className="text-sm text-muted-foreground">
															You'll be messaging about this appointment. The recipient will be automatically selected.
														</p>
													</div>
												)}

												{/* Direct recipient selection for practitioners and patients */}
												<div className="mt-4">
													<label className="text-sm font-medium">Or Select Recipient Directly</label>
													<Popover>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																role="combobox"
																className="w-full justify-between"
															>
																{newMessageData.recipientId
																	? allowedRecipients?.find((recipient: any) => recipient.id === newMessageData.recipientId)?.displayName
																	: "Select recipient directly..."}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-full p-0">
															<Command>
																<CommandInput placeholder="Search recipients by name or email..." />
																<CommandList>
																	<CommandEmpty>No recipients found.</CommandEmpty>
																	<CommandGroup>
																		{recipientsLoading ? (
																			<CommandItem disabled>Loading recipients...</CommandItem>
																		) : allowedRecipients && allowedRecipients.length > 0 ? (
																			allowedRecipients.map((recipient: any, index: number) => (
																				<CommandItem
																					key={`recipient-practitioner-${recipient.id}-${index}`}
																					value={recipient.displayName}
																					onSelect={() => {
																						setNewMessageData(prev => ({
																							...prev,
																							recipientId: recipient.id,
																							appointmentId: undefined // Clear appointment when selecting direct recipient
																						}));
																					}}
																				>
																					<Check
																						className={cn(
																							"mr-2 h-4 w-4",
																							newMessageData.recipientId === recipient.id ? "opacity-100" : "opacity-0"
																						)}
																					/>
																					{recipient.displayName}
																				</CommandItem>
																			))
																		) : (
																			<CommandItem disabled>No recipients available</CommandItem>
																		)}
																	</CommandGroup>
																</CommandList>
															</Command>
														</PopoverContent>
													</Popover>
												</div>
											</div>
										)}

										{/* Appointment Selection for Admin/Staff */}
										{(user?.role === 'admin' || user?.role === 'staff') && (newMessageData.messageType !== 'general' && newMessageData.messageType !== 'emergency_notification' && newMessageData.messageType !== 'system_notification') && (
											<div>
												<label className="text-sm font-medium">Link to Appointment (Optional)</label>
												<Popover>
													<PopoverTrigger asChild>
														<Button
															variant="outline"
															role="combobox"
															className="w-full justify-between"
														>
															{newMessageData.appointmentId
																? (() => {
																	const appointment = appointments?.find((apt: any) => apt.id === newMessageData.appointmentId);
																	return appointment
																		? `${appointment.title} - ${format(new Date(appointment.appointmentDate), "MMM dd, yyyy HH:mm")}`
																		: "Select appointment...";
																})()
																: "Select appointment to link"}
															<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-full p-0">
														<Command>
															<CommandInput placeholder="Search appointments by title, date, or participant..." />
															<CommandList>
																<CommandEmpty>No appointments found.</CommandEmpty>
																<CommandGroup>
																	<CommandItem
																		value="No appointment linked"
																		onSelect={() => setNewMessageData(prev => ({ ...prev, appointmentId: undefined }))}
																	>
																		<Check
																			className={cn(
																				"mr-2 h-4 w-4",
																				!newMessageData.appointmentId ? "opacity-100" : "opacity-0"
																			)}
																		/>
																		No appointment linked
																	</CommandItem>
																	{appointmentsLoading ? (
																		<CommandItem disabled>Loading appointments...</CommandItem>
																	) : appointments && appointments.length > 0 ? (
																		appointments.map((appointment: any) => {
																			const displayText = `${appointment.title} - ${format(new Date(appointment.appointmentDate), "MMM dd, yyyy HH:mm")}`;

																			return (
																				<CommandItem
																					key={`appointment-admin-${appointment.id}`}
																					value={displayText}
																					onSelect={() => setNewMessageData(prev => ({ ...prev, appointmentId: appointment.id }))}
																				>
																					<Check
																						className={cn(
																							"mr-2 h-4 w-4",
																							newMessageData.appointmentId === appointment.id ? "opacity-100" : "opacity-0"
																						)}
																					/>
																					{displayText}
																				</CommandItem>
																			);
																		})
																	) : (
																		<CommandItem disabled>No appointments found</CommandItem>
																	)}
																</CommandGroup>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>
											</div>
										)}
										<div>
											<label className="text-sm font-medium">Subject</label>
											<Input
												value={newMessageData.subject}
												onChange={(e) => setNewMessageData(prev => ({ ...prev, subject: e.target.value }))}
												placeholder="Message subject"
											/>
										</div>
										<div>
											<label className="text-sm font-medium">Priority</label>
											<Select
												value={newMessageData.priority}
												onValueChange={(value: any) => setNewMessageData(prev => ({ ...prev, priority: value }))}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="low">Low</SelectItem>
													<SelectItem value="normal">Normal</SelectItem>
													<SelectItem value="high">High</SelectItem>
													<SelectItem value="urgent">Urgent</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div>
											<label className="text-sm font-medium">Message</label>
											<Textarea
												value={newMessageData.content}
												onChange={(e) => setNewMessageData(prev => ({ ...prev, content: e.target.value }))}
												placeholder="Type your message..."
												rows={4}
											/>
										</div>
										<div className="flex justify-end space-x-2">
											<Button variant="outline" onClick={() => setShowNewMessageDialog(false)}>
												Cancel
											</Button>
											<Button
												onClick={() => {
													// Different validation for different roles
													if (user?.role === 'admin' || user?.role === 'staff') {
														// Admin/Staff validation
														if (!newMessageData.recipientId || !newMessageData.subject || !newMessageData.content) {
															// Only show validation error toast, not success toast
															return;
														}
													} else if (user?.role === 'practitioner' || user?.role === 'patient') {
														// Practitioner/Patient validation - can use either appointment or direct recipient
														if (!newMessageData.recipientId || !newMessageData.subject || !newMessageData.content) {
															// Only show validation error toast, not success toast
															return;
														}
													}

													// Prepare message data with proper appointmentId handling
													const messageData = {
														...newMessageData,
														appointmentId: newMessageData.appointmentId || undefined
													};

													sendMessage(messageData);
													setNewMessageData({
														recipientId: "",
														subject: "",
														content: "",
														messageType: "general",
														priority: "normal",
														appointmentId: undefined
													});
													setShowNewMessageDialog(false);
												}}
												disabled={isSending}
											>
												{isSending ? "Sending..." : "Send Message"}
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					</div>

					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
						<Input
							placeholder="Search conversations..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="conversations">Conversations</TabsTrigger>
						<TabsTrigger value="all-messages">All Messages</TabsTrigger>
					</TabsList>

					<TabsContent value="conversations" className="mt-0 flex-1">
						<ScrollArea className="h-full">
							<div className="p-2">
								{filteredConversations.length > 0 ? (
									filteredConversations.map((conversation) => (
										<div
											className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${selectedConversation?.userId === conversation.userId
												? "bg-primary/10 border border-primary/20 shadow-sm"
												: "hover:bg-muted/50 border border-transparent"
												}`}
											onClick={() => handleConversationSelect(conversation)}
										>
											<div className="flex items-center space-x-3">
												<div className="relative">
													<Avatar className="w-8 h-8 ring-2 ring-primary/10">
														<AvatarImage src="" />
														<AvatarFallback className="bg-primary/10 text-primary font-semibold">
															{conversation.userName[0]}
														</AvatarFallback>
													</Avatar>
													{isUserOnline(conversation.userId) && (
														<div className="absolute bottom-0 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
													)}
												</div>

												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between mb-1" onClick={() => handleConversationSelect(conversation)}>
														<h3 className="font-semibold text-xs truncate">
															{conversation.userName}
														</h3>
														<div className="flex text-[10px] items-center space-x-2">
															{markingAsRead === conversation.userId ? (
																<div className="flex items-center space-x-1">
																	{/* <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
																	<span className="text-xs text-blue-600 dark:text-blue-400">Marking as read...</span> */}
																</div>
															) : (
																<>
																	{conversation.unreadCount > 0 && (
																		<Badge variant="destructive" className="text-xs px-2 py-0.5">
																			{conversation.unreadCount}
																		</Badge>
																	)}
																	{conversation.lastMessage && (
																		<span className="text-xs text-muted-foreground">
																			{formatMessageTimeShort(conversation.lastMessage.createdAt)}
																		</span>
																	)}
																</>
															)}
														</div>
													</div>

													<div className="flex items-center space-x-2 mb-1">
														<Badge variant="outline" className="text-[10px] px-2 py-0.5">
															{conversation.userRole}
														</Badge>
														{isUserOnline(conversation.userId) && (
															<span className="text-xs text-green-600 dark:text-green-400 font-medium">• Online</span>
														)}
													</div>

													{isTyping(conversation.userId) ? (
														<div className="mt-2">
															<div className="flex space-x-1">
																<div className="size-2 bg-gray-500/40 dark:bg-[#ffdd00] bg-black rounded-full animate-bounce"></div>
																<div className="size-2 bg-gray-500/40 dark:bg-[#ffdd00] bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
																<div className="size-2 bg-gray-500/40 dark:bg-[#ffdd00] bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
															</div>
														</div>
													) : conversation.lastMessage && (
														<div className="flex items-center space-x-2">
															{getMessageTypeIcon(conversation.lastMessage.messageType)}
															<p className="text-xs text-muted-foreground truncate flex-1">
																{conversation.lastMessage.content}
															</p>
														</div>
													)}
												</div>
											</div>
										</div>
									))
								) : (
									<div className="text-center py-8 text-muted-foreground">
										<MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
										<p className="mb-2">No conversations found</p>
										<p className="text-xs mb-4">Start a conversation by sending a message</p>
										<Button
											size="sm"
											onClick={() => setShowNewMessageDialog(true)}
											className="text-xs"
										>
											<Plus className="w-3 h-3 mr-1" />
											Start Conversation
										</Button>
									</div>
								)}
							</div>
						</ScrollArea>
					</TabsContent>

					<TabsContent value="all-messages" className="mt-0 flex-1">
						<ScrollArea className="h-full">
							<div className="p-2">
								{messages && messages.length > 0 ? (
									// Remove duplicates from messages array
									messages
										.filter((message: Message, index: number, self: Message[]) =>
											index === self.findIndex(m => m.id === message.id)
										)
										.map((message: Message, index: number) => (
											<Tooltip key={`message-all-${message.id}-${index}`}>
												<TooltipTrigger asChild>
													<div className={`p-3 rounded-lg cursor-pointer transition-colors ${message.status === "unread"
														? "bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800"
														: "hover:bg-accent/50"
														}`}
														onClick={() => {
															// Mark message as read if unread
															if (message.status === 'unread') {
																markAsRead(message.id);
															}

															// Open conversation with the sender/recipient
															const otherUserId = message.senderId === user?.id ? message.recipientId : message.senderId;
															const otherUser = message.senderId === user?.id ? message.recipient : message.sender;

															if (otherUser) {
																const conversation: Conversation = {
																	userId: otherUserId,
																	userName: `${otherUser.firstName} ${otherUser.lastName}`,
																	userRole: otherUser.role,
																	lastMessage: message,
																	unreadCount: 0, // Will be recalculated
																	isOnline: false
																};

																handleConversationSelect(conversation);
																setActiveTab("conversations"); // Switch to conversations tab
															}
														}}
													>
														<div className="flex items-start space-x-3">
															<Avatar className="w-8 h-8">
																<AvatarImage src="" />
																<AvatarFallback>
																	{message.sender?.firstName?.charAt(0)}{message.sender?.lastName?.charAt(0)}
																</AvatarFallback>
															</Avatar>

															<div className="flex-1 min-w-0">
																<div className="flex items-center justify-between">
																	<h3 className="font-medium text-sm">
																		{message.sender?.firstName} {message.sender?.lastName}
																	</h3>
																	<div className="flex items-center space-x-1">
																		{getMessageTypeIcon(message.messageType)}
																		<Badge
																			variant="secondary"
																			className={`text-xs ${getPriorityColor(message.priority)}`}
																		>
																			{message.priority}
																		</Badge>
																	</div>
																</div>

																<h4 className="text-sm font-medium text-foreground mt-1">
																	{message.subject}
																</h4>

																<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
																	{message.content}
																</p>

																<div className="flex items-center justify-between mt-2">
																	<span className="text-xs text-muted-foreground">
																		{formatMessageTime(message.createdAt)}
																	</span>
																	{message.status === "unread" && (
																		<Circle className="w-3 h-3 text-blue-500 dark:text-blue-400 fill-current" />
																	)}
																</div>
															</div>
														</div>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<div className="space-y-1">
														<p className="font-medium">{message.sender?.firstName} {message.sender?.lastName}</p>
														<p className="text-xs text-muted-foreground">{message.subject}</p>
														<p className="text-xs text-muted-foreground">
															Sent: {formatMessageTime(message.createdAt)}
														</p>
														{message.deliveryStatus && (
															<p className="text-xs text-muted-foreground">
																Status: {message.deliveryStatus}
															</p>
														)}
														{message.status === 'unread' && (
															<p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
																Unread
															</p>
														)}
														<p className="text-xs text-muted-foreground">
															Click to open conversation
														</p>
													</div>
												</TooltipContent>
											</Tooltip>
										))
								) : (
									<div className="text-center py-8 text-muted-foreground">
										<MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
										<p>No messages found</p>
									</div>
								)}
							</div>
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</div>

			{/* Right Side - Message Thread */}
			<div className={cn(
				"flex flex-col overflow-hidden h-[calc(100vh-92px)]",
				isMobileView ? "w-full" : "flex-1",
				isMobileView && showConversations && "hidden"
			)}>
				{selectedConversation ? (
					<>
						{/* Conversation Header - Fixed */}
						<div className="p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									{/* Mobile Back Button */}
									{isMobileView && (
										<Button
											variant="ghost"
											size="sm"
											onClick={handleMobileBack}
											className="mr-2"
										>
											<ArrowLeft className="w-4 h-4" />
										</Button>
									)}
									<div className="relative">
										<Avatar className="w-6 h-6 ring-2 ring-[#ffdd00]">
											<AvatarImage src="" />
											<AvatarFallback className="bg-[#ffdd00]/30 text-black font-semibold text-sm">
												{selectedConversation.userName.split(' ').map(n => n[0]).join('')}
											</AvatarFallback>
										</Avatar>
										{selectedConversation.isOnline && (
											<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
										)}
									</div>

									<div>
										<h3 className="font-semibold text-xs">{selectedConversation.userName}</h3>
										<div className="flex items-center space-x-2">
											<Badge variant="outline" className="text-[10px]">
												{selectedConversation.userRole}
											</Badge>
											{isUserOnline(selectedConversation.userId) && (
												<span className="text-xs text-green-600 dark:text-green-400 font-medium">• Online</span>
											)}
										</div>
									</div>
								</div>

								<div className="flex items-center space-x-2">
									{isTyping(selectedConversation.userId) && (
										<div className="flex items-center space-x-1 px-3 py-1 bg-muted rounded-full">
											<div className="flex space-x-1">
												<div className="w-2 h-2 bg-gray-500/40 dark:bg-[#ffdd00] rounded-full animate-bounce"></div>
												<div className="w-2 h-2 bg-gray-500/40 dark:bg-[#ffdd00] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
												<div className="w-2 h-2 bg-gray-500/40 dark:bg-[#ffdd00] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
											</div>
										</div>
									)}
									<Button variant="ghost" size="sm" className="rounded-full">
										<MoreVertical className="w-4 h-4" />
									</Button>
								</div>
							</div>
						</div>

						{/* Messages - Scrollable Area */}
						<ScrollArea className="flex-1 overflow-y-auto h-[calc(100vh-100px)]">
							<div className="space-y-1 pr-2">
								{conversationMessages.map((message: Message, index: number) => {
									const isOwnMessage = message.senderId === user?.id;
									const showSenderInfo = !isOwnMessage && (
										index === 0 ||
										conversationMessages[index - 1]?.senderId !== message.senderId
									);

									return (
										<div
											key={`message-conversation-${message.id}-${index}`}
											className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
										>
											<div className={`flex flex-col max-w-xs lg:max-w-md ${isOwnMessage ? 'items-end' : 'items-start'}`}>
												{/* Sender info for other person's messages */}
												{showSenderInfo && (
													<div className="flex items-center space-x-2 px-2">
														<Avatar className="w-6 h-6 border p-3 bg-[#ffdd00]/50 border-[#ffdd00]">
															<AvatarImage src="" />
															<AvatarFallback className="text-xs">
																{message.sender?.firstName?.charAt(0)}{message.sender?.lastName?.charAt(0)}
															</AvatarFallback>
														</Avatar>
														<span className="text-[11px] font-medium text-muted-foreground">
															{message.sender?.firstName} {message.sender?.lastName}
														</span>
													</div>
												)}

												{/* Message bubble */}
												<div
													className={`px-2 py-1 rounded-2xl shadow-sm ${isOwnMessage
														? 'bg-[#ffdd00]/70 text-foreground rounded-br-md'
														: 'ml-10 bg-[#ffdd00]/30 text-foreground rounded-bl-md'
														}`}
												>
													{/* Message type indicator */}
													{message.messageType !== 'general' && (
														<div className="flex items-center space-x-1">
															{getMessageTypeIcon(message.messageType)}
															<span className="text-[11px] opacity-70">
																{message.messageType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
															</span>
														</div>
													)}

													{/* Message content */}
													<p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

													{/* Appointment link info - only show in first message */}
													{message.appointment && index === 0 && (
														<div className="mt-2 p-1 bg-muted/50 dark:bg-muted/30 rounded-lg border-l-2 border-primary">
															<div className="flex items-center space-x-2">
																<Calendar className="w-4 h-4 text-primary" />
																<div className="flex-1">
																	<p className="text-xs font-medium text-primary">Linked Appointment</p>
																	<p className="text-xs text-muted-foreground">{message.appointment.title}</p>
																	<p className="text-xs text-muted-foreground">
																		{format(new Date(message.appointment.appointmentDate), "MMM dd, yyyy 'at' HH:mm")}
																	</p>
																</div>
															</div>
														</div>
													)}

													{/* Message metadata */}
													<div className="flex items-center justify-between mt-1 text-[10px] opacity-60">
														{isOwnMessage && (
															<div className="flex space-x-1 ml-auto">
																{renderMessageStatus(message)}
															</div>
														)}
													</div>
												</div>
											</div>
										</div>
									);
								})}
								<div ref={messagesEndRef} />
							</div>
						</ScrollArea>

						{/* Message Input - Fixed Footer */}
						<div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
							<div className="flex items-center space-x-3">
								<div className="flex-1">
									<div className="relative flex items-center">
										<Textarea
											ref={textareaRef}
											placeholder="Type your message..."
											value={messageText}
											onChange={(e) => setMessageText(e.target.value)}
											onKeyPress={handleKeyPress}
											className="min-h-[60px] max-h-[120px] resize-none rounded-2xl border-2 focus:border-primary/50 transition-colors pr-20"
											rows={1}
										/>
										<div className="absolute bottom-2 right-2 flex items-center space-x-1">
											<Button disabled
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0 rounded-full hover:bg-muted"
											>
												<Paperclip className="w-4 h-4" />
											</Button>
											<Button disabled
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0 rounded-full hover:bg-muted"
											>
												<Smile className="w-4 h-4" />
											</Button>
										</div>
									</div>
								</div>
								<Button
									onClick={handleSendMessage}
									disabled={!messageText.trim() || isSending}
									size="lg"
									className="h-12 w-12 rounded-full p-0 shadow-lg hover:shadow-xl transition-all duration-200"
								>
									{isSending ? (
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									) : (
										<Send className="w-5 h-5" />
									)}
								</Button>
							</div>

							{/* Message tips */}
							<div className="mt-2 text-xs text-muted-foreground text-center">
								Press Enter to send, Shift+Enter for new line
							</div>
						</div>
					</>
				) : (
					<div className="flex items-center justify-center h-full">
						<div className="text-center mt-10">
							<MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
							<h3 className="text-lg font-medium text-muted-foreground mb-2">
								Select a conversation
							</h3>
							<p className="text-sm text-muted-foreground">
								Choose a conversation from the list to start messaging
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
