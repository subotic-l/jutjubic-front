import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { VideoPostResponse } from '../../models/video.model';

@Component({
  selector: 'app-video-feed',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './video-feed.component.html',
  styleUrls: ['./video-feed.component.css']
})
export class VideoFeedComponent implements OnInit {
  public videoService = inject(VideoService);
  public router = inject(Router);

  videos = signal<VideoPostResponse[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadVideos();
  }

  loadVideos(): void {
    this.videoService.getAllVideos().subscribe({
      next: (videos) => {
        // Sortiranje po datumu, najnovije prvo
        this.videos.set(
          videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Failed to load videos.');
        this.isLoading.set(false);
      }
    });
  }

  notifyLogin(): void {
    alert('You must log in to like or comment.');
    this.router.navigate(['/login']);
  }

  goToProfile(userId: number): void {
    this.router.navigate(['/profile', userId]);
  }
}
