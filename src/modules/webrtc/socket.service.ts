import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private server: Server;
  private connectedUsers = new Map<string, string>(); // [userId, socketId]

  setServer(server: Server) {
    this.server = server;
  }

  setCurrentUser(userId: string, socketId: string) {
    this.connectedUsers.set(userId, socketId);
  }

  removeCurrentUser(userId: string) {
    this.connectedUsers.delete(userId);
  }

  getSocketId(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }

  emitToUser(userId: string, event: string, data: any) {
    const socketId = this.getSocketId(userId);
    if (socketId && this.server) {
      this.server.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
