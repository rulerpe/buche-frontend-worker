import { useState, useEffect, useCallback } from 'react';
import type { Tag } from '../types';

export const useTags = (apiBaseUrl: string) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Fetch available tags from the proxy API
  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status}`);
      }

      const result = await response.json() as any;
      
      if (result.success && result.data && result.data.tags) {
        setTags(result.data.tags);
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      console.error('Error fetching tags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  // Group tags by category
  const groupedTags = useCallback(() => {
    const groups: Record<string, Tag[]> = {};
    
    tags.forEach(tag => {
      const category = tag.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tag);
    });

    // Sort tags within each category by usage count
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => b.usageCount - a.usageCount);
    });

    return groups;
  }, [tags]);

  // Get popular tags (top N by usage)
  const getPopularTags = useCallback((limit: number = 8) => {
    return [...tags]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }, [tags]);

  // Toggle tag selection
  const toggleTag = useCallback((tagName: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  }, []);

  // Clear all selected tags
  const clearSelection = useCallback(() => {
    setSelectedTags([]);
  }, []);

  // Select multiple tags
  const selectTags = useCallback((tagNames: string[]) => {
    setSelectedTags(tagNames);
  }, []);

  // Search tags by name
  const searchTags = useCallback((query: string) => {
    if (!query.trim()) return tags;
    
    const lowerQuery = query.toLowerCase();
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(lowerQuery)
    );
  }, [tags]);

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    groupedTags: groupedTags(),
    popularTags: getPopularTags(),
    selectedTags,
    isLoading,
    error,
    fetchTags,
    toggleTag,
    clearSelection,
    selectTags,
    searchTags,
    getPopularTags
  };
};