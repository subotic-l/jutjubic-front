import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { VideoPostResponse } from '../../models/video.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private videoService = inject(VideoService);
  private router = inject(Router);

  videos = signal<VideoPostResponse[]>([]);
  isLoading = signal<boolean>(true);
  displayedVideos = signal<VideoPostResponse[]>([]);
  videosPerPage = 12;
  currentPage = 0;

  ngOnInit(): void {
    this.loadVideos();
  }

  loadVideos(): void {
    this.videoService.getAllVideos().subscribe({
      next: (videos) => {
        this.videos.set(videos);
        this.loadMoreVideos();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading videos:', error);
        this.isLoading.set(false);
      }
    });
  }

  loadMoreVideos(): void {
    const allVideos = this.videos();
    const start = this.currentPage * this.videosPerPage;
    const end = start + this.videosPerPage;
    const newVideos = allVideos.slice(start, end);
    
    this.displayedVideos.set([...this.displayedVideos(), ...newVideos]);
    this.currentPage++;
  }

  hasMoreVideos(): boolean {
    return this.displayedVideos().length < this.videos().length;
  }

  getThumbnailUrl(thumbnailPath: string): string {
    return this.videoService.getThumbnailUrl(thumbnailPath);
  }

  onVideoClick(videoId: number): void {
    this.router.navigate(['/video', videoId]);
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    
    if (atBottom && this.hasMoreVideos() && !this.isLoading()) {
      this.loadMoreVideos();
    }
  }
}
