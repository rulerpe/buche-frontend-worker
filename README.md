# Buche Frontend Worker

**Mobile-first React UI for testing the Buche Content Generator** - A responsive e-reader interface with real-time AI content generation capabilities.

## Overview

This Cloudflare Worker serves a React application that provides an intuitive interface for testing the Buche Content Generator Worker. Users can load text files (novels, stories), read them in a clean e-reader interface, and generate sexual content by clicking anywhere in the text with real-time WebSocket streaming.

## Architecture

### **Tech Stack**
- **Cloudflare Workers** - Static file serving and API proxying
- **React + TypeScript** - Frontend framework
- **CSS Modules** - Component-scoped styling
- **WebSocket** - Real-time content streaming
- **Vite** - Build system and development server

### **Project Structure**
```
buche-frontend-worker/
├── src/
│   ├── components/
│   │   ├── FileLoader/         # File upload and text parsing
│   │   │   ├── FileLoader.tsx
│   │   │   └── FileLoader.module.css
│   │   ├── EReader/            # Main reading interface
│   │   │   ├── EReader.tsx
│   │   │   ├── TextRenderer.tsx
│   │   │   ├── VirtualScroll.tsx
│   │   │   └── EReader.module.css
│   │   ├── ContextMenu/        # Generation options popup
│   │   │   ├── ContextMenu.tsx
│   │   │   ├── TagSelector.tsx
│   │   │   └── ContextMenu.module.css
│   │   └── StreamingIndicator/ # Real-time generation display
│   │       ├── StreamingIndicator.tsx
│   │       ├── ProgressBar.tsx
│   │       └── StreamingIndicator.module.css
│   ├── hooks/
│   │   ├── useWebSocket.ts     # WebSocket connection management
│   │   ├── useFileLoader.ts    # File processing utilities
│   │   ├── useTextSelection.ts # Click position detection
│   │   └── useTags.ts          # Tag fetching from database
│   ├── styles/
│   │   ├── global.css          # Global styles and CSS variables
│   │   └── variables.css       # Design tokens
│   ├── types/
│   │   ├── api.ts              # API response types
│   │   ├── reader.ts           # Reader-specific types
│   │   └── websocket.ts        # WebSocket message types
│   ├── utils/
│   │   ├── fileParser.ts       # Text file processing
│   │   ├── textUtils.ts        # Text manipulation helpers
│   │   └── apiClient.ts        # API communication
│   ├── App.tsx                 # Main app component
│   └── main.tsx                # React entry point
├── worker/
│   └── index.ts                # Cloudflare Worker entry point
├── public/
│   └── index.html              # HTML template
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
├── wrangler.jsonc              # Cloudflare Workers config
└── README.md                   # This file
```

## Features

### **Core Functionality**

#### **1. File Loading & Processing**
- **Drag & Drop Interface**: Easy file upload with visual feedback
- **Large File Support**: No size limits, efficient memory usage
- **Format Support**: .txt, .md, and other text formats
- **Progressive Loading**: Background parsing for immediate responsiveness

#### **2. E-Reader Interface**
- **Virtual Scrolling**: Efficient rendering for novels of any size
- **Mobile-First Design**: Optimized for touch devices
- **Typography**: Readable fonts, proper line spacing, adjustable text size
- **Smooth Scrolling**: Performant navigation through large texts
- **Position Memory**: Remembers reading position

#### **3. Interactive Content Generation**
- **Click-to-Generate**: Tap anywhere in text to trigger generation
- **Context Extraction**: Automatically uses 100 characters before click point
- **Visual Feedback**: Clear indication of selected position
- **Tag Selection**: Dropdown with database-sourced tags for content type

#### **4. Real-Time Streaming**
- **WebSocket Integration**: Direct connection to content generator
- **Live Progress**: Real-time updates during generation process
- **Stream Display**: Content appears as it's generated
- **Error Handling**: Graceful error recovery and retry logic

