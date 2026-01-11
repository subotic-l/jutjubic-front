import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-upload-video',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-video.component.html',
  styleUrl: './upload-video.component.css'
})
export class UploadVideoComponent {
  title = '';
  description = '';
  tagInput = '';
  tags: string[] = [];
  thumbnail: File | null = null;
  video: File | null = null;
  location = '';
  includeLocation = false;
  
  thumbnailPreview = signal<string | null>(null);
  videoFileName = signal<string | null>(null);
  
  isUploading = signal(false);
  uploadProgress = signal(0);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private videoService: VideoService,
    private router: Router
  ) {}

  onThumbnailSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Please select an image (JPG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 5MB for thumbnail)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage.set('Image cannot be larger than 5MB');
        return;
      }
      
      this.thumbnail = file;
      this.errorMessage.set(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.thumbnailPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onVideoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (file.type !== 'video/mp4') {
        this.errorMessage.set('Please select an MP4 video');
        return;
      }
      
      // Validate file size (max 200MB)
      if (file.size > 200 * 1024 * 1024) {
        this.errorMessage.set('Video cannot be larger than 200MB');
        return;
      }
      
      this.video = file;
      this.videoFileName.set(file.name);
      this.errorMessage.set(null);
    }
  }

  addTag(): void {
    const tag = this.tagInput.trim();
    
    if (!tag) return;
    
    // Ensure tag starts with #
    const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
    
    // Check if tag already exists
    if (this.tags.includes(formattedTag)) {
      this.errorMessage.set('Tag already exists');
      return;
    }
    
    this.tags.push(formattedTag);
    this.tagInput = '';
    this.errorMessage.set(null);
  }

  removeTag(index: number): void {
    this.tags.splice(index, 1);
  }

  onTagInputKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }
  }

  async getCurrentLocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.errorMessage.set('Geolocation is not supported in your browser');
      return;
    }

    this.isUploading.set(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      
      // Use reverse geocoding to get city and country
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
        const country = data.address?.country || '';
        
        if (city && country) {
          this.location = `${city}, ${country}`;
        } else if (country) {
          this.location = country;
        } else {
          // Fallback to coordinates if geocoding fails
          this.location = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
      } else {
        // Fallback to coordinates if API fails
        this.location = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      this.includeLocation = true;
      this.successMessage.set('Location successfully obtained');
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set('Unable to get location. Check permissions.');
      this.includeLocation = false;
    } finally {
      this.isUploading.set(false);
    }
  }

  validateForm(): boolean {
    if (!this.title.trim()) {
      this.errorMessage.set('Title is required');
      return false;
    }
    
    if (!this.description.trim()) {
      this.errorMessage.set('Description is required');
      return false;
    }
    
    if (this.tags.length === 0) {
      this.errorMessage.set('Add at least one tag');
      return false;
    }
    
    if (!this.thumbnail) {
      this.errorMessage.set('Thumbnail image is required');
      return false;
    }
    
    if (!this.video) {
      this.errorMessage.set('Video is required');
      return false;
    }
    
    return true;
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    
    if (!this.validateForm()) {
      return;
    }

    this.isUploading.set(true);
    
    try {
      const formData = new FormData();
      formData.append('title', this.title);
      formData.append('description', this.description);
      
      // Add tags as JSON array or individual entries
      this.tags.forEach(tag => {
        formData.append('tags', tag);
      });
      
      formData.append('thumbnail', this.thumbnail!);
      formData.append('video', this.video!);
      
      if (this.includeLocation && this.location) {
        formData.append('location', this.location);
      }
      
      await firstValueFrom(this.videoService.uploadVideo(formData));
      
      this.successMessage.set('Video uploaded successfully!');
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
      
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Error uploading video');
    } finally {
      this.isUploading.set(false);
    }
  }
}
