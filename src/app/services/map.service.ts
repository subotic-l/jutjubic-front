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
      this.leafletMap = L.map(elementId, {
        minZoom: 2,
        maxBoundsViscosity: 1.0
      }).setView(center, zoom);

      // Custom tile layer sa validacijom koordinata
      const CustomTileLayer = (L.TileLayer as any).extend({
        getTileUrl: function(coords: any) {
          const maxTile = Math.pow(2, coords.z) - 1;
          
          // Proveri da li su koordinate validne
          if (coords.x < 0 || coords.x > maxTile || coords.y < 0 || coords.y > maxTile) {
            return ''; // Vrati praznu string za nevažeće koordinate
          }
          
          return (L.TileLayer.prototype as any).getTileUrl.call(this, coords);
        }
      });

      const customLayer = new CustomTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
        noWrap: true
      });
      
      customLayer.addTo(this.leafletMap);

      // Postavi granice mape
      this.leafletMap.setMaxBounds([[-90, -180], [90, 180]]);

      return this.leafletMap;
    }
  }

  getMap(): any {
    return this.leafletMap;
  }
}
