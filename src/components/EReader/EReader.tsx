import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { FileInfo, ClickPosition, GeneratedContentBlock, ReaderSettings } from '../../types';
import { useTextSelection } from '../../hooks/useTextSelection';
import styles from './EReader.module.css';

interface EReaderProps {
  fileInfo: FileInfo;
  onTextClick: (position: ClickPosition) => void;
  generatedContent: Map<number, GeneratedContentBlock>;
  isGenerating: boolean;
  streamingContent?: string;
  className?: string;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  lineHeight: 1.8,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  backgroundColor: '#f8f9fa',
  textColor: '#2d3748',
  maxWidth: 900,
  padding: 16,
  theme: 'light'
};

const EReader: React.FC<EReaderProps> = ({
  fileInfo,
  onTextClick,
  generatedContent,
  isGenerating,
  streamingContent = '',
  className = ''
}) => {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  
  const { textContainerRef, handleTextClick } = useTextSelection();

  // Split text into lines for better rendering performance
  const textLines = useMemo(() => {
    if (!fileInfo.content) return [];
    return fileInfo.content.split('\n').filter(line => line.trim() !== '');
  }, [fileInfo.content]);

  // Handle scroll to update progress
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const progress = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  // Handle text click with position calculation
  const handleLineClick = useCallback((
    event: React.MouseEvent | React.TouchEvent,
    lineIndex: number
  ) => {
    // Update highlighted line for visual feedback
    setHighlightedLine(lineIndex);
    setTimeout(() => setHighlightedLine(null), 1000);

    // Use the text selection hook to handle the click
    handleTextClick(event, fileInfo.content, onTextClick);
  }, [fileInfo.content, handleTextClick, onTextClick]);

  // Render text line with generated content insertion
  const renderTextLine = useCallback((line: string, lineIndex: number) => {
    const key = `line-${lineIndex}`;
    const isHighlighted = highlightedLine === lineIndex;
    
    return (
      <div key={key} className={styles.textLine}>
        <div
          className={`${styles.lineContent} ${isHighlighted ? styles.highlighted : ''}`}
          onClick={(e) => handleLineClick(e, lineIndex)}
          onTouchEnd={(e) => handleLineClick(e, lineIndex)}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            fontFamily: settings.fontFamily,
            color: settings.textColor
          }}
        >
          {line}
        </div>
        
        {/* Render generated content after this line if exists */}
        {renderGeneratedContentAfterLine(lineIndex)}
      </div>
    );
  }, [
    highlightedLine, 
    handleLineClick, 
    settings,
    generatedContent,
    isGenerating,
    streamingContent
  ]);

  // Render generated content blocks
  const renderGeneratedContentAfterLine = useCallback((lineIndex: number) => {
    const content = Array.from(generatedContent.values()).find(
      block => block.position <= lineIndex * 100 && block.position > (lineIndex - 1) * 100
    );

    if (content) {
      return (
        <div key={`generated-${content.id}`} className={styles.generatedContent}>
          {content.content}
        </div>
      );
    }

    // Show streaming content if generating
    if (isGenerating && streamingContent && lineIndex === highlightedLine) {
      return (
        <div key="streaming" className={styles.streamingContent}>
          {streamingContent}
          <div className={styles.cursor}>|</div>
        </div>
      );
    }

    return null;
  }, [generatedContent, isGenerating, streamingContent, highlightedLine]);

  // Settings handlers
  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const updateSetting = useCallback(<K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            updateSetting('fontSize', Math.min(24, settings.fontSize + 1));
            break;
          case '-':
            event.preventDefault();
            updateSetting('fontSize', Math.max(12, settings.fontSize - 1));
            break;
          case ',':
            event.preventDefault();
            toggleSettings();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [settings.fontSize, updateSetting, toggleSettings]);

  if (!fileInfo.content) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>📖</div>
        <p>No content to display</p>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.readerContainer} ${className} ${
        settings.theme === 'dark' ? styles.dark : ''
      }`}
      style={{ 
        backgroundColor: settings.backgroundColor,
        fontFamily: settings.fontFamily 
      }}
    >
      {/* Header */}
      <div className={styles.readerHeader}>
        <div className={styles.fileName} title={fileInfo.name}>
          {fileInfo.name}
        </div>
        
        <div className={styles.readerControls}>
          <button
            className={styles.controlButton}
            onClick={() => updateSetting('fontSize', Math.max(12, settings.fontSize - 1))}
            title="Decrease font size"
          >
            A-
          </button>
          
          <button
            className={styles.controlButton}
            onClick={() => updateSetting('fontSize', Math.min(24, settings.fontSize + 1))}
            title="Increase font size"
          >
            A+
          </button>
          
          <button
            className={styles.controlButton}
            onClick={toggleSettings}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main content */}
      <div 
        className={styles.scrollContainer}
        onScroll={handleScroll}
        ref={textContainerRef}
      >
        <div 
          className={styles.textContent}
          style={{
            maxWidth: `${settings.maxWidth}px`,
            margin: '0 auto',
            padding: `${settings.padding}px`
          }}
        >
          {textLines.map((line, index) => renderTextLine(line, index))}
          
          {/* Loading indicator */}
          {isGenerating && (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner} />
              Generating content...
            </div>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <>
          <div 
            className={`${styles.settingsOverlay} ${showSettings ? styles.open : ''}`}
            onClick={() => setShowSettings(false)}
          />
          <div className={`${styles.settingsPanel} ${showSettings ? styles.open : ''}`}>
            <h3>Reader Settings</h3>
            
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Font Size</label>
              <input
                type="range"
                min="12"
                max="24"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                className={styles.settingInput}
              />
              <span>{settings.fontSize}px</span>
            </div>
            
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Line Height</label>
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                className={styles.settingInput}
              />
              <span>{settings.lineHeight}</span>
            </div>
            
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'sepia')}
                className={styles.settingInput}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="sepia">Sepia</option>
              </select>
            </div>
            
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Max Width</label>
              <input
                type="range"
                min="600"
                max="1200"
                step="50"
                value={settings.maxWidth}
                onChange={(e) => updateSetting('maxWidth', parseInt(e.target.value))}
                className={styles.settingInput}
              />
              <span>{settings.maxWidth}px</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EReader;