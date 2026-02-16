import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WatchPartyService } from '../../services/watch-party.service';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { WatchPartyDto, WatchPartyMessage } from '../../models/watch-party.model';
import { VideoPostResponse } from '../../models/video.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-watch-party',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watch-party.component.html',
  styleUrl: './watch-party.component.css'
})
export class WatchPartyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private watchPartyService = inject(WatchPartyService);
  private videoService = inject(VideoService);
  public authService = inject(AuthService);

  watchParty = signal<WatchPartyDto | null>(null);
  videos = signal<VideoPostResponse[]>([]);
  messages = signal<WatchPartyMessage[]>([]);
  isLoading = signal<boolean>(true);
  isOwner = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  private messageSubscription?: Subscription;

  ngOnInit(): void {
    const roomCode = this.route.snapshot.paramMap.get('roomCode');
    if (roomCode) {
      this.loadWatchParty(roomCode);
      this.loadVideos();
      this.connectToWebSocket(roomCode);
      this.subscribeToMessages();
    }
  }

  ngOnDestroy(): void {
    this.watchPartyService.disconnectFromRoom();
    this.messageSubscription?.unsubscribe();
  }

  loadWatchParty(roomCode: string): void {
    this.watchPartyService.getWatchParty(roomCode).subscribe({
      next: (party) => {
        this.watchParty.set(party);
        this.isLoading.set(false);
        
        const currentUser = this.authService.currentUser();
        this.isOwner.set(currentUser?.username === party.ownerUsername);
      },
      error: (error) => {
        console.error('Error loading watch party:', error);
        this.errorMessage.set('Watch party not found');
        this.isLoading.set(false);
      }
    });
  }

  loadVideos(): void {
    this.videoService.getAllVideos().subscribe({
      next: (videos) => {
        this.videos.set(videos);
      },
      error: (error) => {
        console.error('Error loading videos:', error);
      }
    });
  }

  connectToWebSocket(roomCode: string): void {
    this.watchPartyService.connectToRoom(roomCode);
  }

  subscribeToMessages(): void {
    this.messageSubscription = this.watchPartyService.messages$.subscribe((message) => {
      this.messages.update(msgs => [...msgs, message]);

      // Ako je VIDEO_STARTED i korisnik nije vlasnik, preusmeri na video
      if (message.type === 'VIDEO_STARTED' && !this.isOwner() && message.videoId) {
        console.log('[WatchParty] Redirecting to video:', message.videoId);
        this.router.navigate(['/video', message.videoId]);
      }

      // Ako je PARTY_CLOSED, vrati na početnu
      if (message.type === 'PARTY_CLOSED') {
        alert('Watch party has been closed by the owner');
        this.router.navigate(['/']);
      }

      // Refresh watch party data za USER_JOINED/USER_LEFT
      if (message.type === 'USER_JOINED' || message.type === 'USER_LEFT') {
        const roomCode = this.watchParty()?.roomCode;
        if (roomCode) {
          this.loadWatchParty(roomCode);
        }
      }
    });
  }

  startVideo(videoId: number): void {
    const roomCode = this.watchParty()?.roomCode;
    if (!roomCode) return;

    this.watchPartyService.startVideo(roomCode, videoId).subscribe({
      next: () => {
        console.log('[WatchParty] Video started successfully');
        // Vlasnik takođe ide na video stranicu
        this.router.navigate(['/video', videoId]);
      },
      error: (error) => {
        console.error('Error starting video:', error);
        this.errorMessage.set('Failed to start video');
      }
    });
  }

  leaveParty(): void {
    const roomCode = this.watchParty()?.roomCode;
    if (!roomCode) return;

    this.watchPartyService.leaveWatchParty(roomCode).subscribe({
      next: () => {
        this.watchPartyService.disconnectFromRoom();
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Error leaving party:', error);
      }
    });
  }

  closeParty(): void {
    const roomCode = this.watchParty()?.roomCode;
    if (!roomCode) return;

    if (confirm('Are you sure you want to close this watch party?')) {
      this.watchPartyService.closeWatchParty(roomCode).subscribe({
        next: () => {
          this.watchPartyService.disconnectFromRoom();
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Error closing party:', error);
        }
      });
    }
  }

  copyInviteLink(): void {
    const roomCode = this.watchParty()?.roomCode;
    if (roomCode) {
      const link = `${window.location.origin}/watch-party/${roomCode}`;
      navigator.clipboard.writeText(link);
      alert('Invite link copied to clipboard!');
    }
  }

  getThumbnailUrl(video: VideoPostResponse): string {
    return this.videoService.getThumbnailUrl(video);
  }
}