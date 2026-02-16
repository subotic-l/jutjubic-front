import { Component, input, OnInit, OnDestroy, ViewChild, ElementRef, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  streamId = input.required<number>();
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  newMessage: string = '';
  private currentStreamId: number = 0;
  private authService = inject(AuthService);

  constructor(private chatService: ChatService) {
    // Effect koji se poziva svaki put kad se messages signal promeni
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });
  }

  ngOnInit(): void {
    // Proveri da li streamId postoji i konektuj se
    try {
      const id = this.streamId();
      if (id && id > 0) {
        this.currentStreamId = id;
        this.chatService.connect(id);
      } else {
        console.warn('Chat: Invalid streamId', id);
      }
    } catch (error) {
      console.error('Chat: Error reading streamId', error);
    }
    
    // Subscribe na poruke
    this.chatService.messages$.subscribe(message => {
      this.messages.update(current => [...current, message]);
    });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    
    if (!this.currentStreamId || this.currentStreamId === 0) {
      console.error('Chat: Cannot send message, streamId not set');
      return;
    }

    const currentUser = this.authService.currentUser();
    const senderName = currentUser?.username || 'Anonymous';
    
    const message: ChatMessage = {
      sender: senderName,
      content: this.newMessage.trim(),
      streamId: this.currentStreamId
    };

    this.chatService.sendMessage(message);
    this.newMessage = '';
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
