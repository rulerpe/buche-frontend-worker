import { useState, useRef, useCallback, useEffect } from 'react';
import type { 
  WebSocketMessage, 
  WebSocketState, 
  WebSocketConfig, 
  GenerationRequest 
} from '../types';

interface UseWebSocketOptions extends Partial<WebSocketConfig> {
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: WebSocketState) => void;
  onError?: (error: string) => void;
}

export const useWebSocket = ({
  url,
  reconnectAttempts = 3,
  reconnectInterval = 2000,
  timeout = 30000,
  onMessage,
  onStatusChange,
  onError
}: UseWebSocketOptions) => {
  const [state, setState] = useState<WebSocketState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Update state and notify
  const updateState = useCallback((newState: WebSocketState) => {
    setState(newState);
    onStatusChange?.(newState);
  }, [onStatusChange]);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
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
          break;
      }
      
      onMessage?.(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      onError?.('Invalid message format received');
    }
  }, [onMessage, onError, updateState]);

  // Handle connection open
  const handleOpen = useCallback(() => {
    console.log('WebSocket connected');
    updateState('connected');
    reconnectCountRef.current = 0;
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
  }, [updateState]);

  // Handle connection close
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('WebSocket closed:', event.code, event.reason);
    wsRef.current = null;
    
    if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
      // Attempt to reconnect unless it was a normal closure
      updateState('reconnecting');
      reconnectCountRef.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval * reconnectCountRef.current);
    } else {
      updateState('disconnected');
    }
  }, [reconnectAttempts, reconnectInterval, updateState]);

  // Handle connection error
  const handleError = useCallback((event: Event) => {
    console.error('WebSocket error:', event);
    updateState('error');
    onError?.('Connection failed');
  }, [updateState, onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!url) {
      onError?.('WebSocket URL not provided');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connecting or connected
    }

    try {
      updateState('connecting');
      
      // Create WebSocket connection
      const wsUrl = url.startsWith('ws') ? url : url.replace('http', 'ws');
      wsRef.current = new WebSocket(wsUrl);
      
      // Set up event listeners
      wsRef.current.addEventListener('open', handleOpen);
      wsRef.current.addEventListener('message', handleMessage);
      wsRef.current.addEventListener('close', handleClose);
      wsRef.current.addEventListener('error', handleError);
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          wsRef.current?.close();
          updateState('error');
          onError?.('Connection timeout');
        }
      }, timeout);
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      updateState('error');
      onError?.('Failed to create connection');
    }
  }, [url, timeout, updateState, onError, handleOpen, handleMessage, handleClose, handleError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    // Close connection
    if (wsRef.current) {
      wsRef.current.removeEventListener('open', handleOpen);
      wsRef.current.removeEventListener('message', handleMessage);
      wsRef.current.removeEventListener('close', handleClose);
      wsRef.current.removeEventListener('error', handleError);
      
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
    
    updateState('disconnected');
    reconnectCountRef.current = 0;
  }, [updateState, handleOpen, handleMessage, handleClose, handleError]);

  // Send message
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        onError?.('Failed to send message');
        return false;
      }
    } else {
      onError?.('WebSocket not connected');
      return false;
    }
  }, [onError]);

  // Generate content with streaming
  const generateContent = useCallback((request: GenerationRequest) => {
    // Reset state
    setGeneratedContent('');
    setProgressMessages([]);
    
    if (state !== 'connected') {
      onError?.('Not connected to server');
      return false;
    }
    
    return sendMessage(request);
  }, [state, sendMessage, onError]);

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