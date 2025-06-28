// E-reader specific types and interfaces

export interface TextPosition {
  index: number;        // Character index in the full text
  line: number;         // Line number
  column: number;       // Column position in line
  x: number;            // Screen x coordinate
  y: number;            // Screen y coordinate
}

export interface TextSelection {
  start: TextPosition;
  end: TextPosition;
  text: string;
}

export interface ClickPosition {
  x: number;            // Click coordinates
  y: number;
  textIndex: number;    // Character index in text
  contextStart: number; // Start of context (100 chars before)
  contextEnd: number;   // End of context 
  contextText: string;  // Extracted context text
}

export interface GeneratedContentBlock {
  id: string;
  position: number;     // Insert position in original text
  content: string;      // Generated content
  timestamp: number;    // When it was generated
  tags: string[];       // Tags used for generation
  isHighlighted: boolean;
  isExpanded: boolean;
}

export interface ReaderSettings {
  fontSize: number;     // Font size in px
  lineHeight: number;   // Line height multiplier
  fontFamily: string;   // Font family
  backgroundColor: string;
  textColor: string;
  maxWidth: number;     // Max content width
  padding: number;      // Content padding
  theme: 'light' | 'dark' | 'sepia';
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string;
  encoding?: string;
}

export interface VirtualScrollItem {
  index: number;
  start: number;        // Start character index
  end: number;          // End character index  
  height: number;       // Rendered height
  text: string;         // Text content for this chunk
  isVisible: boolean;
}

export interface ScrollPosition {
  top: number;
  left: number;
  textIndex: number;    // Character index at top of viewport
  percentage: number;   // Scroll percentage (0-100)
}

// Touch/click event types
export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
}

export interface GestureEvent {
  type: 'tap' | 'longPress' | 'swipe' | 'pinch';
  startPoint: TouchPoint;
  endPoint?: TouchPoint;
  duration: number;
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;       // For pinch gestures
}