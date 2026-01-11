import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { VideoComment } from '../../models/video.model';

@Component({
  selector: 'app-video-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-comments.component.html',
  styleUrls: ['./video-comments.component.css']
})
export class VideoCommentsComponent implements OnInit {
  @Input() videoId!: number;

  private videoService = inject(VideoService);
  public authService = inject(AuthService);

  comments = signal<VideoComment[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  newCommentText = '';

  // Pagination
  currentPage = signal(0);
  commentsPerPage = 10;
  hasMoreComments = signal(true);

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(page: number = 0) {
    if (!this.videoId) return;
    
    this.isLoading.set(true);
    this.videoService.getVideoComments(this.videoId, page, this.commentsPerPage)
      .subscribe({
        next: (comments) => {
          if (page === 0) {
            this.comments.set(comments);
          } else {
            this.comments.update(current => [...current, ...comments]);
          }
          
          this.hasMoreComments.set(comments.length === this.commentsPerPage);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading comments:', err);
          this.errorMessage.set('Failed to load comments.');
          this.isLoading.set(false);
        }
      });
  }

  addComment() {
    if (!this.authService.isLoggedIn()) {
      alert('You must log in to comment.');
      return;
    }

    const text = this.newCommentText.trim();
    if (!text) return;

    this.videoService.addVideoComment(this.videoId, text)
      .subscribe({
        next: (comment) => {
          // Dodaj novi komentar na početak liste
          this.comments.update(comments => [comment, ...comments]);
          this.newCommentText = '';
        },
        error: (err) => {
          console.error('Error posting comment:', err);
          alert('Failed to post comment.');
        }
      });
  }

  loadMoreComments() {
    const nextPage = this.currentPage() + 1;
    this.currentPage.set(nextPage);
    this.loadComments(nextPage);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
    return `${Math.floor(seconds / 31536000)} years ago`;
  }

  onTextareaFocus(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.rows = 3;
  }

  onTextareaBlur(event: Event) {
    if (!this.newCommentText.trim()) {
      const textarea = event.target as HTMLTextAreaElement;
      textarea.rows = 1;
    }
  }
}
