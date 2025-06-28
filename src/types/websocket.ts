// WebSocket message types for real-time content streaming

export type WebSocketMessageType = 'status' | 'progress' | 'stream' | 'complete' | 'error';

export interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  timestamp?: number;
}

export interface StatusMessage extends BaseWebSocketMessage {
  type: 'status';
  message: string;
}

export interface ProgressMessage extends BaseWebSocketMessage {
  type: 'progress';
  step: 'characters' | 'summary' | 'tags' | 'snippets' | 'generation';
  data: any;
  message?: string;
}

export interface StreamMessage extends BaseWebSocketMessage {
  type: 'stream';
  chunk: string;
  total?: string;
}

export interface CompleteMessage extends BaseWebSocketMessage {
  type: 'complete';
  data: {
    success: boolean;
    generatedContent: string;
    extractedCharacters: any[];
    contentSummary: string;
    detectedTags: string[];
    relatedSnippets: any[];
  };
}

export interface ErrorMessage extends BaseWebSocketMessage {
  type: 'error';
  message: string;
  code?: string;
  retryable?: boolean;
}

export type WebSocketMessage = 
  | StatusMessage 
  | ProgressMessage 
  | StreamMessage 
  | CompleteMessage 
  | ErrorMessage;

// WebSocket connection states
export type WebSocketState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'error' 
  | 'reconnecting';

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  timeout?: number;
}