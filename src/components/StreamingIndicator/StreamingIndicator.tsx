import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketState } from '../../types';
import styles from './StreamingIndicator.module.css';

interface StreamingIndicatorProps {
  isActive: boolean;
  state: WebSocketState;
  progressMessages: string[];
  generatedContent: string;
  onCancel: () => void;
  theme?: 'light' | 'dark';
  className?: string;
}

const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  isActive,
  state,
  progressMessages,
  generatedContent,
  onCancel,
  theme = 'light',
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Determine if we're actually streaming content (not just connected)
  // Only expand when we have substantial content AND connection is stable
  const isStreaming = generatedContent.length > 50 && state === 'connected';
  // Get current progress message (latest one)
  const currentProgress = progressMessages.length > 0 ? progressMessages[progressMessages.length - 1] : null;

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent]);


  // Don't auto-minimize - let user decide when to close
  // useEffect(() => {
  //   if (state === 'connected' && generatedContent.length > 0 && progressMessages.length > 0) {
  //     // Generation completed, minimize after a delay
  //     const timer = setTimeout(() => {
  //       setIsMinimized(true);
  //     }, 3000);
  //     
  //     return () => clearTimeout(timer);
  //   }
  // }, [state, generatedContent, progressMessages]);

  const handleCancel = useCallback(() => {
    onCancel();
    setIsMinimized(false);
  }, [onCancel]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const getStatusText = useCallback(() => {
    switch (state) {
      case 'connecting':
        return 'Connecting to server...';
      case 'connected':
        if (generatedContent.length > 50) {
          return 'Streaming content...';
        } else if (generatedContent.length > 0) {
          return 'Starting generation...';
        }
        return 'Generating content...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Connection failed - please retry';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Ready';
    }
  }, [state, generatedContent]);


  if (!isActive) {
    return null;
  }

  return (
    <div 
      className={`
        ${styles.container} 
        ${isActive ? styles.visible : ''} 
        ${isMinimized ? styles.minimized : ''}
        ${isStreaming ? styles.streaming : ''}
        ${theme === 'dark' ? styles.dark : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div 
        className={styles.header}
        onClick={isMinimized ? toggleMinimize : undefined}
      >
        <div className={styles.title}>
          ✨ Content Generation
        </div>
        
        <div className={styles.status}>
          {state === 'connected' && generatedContent.length === 0 && (
            <div className={styles.spinner} />
          )}
          {getStatusText()}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isMinimized && (
            <button
              className={styles.minimizeButton}
              onClick={toggleMinimize}
              title="Minimize"
            >
              ⤓
            </button>
          )}
          
          <button
            className={styles.closeButton}
            onClick={handleCancel}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Show Progress Phase - only when not streaming content */}
        {!isStreaming && (
          <>
            {/* Current Progress Only */}
            {currentProgress && (
              <div className={styles.progressSection}>
                <div className={styles.progressTitle}>Current Step</div>
                <div className={styles.currentProgress}>
                  <div className={styles.progressItem}>
                    {(state === 'connecting' || state === 'connected') && generatedContent.length === 0 && (
                      <div className={styles.spinner} />
                    )}
                    {currentProgress}
                  </div>
                </div>
              </div>
            )}
            
            {/* Connection Status */}
            {!currentProgress && state === 'connecting' && (
              <div className={styles.progressSection}>
                <div className={styles.progressTitle}>Current Step</div>
                <div className={styles.currentProgress}>
                  <div className={styles.progressItem}>
                    <div className={styles.spinner} />
                    Connecting to server...
                  </div>
                </div>
              </div>
            )}
            
            {/* Generation Status */}
            {!currentProgress && state === 'connected' && generatedContent.length === 0 && (
              <div className={styles.progressSection}>
                <div className={styles.progressTitle}>Current Step</div>
                <div className={styles.currentProgress}>
                  <div className={styles.progressItem}>
                    <div className={styles.spinner} />
                    Preparing content generation...
                  </div>
                </div>
              </div>
            )}
            
            {/* Error State */}
            {state === 'error' && (
              <div className={styles.errorState}>
                ⚠️ Connection failed. Please check your connection and try again.
              </div>
            )}
          </>
        )}

        {/* Show Streaming Content Phase - full screen for reading */}
        {isStreaming && (
          <div className={styles.streamingSection}>
            <div className={styles.streamingContent} ref={contentRef}>
              <div className={styles.streamingText}>
                {generatedContent}
                {state === 'connected' && generatedContent.length > 0 && (
                  <span className={styles.cursor} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default StreamingIndicator;