export interface ChatMessage {
  sender: string;
  content: string;
  streamId: number;
  timestamp?: string;
}
