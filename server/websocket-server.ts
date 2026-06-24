import { WebSocketServer, WebSocket } from 'ws';
import { pushNotificationService } from './push-notification-service';
import { verifyTokenForWebSocket } from './auth-middleware';

interface AuthenticatedWebSocket extends WebSocket {
	userId?: string;
	isAuthenticated?: boolean;
	sessionId?: string;
	role?: 'patient' | 'practitioner';
	channel?: string;
}

interface SignalingMessage {
	type: 'offer' | 'answer' | 'ice-candidate' | 'join_meeting' | 'participant_joined' | 'participant_left' | 'meeting_ended' | 'error';
	from: string;
	to: string;
	sessionId: string;
	userId?: string;
	userRole?: 'patient' | 'practitioner';
	userName?: string;
	offer?: RTCSessionDescriptionInit;
	answer?: RTCSessionDescriptionInit;
	candidate?: RTCIceCandidateInit;
	data?: any;
}

interface MessageData {
	type: 'new_message' | 'message_read' | 'typing_start' | 'typing_stop' | 'message_deleted';
	from: string;
	to: string;
	messageId?: string;
	content?: string;
	subject?: string;
	appointmentId?: string;
	messageType?: string;
	data?: any;
}

export class WebSocketNotificationServer {
	private wss: WebSocketServer;
	private port: number;
	private telehealthSessions: Map<string, Set<string>> = new Map(); // sessionId -> Set of client IDs
	// Cache of the user's last active telehealth session (set by HTTP routes)
	public activeSessionByUser: Map<string, { sessionId: string; role: 'patient' | 'practitioner' }> = new Map();

	constructor(port: number = 8080) {
		this.port = port;
		this.wss = new WebSocketServer({ port });
		this.initialize();
	}

	private initialize() {
		console.log(`WebSocket server starting on port ${this.port}`);

		this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {

			console.log('WebSocket Server: Request URL:', request.url);

			// Extract parameters from query
			const url = new URL(request.url || '', `http://localhost:${this.port}`);
			const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');
			const sessionId = url.searchParams.get('sessionId');
			const userId = url.searchParams.get('userId');
			const role = url.searchParams.get('role') as 'patient' | 'practitioner' | null;
			const channel = url.searchParams.get('channel') || 'default';

			console.log('WebSocket Server: Token extracted:', token ? 'Present' : 'Missing');
			console.log('WebSocket Server: Session ID from URL:', sessionId);
			console.log('WebSocket Server: User ID from URL:', userId);
			console.log('WebSocket Server: Role from URL:', role);
			console.log('WebSocket Server: Channel from URL:', channel);
			console.log('WebSocket Server: Will also check cached active session');

			if (!token) {
				console.log('WebSocket Server: No token provided, closing connection');
				ws.close(1008, 'Authentication required');
				return;
			}

			// Verify the token
			try {
				console.log('WebSocket Server: Verifying token...');
				const decoded = await verifyTokenForWebSocket(token);
				console.log('WebSocket Server: Token verified successfully for user:', decoded.userId);

				ws.userId = decoded.userId;
				ws.isAuthenticated = true;
				ws.channel = channel;

				// Register the client with the push notification service
				pushNotificationService.registerClient(decoded.userId, ws, channel);

				// Set session ID and role from URL parameters or cached session
				if (sessionId && role) {
					ws.sessionId = sessionId;
					ws.role = role;
					console.log(`WebSocket Server: Set session from URL parameters for user ${decoded.userId}:`, { sessionId, role });
				} else {
					// If we have a cached active session for this user, attach it now
					const cached = this.activeSessionByUser.get(decoded.userId);
					if (cached) {
						ws.sessionId = cached.sessionId;
						ws.role = cached.role;
						console.log(`WebSocket Server: Attached cached active session for user ${decoded.userId}:`, cached);
					}
				}

				// If this is a telehealth session, add to session
				if (ws.sessionId && ws.role) {
					this.addToTelehealthSession(ws.sessionId, decoded.userId);

					// Send confirmation to the client
					ws.send(JSON.stringify({
						type: 'joined_session',
						data: {
							sessionId: ws.sessionId,
							role: ws.role,
							userId: decoded.userId,
							timestamp: new Date()
						}
					}));

					// Notify other clients in the session
					this.broadcastToTelehealthSession(ws.sessionId, {
						type: 'join',
						from: decoded.userId,
						to: 'all',
						sessionId: ws.sessionId,
						data: { role: ws.role, userId: decoded.userId }
					}, decoded.userId);
				}

				console.log(`WebSocket Server: Client authenticated and registered: ${decoded.userId}`);

				// Send initial connection confirmation
				ws.send(JSON.stringify({
					type: 'connection_established',
					data: {
						userId: decoded.userId,
						timestamp: new Date(),
						sessionId: ws.sessionId,
						role: ws.role
					}
				}));

				// Handle incoming messages
				ws.on('message', (message) => {
					try {
						const data = JSON.parse(message.toString());
						console.log('WebSocket Server: Received message from user', decoded.userId, 'channel', channel, ':', data);

						// Route message based on channel
						if (channel === 'telehealth') {
							this.handleTelehealthMessage(ws, data);
						} else if (channel === 'notifications') {
							this.handleNotificationMessage(ws, data);
						} else if (channel === 'messaging') {
							this.handleMessagingMessage(ws, data);
						} else {
							// Default channel - handle both
							this.handleMessage(ws, data);
						}
					} catch (error) {
						console.error('WebSocket Server: Error parsing message:', error);
					}
				});

				// Handle client disconnect
				ws.on('close', () => {
					if (ws.userId) {
						pushNotificationService.unregisterClient(ws.userId, ws.channel);

						// If this was a telehealth session, remove from session
						if (ws.sessionId && ws.role) {
							this.removeFromTelehealthSession(ws.sessionId, ws.userId);

							// Notify other clients in the session
							this.broadcastToTelehealthSession(ws.sessionId, {
								type: 'leave',
								from: ws.userId,
								to: 'all',
								sessionId: ws.sessionId,
								data: { role: ws.role, userId: ws.userId }
							}, ws.userId);
						}

						console.log(`WebSocket Server: Client disconnected: ${ws.userId}`);
					}
				});

				// Handle errors
				ws.on('error', (error) => {
					console.error('WebSocket Server: Connection error:', error);
					if (ws.userId) {
						pushNotificationService.unregisterClient(ws.userId, ws.channel);
					}
				});
			} catch (error) {
				console.log('WebSocket Server: Invalid token, closing connection:', error);
				ws.close(1008, 'Authentication failed');
				return;
			}
		});

