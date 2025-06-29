import React, { useState, useCallback, useEffect } from 'react';
import FileLoader from './components/FileLoader';
import EReader from './components/EReader';
import ContextMenu from './components/ContextMenu';
import StreamingIndicator from './components/StreamingIndicator';
import { useWebSocket } from './hooks/useWebSocket';
import type { 
  FileInfo, 
  ClickPosition, 
  GeneratedContentBlock, 
  GenerationRequest,
  WebSocketMessage 
} from './types';
import './styles/global.css';

// Configuration - direct connection to content generator worker
const WS_URL = 'wss://buche-content-generator-worker.neetisthebest.workers.dev/generate-stream';

const App: React.FC = () => {
  // File state
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  
  // UI state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const [theme] = useState<'light' | 'dark'>('light');
  
  // Generated content state
  const [generatedContent, setGeneratedContent] = useState<Map<number, GeneratedContentBlock>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);

  // WebSocket connection
  const {
    state: wsState,
    generatedContent: streamingContent,
    progressMessages,
    generateContent,
    clearContent,
    clearProgress,
    connect,
    isConnected
  } = useWebSocket({
    url: WS_URL,
    onMessage: handleWSMessage,
    onStatusChange: handleWSStatusChange,
    onError: handleWSError
  });

  // Handle WebSocket messages
  function handleWSMessage(message: WebSocketMessage) {
    console.log('WebSocket message:', message);
    
    switch (message.type) {
      case 'complete':
        setIsGenerating(false);
        break;
      case 'error':
        setIsGenerating(false);
        console.error('Generation error:', message.message);
        break;
    }
  }

  // Handle WebSocket status changes
  function handleWSStatusChange(status: typeof wsState) {
    console.log('WebSocket status:', status);
  }

  // Handle WebSocket errors
  function handleWSError(error: string) {
    console.error('WebSocket error:', error);
    setIsGenerating(false);
  }

  // Handle file loading
  const handleFileLoad = useCallback((fileInfo: FileInfo) => {
    console.log('File loaded:', fileInfo.name, `${fileInfo.size} bytes`);
    setCurrentFile(fileInfo);
    
    // Clear previous generated content
    setGeneratedContent(new Map());
    
    // Don't auto-connect on file load, wait for user to generate content
  }, []);

  // Handle text click in reader
  const handleTextClick = useCallback((position: ClickPosition) => {
    console.log('Text clicked at position:', position);
    setClickPosition(position);
    setShowContextMenu(true);
  }, []);

  // Handle content generation request
  const handleGenerate = useCallback((selectedTags: string[], contextText: string) => {
    // Start generation state immediately to show dialog
    setIsGenerating(true);
    setShowContextMenu(false);
    
    // Clear previous streaming content
    clearContent();
    clearProgress();
    
    // Connect if not already connected
    if (!isConnected) {
      console.log('Connecting to WebSocket...');
      connect();
      
      // Store the generation parameters to use after connection
      (window as any).__pendingGeneration = { selectedTags, contextText };
      
      return;
    }
    
    proceedWithGeneration(selectedTags, contextText);
  }, [isConnected, connect, clearContent, clearProgress]);
  
  // Helper function to proceed with generation
  const proceedWithGeneration = useCallback((selectedTags: string[], contextText: string) => {
    console.log('Generating content with tags:', selectedTags);
    
    // Prepare generation request
    const request: GenerationRequest = {
      content: contextText,
      tags: selectedTags,
      maxLength: 800,
      style: 'continue'
    };
    
    const success = generateContent(request);
    if (!success) {
      console.error('Failed to send generation request');
      // Keep dialog open to show error state
    }
  }, [generateContent]);

  // Watch for WebSocket connection to complete pending generation
  useEffect(() => {
    if (isConnected && (window as any).__pendingGeneration) {
      const { selectedTags, contextText } = (window as any).__pendingGeneration;
      delete (window as any).__pendingGeneration;
      
      console.log('WebSocket connected - proceeding with pending generation');
      proceedWithGeneration(selectedTags, contextText);
    }
  }, [isConnected, proceedWithGeneration]);


  // Handle canceling generation
  const handleCancelGeneration = useCallback(() => {
    setIsGenerating(false);
    clearContent();
    clearProgress();
    console.log('Generation canceled');
  }, [clearContent, clearProgress]);



  // Render loading state
  if (!currentFile) {
    return (
      <div className={`app ${theme}`}>
        <FileLoader onFileLoad={handleFileLoad} />
      </div>
    );
  }

  return (
    <div className={`app ${theme}`}>
      {/* Main Reader */}
      <EReader
        fileInfo={currentFile}
        onTextClick={handleTextClick}
        generatedContent={generatedContent}
        isGenerating={isGenerating}
        streamingContent={streamingContent}
      />

      {/* Context Menu */}
      {showContextMenu && clickPosition && (
        <ContextMenu
          position={clickPosition}
          onGenerate={handleGenerate}
          onClose={() => setShowContextMenu(false)}
          apiBaseUrl="/api" // Use proxy API base
          isGenerating={isGenerating}
          theme={theme}
        />
      )}

      {/* Streaming Indicator */}
      <StreamingIndicator
        isActive={isGenerating || streamingContent.length > 0 || wsState === 'error'}
        state={wsState}
        progressMessages={progressMessages}
        generatedContent={streamingContent}
        onCancel={handleCancelGeneration}
        theme={theme}
      />

    </div>
  );
};

export default App;