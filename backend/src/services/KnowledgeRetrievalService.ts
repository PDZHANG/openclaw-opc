import { AgentKnowledgeBaseBindingModel } from '../models/AgentKnowledgeBaseBinding';
import { createKnowledgeBaseAdapter } from './knowledgeBase';
import type { KnowledgeBase, KnowledgeRetrievalResult } from '../types';

export class KnowledgeRetrievalService {
  static async retrieveForAgent(
    agentId: string,
    query: string,
    topK: number = 10
  ): Promise<KnowledgeRetrievalResult[]> {
    try {
      const knowledgeBases = AgentKnowledgeBaseBindingModel.findKnowledgeBasesByAgentId(agentId);
      
      if (knowledgeBases.length === 0) {
        console.log(`[KnowledgeRetrieval] No knowledge bases bound to agent ${agentId}`);
        return [];
      }

      console.log(`[KnowledgeRetrieval] Retrieving from ${knowledgeBases.length} knowledge bases for agent ${agentId}`);
      
      const allResults: KnowledgeRetrievalResult[] = [];
      
      for (const kb of knowledgeBases) {
        try {
          const adapter = createKnowledgeBaseAdapter(kb);
          const results = await adapter.retrieve(query, Math.ceil(topK / knowledgeBases.length));
          
          const resultsWithSource = results.map(result => ({
            ...result,
            source: `${kb.name} (${kb.type}) - ${result.source}`
          }));
          
          allResults.push(...resultsWithSource);
        } catch (error) {
          console.error(`[KnowledgeRetrieval] Error retrieving from KB ${kb.name}:`, error);
        }
      }
      
      allResults.sort((a, b) => b.score - a.score);
      
      return allResults.slice(0, topK);
    } catch (error) {
      console.error('[KnowledgeRetrieval] Error:', error);
      return [];
    }
  }

  static async formatKnowledgeForInjection(results: KnowledgeRetrievalResult[]): Promise<string> {
    if (results.length === 0) {
      return '';
    }

    let content = '\n\n## 相关知识库内容\n\n';
    
    results.forEach((result, index) => {
      content += `### ${index + 1}. 来源: ${result.source}\n`;
      content += `相关度: ${(result.score * 100).toFixed(1)}%\n\n`;
      content += `${result.content}\n\n`;
      content += '---\n\n';
    });

    return content;
  }

  static async retrieveAndFormat(
    agentId: string,
    query: string,
    topK: number = 10
  ): Promise<string> {
    const results = await this.retrieveForAgent(agentId, query, topK);
    return this.formatKnowledgeForInjection(results);
  }

  static async testKnowledgeBase(knowledgeBase: KnowledgeBase): Promise<boolean> {
    try {
      const adapter = createKnowledgeBaseAdapter(knowledgeBase);
      return await adapter.testConnection();
    } catch (error) {
      console.error('[KnowledgeRetrieval] Test connection failed:', error);
      return false;
    }
  }
}

export const knowledgeRetrievalService = new KnowledgeRetrievalService();