#### **5. Content Integration**
- **Smart Insertion**: Generated content inserted at click position
- **Visual Separation**: Clear padding and styling for new content
- **Highlight System**: Distinguish generated vs original content
- **Undo Capability**: Remove generated content if needed

### **Mobile-First Design**

#### **Touch Interactions**
- **Tap Detection**: Precise touch position mapping to text
- **Touch Feedback**: Visual feedback for all interactions  
- **Gesture Support**: Swipe navigation, pinch-to-zoom
- **Thumb-Friendly**: Large touch targets, accessible controls

#### **Responsive Layout**
- **Breakpoints**: Mobile (320px+), Tablet (768px+), Desktop (1024px+)
- **Adaptive UI**: Context menu becomes bottom sheet on mobile
- **Font Scaling**: Responsive typography for different screen sizes
- **Safe Areas**: Proper handling of notches and navigation bars

#### **Performance Optimization**
- **Lazy Loading**: Only render visible text portions
- **Memory Management**: Efficient handling of large files
- **Battery Conscious**: Optimized for mobile device constraints
- **Network Aware**: Adaptive behavior based on connection speed

## API Integration

### **Content Generator Worker Integration**
```typescript
// WebSocket connection for real-time generation
const ws = new WebSocket('wss://buche-content-generator-worker.workers.dev/generate-stream');

// Generation request format
interface GenerationRequest {
  content: string;      // 100 chars before click position
  tags?: string[];      // Selected tags from dropdown
  maxLength?: number;   // Default: 800 characters
}

// Real-time streaming responses
interface StreamingResponse {
  type: 'status' | 'stream' | 'complete' | 'error';
  message?: string;     // Progress updates
  chunk?: string;       // Content chunks
  data?: any;          // Final result data
}
```

### **Tag Database Integration**
```typescript
// Fetch available tags from generator worker
GET /status → {
  taggedSnippets: number;
  totalTags: number;
  capabilities: string[];
}

// Future: Dedicated tag endpoint
GET /tags → {
  tags: Array<{
    id: number;
    name: string;
    category: string;
    usageCount: number;
  }>
}
```

## User Flow

### **1. File Loading Flow**
```
User visits frontend → 
Drag/drop or select file → 
File validation & parsing → 
Display in e-reader interface → 
Ready for interaction
```

### **2. Content Generation Flow**
```
User taps text position → 
Show context menu overlay → 
Extract 100 chars before position → 
User selects tags (optional) → 
User clicks "Generate" → 
WebSocket connection opens → 
Real-time streaming begins → 
Progress updates display → 
Generated content streams in → 
Content inserted with formatting → 
User continues reading
```

### **3. Error Handling Flow**
```
Network error detected → 
Show retry options → 
Attempt reconnection → 
Fallback to traditional API → 
User notification of status
```

## Development Requirements

### **Prerequisites**
- Node.js 18+ and npm
- Cloudflare Workers CLI (`wrangler`)
- Access to buche-content-generator-worker

### **Environment Setup**
```bash
# Install dependencies
npm install

# Development server (React + Workers)
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy

# Type checking
npm run type-check

# Linting
npm run lint
```

### **Environment Variables**
```bash
# wrangler.jsonc configuration
{
  "name": "buche-frontend-worker",
  "compatibility_date": "2024-01-01",
  "vars": {
    "CONTENT_GENERATOR_API": "https://buche-content-generator-worker.workers.dev",
    "ENVIRONMENT": "production"
  }
}
```

## Component Architecture

### **State Management**
- **React Hooks**: useState, useEffect, useContext for local state
- **Custom Hooks**: Reusable logic for WebSocket, file handling, text selection
- **Context API**: Global state for reader settings, active generation
- **Local Storage**: Persist user preferences and reading position

### **Key Components**

