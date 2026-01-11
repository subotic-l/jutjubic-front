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
  location?: string;
  username?: string;
  likedByCurrentUser?: boolean;
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
