import type { KnowledgeBaseConfig, KnowledgeRetrievalResult } from '../../types';

export interface KnowledgeBaseAdapter {
  retrieve(query: string, topK?: number): Promise<KnowledgeRetrievalResult[]>;
  testConnection(): Promise<boolean>;
}

export abstract class BaseKnowledgeBaseAdapter implements KnowledgeBaseAdapter {
  protected config: KnowledgeBaseConfig;

  constructor(config: KnowledgeBaseConfig) {
    this.config = config;
  }

  abstract retrieve(query: string, topK?: number): Promise<KnowledgeRetrievalResult[]>;
  abstract testConnection(): Promise<boolean>;
}