#### **FileLoader Component**
```typescript
interface FileLoaderProps {
  onFileLoad: (content: string, filename: string) => void;
  maxSize?: number;
  acceptedTypes?: string[];
}
```

#### **EReader Component**  
```typescript
interface EReaderProps {
  content: string;
  onTextClick: (position: number, contextText: string) => void;
  generatedContent: Map<number, string>;
  isGenerating: boolean;
}
```

#### **ContextMenu Component**
```typescript
interface ContextMenuProps {
  position: { x: number; y: number };
  contextText: string;
  availableTags: Tag[];
  onGenerate: (selectedTags: string[]) => void;
  onClose: () => void;
}
```

#### **StreamingIndicator Component**
```typescript
interface StreamingIndicatorProps {
  isActive: boolean;
  progress: string;
  generatedText: string;
  onComplete: () => void;
}
```

## Performance Considerations

### **Large File Handling**
- **Virtual Scrolling**: Only render visible text (viewport + buffer)
- **Text Chunking**: Split large files into manageable segments
- **Lazy Loading**: Load file content progressively
- **Memory Management**: Garbage collect unused text chunks

### **Mobile Optimization**
- **Touch Debouncing**: Prevent accidental multiple taps
- **Smooth Scrolling**: Use transform3d for hardware acceleration
- **Battery Efficiency**: Minimize background processing
- **Network Optimization**: Efficient WebSocket connection management

### **Streaming Performance**
- **Buffer Management**: Handle partial UTF-8 characters properly
- **DOM Updates**: Batch DOM manipulations for smooth updates
- **Memory Leaks**: Proper WebSocket cleanup and event listener removal
- **Error Recovery**: Robust reconnection and fallback strategies

## Testing Strategy

### **Unit Testing**
- **Components**: React Testing Library for component logic
- **Hooks**: Custom hook testing with act() wrapper
- **Utilities**: Pure function testing for text processing
- **API Client**: Mock WebSocket and HTTP requests

### **Integration Testing**
- **File Loading**: End-to-end file processing workflow
- **Generation Flow**: Complete user interaction simulation
- **Mobile Testing**: Touch event simulation and responsive design
- **Performance Testing**: Large file handling stress tests

### **Manual Testing Checklist**
- [ ] File upload works on mobile and desktop
- [ ] Large files (>1MB) load efficiently
- [ ] Click/tap detection accurately maps to text position
- [ ] WebSocket streaming displays content smoothly
- [ ] Context menu appears correctly on mobile
- [ ] Generated content integrates seamlessly
- [ ] Error states display appropriate messages
- [ ] Responsive design works across devices

## Deployment

### **Build Process**
1. **Vite Build**: Bundle React app with optimizations
2. **Worker Bundle**: Include static assets in worker deployment
3. **Environment Config**: Set production API endpoints
4. **Asset Optimization**: Minify and compress static files

### **Production Considerations**
- **CDN Caching**: Appropriate cache headers for static assets
- **Error Monitoring**: Production error tracking and alerts
- **Performance Monitoring**: Core Web Vitals tracking
- **Security Headers**: CSP, HSTS, and other security measures

## Future Enhancements

### **Planned Features**
- **Multiple File Support**: Tabs or library view for multiple documents
- **Reading Analytics**: Track reading progress and generation usage
- **User Preferences**: Customizable themes, fonts, and generation settings
- **Export Functionality**: Save documents with generated content
- **Collaboration**: Share documents with generated content
- **Advanced Generation**: Multiple generation styles and fine-tuning

### **Technical Improvements**
- **Offline Support**: Service worker for offline reading
- **PWA Features**: Install prompt and native app experience
- **Advanced Virtual Scrolling**: More efficient large file handling
- **WebAssembly**: Performance-critical text processing
- **Voice Integration**: Text-to-speech for generated content

This frontend worker provides a comprehensive, mobile-first interface for testing and experiencing the Buche Content Generator's capabilities in an intuitive, real-world reading context.