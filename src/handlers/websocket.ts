import type { Env } from '../types/worker.js';

/**
 * Handle /api/stream - Proxy SSE streaming requests to content generator worker
 * Uses traditional service binding fetch for SSE proxying (better compatibility than WebSocket)
 */
export async function handleStreamRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Only accept POST requests for SSE streaming
    if (request.method !== 'POST') {
      return new Response('POST method required for streaming', { status: 405 });
    }

    // Check if GENERATOR_WORKER binding exists
    if (!env.GENERATOR_WORKER) {
      throw new Error('GENERATOR_WORKER binding not available');
    }

    // Use traditional service binding to proxy SSE request to generator worker
    console.log('Proxying SSE request to generator worker via service binding...');
    
    // Create a new request to the generator worker's SSE endpoint
    const generatorRequest = new Request('https://fake-host/generate-stream-sse', {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    // Forward the SSE request to the generator worker
    const response = await env.GENERATOR_WORKER.fetch(generatorRequest);
    
    console.log('Generator worker SSE response status:', response.status);
    return response;

  } catch (error) {
    console.error('Error proxying SSE request:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(JSON.stringify({
      error: 'SSE proxy failed: ' + (error instanceof Error ? error.message : String(error))
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Keep the old WebSocket handler for backward compatibility
export async function handleWebSocketRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    // Check if GENERATOR_WORKER binding exists
    if (!env.GENERATOR_WORKER) {
      throw new Error('GENERATOR_WORKER binding not available');
    }

    // Use traditional service binding to proxy WebSocket to generator worker
    console.log('Proxying WebSocket request to generator worker via service binding...');
    
    // Create a new request to the generator worker's WebSocket endpoint
    const generatorRequest = new Request('https://fake-host/generate-stream', {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    // Forward the WebSocket request to the generator worker
    const response = await env.GENERATOR_WORKER.fetch(generatorRequest);
    
    console.log('Generator worker response status:', response.status);
    return response;

  } catch (error) {
    console.error('Error proxying WebSocket request:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response('WebSocket proxy failed: ' + (error instanceof Error ? error.message : String(error)), { 
      status: 500 
    });
  }
}