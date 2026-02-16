export interface WatchPartyDto {
  id: number;
  roomCode: string;
  name: string;
  ownerUsername: string;
  participantUsernames: string[];
  currentVideoId?: number;
  currentVideoTitle?: string;
  active: boolean;
  createdAt: string;
}

export interface CreateWatchPartyRequest {
  name: string;
}

export interface WatchPartyMessage {
  type: 'VIDEO_STARTED' | 'USER_JOINED' | 'USER_LEFT' | 'PARTY_CLOSED';
  roomCode: string;
  videoId?: number;
  videoTitle?: string;
  username?: string;
  message?: string;
}