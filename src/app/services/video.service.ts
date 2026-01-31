import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VideoPostResponse, VideoComment, VideoCommentRequest, StreamInfoResponse, PopularVideosResponse } from '../models/video.model';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/videos';
  private mapUrl = 'http://localhost:8080/api/map';
  private commentsUrl = 'http://localhost:8080/api/comments';
  private popularVideosUrl = 'http://localhost:8080/api/popular-videos';

  getAllVideos(): Observable<VideoPostResponse[]> {
    return this.http.get<VideoPostResponse[]>(this.apiUrl);
  }

  getMapVideos(tiles: Array<{x: number, y: number, zoom: number}>): Observable<VideoPostResponse[]> {
    return this.http.post<VideoPostResponse[]>(`${this.mapUrl}/tiles`, { tiles });
  }

  getVideoById(id: number): Observable<VideoPostResponse> {
    return this.http.get<VideoPostResponse>(`${this.apiUrl}/${id}`);
  }

  getThumbnailUrl(thumbnailPath: string): string {
    // Ako thumbnailPath već sadrži punu putanju, vrati ga direktno
    if (thumbnailPath.startsWith('http')) {
      return thumbnailPath;
    }
    // Izvuci samo ime fajla iz putanje (npr. 'uploads\\thumbnails\\xyz.jpg' -> 'xyz.jpg')
    const fileName = thumbnailPath.split(/[\\/]/).pop() || thumbnailPath;
    return `${this.apiUrl}/thumbnails/${fileName}`;
  }

  getVideoUrl(videoUrl: string): string {
    // Ako videoUrl već sadrži punu putanju, vrati ga direktno
    if (videoUrl.startsWith('http')) {
      return videoUrl;
    }
    // Izvuci samo ime fajla iz putanje
    const fileName = videoUrl.split(/[\\/]/).pop() || videoUrl;
    // Backend mora da ima endpoint za serviranje video fajlova
    return `${this.apiUrl}/videos/${fileName}`;
  }

  uploadVideo(formData: FormData): Observable<VideoPostResponse> {
    return this.http.post<VideoPostResponse>(this.apiUrl, formData);
  }

  toggleLike(videoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${videoId}/like`, {});
  }

  // Comments API
  getVideoComments(videoId: number, page: number = 0, size: number = 10): Observable<VideoComment[]> {
    return this.http.get<VideoComment[]>(`${this.commentsUrl}/${videoId}?page=${page}&size=${size}`);
  }

  addVideoComment(videoId: number, text: string): Observable<VideoComment> {
    const request: VideoCommentRequest = { text, videoId };
    return this.http.post<VideoComment>(this.commentsUrl, request);
  }

  getStreamInfo(videoId: number): Observable<StreamInfoResponse> {
    return this.http.get<StreamInfoResponse>(`${this.apiUrl}/${videoId}/stream-info`);
  }

  getPopularVideos(): Observable<PopularVideosResponse> {
    return this.http.get<PopularVideosResponse>(this.popularVideosUrl);
  }
}
