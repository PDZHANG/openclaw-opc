import { getDatabase, saveDatabase } from '../config/database';
import type { AgentKnowledgeBaseBinding, KnowledgeBase } from '../types';
import { KnowledgeBaseModel } from './KnowledgeBase';

export class AgentKnowledgeBaseBindingModel {
  static create(
    agentId: string,
    knowledgeBaseId: string,
    priority: number = 0
  ): AgentKnowledgeBaseBinding {
    const db = getDatabase();
    const now = new Date();
    
    db.run(`
      INSERT INTO agent_knowledge_base_bindings (
        agent_id, knowledge_base_id, priority, created_at
      ) VALUES (?, ?, ?, ?)
    `, [
      agentId,
      knowledgeBaseId,
      priority,
      now.toISOString()
    ]);
    
    saveDatabase();
    return this.find(agentId, knowledgeBaseId) as AgentKnowledgeBaseBinding;
  }

  static find(agentId: string, knowledgeBaseId: string): AgentKnowledgeBaseBinding | null {
    const db = getDatabase();
    const result = db.exec(`
      SELECT * FROM agent_knowledge_base_bindings 
      WHERE agent_id = '${agentId}' AND knowledge_base_id = '${knowledgeBaseId}'
    `);
    
    if (!result || !result.length) {
      return null;
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = values[i];
    });
    
    return this.rowToBinding(obj);
  }

  static findByAgentId(agentId: string): AgentKnowledgeBaseBinding[] {
    const db = getDatabase();
    const result = db.exec(`
      SELECT * FROM agent_knowledge_base_bindings 
      WHERE agent_id = '${agentId}'
      ORDER BY priority ASC, created_at ASC
    `);
    
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToBinding(obj);
    });
  }

  static findKnowledgeBasesByAgentId(agentId: string): KnowledgeBase[] {
    const db = getDatabase();
    const result = db.exec(`
      SELECT kb.* FROM knowledge_bases kb
      INNER JOIN agent_knowledge_base_bindings akb ON kb.id = akb.knowledge_base_id
      WHERE akb.agent_id = '${agentId}' AND kb.is_active = 1
      ORDER BY akb.priority ASC, akb.created_at ASC
    `);
    
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return KnowledgeBaseModel['rowToKnowledgeBase'](obj);
    });
  }

  static delete(agentId: string, knowledgeBaseId: string): boolean {
    const db = getDatabase();
    const result = db.exec(`
      SELECT COUNT(*) as count FROM agent_knowledge_base_bindings 
      WHERE agent_id = '${agentId}' AND knowledge_base_id = '${knowledgeBaseId}'
    `);
    const exists = result.length > 0 && result[0].values.length > 0 && result[0].values[0][0] > 0;
    
    if (exists) {
      db.run(`
        DELETE FROM agent_knowledge_base_bindings 
        WHERE agent_id = '${agentId}' AND knowledge_base_id = '${knowledgeBaseId}'
      `);
      saveDatabase();
    }
    
    return exists;
  }

  static updatePriority(agentId: string, knowledgeBaseId: string, priority: number): AgentKnowledgeBaseBinding | null {
    const db = getDatabase();
    
    db.run(`
      UPDATE agent_knowledge_base_bindings 
      SET priority = ?
      WHERE agent_id = ? AND knowledge_base_id = ?
    `, [priority, agentId, knowledgeBaseId]);
    
    saveDatabase();
    return this.find(agentId, knowledgeBaseId);
  }

  private static rowToBinding(row: any): AgentKnowledgeBaseBinding {
    return {
      id: row.id,
      agentId: row.agent_id,
      knowledgeBaseId: row.knowledge_base_id,
      priority: row.priority,
      createdAt: new Date(row.created_at)
    } as AgentKnowledgeBaseBinding;
  }
}
