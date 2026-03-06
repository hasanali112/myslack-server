import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebrtcService } from './webrtc.service';
import { SocketService } from './socket.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import {
  CallResponseDto,
  IceCandidateDto,
  InitiateCallDto,
  SignalDto,
} from './dto/webrtc.dto';

const roomUsers = new Map<string, string[]>(); // [roomId, [socketId1, socketId2]]
const callTimeouts = new Map<string, NodeJS.Timeout>(); // [roomId, timeoutId]
const activeRooms = new Map<string, any>();

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'https://my-lark.onrender.com'],
    credentials: true,
  },
  namespace: '/app',
})
export class AppGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly webrtcService: WebrtcService,
    private readonly socketService: SocketService,
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit(server: Server) {
    this.socketService.setServer(server);
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake?.query?.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }
    this.socketService.setCurrentUser(userId, client.id);
    console.log(`Client connected: ${client.id} (User: ${userId})`);

    // Update user status in DB
    await this.prisma.user.update({
      where: { user_id: userId },
      data: { status: 'ONLINE' },
    });

    // Emit the current list of online users to everyone
    this.server.emit('online-users', this.socketService.getConnectedUsers());
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketService
      .getConnectedUsers()
      .find((id) => this.socketService.getSocketId(id) === client.id);

    if (userId) {
      this.socketService.removeCurrentUser(userId);

      // Update user status in DB
      await this.prisma.user.update({
        where: { user_id: userId },
        data: { status: 'OFFLINE' },
      });

      // Emit the updated list of online users to everyone
      this.server.emit('online-users', this.socketService.getConnectedUsers());
    }

    for (const [roomId, participants] of roomUsers.entries()) {
      if (participants.includes(client.id)) {
        const otherSocketId = participants.find((id) => id !== client.id);
        if (otherSocketId) {
          this.server.to(otherSocketId).emit('call-ended', {
            roomId,
            reason: 'other_user_disconnected',
          });
        }

        await this.webrtcService.endCall(roomId);
        roomUsers.delete(roomId);
        const timeout = callTimeouts.get(roomId);
        if (timeout) {
          clearTimeout(timeout);
          callTimeouts.delete(roomId);
        }
        activeRooms.delete(roomId);
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 1: CALL INITIATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('initiate-call')
  async handleInitiateCall(
    @MessageBody() dto: InitiateCallDto,
    @ConnectedSocket() client: Socket,
  ) {
    const callerId = this.socketService
      .getConnectedUsers()
      .find((id) => this.socketService.getSocketId(id) === client.id);

    if (!callerId) {
      client.emit('call-error', { message: 'Caller not found' });
      return;
    }

    const receiverSocketId = this.socketService.getSocketId(dto.receiverId);
    if (!receiverSocketId) {
      client.emit('call-error', { message: 'User is offline' });
      return;
    }

    const call = await this.webrtcService.createCall(callerId, dto.receiverId);

    // Track participants immediately for this room
    const participants = [client.id, receiverSocketId];
    roomUsers.set(call.roomId, participants);
    activeRooms.set(call.roomId, participants);

    client.emit('call-initiated', {
      roomId: call.roomId,
      receiver: call.receiver,
      video: dto.video,
    });

    this.server.to(receiverSocketId).emit('incoming-call', {
      roomId: call.roomId,
      caller: call.caller,
      video: dto.video,
    });

    const timeout = setTimeout(async () => {
      const room = activeRooms.get(call.roomId);
      if (!room) {
        await this.webrtcService.missedCall(call.roomId);
        client.emit('call-missed', { roomId: call.roomId });
        this.server.to(receiverSocketId).emit('call-missed', {
          roomId: call.roomId,
        });
      }
      callTimeouts.delete(call.roomId);
    }, 30000);

    callTimeouts.set(call.roomId, timeout);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2: CALL RESPONSE (Accept/Reject)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('call-response')
  async handleCallResponse(
    @MessageBody() dto: CallResponseDto,
    @ConnectedSocket() client: Socket,
  ) {
    const timeout = callTimeouts.get(dto.roomId);
    if (timeout) {
      clearTimeout(timeout);
      callTimeouts.delete(dto.roomId);
    }

    if (!dto.accept) {
      await this.webrtcService.rejectCall(dto.roomId);
      const call = await this.webrtcService.endCall(dto.roomId);
      const callerSocketId = this.socketService.getSocketId(call?.callerId);
      if (callerSocketId) {
        this.server.to(callerSocketId).emit('call-rejected', {
          roomId: dto.roomId,
        });
      }
      return;
    }

    await this.webrtcService.acceptCall(dto.roomId);

    const callData = await this.webrtcService.getCall(dto.roomId);
    if (!callData) return;

    const callerSocketId = this.socketService.getSocketId(callData.callerId);
    const receiverSocketId = this.socketService.getSocketId(
      callData.receiverId,
    );

    // Track participants for this room
    const participants: string[] = [];
    if (callerSocketId) participants.push(callerSocketId);
    if (receiverSocketId) participants.push(receiverSocketId);
    roomUsers.set(dto.roomId, participants);
    activeRooms.set(dto.roomId, participants);

    if (callerSocketId && receiverSocketId) {
      this.server.to(callerSocketId).emit('call-accepted', {
        roomId: dto.roomId,
        shouldCreateOffer: true,
        peerSocketId: receiverSocketId,
        video: callData.status === 'ACCEPTED', // We should ideally have the video flag in DB or pass it through
      });

      this.server.to(receiverSocketId).emit('call-accepted', {
        roomId: dto.roomId,
        shouldCreateOffer: false,
        peerSocketId: callerSocketId,
      });
    }
  }

  @SubscribeMessage('reject-call')
  async handleRejectCall(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const callData = await this.webrtcService.getCall(data.roomId);
    if (callData) {
      const callerSocketId = this.socketService.getSocketId(callData.callerId);
      if (callerSocketId) {
        this.server.to(callerSocketId).emit('call-rejected', {
          roomId: data.roomId,
        });
      }
    }
    await this.webrtcService.rejectCall(data.roomId);
    await this.webrtcService.endCall(data.roomId);
    activeRooms.delete(data.roomId);
    roomUsers.delete(data.roomId);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 3: SDP EXCHANGE (Offer/Answer)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('send-offer')
  async handleOffer(
    @MessageBody() dto: SignalDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketService
      .getConnectedUsers()
      .find((id) => this.socketService.getSocketId(id) === client.id);

    if (!userId) {
      client.emit('call-error', { message: 'User not found' });
      return;
    }

    const isValid = await this.webrtcService.validateRoom(dto.roomId, userId);
    if (!isValid) {
      client.emit('call-error', { message: 'Invalid room' });
      return;
    }

    // Sync roomUsers and activeRooms
    const room = roomUsers.get(dto.roomId) || [];
    if (!room.includes(client.id)) {
      room.push(client.id);
      roomUsers.set(dto.roomId, room);
      activeRooms.set(dto.roomId, room);
    }

    this.server.to(dto.targetId).emit('receive-offer', {
      offer: dto.offer,
      roomId: dto.roomId,
      fromSocketId: client.id,
    });
  }

  @SubscribeMessage('send-answer')
  async handleAnswer(
    @MessageBody() dto: SignalDto,
    @ConnectedSocket() client: Socket,
  ) {
    // Sync roomUsers and activeRooms
    const room = roomUsers.get(dto.roomId) || [];
    if (!room.includes(client.id)) {
      room.push(client.id);
      roomUsers.set(dto.roomId, room);
      activeRooms.set(dto.roomId, room);
    }

    this.server.to(dto.targetId).emit('receive-answer', {
      answer: dto.answer,
      roomId: dto.roomId,
      fromSocketId: client.id,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 4: ICE CANDIDATE EXCHANGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() dto: IceCandidateDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(dto.targetId).emit('ice-candidate', {
      candidate: dto.candidate,
      roomId: dto.roomId,
      fromSocketId: client.id,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 5: CALL END
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('end-call')
  async handleEndCall(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.webrtcService.endCall(data.roomId);

    const participants = activeRooms.get(data.roomId) || [];
    const otherSocketId = participants.find((id) => id !== client.id);

    if (otherSocketId) {
      this.server.to(otherSocketId).emit('call-ended', {
        roomId: data.roomId,
        reason: 'ended_by_user',
      });
    }

    activeRooms.delete(data.roomId);
    client.emit('call-ended', { roomId: data.roomId });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE: MESSAGING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() dto: { receiverId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = this.socketService
      .getConnectedUsers()
      .find((id) => this.socketService.getSocketId(id) === client.id);

    if (!senderId) {
      client.emit('message-error', { message: 'Sender not found' });
      return;
    }

    const message = await this.messagesService.sendMessage(senderId, {
      content: dto.content,
      receiverId: dto.receiverId,
    });

    // Emit to sender
    client.emit('new-message', message);

    // Emit to receiver if online
    const receiverSocketId = this.socketService.getSocketId(dto.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('new-message', message);
    }
  }
}
