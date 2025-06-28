import React, { useState, useRef, useCallback } from 'react';
import type { FileInfo } from '../../types';
import styles from './FileLoader.module.css';

interface FileLoaderProps {
  onFileLoad: (fileInfo: FileInfo) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

const DEFAULT_ACCEPTED_TYPES = ['.txt', '.md', '.text'];
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

const FileLoader: React.FC<FileLoaderProps> = ({
  onFileLoad,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    // Check file size
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${formatFileSize(maxSize)}`;
    }

    // Check if file is actually text
    if (!file.type.startsWith('text/') && file.type !== 'application/octet-stream') {
      return 'Please select a text file';
    }

    return null;
  }, [acceptedTypes, maxSize, formatFileSize]);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    setLoadingProgress(0);
    setCurrentFile(file);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // For Chinese text files, we need to handle encoding properly
      // First read as ArrayBuffer to detect encoding
      const arrayBuffer = await file.arrayBuffer();
      setLoadingProgress(50);

      // Try different encodings for Chinese text
      const encodings = ['utf-8', 'gbk', 'gb2312', 'big5'];
      let content = '';
      let detectedEncoding = 'utf-8';

      for (const encoding of encodings) {
        try {
          const decoder = new TextDecoder(encoding);
          const decoded = decoder.decode(arrayBuffer);
          
          // Check if this encoding produces valid Chinese characters
          // Look for common Chinese character ranges
          const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/;
          const hasValidChinese = chineseRegex.test(decoded);
          const hasGarbledText = /�/.test(decoded);
          
          if (hasValidChinese && !hasGarbledText) {
            content = decoded;
            detectedEncoding = encoding;
            break;
          } else if (!hasGarbledText && encoding === 'utf-8') {
            // If UTF-8 doesn't have garbled text, use it as fallback
            content = decoded;
            detectedEncoding = encoding;
          }
        } catch (err) {
          // Try next encoding
          continue;
        }
      }

      if (!content) {
        // Fallback to UTF-8 if no encoding worked
        const decoder = new TextDecoder('utf-8');
        content = decoder.decode(arrayBuffer);
        detectedEncoding = 'utf-8';
      }

      setLoadingProgress(80);

      // Create FileInfo object
      const fileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        content: content,
        encoding: detectedEncoding
      };

      setLoadingProgress(100);
      
      // Small delay for UX
      setTimeout(() => {
        onFileLoad(fileInfo);
        setIsLoading(false);
        setLoadingProgress(0);
        setCurrentFile(null);
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsLoading(false);
      setLoadingProgress(0);
      setCurrentFile(null);
    }
  }, [validateFile, onFileLoad]);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]); // Only process first file
    }
  }, [processFile]);

  // File input handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Reset input value to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  const handleBrowseClick = useCallback(() => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isLoading]);


  const getDropZoneClasses = useCallback(() => {
    let classes = styles.dropZone;
    if (isDragOver) classes += ` ${styles.dragOver}`;
    if (isLoading) classes += ` ${styles.loading}`;
    if (error) classes += ` ${styles.error}`;
    return classes;
  }, [isDragOver, isLoading, error]);

  return (
    <div className={`${styles.fileLoader} ${className}`}>
      <div
        className={getDropZoneClasses()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className={styles.hiddenInput}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={isLoading}
        />

        {/* Upload Icon */}
        <div className={styles.icon}>
          {isLoading ? (
            // Loading spinner
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
              <animateTransform
                attributeName="transform"
                type="rotate"
                dur="1s"
                repeatCount="indefinite"
                values="0 12 12;360 12 12"
              />
            </svg>
          ) : error ? (
            // Error icon
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ) : (
            // Upload icon
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <>
            <h3 className={styles.title}>Processing File...</h3>
            <p className={styles.subtitle}>
              {currentFile ? `Loading ${currentFile.name}` : 'Please wait'}
            </p>
          </>
        ) : error ? (
          <>
            <h3 className={styles.title}>Upload Failed</h3>
            <p className={styles.subtitle}>Please try again with a different file</p>
          </>
        ) : (
          <>
            <h3 className={styles.title}>
              {isDragOver ? 'Drop your file here' : 'Upload Text File'}
            </h3>
            <p className={styles.subtitle}>
              Drag and drop a text file here, or click to browse
              <br />
              Support for novels, stories, and documents
            </p>
          </>
        )}

        {!isLoading && !error && (
          <button 
            className={styles.browseButton}
            onClick={handleBrowseClick}
            disabled={isLoading}
          >
            Choose File
          </button>
        )}

        {/* Progress bar */}
        {isLoading && (
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        )}

        {/* File info */}
        {currentFile && (
          <div className={styles.fileInfo}>
            <div className={styles.fileName}>{currentFile.name}</div>
            <div className={styles.fileSize}>{formatFileSize(currentFile.size)}</div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Supported formats */}
      <div className={styles.supportedFormats}>
        Supported formats: {acceptedTypes.join(', ')} • Max size: {formatFileSize(maxSize)}
      </div>
    </div>
  );
};

export default FileLoader;