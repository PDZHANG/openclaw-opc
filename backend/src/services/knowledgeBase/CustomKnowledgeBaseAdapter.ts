import { BaseKnowledgeBaseAdapter } from './KnowledgeBaseAdapter';
import type { CustomKnowledgeBaseConfig, KnowledgeRetrievalResult } from '../../types';

export class CustomKnowledgeBaseAdapter extends BaseKnowledgeBaseAdapter {
  private get typedConfig() {
    return this.config as CustomKnowledgeBaseConfig;
  }

  constructor(config: CustomKnowledgeBaseConfig) {
    super(config);
  }

  async retrieve(query: string, topK: number = 5): Promise<KnowledgeRetrievalResult[]> {
    try {
      console.log(`[Custom KB] Retrieving for query: ${query}`);
      
      if (this.typedConfig.baseUrl && this.typedConfig.apiKey) {
        const url = `${this.typedConfig.baseUrl}/retrieve`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.typedConfig.apiKey}`
          },
          body: JSON.stringify({
            query,
            top_k: topK
          })
        });

        if (response.ok) {
          const data = await response.json() as any;
          return data.results || [];
        }
      }
      
      return [
        {
          content: `自定义知识库示例内容 - 查询: ${query}`,
          source: 'custom-kb-example',
          score: 0.75
        }
      ];
    } catch (error) {
      console.error('[Custom KB] Retrieval error:', error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[Custom KB] Testing connection...');
      
      if (this.typedConfig.baseUrl && this.typedConfig.apiKey) {
        const url = `${this.typedConfig.baseUrl}/health`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.typedConfig.apiKey}`
          }
        });

        return response.ok;
      }
      
      return true;
    } catch (error) {
      console.error('[Custom KB] Connection test failed:', error);
      return false;
    }
  }
}
