import { Component, OnInit, inject, signal, PLATFORM_ID, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { VideoPostResponse, StreamInfoResponse } from '../../models/video.model';
import { VideoCommentsComponent } from '../video-comments/video-comments.component';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, VideoCommentsComponent],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css'
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private videoService = inject(VideoService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  video = signal<VideoPostResponse | null>(null);
  isLoading = signal<boolean>(true);
  videoUrl = signal<string>('');
  errorMessage = signal<string | null>(null);
  
  streamInfo = signal<StreamInfoResponse | null>(null);
  syncInterval: any = null;
  isScheduledStream = signal<boolean>(false);
  streamMessage = signal<string | null>(null);
  showVideo = signal<boolean>(true);
  streamStatus = signal<'not-started' | 'live' | 'ended' | 'regular'>('regular');
  
  // Track user's pause state to prevent auto-play during sync
  userPausedVideo = signal<boolean>(false);
  // Track if view has been counted in this session
  viewCounted = signal<boolean>(false);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const videoId = this.route.snapshot.paramMap.get('id');
      if (videoId) {
        this.loadVideo(+videoId);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
  
  // Setup video event listeners to track user pause/play
  setupVideoEventListeners(): void {
    setTimeout(() => {
      const videoEl = this.videoElement?.nativeElement;
      if (videoEl) {
        videoEl.addEventListener('pause', () => {
          // Only mark as user paused if video is not at the end
          if (!videoEl.ended) {
            this.userPausedVideo.set(true);
          }
        });
        
        videoEl.addEventListener('play', () => {
          this.userPausedVideo.set(false);
        });
      }
    }, 100);
  }

  loadVideo(id: number): void {
    this.videoService.getVideoById(id).subscribe({
      next: (video) => {
        this.video.set(video);
        this.videoUrl.set(this.videoService.getVideoUrl(video));
        
        if (video.scheduledReleaseTime) {
          this.isScheduledStream.set(true);
          this.loadStreamInfo(id);
        } else {
          this.isLoading.set(false);
          this.setupVideoEventListeners();
        }
        
        // Mark that view has been counted
        this.viewCounted.set(true);
      },
      error: (error) => {
        console.error('Error loading video:', error);
        
        if (error.status === 403) {
          this.isScheduledStream.set(true);
          this.errorMessage.set(null);
          this.loadStreamInfo(id);
          return;
        }
        
        let errorMsg = 'Video is not available.';
        
        if (error.status === 404) {
          errorMsg = 'Video not found. It may have been removed or the link is incorrect.';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        this.errorMessage.set(errorMsg);
        this.isLoading.set(false);
      }
    });
  }

  loadStreamInfo(videoId: number): void {
    this.videoService.getStreamInfo(videoId).subscribe({
      next: (streamInfo) => {
        this.streamInfo.set(streamInfo);
        this.isLoading.set(false);
        
        if (!this.video()) {
          this.video.set({
            id: videoId,
            title: 'Scheduled Live Stream',
            description: '',
            tags: [],
            videoUrl: '',
            thumbnailPath: '',
            createdAt: streamInfo.scheduledReleaseTime || new Date().toISOString(),
            scheduledReleaseTime: streamInfo.scheduledReleaseTime,
            videoDurationSeconds: streamInfo.videoDurationSeconds
          });
        }
        
        if (!streamInfo.hasStarted) {
          this.streamStatus.set('not-started');
          this.showVideo.set(false);
          const startTime = new Date(streamInfo.scheduledReleaseTime!).toLocaleString('sr-RS', {
            dateStyle: 'medium',
            timeStyle: 'short'
          });
          this.streamMessage.set(`This live stream hasn't started yet. It will begin at ${startTime}`);
          
          // Start periodic check to auto-detect when stream starts
          this.startPeriodicSync(videoId);
        } else if (streamInfo.hasEnded) {
          this.streamStatus.set('ended');
          this.showVideo.set(true);
          this.streamMessage.set('This live stream has ended. You can watch the replay.');
        } else {
          this.streamStatus.set('live');
          this.showVideo.set(true);
          this.streamMessage.set('LIVE - Synchronized streaming');
          
          // Load full video data if not already loaded (to increment view count once)
          if (!this.viewCounted()) {
            this.videoService.getVideoById(videoId).subscribe({
              next: (video) => {
                this.video.set(video);
                this.videoUrl.set(this.videoService.getVideoUrl(video));
                this.viewCounted.set(true);
                this.synchronizeVideo(streamInfo);
                this.startPeriodicSync(videoId);
                this.setupVideoEventListeners();
              },
              error: (error) => {
                console.error('Error loading video data:', error);
                // Continue with stream info even if full video load fails
                this.synchronizeVideo(streamInfo);
                this.startPeriodicSync(videoId);
                this.setupVideoEventListeners();
              }
            });
          } else {
            this.synchronizeVideo(streamInfo);
            this.startPeriodicSync(videoId);
            this.setupVideoEventListeners();
          }
        }
      },
      error: (error) => {
        console.error('Error loading stream info:', error);
        
        if (error.error?.error && error.error.error.includes('Scheduled for:')) {
          const scheduledTimeMatch = error.error.error.match(/Scheduled for: (.+)/);
          const scheduledTime = scheduledTimeMatch ? scheduledTimeMatch[1] : null;
          
          this.video.set({
            id: videoId,
            title: 'Scheduled Live Stream',
            description: '',
            tags: [],
            videoUrl: '',
            thumbnailPath: '',
            createdAt: scheduledTime || new Date().toISOString(),
            scheduledReleaseTime: scheduledTime || undefined,
            videoDurationSeconds: undefined
          });
          
          this.streamStatus.set('not-started');
          this.showVideo.set(false);
          
          if (scheduledTime) {
            const startTime = new Date(scheduledTime).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });
            this.streamMessage.set(`This live stream hasn't started yet. It will begin at ${startTime}`);
          } else {
            this.streamMessage.set('This live stream is scheduled and will start soon.');
          }
          
          this.isLoading.set(false);
          return;
        }
        
        this.errorMessage.set('Unable to load stream information. Please try again later.');
        this.isLoading.set(false);
        this.showVideo.set(false);
      }
    });
  }

  synchronizeVideo(streamInfo: StreamInfoResponse): void {
    if (streamInfo.currentOffsetSeconds !== undefined) {
      setTimeout(() => {
        const videoEl = this.videoElement?.nativeElement;
        if (videoEl) {
          const targetTime = streamInfo.currentOffsetSeconds!;
          const currentTime = videoEl.currentTime;
          const wasPaused = videoEl.paused;
          
          // Sync time if difference is significant
          if (Math.abs(currentTime - targetTime) > 2) {
            videoEl.currentTime = targetTime;
          }
          
          // Only auto-play if user hasn't explicitly paused the video
          if (wasPaused && !this.userPausedVideo()) {
            videoEl.play().catch(err => console.log('Auto-play prevented:', err));
          }
        }
      }, 100);
    }
  }

  startPeriodicSync(videoId: number): void {
    // Prevent duplicate sync intervals
    if (this.syncInterval) {
      return;
    }
    
    this.syncInterval = setInterval(() => {
      this.videoService.getStreamInfo(videoId).subscribe({
        next: (streamInfo) => {
          this.streamInfo.set(streamInfo);
          
          if (streamInfo.hasEnded) {
            this.streamStatus.set('ended');
            this.streamMessage.set('This live stream has ended. You can continue watching the replay.');
            if (this.syncInterval) {
              clearInterval(this.syncInterval);
              this.syncInterval = null;
            }
          } else if (streamInfo.hasStarted) {
            this.streamStatus.set('live');
            const wasNotShowing = !this.showVideo();
            this.showVideo.set(true);
            this.streamMessage.set('LIVE - Synchronized streaming');
            
            // Load full video data once when stream goes live (to increment view count)
            if (wasNotShowing && !this.viewCounted()) {
              this.videoService.getVideoById(videoId).subscribe({
                next: (video) => {
                  this.video.set(video);
                  this.videoUrl.set(this.videoService.getVideoUrl(video));
                  this.viewCounted.set(true);
                },
                error: (error) => {
                  console.error('Error loading video data:', error);
                }
              });
            }
            
            this.synchronizeVideo(streamInfo);
            
            // Setup event listeners if video just became visible
            if (wasNotShowing) {
              this.setupVideoEventListeners();
            }
          } else {
            this.streamStatus.set('not-started');
            this.showVideo.set(false);
            const startTime = new Date(streamInfo.scheduledReleaseTime!).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });
            this.streamMessage.set(`This live stream hasn't started yet. It will begin at ${startTime}`);
          }
        },
        error: (error) => {
          console.error('Error syncing stream:', error);
        }
      });
    }, 2000);
  }
  
  // Check if stream has started without incrementing view count
  checkIfStarted(): void {
    const videoId = this.video()?.id;
    if (!videoId) return;
    
    this.isLoading.set(true);
    this.loadStreamInfo(videoId);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onLike(): void {
    const video = this.video();
    if (!video) return;

    if (!this.authService.isLoggedIn()) {
      this.errorMessage.set('Please log in to like videos');
      setTimeout(() => this.errorMessage.set(null), 3000);
      return;
    }

    this.videoService.toggleLike(video.id).subscribe({
      next: (response) => {
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
