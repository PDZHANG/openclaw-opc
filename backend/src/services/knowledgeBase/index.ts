import { KnowledgeBaseAdapter } from './KnowledgeBaseAdapter';
import { AliyunKnowledgeBaseAdapter } from './AliyunKnowledgeBaseAdapter';
import { LexiangKnowledgeBaseAdapter } from './LexiangKnowledgeBaseAdapter';
import { DifyKnowledgeBaseAdapter } from './DifyKnowledgeBaseAdapter';
import { CustomKnowledgeBaseAdapter } from './CustomKnowledgeBaseAdapter';
import type { KnowledgeBase, KnowledgeBaseType } from '../../types';

export function createKnowledgeBaseAdapter(knowledgeBase: KnowledgeBase): KnowledgeBaseAdapter {
  const { type, config } = knowledgeBase;

  switch (type as KnowledgeBaseType) {
    case 'aliyun':
      return new AliyunKnowledgeBaseAdapter(config as any);
    case 'lexiang':
      return new LexiangKnowledgeBaseAdapter(config as any);
    case 'dify':
      return new DifyKnowledgeBaseAdapter(config as any);
    case 'custom':
      return new CustomKnowledgeBaseAdapter(config as any);
    default:
      throw new Error(`Unsupported knowledge base type: ${type}`);
  }
}

export * from './KnowledgeBaseAdapter';
export * from './AliyunKnowledgeBaseAdapter';
export * from './LexiangKnowledgeBaseAdapter';
export * from './DifyKnowledgeBaseAdapter';
export * from './CustomKnowledgeBaseAdapter';
