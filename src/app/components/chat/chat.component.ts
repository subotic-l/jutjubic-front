import { Component, input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal, inject } from '@angular/core';
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
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  streamId = input.required<number>();
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  newMessage: string = '';
  private shouldScroll = false;
  private currentStreamId: number = 0;
  private authService = inject(AuthService);

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    // Proveri da li streamId postoji i konektuj se
    try {
      const id = this.streamId();
      if (id && id > 0) {
        this.currentStreamId = id;
        console.log('Chat: Connecting to stream', id);
        this.chatService.connect(id);
      } else {
        console.warn('Chat: Invalid streamId', id);
      }
    } catch (error) {
      console.error('Chat: Error reading streamId', error);
    }
    
    // Subscribe na poruke
    this.chatService.messages$.subscribe(message => {
      console.log('Chat: Received message', message);
      this.messages.update(current => [...current, message]);
      this.shouldScroll = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
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
    
    console.log('Chat: Sending message', message);
    this.chatService.sendMessage(message);
    this.newMessage = '';
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
