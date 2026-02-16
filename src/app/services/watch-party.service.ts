import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WatchPartyDto, CreateWatchPartyRequest, WatchPartyMessage } from '../models/watch-party.model';

@Injectable({
  providedIn: 'root'
})
export class WatchPartyService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  
  private apiUrl = 'http://localhost/api/watch-party';
  private wsUrl = 'http://localhost/ws';
  
  private stompClient: Client | null = null;
  private messageSubject = new Subject<WatchPartyMessage>();
  
  public messages$ = this.messageSubject.asObservable();
  public connected = signal<boolean>(false);
  public currentRoom = signal<string | null>(null);

  // REST API calls
  createWatchParty(request: CreateWatchPartyRequest): Observable<WatchPartyDto> {
    return this.http.post<WatchPartyDto>(this.apiUrl, request);
  }

  joinWatchParty(roomCode: string): Observable<WatchPartyDto> {
    return this.http.post<WatchPartyDto>(`${this.apiUrl}/${roomCode}/join`, {});
  }

  leaveWatchParty(roomCode: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${roomCode}/leave`, {});
  }

  startVideo(roomCode: string, videoId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${roomCode}/start-video/${videoId}`, {});
  }

  closeWatchParty(roomCode: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${roomCode}/close`, {});
  }

  getWatchParty(roomCode: string): Observable<WatchPartyDto> {
    return this.http.get<WatchPartyDto>(`${this.apiUrl}/${roomCode}`);
  }

  getActiveWatchParties(): Observable<WatchPartyDto[]> {
    return this.http.get<WatchPartyDto[]>(this.apiUrl);
  }

  // WebSocket connection
  connectToRoom(roomCode: string, onConnected?: () => void): void {
    if (!isPlatformBrowser(this.platformId)) {
        return;
    }

    this.disconnectFromRoom();

    this.stompClient = new Client({
        webSocketFactory: () => new SockJS(this.wsUrl),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: (str) => {
        console.log('[STOMP]', str);
        }
    });

    this.stompClient.onConnect = () => {
        console.log('[WatchParty] Connected to WebSocket');
        this.connected.set(true);
        this.currentRoom.set(roomCode);

        this.stompClient?.subscribe(`/topic/watchparty/${roomCode}`, (message: IMessage) => {
        const parsedMessage: WatchPartyMessage = JSON.parse(message.body);
        console.log('[WatchParty] Received message:', parsedMessage);
        this.messageSubject.next(parsedMessage);
        });

        if (onConnected) {
        onConnected();
        }
    };

    this.stompClient.onDisconnect = () => {
        console.log('[WatchParty] Disconnected from WebSocket');
        this.connected.set(false);
        this.currentRoom.set(null);
    };

    this.stompClient.onStompError = (frame) => {
        console.error('[WatchParty] STOMP error:', frame);
    };

    this.stompClient.activate();
  }

  disconnectFromRoom(): void {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.deactivate();
    }
    this.connected.set(false);
    this.currentRoom.set(null);
  }
}