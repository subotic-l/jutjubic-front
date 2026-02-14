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
  latitude: number | null = null;
  longitude: number | null = null;
  includeLocation = false;
  
  // Scheduled release fields
  scheduledReleaseTime: string | null = null;
  videoDurationSeconds: number | null = null;
  isScheduled = false;
  
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
      
      // Get video duration
      this.getVideoDuration(file);
    }
  }

  getVideoDuration(file: File): void {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      this.videoDurationSeconds = Math.floor(video.duration);
    };
    
    video.src = URL.createObjectURL(file);
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
      
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;
      
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
    this.uploadProgress.set(0);
    
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
      
      if (this.includeLocation && this.latitude !== null && this.longitude !== null) {
        formData.append('latitude', this.latitude.toString());
        formData.append('longitude', this.longitude.toString());
      }
      
      // Add scheduled release fields if scheduled
      if (this.isScheduled && this.scheduledReleaseTime) {
        formData.append('scheduledReleaseTime', this.scheduledReleaseTime);
      }
      
      if (this.videoDurationSeconds !== null) {
        formData.append('videoDurationSeconds', this.videoDurationSeconds.toString());
      }
      
      // Use uploadVideoWithProgress to track upload progress
      const uploadObservable = this.videoService.uploadVideoWithProgress(formData);
      
      await new Promise<void>((resolve, reject) => {
        uploadObservable.subscribe({
          next: (event) => {
            this.uploadProgress.set(event.progress);
            if (event.response) {
              resolve();
            }
          },
          error: (error) => {
            console.error('Upload error:', error);
            let errorMsg = 'Error uploading video';
            
            if (error.status === 0) {
              errorMsg = 'Connection failed. Check if backend is running or if file is too large.';
            } else if (error.status === 413) {
              errorMsg = 'File is too large. Maximum size exceeded.';
            } else if (error.status === 500) {
              errorMsg = 'Server error. Please try again later.';
            } else if (error.error?.message) {
              errorMsg = error.error.message;
            } else if (error.message) {
              errorMsg = error.message;
            }
            
            reject(new Error(errorMsg));
          },
          complete: () => {
            // Upload completed successfully
          }
        });
      });
      
      this.successMessage.set('Video uploaded successfully!');
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
      
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Error uploading video');
      this.uploadProgress.set(0);
    } finally {
      this.isUploading.set(false);
    }
  }
}
