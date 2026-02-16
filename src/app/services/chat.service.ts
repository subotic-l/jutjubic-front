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
  private currentStreamId: number | null = null;
  private isConnecting: boolean = false;

  connect(streamId: number): void {
    // Prevent multiple connections to the same stream
    if (this.currentStreamId === streamId && this.stompClient?.connected) {
      console.log('ChatService: Already connected to stream', streamId);
      return;
    }

    // Disconnect from previous stream if connected
    if (this.stompClient?.connected) {
      console.log('ChatService: Disconnecting from previous stream', this.currentStreamId);
      this.disconnect();
    }

    if (this.isConnecting) {
      console.log('ChatService: Connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.currentStreamId = streamId;
    
    const socketUrl = 'http://localhost/ws-chat';
    console.log('ChatService: Connecting to', socketUrl, 'for stream', streamId);
    
    const socket = new SockJS(socketUrl);
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect({}, (frame: any) => {
      this.isConnecting = false;
      console.log('ChatService: ✅ Connected to stream', streamId);
      
      // Subscribe to chat topic for this stream
      this.stompClient.subscribe(`/topic/stream/${streamId}`, (message: any) => {
        console.log('ChatService: 📨 Received message', message.body);
        const chatMessage: ChatMessage = JSON.parse(message.body);
        this.messageSubject.next(chatMessage);
      });
      
    }, (error: any) => {
      this.isConnecting = false;
      console.error('ChatService: ❌ Connection error', error);
    });
  }

  sendMessage(message: ChatMessage): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.error('ChatService: Client not connected');
      return;
    }
    
    console.log('ChatService: 📤 Sending message to stream', message.streamId, message);
    this.stompClient.send(
      `/app/chat.send/${message.streamId}`,
      {},
      JSON.stringify(message)
    );
  }

  disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('ChatService: Disconnecting from stream', this.currentStreamId);
      this.stompClient.disconnect();
      this.stompClient = null;
      this.currentStreamId = null;
    }
  }
}
