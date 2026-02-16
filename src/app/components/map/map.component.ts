import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, NgZone, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MapService } from '../../services/map.service';
import { VideoService } from '../../services/video.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { VideoPostResponse } from '../../models/video.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private leafletMap?: any;
  private markers: any[] = [];
  private allVideos: VideoPostResponse[] = [];
  
  isLoading = signal(false);
  currentTimeFilter = signal('all');

  constructor(
    private mapService: MapService,
    private videoService: VideoService,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  private async initializeMap(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const L = await import('leaflet');
      
      let center: [number, number] = [44.7866, 20.4489]; // Default: Belgrade
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        center = [position.coords.latitude, position.coords.longitude];
      } catch (error) {
        console.warn('Geolocation failed or denied, using default center:', error);
      }

      this.leafletMap = await this.mapService.initMap('map-container', center);
      
      if (!this.leafletMap) return;

      // Fix for Leaflet marker icons
      const iconDefault = L.icon({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      L.Marker.prototype.options.icon = iconDefault;

      await this.loadInitialData(L);
    }
  }

  private async loadInitialData(L: any): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.loadVideosForCurrentView();
      this.renderMarkers(L);
      this.setupPopupClickListener();
      this.setupMapEventListeners();
    } catch (error) {
      console.error('Error loading map videos:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadVideosForCurrentView(): Promise<void> {
    if (!this.leafletMap) return;
    
    const bounds = this.leafletMap.getBounds();
    const tiles = this.calculateTiles(bounds);
    
    this.allVideos = await firstValueFrom(
      this.videoService.getMapVideos(tiles)
    );
  }

  private calculateTiles(bounds: any): Array<{x: number, y: number, zoom: number}> {
    const mapZoom: number = this.leafletMap.getZoom();

    const ZOOM = Math.min(mapZoom, 12);
    
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLon = bounds.getWest();
    const maxLon = bounds.getEast();
    
    // Konvertuj geo koordinate u tile koordinate (Leaflet/OSM tile sistem)
    const minTileX = this.lonToTile(minLon, ZOOM);
    const maxTileX = this.lonToTile(maxLon, ZOOM);
    const minTileY = this.latToTile(maxLat, ZOOM); // Y osa je obrnuta
    const maxTileY = this.latToTile(minLat, ZOOM);
    
    // Generisi sve tile-ove u vidljivom delu mape
    const tiles: Array<{x: number, y: number, zoom: number}> = [];
    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({ x, y, zoom: ZOOM });
      }
    }
    
    return tiles;
  }

  private lonToTile(lon: number, zoom: number): number {
    const tiles = Math.pow(2, zoom);
    const x = Math.floor((lon + 180) / 360 * tiles);
    // Clampuj vrednost na validni opseg [0, tiles-1]
    return Math.max(0, Math.min(tiles - 1, x));
  }

  private latToTile(lat: number, zoom: number): number {
    const tiles = Math.pow(2, zoom);
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * tiles);
    // Clampuj vrednost na validni opseg [0, tiles-1]
    return Math.max(0, Math.min(tiles - 1, y));
  }

  private setupMapEventListeners(): void {
    if (!this.leafletMap) return;
    
    let moveTimeout: any;
    this.leafletMap.on('moveend', async () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(async () => {
        const L = await import('leaflet');
        this.isLoading.set(true);
        try {
          await this.loadVideosForCurrentView();
          this.renderMarkers(L);
        } catch (error) {
          console.error('Error reloading videos:', error);
        } finally {
          this.isLoading.set(false);
        }
      }, 300); // Debounce 300ms
    });
  }

  onFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentTimeFilter.set(select.value);
    this.applyFilters();
  }

  private async applyFilters(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const L = await import('leaflet');
    this.renderMarkers(L);
  }

  private renderMarkers(L: any): void {
    if (!this.leafletMap) return;

    // Remove existing markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const now = new Date();
    const filteredVideos = this.allVideos.filter(video => {
      // Prvo filtriraj zakazane videe koji još nisu dostupni
      if (!this.isVideoAvailable(video)) {
        return false;
      }
      
      if (!video.createdAt) return false;
      const uploadDate = new Date(video.createdAt);
      
      switch (this.currentTimeFilter()) {
        case '30days':
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return uploadDate >= thirtyDaysAgo;
        case 'thisYear':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          return uploadDate >= startOfYear;
        default:
          return true;
      }
    });

    filteredVideos.forEach(video => {
      if (video.latitude !== undefined && video.longitude !== undefined) {
        const marker = L.marker([video.latitude, video.longitude]).addTo(this.leafletMap);
        
        const popupContent = `
          <div class="map-popup">
            <img src="${this.videoService.getThumbnailUrl(video.thumbnailPath)}" class="popup-thumb">
            <div class="popup-info">
              <h4 class="popup-title">${video.title}</h4>
              <p class="popup-author">By: ${video.username || 'Unknown'}</p>
              <p class="popup-views">${video.views || 0} views</p>
              <button class="btn-popup-view" data-id="${video.id}">Watch Video</button>
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent, {
          maxWidth: 250,
          className: 'custom-leaflet-popup'
        });

        this.markers.push(marker);
      }
    });
  }

  private setupPopupClickListener(): void {
    const container = document.getElementById('map-container');
    if (container) {
      container.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('btn-popup-view')) {
          const id = target.getAttribute('data-id');
          if (id) {
            this.ngZone.run(() => {
              this.router.navigate(['/video', id]);
            });
          }
        }
      });
    }
  }

  /**
   * Proverava da li je video dostupan za prikaz u listi.
   * Video je dostupan ako je DATUM premijere već nastupio (bez obzira na sat).
   */
  private isVideoAvailable(video: VideoPostResponse): boolean {
    if (!video.scheduledReleaseTime) {
      return true; // Nema zakazano vreme, video je dostupan
    }
    
    const scheduledTime = new Date(video.scheduledReleaseTime);
    const now = new Date();
    
    // Upoređujemo samo datume (bez sati)
    const scheduledDate = new Date(scheduledTime.getFullYear(), scheduledTime.getMonth(), scheduledTime.getDate());
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Video je dostupan ako je datum premijere danas ili u prošlosti
    return currentDate >= scheduledDate;
  }

  ngOnDestroy(): void {
    if (this.leafletMap) {
      this.leafletMap.remove();
    }
  }
}
