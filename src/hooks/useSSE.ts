import { useState, useRef, useCallback, useEffect } from 'react';
import type { 
  WebSocketMessage, 
  WebSocketState, 
  GenerationRequest 
} from '../types';

interface UseSSEOptions {
  url?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: WebSocketState) => void;
  onError?: (error: string) => void;
}

export const useSSE = ({
  url,
  onMessage,
  onStatusChange,
  onError
}: UseSSEOptions) => {
  const [state, setState] = useState<WebSocketState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update state and notify
  const updateState = useCallback((newState: WebSocketState) => {
    setState(newState);
    onStatusChange?.(newState);
  }, [onStatusChange]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);
    
    // Update local state based on message type
    switch (message.type) {
      case 'status':
        setProgressMessages(prev => [...prev, message.message]);
        break;
        
      case 'progress':
        setProgressMessages(prev => [...prev, message.message || `${message.step} completed`]);
        break;
        
      case 'stream':
        setGeneratedContent(prev => prev + message.chunk);
        break;
        
      case 'complete':
        if (message.data.success) {
          setGeneratedContent(message.data.generatedContent);
        }
        updateState('connected'); // Reset to connected state
        break;
        
      case 'error':
        onError?.(message.message);
        updateState('error');
        break;
    }
    
    onMessage?.(message);
  }, [onMessage, onError, updateState]);

  // Generate content with SSE streaming
  const generateContent = useCallback(async (request: GenerationRequest) => {
    if (!url) {
      onError?.('SSE URL not provided');
      return false;
    }

    // Reset state
    setGeneratedContent('');
    setProgressMessages([]);
    updateState('connecting');

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Make POST request to SSE endpoint
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      updateState('connected');

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // Decode chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Parse SSE events
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = line.slice(6); // Remove 'data: ' prefix
                if (data.trim()) {
                  const message: WebSocketMessage = JSON.parse(data);
                  handleMessage(message);
                  
                  // If complete, we're done
                  if (message.type === 'complete' || message.type === 'error') {
                    return true;
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE message:', line, parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return true;

    } catch (error) {
      console.error('SSE generation error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        updateState('disconnected');
      } else {
        updateState('error');
        onError?.(error instanceof Error ? error.message : String(error));
      }
      
      return false;
    }
  }, [url, onError, updateState, handleMessage]);

  // Connect (for compatibility with WebSocket interface)
  const connect = useCallback(() => {
    updateState('disconnected'); // SSE doesn't maintain persistent connections
  }, [updateState]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    updateState('disconnected');
  }, [updateState]);

  // Send message (not applicable for SSE, but kept for compatibility)
  const sendMessage = useCallback((_message: any) => {
    console.warn('sendMessage not supported in SSE mode, use generateContent instead');
    return false;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    state,
    lastMessage,
    generatedContent,
    progressMessages,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    generateContent,
    
    // Status
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
    isReconnecting: state === 'reconnecting',
    hasError: state === 'error',
    
    // Reset functions
    clearContent: () => setGeneratedContent(''),
    clearProgress: () => setProgressMessages([])
  };
};