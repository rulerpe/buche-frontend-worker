import { useCallback, useRef } from 'react';
import type { ClickPosition, TextPosition } from '../types';

export const useTextSelection = () => {
  const textContainerRef = useRef<HTMLDivElement>(null);

  const getTextPositionFromPoint = useCallback((x: number, y: number): TextPosition | null => {
    if (!textContainerRef.current) return null;

    try {
      // Use document.caretPositionFromPoint or document.caretRangeFromPoint
      let range: Range | null = null;
      
      if (document.caretPositionFromPoint) {
        const caretPosition = document.caretPositionFromPoint(x, y);
        if (caretPosition) {
          range = document.createRange();
          range.setStart(caretPosition.offsetNode, caretPosition.offset);
          range.setEnd(caretPosition.offsetNode, caretPosition.offset);
        }
      } else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      }

      if (!range) return null;

      // Calculate character index from start of text
      const textContent = textContainerRef.current.textContent || '';
      const preRange = document.createRange();
      preRange.selectNodeContents(textContainerRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const textIndex = preRange.toString().length;

      // Calculate line and column
      const textBeforeClick = textContent.substring(0, textIndex);
      const lines = textBeforeClick.split('\n');
      const line = lines.length - 1;
      const column = lines[lines.length - 1].length;

      return {
        index: textIndex,
        line,
        column,
        x,
        y
      };
    } catch (error) {
      console.error('Error getting text position:', error);
      return null;
    }
  }, []);

  const extractContextFromPosition = useCallback((
    textContent: string, 
    position: TextPosition, 
    contextLength: number = 100
  ): ClickPosition => {
    const { index, x, y } = position;
    
    // Calculate context start (100 characters before click)
    const contextStart = Math.max(0, index - contextLength);
    const contextEnd = index;
    
    // Extract context text
    const contextText = textContent.substring(contextStart, contextEnd);

    return {
      x,
      y,
      textIndex: index,
      contextStart,
      contextEnd,
      contextText: contextText.trim()
    };
  }, []);

  const handleTextClick = useCallback((
    event: React.MouseEvent | React.TouchEvent,
    textContent: string,
    onPositionSelect: (position: ClickPosition) => void
  ) => {
    event.preventDefault();
    
    // Get coordinates from event
    let clientX: number, clientY: number;
    
    if ('touches' in event && event.touches.length > 0) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('changedTouches' in event && event.changedTouches.length > 0) {
      // Touch end event
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      // Mouse event
      const mouseEvent = event as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    // Get text position
    const textPosition = getTextPositionFromPoint(clientX, clientY);
    
    if (textPosition) {
      // Extract context and create click position
      const clickPosition = extractContextFromPosition(textContent, textPosition);
      onPositionSelect(clickPosition);
    }
  }, [getTextPositionFromPoint, extractContextFromPosition]);

  return {
    textContainerRef,
    handleTextClick,
    getTextPositionFromPoint,
    extractContextFromPosition
  };
};