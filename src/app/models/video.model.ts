export interface VideoPostResponse {
  id: number;
  title: string;
  description: string;
  tags?: string[];
  videoUrl: string;
  thumbnailPath: string;
  createdAt: string;
  views?: number;
  likes?: number;
  location?: string;
  username?: string;
  likedByCurrentUser?: boolean;
}
