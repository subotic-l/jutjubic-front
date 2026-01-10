import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { VideoPostResponse } from '../../models/video.model';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css'
})
export class VideoPlayerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private videoService = inject(VideoService);

  video = signal<VideoPostResponse | null>(null);
  isLoading = signal<boolean>(true);
  videoUrl = signal<string>('');

  ngOnInit(): void {
    const videoId = this.route.snapshot.paramMap.get('id');
    if (videoId) {
      this.loadVideo(+videoId);
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
    // TODO: Add backend call for like
    console.log('Like video:', this.video()?.id);
  }

  onDislike(): void {
    // TODO: Add backend call for dislike
    console.log('Dislike video:', this.video()?.id);
  }
}
