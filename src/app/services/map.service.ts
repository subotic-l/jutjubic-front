import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private leafletMap?: any; // Use any since L is not imported statically

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  async initMap(elementId: string, center: [number, number] = [44.7866, 20.4489], zoom: number = 13): Promise<any> {
    if (isPlatformBrowser(this.platformId)) {
      const L = await import('leaflet');
      this.leafletMap = L.map(elementId).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.leafletMap);

      return this.leafletMap;
    }
  }

  getMap(): any {
    return this.leafletMap;
  }
}
