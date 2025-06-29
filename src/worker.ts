import { handleStaticRequest, handleCORSPreflight } from './handlers/static.js';
import { handleTagsRequest, handleGeneratorStatusRequest, createErrorResponse } from './handlers/api.js';
import { handleStreamRequest, handleWebSocketRequest } from './handlers/websocket.js';
import type { Env } from './types/worker.js';

/**
 * Main worker entry point
 * Handles routing between static assets, API proxies, and WebSocket connections
 */
export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    try {
      const url = new URL(request.url);
      const { pathname, method } = { pathname: url.pathname, method: request.method };

      console.log(`${method} ${pathname}`);

      // Handle CORS preflight requests
      if (method === 'OPTIONS') {
        return handleCORSPreflight();
      }

      // API Routes
      if (pathname.startsWith('/api/')) {
        return await handleAPIRoutes(pathname, method, request, env);
      }

      // Static file serving (React SPA)
      return await handleStaticRequest(request, env);

    } catch (error) {
      console.error('Worker error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }
};

/**
 * Handle API routing
 */
async function handleAPIRoutes(pathname: string, method: string, request: Request, env: Env): Promise<Response> {
  switch (pathname) {
    case '/api/tags':
      if (method === 'GET') {
        return await handleTagsRequest(env);
      }
      break;

    case '/api/status':
      if (method === 'GET') {
        return await handleGeneratorStatusRequest(env);
      }
      break;

    case '/api/stream':
      if (method === 'GET') {
        return await handleWebSocketRequest(request, env);
      }
      if (method === 'POST') {
        return await handleStreamRequest(request, env);
      }
      break;

    case '/api/debug':
      if (method === 'GET') {
        return await handleDebugRequest(env);
      }
      break;

    case '/api/ping':
      if (method === 'GET') {
        return await handlePingRequest(env);
      }
      break;

    default:
      return createErrorResponse(`API endpoint not found: ${pathname}`, 404);
  }

  return createErrorResponse(`Method ${method} not allowed for ${pathname}`, 405);
}

/**
 * Ping endpoint to test RPC connectivity
 */
async function handlePingRequest(env: Env): Promise<Response> {
  try {
    console.log('Testing RPC ping to tag worker...');
    const pingResult = await env.TAG_WORKER.ping();
    console.log('Ping result:', pingResult);

    return new Response(JSON.stringify({
      success: true,
      rpcTest: pingResult,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('RPC ping failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Debug endpoint to check service bindings
 */
async function handleDebugRequest(env: Env): Promise<Response> {
  const debug = {
    architecture: 'Hybrid RPC + Traditional Service Binding',
    bindings: {
      TAG_WORKER: {
        exists: !!env.TAG_WORKER,
        type: typeof env.TAG_WORKER,
        bindingType: 'RPC (with TagWorkerEntrypoint)',
        methods: env.TAG_WORKER ? Object.getOwnPropertyNames(env.TAG_WORKER) : [],
        note: 'Used for simple API calls like getTags(), getStatus()'
      },
      GENERATOR_WORKER: {
        exists: !!env.GENERATOR_WORKER,
        type: typeof env.GENERATOR_WORKER,
        bindingType: 'Traditional Service Binding (fetch)',
        methods: env.GENERATOR_WORKER ? Object.getOwnPropertyNames(env.GENERATOR_WORKER) : [],
        note: 'Used for WebSocket streaming and HTTP requests'
      },
      ASSETS: {
        exists: !!env.ASSETS,
        type: typeof env.ASSETS,
        bindingType: 'Assets binding'
      }
    },
    endpoints: {
      '/api/ping': 'RPC test → TAG_WORKER.ping()',
      '/api/tags': 'RPC → TAG_WORKER.getTags()',
      '/api/status': 'HTTP → GENERATOR_WORKER.fetch(/status)',
      '/api/stream': 'WebSocket → GENERATOR_WORKER.fetch(/generate-stream)',
      '/api/debug': 'This endpoint'
    },
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(debug, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Export for ES module compatibility
 */
export { };