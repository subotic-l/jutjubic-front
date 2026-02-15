import { Injectable } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  private messageSubject = new Subject<ChatMessage>();
  public messages$ = this.messageSubject.asObservable();

  connect(streamId: number): void {
    console.log('ChatService: Connecting to stream', streamId);
    
    // Dohvati JWT token iz localStorage
    const token = localStorage.getItem('jwt-token');
    
    this.client = new Client({
      brokerURL: 'ws://localhost/ws-chat',
      reconnectDelay: 5000,
      connectHeaders: token ? {
        'Authorization': `Bearer ${token}`
      } : {},
      onConnect: () => {
        console.log('ChatService: Connected successfully');
        this.subscription = this.client!.subscribe(
          `/topic/stream/${streamId}`,
          (message) => {
            console.log('ChatService: Received raw message', message.body);
            const chatMessage: ChatMessage = JSON.parse(message.body);
            this.messageSubject.next(chatMessage);
          }
        );
      },
      onStompError: (frame) => {
        console.error('ChatService: STOMP error', frame);
      },
      onWebSocketError: (event) => {
        console.error('ChatService: WebSocket error', event);
      }
    });

    this.client.activate();
  }

  sendMessage(message: ChatMessage): void {
    console.log('ChatService: Attempting to send message', message);
    
    if (!this.client) {
      console.error('ChatService: Client not initialized');
      return;
    }
    
    if (!this.client.connected) {
      console.error('ChatService: Client not connected');
      return;
    }
    
    this.client.publish({
      destination: `/app/chat.send/${message.streamId}`,
      body: JSON.stringify(message)
    });
    
    console.log('ChatService: Message sent successfully');
  }

  disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }
}
