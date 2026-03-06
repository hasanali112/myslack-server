import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebrtcService } from './webrtc.service';
import {
  CallResponseDto,
  IceCandidateDto,
  InitiateCallDto,
  SignalDto,
} from './dto/webrtc.dto';

const connectedUsers = new Map<string, string>(); // [userId, socketId]
const roomUsers = new Map<string, string[]>(); // [roomId, [socketId1, socketId2]]
const callTimeouts = new Map<string, NodeJS.Timeout>(); // [roomId, timeoutId]
const activeRooms = new Map<string, any>(); // Added missing map

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/webrtc',
})
export class WebrtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly webrtcService: WebrtcService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake?.query?.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }
    connectedUsers.set(userId, client.id);
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = Array.from(connectedUsers.entries()).find(
      ([key, value]) => value === client.id,
    )?.[0];
    if (userId) {
      connectedUsers.delete(userId);
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

  @SubscribeMessage('initiate-call')
  async handleInitiateCall(
    @MessageBody() dto: InitiateCallDto,
    @ConnectedSocket() client: Socket,
  ) {
    const callerId = [...connectedUsers.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (!callerId) {
      client.emit('call-error', { message: 'Caller not found' });
      return;
    }

    // Receiver online আছে কিনা check করো
    const receiverSocketId = connectedUsers.get(dto.receiverId);
    if (!receiverSocketId) {
      client.emit('call-error', { message: 'User is offline' });
      return;
    }

    // DB তে call তৈরি করো
    const call = await this.webrtcService.createCall(callerId, dto.receiverId);

    // Caller কে roomId দাও
    client.emit('call-initiated', {
      roomId: call.roomId,
      receiver: call.receiver,
    });

    // Receiver কে incoming call জানাও
    this.server.to(receiverSocketId).emit('incoming-call', {
      roomId: call.roomId,
      caller: call.caller,
    });

    // ৩০ সেকেন্ড পর কেউ না ধরলে missed call
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
    }, 30000); // 30 seconds

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
    // Timeout clear করো
    const timeout = callTimeouts.get(dto.roomId);
    if (timeout) {
      clearTimeout(timeout);
      callTimeouts.delete(dto.roomId);
    }

    if (!dto.accept) {
      // Reject করলে
      await this.webrtcService.rejectCall(dto.roomId);

      // Caller কে জানাও
      const call = await this.webrtcService.endCall(dto.roomId);
      const callerSocketId = connectedUsers.get(call?.callerId);
      if (callerSocketId) {
        this.server.to(callerSocketId).emit('call-rejected', {
          roomId: dto.roomId,
        });
      }
      return;
    }

    // Accept করলে
    await this.webrtcService.acceptCall(dto.roomId);

    // Room এ দুইজনকে add করো
    activeRooms.set(dto.roomId, []);

    // Caller কে জানাও call accepted
    const callData = await this.webrtcService.acceptCall(dto.roomId);
    const callerSocketId = connectedUsers.get(callData?.callerId);

    if (callerSocketId) {
      this.server.to(callerSocketId).emit('call-accepted', {
        roomId: dto.roomId,
        // Caller এখন Offer তৈরি করবে
        shouldCreateOffer: true,
      });
    }

    // Receiver কে বলো offer এর জন্য wait করো
    client.emit('call-accepted', {
      roomId: dto.roomId,
      shouldCreateOffer: false,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 3: SDP EXCHANGE (Offer/Answer)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @SubscribeMessage('send-offer')
  async handleOffer(
    @MessageBody() dto: SignalDto,
    @ConnectedSocket() client: Socket,
  ) {
    // Room valid কিনা check করো
    const userId = [...connectedUsers.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (!userId) {
      client.emit('call-error', { message: 'User not found' });
      return;
    }

    const isValid = await this.webrtcService.validateRoom(dto.roomId, userId);
    if (!isValid) {
      client.emit('call-error', { message: 'Invalid room' });
      return;
    }

    // Room এ socket add করো
    const room = activeRooms.get(dto.roomId) || [];
    if (!room.includes(client.id)) {
      room.push(client.id);
      activeRooms.set(dto.roomId, room);
    }

    // Receiver এর কাছে offer পাঠাও
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
    // Room এ socket add করো
    const room = activeRooms.get(dto.roomId) || [];
    if (!room.includes(client.id)) {
      room.push(client.id);
      activeRooms.set(dto.roomId, room);
    }

    // Caller এর কাছে answer পাঠাও
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
    // অন্যজনের কাছে ICE candidate পাঠাও
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

    // Room এর অন্যজনকে জানাও
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
}
