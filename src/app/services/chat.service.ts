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
    this.client = new Client({
      brokerURL: 'ws://localhost/ws-chat',
      reconnectDelay: 5000,
      onConnect: () => {
        this.subscription = this.client!.subscribe(
          `/topic/stream/${streamId}`,
          (message) => {
            const chatMessage: ChatMessage = JSON.parse(message.body);
            this.messageSubject.next(chatMessage);
          }
        );
      }
    });

    this.client.activate();
  }

  sendMessage(message: ChatMessage): void {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination: `/app/chat.send/${message.streamId}`,
        body: JSON.stringify(message)
      });
    }
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
