// Worker environment types for Cloudflare Workers

// Use the global types from Cloudflare Workers runtime
export interface Env {
  // Static assets binding
  ASSETS: any;
  
  // TAG_WORKER: RPC service binding with entrypoint
  TAG_WORKER: {
    ping(): Promise<any>;
    getStatus(): Promise<any>;
    getTags(): Promise<any>;
    startQueueTagging(): Promise<any>;
    getQueueProgress(): Promise<any>;
  };
  
  // GENERATOR_WORKER: Traditional service binding with fetch method
  GENERATOR_WORKER: {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  };
}

export interface WorkerContext {
  request: Request;
  env: Env;
  ctx: any;
}

// Response types for proxy endpoints
export interface ProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

// Tag response from tag worker
export interface TagWorkerResponse {
  status: string;
  // Add more fields as needed based on tag worker response
}

// Generation request/response types
export interface GenerationProxyRequest {
  content: string;
  tags: string[];
  maxLength?: number;
  style?: string;
}

export interface GenerationProxyResponse {
  success: boolean;
  generatedContent?: string;
  error?: string;
}