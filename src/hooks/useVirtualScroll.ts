import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScrollPosition } from '../types';

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
  totalItems: number;
}

export const useVirtualScroll = ({
  itemHeight,
  containerHeight,
  overscan = 5,
  totalItems
}: UseVirtualScrollOptions) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range based on scroll position
  const calculateVisibleRange = useCallback(() => {
    const itemsPerViewport = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + itemsPerViewport + overscan,
      totalItems
    );
    
    const rangeStart = Math.max(0, startIndex - overscan);
    
    return { start: rangeStart, end: endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, totalItems]);

  // Update visible range when scroll or dimensions change
  useEffect(() => {
    const range = calculateVisibleRange();
    setVisibleRange(range);
  }, [calculateVisibleRange]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  // Get the total height of the virtual list
  const getTotalHeight = useCallback(() => {
    return totalItems * itemHeight;
  }, [totalItems, itemHeight]);

  // Get the offset for the visible items container
  const getOffsetY = useCallback(() => {
    return visibleRange.start * itemHeight;
  }, [visibleRange.start, itemHeight]);

  // Scroll to a specific item index
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: targetScrollTop,
        behavior
      });
    }
  }, [itemHeight]);

  // Scroll to a specific character position in text
  const scrollToTextPosition = useCallback((
    textIndex: number, 
    _textContent: string, 
    charsPerItem: number,
    behavior: ScrollBehavior = 'smooth'
  ) => {
    const itemIndex = Math.floor(textIndex / charsPerItem);
    scrollToIndex(itemIndex, behavior);
  }, [scrollToIndex]);

  // Get current scroll position info
  const getScrollPosition = useCallback((): ScrollPosition => {
    const percentage = totalItems > 0 ? (scrollTop / getTotalHeight()) * 100 : 0;
    const textIndex = Math.floor((scrollTop / itemHeight) * 100); // Approximate
    
    return {
      top: scrollTop,
      left: 0,
      textIndex,
      percentage: Math.min(100, Math.max(0, percentage))
    };
  }, [scrollTop, totalItems, getTotalHeight, itemHeight]);

  return {
    scrollElementRef,
    visibleRange,
    scrollTop,
    handleScroll,
    getTotalHeight,
    getOffsetY,
    scrollToIndex,
    scrollToTextPosition,
    getScrollPosition
  };
};