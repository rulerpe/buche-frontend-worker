// API response types for content generator integration

export interface GenerationRequest {
  content: string;      // 100 chars before click position
  tags?: string[];      // Selected tags from dropdown
  maxLength?: number;   // Default: 800 characters
  style?: 'continue' | 'expand' | 'variation';
  characterLimit?: number;
}

export interface GenerationResponse {
  success: boolean;
  generatedContent?: string;
  relatedSnippets?: RelatedSnippet[];
  detectedTags?: string[];
  extractedCharacters?: CharacterInfo[];
  contentSummary?: string;
  error?: string;
}

export interface RelatedSnippet {
  id: string;
  title: string;
  author: string;
  tags: string[];
  relevanceScore: number;
}

export interface CharacterInfo {
  name: string;
  relationship?: string;
  attributes: string[];
  role?: string;
}

export interface Tag {
  id: number;
  name: string;
  usageCount: number;
  category?: string;
}

export interface WorkerStatusResponse {
  status: 'active' | 'inactive';
  taggedSnippets: number;
  totalTags: number;
  capabilities: string[];
  error?: string;
}

// API client configuration
export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}