export interface VideoPostResponse {
  id: number;
  title: string;
  description: string;
  tags: string[];
  videoUrl: string;
  transcodedVideoUrl?: string;
  thumbnailPath: string;
  createdAt: string;
  views?: number;
  likes?: number;
  longitude?: number;
  latitude?: number;
  username?: string;
  likedByCurrentUser?: boolean;
  scheduledReleaseTime?: string;
  videoDurationSeconds?: number;
}

export interface StreamInfoResponse {
  isScheduled: boolean;
  hasStarted: boolean;
  hasEnded: boolean;
  scheduledReleaseTime?: string;
  videoDurationSeconds?: number;
  currentOffsetSeconds?: number;
  serverTime: string;
}

export interface VideoComment {
  id: number;
  text: string;
  userId: number;
  username: string;
  createdAt: string;
}

export interface VideoCommentRequest {
  text: string;
  videoId: number;
}

export interface PopularVideoDto {
  id: number;
  title: string;
  description: string;
  thumbnailPath: string;
  popularityScore: number;
  totalViews: number;
  likes: number;
  username: string;
}

export interface PopularVideosResponse {
  reportDate: string;
  popularVideos: PopularVideoDto[];
}
