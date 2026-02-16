import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { VideoPostResponse, PopularVideoDto, convertLocalDateTimeToString } from '../../models/video.model';

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
  popularVideos = signal<PopularVideoDto[]>([]);
  isLoading = signal<boolean>(true);
  displayedVideos = signal<VideoPostResponse[]>([]);
  videosPerPage = 12;
  currentPage = 0;

  ngOnInit(): void {
    this.loadPopularVideos();
    this.loadVideos();
  }

  loadPopularVideos(): void {
    this.videoService.getPopularVideos().subscribe({
      next: (response) => {
        console.log('Popular videos response:', response);
        console.log('Popular videos array:', response.popularVideos);
        // Mapiranje uploaderUsername u username i filtriranje zakazanih videa
        const mappedVideos = response.popularVideos
          .map((video: any) => ({
            ...video,
            username: video.uploaderUsername,
            scheduledReleaseTime: video.scheduledReleaseTime ? convertLocalDateTimeToString(video.scheduledReleaseTime) : undefined
          }))
          .filter((video: any) => this.isVideoAvailable(video));
        this.popularVideos.set(mappedVideos);
      },
      error: (error) => {
        console.error('Error loading popular videos:', error);
        // Ako nema popularnih videa, nastavi sa normalnim prikazom
      }
    });
  }

  loadVideos(): void {
    this.videoService.getAllVideos().subscribe({
      next: (videos) => {
        // Konvertuj scheduledReleaseTime iz array formata u string
        const convertedVideos = videos.map(video => ({
          ...video,
          scheduledReleaseTime: video.scheduledReleaseTime ? convertLocalDateTimeToString(video.scheduledReleaseTime) : undefined
        }));
        // Filtriraj samo videe koji su dostupni (nisu zakazani za budućnost)
        const availableVideos = convertedVideos.filter(video => this.isVideoAvailable(video));
        this.videos.set(availableVideos);
        this.loadMoreVideos();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading videos:', error);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Proverava da li je video dostupan za prikaz u listi.
   * Video je dostupan ako je DATUM premijere već nastupio (bez obzira na sat).
   */
  private isVideoAvailable(video: VideoPostResponse | any): boolean {
    if (!video.scheduledReleaseTime) {
      return true; // Nema zakazano vreme, video je dostupan
    }
    
    const scheduledTime = new Date(video.scheduledReleaseTime);
    const now = new Date();
    
    // Upoređujemo samo datume (bez sati)
    const scheduledDate = new Date(scheduledTime.getFullYear(), scheduledTime.getMonth(), scheduledTime.getDate());
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log(`Checking availability for video "${video.title}": scheduledDate=${scheduledDate.toUTCString()}, currentDate=${currentDate.toUTCString()}`);
    
    // Video je dostupan ako je datum premijere danas ili u prošlosti
    return currentDate >= scheduledDate;
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

  getThumbnailUrl(video: VideoPostResponse): string {
    return this.videoService.getThumbnailUrl(video);
  }

  getPopularThumbnailUrl(video: any): string {
    return this.videoService.getThumbnailUrl(video);
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
