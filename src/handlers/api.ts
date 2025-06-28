import type { Env, ProxyResponse } from '../types/worker.js';

/**
 * Handle GET /api/tags - Use RPC to call tag worker
 */
export async function handleTagsRequest(env: Env): Promise<Response> {
  try {
    // Check if TAG_WORKER binding exists
    if (!env.TAG_WORKER) {
      throw new Error('TAG_WORKER binding not available');
    }

    // Use RPC to call the tag worker directly
    console.log('Calling tag worker via RPC...');
    console.log('TAG_WORKER binding:', typeof env.TAG_WORKER);
    
    const tagsResult = await env.TAG_WORKER.getTags();
    console.log('Tags result:', tagsResult);

    if (!tagsResult || !tagsResult.success) {
      throw new Error(tagsResult?.error || 'Failed to get tags');
    }

    // Transform the tags data to match frontend expectations
    const tags = tagsResult.data.tags || [];
    const tagsWithCategories = tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      usageCount: tag.usage_count || tag.usageCount,
      category: categorizeTag(tag.name) // Simple categorization
    }));

    const result: ProxyResponse = {
      success: true,
      data: {
        tags: tagsWithCategories,
        total: tagsWithCategories.length,
        totalTags: tagsResult.data.totalTags || tagsWithCategories.length
      }
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error calling tag worker via RPC:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return mock data as fallback for development
    const mockTags = [
      { id: 1, name: '浪漫', usageCount: 150, category: '情感' },
      { id: 2, name: '激情', usageCount: 200, category: '情感' },
      { id: 3, name: '温柔', usageCount: 120, category: '情感' },
      { id: 4, name: '床上', usageCount: 180, category: '场景' },
      { id: 5, name: '浴室', usageCount: 95, category: '场景' },
      { id: 6, name: '户外', usageCount: 75, category: '场景' }
    ];

    const result: ProxyResponse = {
      success: true,
      data: {
        tags: mockTags,
        total: mockTags.length,
        totalTags: mockTags.length,
        fallback: true,
        error: error instanceof Error ? error.message : String(error)
      }
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Handle GET /api/status - Get content generator worker status via traditional service binding
 */
export async function handleGeneratorStatusRequest(env: Env): Promise<Response> {
  try {
    // Check if GENERATOR_WORKER binding exists
    if (!env.GENERATOR_WORKER) {
      throw new Error('GENERATOR_WORKER binding not available');
    }

    // Use traditional service binding to call the generator worker status
    console.log('Calling generator worker status via service binding...');
    console.log('GENERATOR_WORKER binding:', typeof env.GENERATOR_WORKER);
    
    const statusRequest = new Request('https://fake-host/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const response = await env.GENERATOR_WORKER.fetch(statusRequest);
    console.log('Generator worker response status:', response.status);

    if (!response.ok) {
      throw new Error(`Generator worker responded with ${response.status}`);
    }

    const statusData = await response.json();
    console.log('Status data:', statusData);

    return new Response(JSON.stringify(statusData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error calling generator worker via service binding:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return mock status as fallback for development
    const mockStatus = {
      status: 'active',
      taggedSnippets: 0,
      totalTags: 0,
      capabilities: ['content_generation', 'tag_analysis', 'snippet_matching'],
      fallback: true,
      error: error instanceof Error ? error.message : String(error)
    };

    return new Response(JSON.stringify(mockStatus), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, status: number = 500): Response {
  const result: ProxyResponse = {
    success: false,
    error: message,
    status
  };

  return new Response(JSON.stringify(result), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Simple categorization function for Chinese tags
 */
function categorizeTag(tagName: string): string {
  // Emotion/feeling tags
  const emotionTags = ['浪漫', '激情', '温柔', '甜蜜', '热烈', '深情', '缠绵'];
  if (emotionTags.some(tag => tagName.includes(tag))) {
    return '情感';
  }
  
  // Location/scene tags
  const locationTags = ['床上', '浴室', '户外', '办公室', '车内', '卧室', '沙发'];
  if (locationTags.some(tag => tagName.includes(tag))) {
    return '场景';
  }
  
  // Action/behavior tags
  const actionTags = ['接吻', '拥抱', '爱抚', '口交', '肛交', '指交'];
  if (actionTags.some(tag => tagName.includes(tag))) {
    return '行为';
  }
  
  // Relationship tags
  const relationshipTags = ['夫妻', '恋人', '初次', '师生', '上司', '同事'];
  if (relationshipTags.some(tag => tagName.includes(tag))) {
    return '关系';
  }
  
  // Default category
  return '其他';
}