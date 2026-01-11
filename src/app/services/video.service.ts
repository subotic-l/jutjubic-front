import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VideoPostResponse } from '../models/video.model';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/videos';

  getAllVideos(): Observable<VideoPostResponse[]> {
    return this.http.get<VideoPostResponse[]>(this.apiUrl);
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
}
