import React, { useState, useCallback } from 'react';
import FileLoader from './components/FileLoader';
import EReader from './components/EReader';
import ContextMenu from './components/ContextMenu';
import StreamingIndicator from './components/StreamingIndicator';
import { useSSE } from './hooks/useSSE';
import type { 
  FileInfo, 
  ClickPosition, 
  GeneratedContentBlock, 
  GenerationRequest,
  WebSocketMessage 
} from './types';
import './styles/global.css';

// Configuration - use proxy endpoints for same-origin requests
const SSE_URL = '/api/stream'; // SSE proxy endpoint

const App: React.FC = () => {
  // File state
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  
  // UI state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Generated content state
  const [generatedContent, setGeneratedContent] = useState<Map<number, GeneratedContentBlock>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);

  // SSE connection
  const {
    state: sseState,
    generatedContent: streamingContent,
    progressMessages,
    generateContent,
    clearContent,
    clearProgress
  } = useSSE({
    url: SSE_URL,
    onMessage: handleSSEMessage,
    onStatusChange: handleSSEStatusChange,
    onError: handleSSEError
  });

  // Handle SSE messages
  function handleSSEMessage(message: WebSocketMessage) {
    console.log('SSE message:', message);
    
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

  // Handle SSE status changes
  function handleSSEStatusChange(status: typeof sseState) {
    console.log('SSE status:', status);
  }

  // Handle SSE errors
  function handleSSEError(error: string) {
    console.error('SSE error:', error);
    setIsGenerating(false);
  }

  // Handle file loading
  const handleFileLoad = useCallback((fileInfo: FileInfo) => {
    console.log('File loaded:', fileInfo.name, `${fileInfo.size} bytes`);
    setCurrentFile(fileInfo);
    
    // Clear previous generated content
    setGeneratedContent(new Map());
    
    // SSE connections are stateless, no need to connect
    // Connection happens on demand during generateContent
  }, []);

  // Handle text click in reader
  const handleTextClick = useCallback((position: ClickPosition) => {
    console.log('Text clicked at position:', position);
    setClickPosition(position);
    setShowContextMenu(true);
  }, []);

  // Handle content generation request
  const handleGenerate = useCallback((selectedTags: string[], contextText: string) => {
    // SSE connections are made on-demand, no need to check isConnected

    console.log('Generating content with tags:', selectedTags);
    
    // Clear previous streaming content
    clearContent();
    clearProgress();
    
    // Prepare generation request
    const request: GenerationRequest = {
      content: contextText,
      tags: selectedTags,
      maxLength: 800,
      style: 'continue'
    };

    // Start generation
    setIsGenerating(true);
    setShowContextMenu(false);
    
    const success = generateContent(request);
    if (!success) {
      setIsGenerating(false);
      console.error('Failed to send generation request');
    }
  }, [generateContent, clearContent, clearProgress]);

  // Handle accepting generated content
  const handleAcceptContent = useCallback((content: string) => {
    if (!clickPosition || !currentFile) return;

    // Create new content block
    const newBlock: GeneratedContentBlock = {
      id: crypto.randomUUID(),
      position: clickPosition.textIndex,
      content: content,
      timestamp: Date.now(),
      tags: [], // Would store the tags used for generation
      isHighlighted: true,
      isExpanded: true
    };

    // Add to generated content map
    setGeneratedContent(prev => {
      const newMap = new Map(prev);
      newMap.set(clickPosition.textIndex, newBlock);
      return newMap;
    });

    // Clear generation state
    setIsGenerating(false);
    clearContent();
    clearProgress();
    
    console.log('Content accepted and inserted');
  }, [clickPosition, currentFile, clearContent, clearProgress]);

  // Handle canceling generation
  const handleCancelGeneration = useCallback(() => {
    setIsGenerating(false);
    clearContent();
    clearProgress();
    console.log('Generation canceled');
  }, [clearContent, clearProgress]);

  // Handle retrying generation
  const handleRetryGeneration = useCallback(() => {
    if (clickPosition) {
      // Show context menu again (no need to reconnect for SSE)
      setShowContextMenu(true);
    }
  }, [clickPosition]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

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
        isActive={isGenerating || streamingContent.length > 0}
        state={sseState}
        progressMessages={progressMessages}
        generatedContent={streamingContent}
        onAccept={handleAcceptContent}
        onCancel={handleCancelGeneration}
        onRetry={handleRetryGeneration}
        theme={theme}
      />

      {/* Theme Toggle (for development) */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          background: theme === 'light' ? '#2d3748' : '#f7fafc',
          color: theme === 'light' ? '#f7fafc' : '#2d3748',
          border: 'none',
          borderRadius: '8px',
          padding: '0.5rem',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
};

export default App;