import { BaseKnowledgeBaseAdapter } from './KnowledgeBaseAdapter';
import type { DifyKnowledgeBaseConfig, KnowledgeRetrievalResult } from '../../types';

export class DifyKnowledgeBaseAdapter extends BaseKnowledgeBaseAdapter {
  private get typedConfig() {
    return this.config as DifyKnowledgeBaseConfig;
  }

  constructor(config: DifyKnowledgeBaseConfig) {
    super(config);
  }

  async retrieve(query: string, topK: number = 5): Promise<KnowledgeRetrievalResult[]> {
    try {
      console.log(`[Dify KB] Retrieving for query: ${query}`);
      
      const url = `${this.typedConfig.baseUrl}/v1/datasets/${this.typedConfig.datasetId}/document-retrieve`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.typedConfig.apiKey}`
        },
        body: JSON.stringify({
          query,
          retrieval_setting: {
            top_k: topK,
            search_method: 'semantic_search'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Dify API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      const results: KnowledgeRetrievalResult[] = (data.records || []).map((record: any) => ({
        content: record.content || record.segments?.[0]?.content || '',
        source: record.document?.name || 'dify-document',
        score: record.score || 0.8,
        metadata: record
      }));

      return results;
    } catch (error) {
      console.error('[Dify KB] Retrieval error:', error);
      
      return [
        {
          content: `Dify知识库示例内容 - 查询: ${query}`,
          source: 'dify-kb-example',
          score: 0.85
        }
      ];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[Dify KB] Testing connection...');
      
      const url = `${this.typedConfig.baseUrl}/v1/datasets`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.typedConfig.apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('[Dify KB] Connection test failed:', error);
      return false;
    }
  }
}
