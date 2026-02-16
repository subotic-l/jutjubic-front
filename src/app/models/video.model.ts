export interface VideoPostResponse {
  id: number;
  title: string;
  description: string;
  tags: string[];
  videoUrl: string;
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

/**
 * Helper funkcija za konverziju LocalDateTime array-a u ISO string
 * Backend šalje LocalDateTime kao [year, month, day, hour, minute, second, nanosecond]
 */
export function convertLocalDateTimeToString(dateArray: any): string {
  if (Array.isArray(dateArray) && dateArray.length >= 6) {
    const [year, month, day, hour, minute, second, nano = 0] = dateArray;
    return new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1000000)).toISOString();
  }
  return dateArray; // Ako nije array, vrati originalnu vrednost
}
