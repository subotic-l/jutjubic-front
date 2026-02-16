import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WatchPartyService } from '../../services/watch-party.service';

@Component({
  selector: 'app-create-watch-party',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-watch-party.component.html',
  styleUrl: './create-watch-party.component.css'
})
export class CreateWatchPartyComponent {
  private router = inject(Router);
  private watchPartyService = inject(WatchPartyService);

  partyName = '';
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  createParty(): void {
    if (!this.partyName.trim()) {
      this.errorMessage.set('Please enter a party name');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.watchPartyService.createWatchParty({ name: this.partyName }).subscribe({
      next: (party) => {
        this.isLoading.set(false);
        this.router.navigate(['/watch-party', party.roomCode]);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error creating watch party:', error);
        this.errorMessage.set('Failed to create watch party');
      }
    });
  }
}