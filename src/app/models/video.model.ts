export interface VideoPost {
  id: number;
  title: string;
  description?: string;
  tags?: string[];
  videoUrl: string;
  thumbnailPath: string;
  createdAt: string;
  views?: number;
  location?: string;
  username?: string;
}

export interface VideoPostRequest {
  title: string;
  description: string;
  video: File;
  thumbnail: File;
}

export interface VideoPostResponse {
  id: number;
  title: string;
  description: string;
  tags?: string[];
  videoUrl: string;
  thumbnailPath: string;
  createdAt: string;
  views?: number;
  location?: string;
  username?: string;
}
