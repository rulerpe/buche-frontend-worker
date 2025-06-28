import type { Env } from '../types/worker.js';

/**
 * Handle static file serving for the React SPA
 * Serves files from the ASSETS binding (dist/ folder)
 */
export async function handleStaticRequest(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Handle root path
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Try to get the asset from the binding
    const asset = await env.ASSETS.fetch(request.url);
    
    if (asset.status === 200) {
      // Clone the response to modify headers
      const response = new Response(asset.body, {
        status: asset.status,
        statusText: asset.statusText,
        headers: asset.headers
      });

      // Add caching headers for static assets
      if (isStaticAsset(pathname)) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // For HTML files, use shorter cache
        response.headers.set('Cache-Control', 'public, max-age=3600');
      }

      // Ensure proper CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

      return response;
    }

    // If asset not found and it's not an API route, serve index.html for SPA routing
    if (!pathname.startsWith('/api/') && !pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      const indexAsset = await env.ASSETS.fetch(indexRequest.url);
      
      if (indexAsset.status === 200) {
        const response = new Response(indexAsset.body, {
          status: 200,
          statusText: 'OK',
          headers: indexAsset.headers
        });
        
        response.headers.set('Content-Type', 'text/html; charset=utf-8');
        response.headers.set('Cache-Control', 'public, max-age=3600');
        response.headers.set('Access-Control-Allow-Origin', '*');
        
        return response;
      }
    }

    // Asset not found
    return new Response('Not Found', { 
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error serving static asset:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Check if a path represents a static asset that should be cached long-term
 */
function isStaticAsset(pathname: string): boolean {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => pathname.includes(ext)) || pathname.includes('/assets/');
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export function handleCORSPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}