import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ClickPosition, Tag } from '../../types';
import { useTags } from '../../hooks/useTags';
import styles from './ContextMenu.module.css';

interface ContextMenuProps {
  position: ClickPosition;
  onGenerate: (selectedTags: string[], contextText: string) => void;
  onClose: () => void;
  apiBaseUrl: string;
  isGenerating?: boolean;
  theme?: 'light' | 'dark';
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onGenerate,
  onClose,
  apiBaseUrl,
  isGenerating = false,
  theme = 'light'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    tags,
    groupedTags,
    popularTags,
    selectedTags,
    isLoading,
    error,
    toggleTag,
    clearSelection,
    searchTags,
    fetchTags
  } = useTags(apiBaseUrl);

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300); // Delay for animation
    }
  }, []);

  // Handle escape key and click outside
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle generate button click
  const handleGenerate = useCallback(() => {
    if (selectedTags.length === 0) {
      // Generate without tags if none selected
      onGenerate([], position.contextText);
    } else {
      onGenerate(selectedTags, position.contextText);
    }
  }, [selectedTags, position.contextText, onGenerate]);

  // Get filtered tags based on search
  const filteredTags = searchQuery.trim() ? searchTags(searchQuery) : tags;

  // Render tag component
  const renderTag = useCallback((tag: Tag) => {
    const isSelected = selectedTags.includes(tag.name);
    
    return (
      <button
        key={tag.id}
        className={`${styles.tag} ${isSelected ? styles.selected : ''}`}
        onClick={() => toggleTag(tag.name)}
        disabled={isGenerating}
      >
        {tag.name}
        <span className={styles.tagCount}>({tag.usageCount})</span>
      </button>
    );
  }, [selectedTags, toggleTag, isGenerating]);

  // Render popular tags section
  const renderPopularTags = () => (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        ⭐ Popular Tags
        {selectedTags.length > 0 && (
          <span className={styles.selectedCount}>
            {selectedTags.length} selected
          </span>
        )}
      </div>
      <div className={styles.popularTags}>
        {popularTags.map(renderTag)}
      </div>
    </div>
  );

  // Render tag categories
  const renderCategories = () => {
    if (searchQuery.trim()) {
      return (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            🔍 Search Results ({filteredTags.length})
          </div>
          <div className={styles.popularTags}>
            {filteredTags.map(renderTag)}
          </div>
        </div>
      );
    }

    const categories = Object.entries(groupedTags);
    const visibleCategories = showAllCategories ? categories : categories.slice(0, 3);

    return (
      <>
        {visibleCategories.map(([category, categoryTags]) => (
          <div key={category} className={styles.categoryContainer}>
            <div className={styles.categoryTitle}>{category}</div>
            <div className={styles.categoryTags}>
              {categoryTags.map(renderTag)}
            </div>
          </div>
        ))}
        
        {!showAllCategories && categories.length > 3 && (
          <button
            className={styles.retryButton}
            onClick={() => setShowAllCategories(true)}
          >
            Show {categories.length - 3} more categories...
          </button>
        )}
      </>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={styles.overlay}>
        <div className={`${styles.contextMenu} ${theme === 'dark' ? styles.dark : ''}`} ref={menuRef}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            Loading tags...
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={styles.overlay}>
        <div className={`${styles.contextMenu} ${theme === 'dark' ? styles.dark : ''}`} ref={menuRef}>
          <div className={styles.errorState}>
            Failed to load tags: {error}
            <button className={styles.retryButton} onClick={fetchTags}>
              Retry
            </button>
          </div>
          <div className={styles.actions}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button 
              className={styles.generateButton} 
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Without Tags'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={`${styles.contextMenu} ${theme === 'dark' ? styles.dark : ''}`} ref={menuRef}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Generate Content</h3>
          <div className={styles.contextPreview}>
            "{position.contextText || 'Click position'}"
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Search */}
          <div className={styles.searchContainer}>
            <div className={styles.searchIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              disabled={isGenerating}
            />
          </div>

          {/* Popular Tags */}
          {!searchQuery.trim() && renderPopularTags()}

          {/* Categories or Search Results */}
          {renderCategories()}

          {/* Empty state */}
          {filteredTags.length === 0 && searchQuery.trim() && (
            <div className={styles.emptyState}>
              No tags found for "{searchQuery}"
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          
          {selectedTags.length > 0 && (
            <button
              className={styles.retryButton}
              onClick={clearSelection}
              disabled={isGenerating}
            >
              Clear ({selectedTags.length})
            </button>
          )}
          
          <button 
            className={styles.generateButton} 
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className={styles.spinner} />
                Generating...
              </>
            ) : (
              <>
                ✨ Generate
                {selectedTags.length > 0 && ` (${selectedTags.length} tags)`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextMenu;