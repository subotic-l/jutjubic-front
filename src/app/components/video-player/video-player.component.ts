import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { VideoPostResponse } from '../../models/video.model';
import { VideoCommentsComponent } from '../video-comments/video-comments.component';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, VideoCommentsComponent],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css'
})
export class VideoPlayerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private videoService = inject(VideoService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  video = signal<VideoPostResponse | null>(null);
  isLoading = signal<boolean>(true);
  videoUrl = signal<string>('');
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // Only load video on browser (client-side) to avoid duplicate API calls during SSR
    if (isPlatformBrowser(this.platformId)) {
      const videoId = this.route.snapshot.paramMap.get('id');
      if (videoId) {
        this.loadVideo(+videoId);
      }
    }
  }

  loadVideo(id: number): void {
    this.videoService.getVideoById(id).subscribe({
      next: (video) => {
        this.video.set(video);
        this.videoUrl.set(this.videoService.getVideoUrl(video.videoUrl));
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading video:', error);
        this.isLoading.set(false);
        this.router.navigate(['/']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onLike(): void {
    const video = this.video();
    if (!video) return;

    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.errorMessage.set('Please log in to like videos');
      setTimeout(() => this.errorMessage.set(null), 3000);
      return;
    }

    this.videoService.toggleLike(video.id).subscribe({
      next: (response) => {
        // Update video with new like count and liked status if backend returns it
        this.video.update(v => {
          if (!v) return v;
          return {
            ...v,
            likes: response.likesCount !== undefined ? response.likesCount : v.likes,
            likedByCurrentUser: response.likedByCurrentUser !== undefined ? response.likedByCurrentUser : !v.likedByCurrentUser
          };
        });
      },
      error: (error) => {
        console.error('Error toggling like:', error);
        this.errorMessage.set('Failed to like video. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 3000);
      }
    });
  }
}
