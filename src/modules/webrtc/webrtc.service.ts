import { Injectable } from '@nestjs/common';
import { CallStatus } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebrtcService {
  constructor(private readonly prisma: PrismaService) {}

  async createCall(callerId: string, receiverId: string) {
    const roomId = uuidv4();
    const call = await this.prisma.call.create({
      data: {
        roomId,
        callerId,
        receiverId,
        status: CallStatus.PENDING,
      },
      select: {
        roomId: true,
        caller: { select: { user_id: true, username: true, avatar: true } },
        receiver: { select: { user_id: true, username: true, avatar: true } },
      },
    });
    return call;
  }

  async acceptCall(roomId: string) {
    const call = await this.prisma.call.update({
      where: {
        roomId,
      },
      data: {
        status: 'ACCEPTED',
      },
    });
    return call;
  }

  async rejectCall(roomId: string) {
    const call = await this.prisma.call.update({
      where: {
        roomId,
      },
      data: {
        status: 'REJECTED',
      },
    });
    return call;
  }

  async endCall(roomId: string) {
    const call = await this.prisma.call.update({
      where: {
        roomId,
      },
      data: {
        status: 'ENDED',
      },
    });
    return call;
  }

  async missedCall(roomId: string) {
    const call = await this.prisma.call.update({
      where: {
        roomId,
      },
      data: {
        status: 'MISSED',
      },
    });
    return call;
  }

  async getCall(roomId: string) {
    const call = await this.prisma.call.findUnique({
      where: {
        roomId,
      },
    });
    return call;
  }

  async getCalls(userId: string) {
    const calls = await this.prisma.call.findMany({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }],
      },
    });
    return calls;
  }

  async validateRoom(roomId: string, userId: string) {
    const call = await this.prisma.call.findUnique({
      where: { roomId },
    });

    if (!call) return false;

    return call.callerId === userId || call.receiverId === userId;
  }
}
