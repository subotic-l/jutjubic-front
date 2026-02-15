import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import { Subject } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private stompClient: any = null;
  private messageSubject = new Subject<ChatMessage>();
  public messages$ = this.messageSubject.asObservable();

  connect(streamId: number): void {
    const socketUrl = 'http://localhost/ws-chat';
    
    const socket = new SockJS(socketUrl);
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect({}, (frame: any) => {
      // Subscribe to chat topic for this stream
      this.stompClient.subscribe(`/topic/stream/${streamId}`, (message: any) => {
        const chatMessage: ChatMessage = JSON.parse(message.body);
        this.messageSubject.next(chatMessage);
      });
      
    }, (error: any) => {
      console.error('ChatService: ❌ Connection error', error);
    });
  }

  sendMessage(message: ChatMessage): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.error('ChatService: Client not connected');
      return;
    }
    
    this.stompClient.send(
      `/app/chat.send/${message.streamId}`,
      {},
      JSON.stringify(message)
    );
  }

  disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.disconnect();
      this.stompClient = null;
    }
  }
}
