import { BaseKnowledgeBaseAdapter } from './KnowledgeBaseAdapter';
import type { LexiangKnowledgeBaseConfig, KnowledgeRetrievalResult } from '../../types';

export class LexiangKnowledgeBaseAdapter extends BaseKnowledgeBaseAdapter {
  constructor(config: LexiangKnowledgeBaseConfig) {
    super(config);
  }

  async retrieve(query: string, topK: number = 5): Promise<KnowledgeRetrievalResult[]> {
    try {
      console.log(`[Lexiang KB] Retrieving for query: ${query}`);
      
      const results: KnowledgeRetrievalResult[] = [
        {
          content: `乐享知识库示例内容 - 查询: ${query}`,
          source: 'lexiang-kb-example',
          score: 0.90
        }
      ];
      
      return results;
    } catch (error) {
      console.error('[Lexiang KB] Retrieval error:', error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[Lexiang KB] Testing connection...');
      return true;
    } catch (error) {
      console.error('[Lexiang KB] Connection test failed:', error);
      return false;
    }
  }
}
