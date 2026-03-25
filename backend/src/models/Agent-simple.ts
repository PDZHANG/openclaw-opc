import { getDatabase, saveDatabase } from '../config/database-simple';
import { v4 as uuidv4 } from 'uuid';
import type { Agent as AgentType } from '../types';

export class Agent {
  static create(data: Omit<AgentType, 'id' | 'createdAt' | 'updatedAt'>): AgentType {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    const agent: AgentType = {
      id,
      name: data.name,
      description: data.description,
      avatar: data.avatar,
      workspacePath: data.workspacePath,
      role: data.role,
      tags: data.tags,
      isActive: data.isActive,
      isPinned: false,
      createdAt: now,
      updatedAt: now
    };
    
    db.agents.push(agent);
    saveDatabase();
    
    return agent;
  }

  static findAll(): AgentType[] {
    const db = getDatabase();
    return [...db.agents].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static findById(id: string): AgentType | null {
    const db = getDatabase();
    return db.agents.find(a => a.id === id) || null;
  }

  static update(id: string, data: Partial<Omit<AgentType, 'id' | 'createdAt'>>): AgentType | null {
    const db = getDatabase();
    const index = db.agents.findIndex(a => a.id === id);
    
    if (index === -1) return null;
    
    db.agents[index] = {
      ...db.agents[index],
      ...data,
      updatedAt: new Date()
    };
    
    saveDatabase();
    return db.agents[index];
  }

  static delete(id: string): boolean {
    const db = getDatabase();
    const initialLength = db.agents.length;
    db.agents = db.agents.filter(a => a.id !== id);
    saveDatabase();
    return db.agents.length < initialLength;
  }
}
