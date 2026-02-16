import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VideoPostResponse, VideoComment, VideoCommentRequest, StreamInfoResponse, PopularVideosResponse } from '../models/video.model';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost/api/videos';
  private mapUrl = 'http://localhost/api/map';
  private commentsUrl = 'http://localhost/api/comments';
  private popularVideosUrl = 'http://localhost/api/popular-videos';

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
    return this.http.post<VideoPostResponse>(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'events',
      // Extend timeout for large video uploads (10 minutes)
      // Note: This requires HttpClient timeout configuration
    }).pipe(
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.Response) {
          return event.body;
        }
        return null as any;
      })
    ) as Observable<VideoPostResponse>;
  }

  uploadVideoWithProgress(formData: FormData): Observable<{progress: number, response?: VideoPostResponse}> {
    return this.http.post<VideoPostResponse>(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { progress };
        } else if (event.type === HttpEventType.Response) {
          return { progress: 100, response: event.body };
        }
        return { progress: 0 };
      })
    );
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
