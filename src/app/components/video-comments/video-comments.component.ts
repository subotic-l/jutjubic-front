import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { VideoComment } from '../../models/video.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-video-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-comments.component.html',
  styleUrls: ['./video-comments.component.css']
})
export class VideoCommentsComponent {
  @Input() videoId!: number;

  public videoService = inject(VideoService);
  public authService = inject(AuthService);

  comments = signal<VideoComment[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  newComment = signal<string>('');

  // Pagination
  currentPage = signal(1);
  commentsPerPage = 5;

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(page: number = 1) {
    if (!this.videoId) return;
    this.isLoading.set(true);
    this.videoService.getVideoComments(this.videoId, page, this.commentsPerPage)
      .subscribe({
        next: (comments) => {
          // sortirano od najnovijeg do najstarijeg
          this.comments.set(comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
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

    const text = this.newComment();
    if (!text.trim()) return;

    this.videoService.addVideoComment(this.videoId, text)
      .subscribe({
        next: (comment) => {
          // dodaj novi komentar na početak liste
          this.comments.update(c => [comment, ...c]);
          this.newComment.set('');
        },
        error: (err) => {
          console.error(err);
          alert('Failed to post comment.');
        }
      });
  }

  nextPage() {
    this.currentPage.update(p => p + 1);
    this.loadComments(this.currentPage());
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadComments(this.currentPage());
    }
  }
}