		this.wss.on('error', (error) => {
			console.error('WebSocket server error:', error);
		});

		console.log(`WebSocket server started on port ${this.port}`);
	}

	private handleMessage(ws: AuthenticatedWebSocket, data: any) {
		if (!ws.isAuthenticated || !ws.userId) {
			ws.send(JSON.stringify({
				type: 'error',
				data: { message: 'Not authenticated' }
			}));
			return;
		}

		// Handle telehealth signaling messages
		if (data.type === 'offer' || data.type === 'ice-candidate' || data.type === 'join' || data.type === 'leave') {
			this.handleTelehealthMessage(ws, data);
			return;
		}

		// NOTE: session_ready is handled centrally in broadcastToTelehealthSession
		// when a join occurs and there are 2+ participants. We intentionally avoid
		// emitting a separate session_ready here to keep payloads consistent
		// (participants should be an array of userIds, not a count).

		switch (data.type) {
			case 'ping':
				ws.send(JSON.stringify({
					type: 'pong',
					data: { timestamp: new Date() }
				}));
				break;

			case 'get_notification_count':
				// This would typically fetch from the database
				ws.send(JSON.stringify({
					type: 'notification_count',
					data: { count: 0 } // Placeholder
				}));
				break;

			default:
				console.log('Unknown message type received:', data.type);
				ws.send(JSON.stringify({
					type: 'error',
					data: { message: 'Unknown message type' }
				}));
		}
	}

	private handleTelehealthMessage(ws: AuthenticatedWebSocket, message: SignalingMessage) {
		console.log('Handling telehealth message:', message.type, 'from:', message.from, 'to:', message.to);

		switch (message.type) {
			case 'join_meeting':
				this.handleJoinMeeting(ws, message);
				break;
			case 'participant_left':
				this.handleParticipantLeft(ws, message);
				break;
			case 'offer':
			case 'answer':
			case 'ice_candidate':
				// Forward signaling messages to the target peer
				if (message.to !== 'all') {
					this.sendToTelehealthPeer(message.to, message);
				}
				break;
			case 'meeting_ended':
				this.handleMeetingEnded(ws, message);
				break;
			default:
				console.log('Unknown telehealth message type:', message.type);
		}
	}

	private handleJoinMeeting(ws: AuthenticatedWebSocket, message: SignalingMessage) {
		if (!ws.userId || !message.userId || !message.userRole) {
			console.error('Missing required fields for join meeting');
			return;
		}

		// Set session info
		ws.sessionId = message.sessionId;
		ws.role = message.userRole;
		
		// Add to session tracking
		this.addToTelehealthSession(message.sessionId, ws.userId);
		
		// Notify other participants
		this.broadcastToTelehealthSession(message.sessionId, {
			type: 'participant_joined',
			from: message.userId,
			to: 'all',
			sessionId: message.sessionId,
			userId: message.userId,
			userRole: message.userRole,
			userName: message.userName || `${message.userRole === 'practitioner' ? 'Dr.' : ''} ${message.userId}`
		}, message.userId);
	}

	private handleParticipantLeft(ws: AuthenticatedWebSocket, message: SignalingMessage) {
		if (!ws.userId) return;
		
		// Remove from session tracking
		this.removeFromTelehealthSession(message.sessionId, ws.userId);
		
		// Notify other participants
		this.broadcastToTelehealthSession(message.sessionId, {
			type: 'participant_left',
			from: ws.userId,
			to: 'all',
			sessionId: message.sessionId,
			userId: ws.userId
		}, ws.userId);
	}

	private handleMeetingEnded(ws: AuthenticatedWebSocket, message: SignalingMessage) {
		// Notify all participants that meeting has ended
		this.broadcastToTelehealthSession(message.sessionId, {
			type: 'meeting_ended',
			from: ws.userId || 'system',
			to: 'all',
			sessionId: message.sessionId
		});
	}

	private handleNotificationMessage(ws: AuthenticatedWebSocket, message: any): void {
		// Handle notification-specific messages
		console.log('WebSocket Server: Handling notification message:', message.type);

		switch (message.type) {
			case 'ping':
				ws.send(JSON.stringify({
					type: 'pong',
					data: { timestamp: new Date() }
				}));
				break;
			case 'notification':
				// Handle notification messages
				console.log('WebSocket Server: Processing notification message');
				break;
			default:
				console.log('WebSocket Server: Unknown notification message type:', message.type);
		}
	}

	private handleMessagingMessage(ws: AuthenticatedWebSocket, message: MessageData): void {
		// Handle messaging-specific messages
		console.log('WebSocket Server: Handling messaging message:', message.type);

		if (!ws.isAuthenticated || !ws.userId) {
			ws.send(JSON.stringify({
				type: 'error',
				data: { message: 'Not authenticated' }
			}));
			return;
		}

		switch (message.type) {
			case 'new_message':
				// Forward message to recipient
				this.sendMessageToUser(message.to, {
					type: 'new_message',
					data: {
						from: message.from,
						messageId: message.messageId,
						content: message.content,
						subject: message.subject,
						appointmentId: message.appointmentId,
						messageType: message.messageType,
						timestamp: new Date()
					}
				});
				break;

			case 'message_read':
				// Notify sender that message was read
				this.sendMessageToUser(message.from, {
					type: 'message_read',
					data: {
						messageId: message.messageId,
						readBy: message.to,
						readAt: new Date(),
						timestamp: new Date()
					}
				});
				break;

			case 'typing_start':
			case 'typing_stop':
				// Forward typing indicators
				this.sendMessageToUser(message.to, {
					type: message.type,
					data: {
						from: message.from,
						timestamp: new Date()
					}
				});
				break;

			default:
				console.log('WebSocket Server: Unknown messaging message type:', message.type);
		}
	}

	// Broadcast message to all connected clients
	broadcast(message: any) {
		this.wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	// Send message to specific user
	sendToUser(userId: string, message: any) {
		this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
			if (client.readyState === WebSocket.OPEN && client.userId === userId) {
				client.send(JSON.stringify(message));
			}
		});
	}

	// Send message to specific user (only to messaging channel)
	sendMessageToUser(userId: string, message: any) {
		this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
			if (client.readyState === WebSocket.OPEN &&
				client.userId === userId &&
				client.channel === 'messaging') {
				client.send(JSON.stringify(message));
			}
		});
	}

	// Send notification to specific user (only to notifications channel)
	sendNotificationToUser(userId: string, message: any) {
		this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
			if (client.readyState === WebSocket.OPEN &&
				client.userId === userId &&
				client.channel === 'notifications') {
				client.send(JSON.stringify(message));
			}
		});
	}

	// Get connected clients count
	getConnectedClientsCount(): number {
		return this.wss.clients.size;
	}

	// Check if user is online
	isUserOnline(userId: string): boolean {
		let isOnline = false;
		this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
			if (client.readyState === WebSocket.OPEN && client.userId === userId) {
				isOnline = true;
			}
		});
		return isOnline;
	}

	// Telehealth session management methods
	private addToTelehealthSession(sessionId: string, userId: string): void {
		if (!this.telehealthSessions.has(sessionId)) {
			this.telehealthSessions.set(sessionId, new Set());
			console.log(`🆕 Created new telehealth session: ${sessionId}`);
		}
		this.telehealthSessions.get(sessionId)!.add(userId);
		console.log(`➕ Added user ${userId} to telehealth session ${sessionId}`);
		console.log(`📊 Session ${sessionId} now has ${this.telehealthSessions.get(sessionId)!.size} participants:`, Array.from(this.telehealthSessions.get(sessionId)!));
	}

	private removeFromTelehealthSession(sessionId: string, userId: string): void {
		const session = this.telehealthSessions.get(sessionId);
		if (session) {
			session.delete(userId);
			if (session.size === 0) {
				this.telehealthSessions.delete(sessionId);
				console.log(`🗑️ Deleted empty telehealth session: ${sessionId}`);
			} else {
				console.log(`➖ Removed user ${userId} from telehealth session ${sessionId}`);
				console.log(`📊 Session ${sessionId} now has ${session.size} participants:`, Array.from(session));
			}
		}
	}

	private broadcastToTelehealthSession(sessionId: string, message: SignalingMessage, excludeUserId?: string): void {
		const session = this.telehealthSessions.get(sessionId);
		if (!session) {
			console.log(`No session found for sessionId: ${sessionId}`);
			return;
		}

		console.log(`Broadcasting to session ${sessionId}:`, message);
		console.log(`Session participants:`, Array.from(session));
		console.log(`Excluding user:`, excludeUserId);

		session.forEach(userId => {
			if (userId !== excludeUserId) {
				console.log(`Sending message to user: ${userId}`);
				this.sendToTelehealthPeer(userId, message);
			} else {
				console.log(`Skipping excluded user: ${userId}`);
			}
		});

		// Send session_ready message when we have 2+ participants
		if (session.size >= 2 && message.type === 'join') {
			console.log(`🎉 Session ${sessionId} has ${session.size} participants - sending session_ready`);
			console.log(`📋 Session participants:`, Array.from(session));
			console.log(`👤 Current user joining:`, message.from);
			console.log(`🔍 All participants in session:`, Array.from(session));

			// Add a small delay to ensure WebSocket connections are fully established
			setTimeout(() => {
				const sessionReadyMessage: SignalingMessage = {
					type: 'session_ready',
					from: 'server',
					to: 'all',
					sessionId: sessionId,
					data: {
						participants: Array.from(session),
						sessionId: sessionId
					}
				};

				session.forEach(userId => {
					console.log(`📤 Sending session_ready to user: ${userId}`);
					this.sendToTelehealthPeer(userId, sessionReadyMessage);
				});
			}, 1000); // 1 second delay
		}
	}

	private sendToTelehealthPeer(userId: string, message: SignalingMessage): void {
		this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
			if (client.readyState === WebSocket.OPEN &&
				client.userId === userId &&
				client.sessionId === message.sessionId) {
				client.send(JSON.stringify(message));
			}
		});
	}

	// Get telehealth session info
	getTelehealthSessionInfo(sessionId: string): { clients: number; roles: { patient: number; practitioner: number } } {
		const session = this.telehealthSessions.get(sessionId);
		if (!session) {
			return { clients: 0, roles: { patient: 0, practitioner: 0 } };
		}

		const roles = { patient: 0, practitioner: 0 };
		session.forEach(userId => {
			this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
				if (client.userId === userId && client.sessionId === sessionId) {
					if (client.role === 'patient') roles.patient++;
					else if (client.role === 'practitioner') roles.practitioner++;
				}
			});
		});

		return {
			clients: session.size,
			roles
		};
	}

	// Get active telehealth sessions
	getActiveTelehealthSessions(): string[] {
		return Array.from(this.telehealthSessions.keys());
	}

	// Broadcast meeting started to all participants in a session
	broadcastMeetingStarted(sessionId: string, startedBy: string): void {
		console.log(`📢 Broadcasting meeting_started for session ${sessionId}, started by ${startedBy}`);
		
		const session = this.telehealthSessions.get(sessionId);
		if (!session) {
			console.log(`❌ No session found for sessionId: ${sessionId}`);
			return;
		}

		const meetingStartedMessage: SignalingMessage = {
			type: 'meeting_started',
			from: startedBy,
			to: 'all',
			sessionId: sessionId,
			data: {
				startedBy,
				timestamp: new Date(),
				participants: Array.from(session)
			}
		};

		// Send to all participants in the session
		session.forEach(userId => {
			console.log(`📤 Sending meeting_started to user: ${userId}`);
			this.sendToTelehealthPeer(userId, meetingStartedMessage);
		});
	}

	// Broadcast account deactivation notification to a specific user
	broadcastAccountDeactivation(userId: string): void {
		console.log(`Broadcasting account deactivation to user: ${userId}`);

		this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
			if (client.readyState === WebSocket.OPEN && client.userId === userId) {
				const deactivationMessage = {
					type: 'account_deactivated',
					data: {
						message: 'Your account has been deactivated. You will be signed out.',
						timestamp: new Date()
					}
				};

				console.log(`Sending account deactivation message to user: ${userId}`);
				client.send(JSON.stringify(deactivationMessage));
			}
		});
	}

	// Close the server
	close() {
		this.wss.close();
	}
}

// Create and export the WebSocket server instance
export const wsServer = new WebSocketNotificationServer(8080);
