import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketState } from '../../types';
import styles from './StreamingIndicator.module.css';

interface StreamingIndicatorProps {
  isActive: boolean;
  state: WebSocketState;
  progressMessages: string[];
  generatedContent: string;
  onAccept: (content: string) => void;
  onCancel: () => void;
  onRetry?: () => void;
  theme?: 'light' | 'dark';
  className?: string;
}

const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  isActive,
  state,
  progressMessages,
  generatedContent,
  onAccept,
  onCancel,
  onRetry,
  theme = 'light',
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent]);

  // Calculate word count
  useEffect(() => {
    const words = generatedContent.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [generatedContent]);

  // Auto-minimize when generation is complete
  useEffect(() => {
    if (state === 'connected' && generatedContent.length > 0 && progressMessages.length > 0) {
      // Generation completed, minimize after a delay
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [state, generatedContent, progressMessages]);

  const handleAccept = useCallback(() => {
    onAccept(generatedContent);
    setIsMinimized(false);
  }, [generatedContent, onAccept]);

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
        return 'Connecting...';
      case 'connected':
        if (generatedContent.length > 0) {
          return 'Generation complete';
        }
        return 'Generating content...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Connection error';
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
        {/* Progress Section */}
        {progressMessages.length > 0 && (
          <div className={styles.progressSection}>
            <div className={styles.progressTitle}>Progress</div>
            <ul className={styles.progressList}>
              {progressMessages.map((message, index) => (
                <li
                  key={index}
                  className={`${styles.progressItem} ${
                    index === progressMessages.length - 1 && state === 'connected' && !generatedContent
                      ? styles.current
                      : ''
                  }`}
                >
                  {message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Generated Content Section */}
        {generatedContent && (
          <div className={styles.generatedSection}>
            <div className={styles.generatedTitle}>
              Generated Content
              <span className={styles.wordCount}>
                {wordCount} words
              </span>
            </div>
            
            <div className={styles.generatedContent} ref={contentRef}>
              <div className={styles.streamingText}>
                {generatedContent}
                {state === 'connected' && generatedContent.length > 0 && (
                  <span className={styles.cursor} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className={styles.errorState}>
            ⚠️ Generation failed. Please check your connection and try again.
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {state === 'error' && onRetry && (
          <button className={styles.retryButton} onClick={onRetry}>
            <div className={styles.spinner} />
            Retry
          </button>
        )}
        
        <button className={styles.cancelButton} onClick={handleCancel}>
          Cancel
        </button>
        
        {generatedContent.length > 0 && (
          <button 
            className={styles.acceptButton} 
            onClick={handleAccept}
            disabled={state !== 'connected'}
          >
            ✓ Accept & Insert
          </button>
        )}
      </div>
    </div>
  );
};

export default StreamingIndicator;