export class InitiateCallDto {
  receiverId: string;
  video: boolean;
}

export class SignalDto {
  roomId: string;
  targetId: string; // Socket ID
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
}

export class IceCandidateDto {
  roomId: string;
  targetId: string;
  candidate: RTCIceCandidateInit;
}

export class CallResponseDto {
  roomId: string;
  accept: boolean; // true = accept, false = reject
}
