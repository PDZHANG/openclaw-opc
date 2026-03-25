import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { Agent as AgentType } from '../types';

export class Agent {
  static create(data: Omit<AgentType, 'createdAt' | 'updatedAt'> & { id?: string }): AgentType {
    const db = getDatabase();
    const id = data.id || uuidv4();
    const now = new Date();
    
    const stmt = db.prepare(`
      INSERT INTO agents (id, name, description, avatar, workspace_path, role, department, tags, is_active, is_pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      data.name,
      data.description || null,
      data.avatar || null,
      data.workspacePath,
      data.role || null,
      (data as any).department || null,
      data.tags ? JSON.stringify(data.tags) : null,
      data.isActive ? 1 : 0,
      (data as any).isPinned ? 1 : 0,
      now.toISOString(),
      now.toISOString()
    ]);
    
    saveDatabase();
    return this.findById(id) as AgentType;
  }

  static findAll(): AgentType[] {
    const db = getDatabase();
    // console.log('Agent.findAll() called, db:', db ? 'not null' : 'null');
    const result = db.exec('SELECT * FROM agents ORDER BY created_at DESC');
    // console.log('Query result:', result);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToAgent(obj);
    });
  }

  static findById(id: string): AgentType | null {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM agents WHERE id = '${id}'`);
    
    if (!result || !result.length) {
      return null;
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = values[i];
    });
    
    return this.rowToAgent(obj);
  }

  static update(id: string, data: Partial<Omit<AgentType, 'id' | 'createdAt'>>): AgentType | null {
    const db = getDatabase();
    const now = new Date();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description || null); }
    if (data.avatar !== undefined) { updates.push('avatar = ?'); values.push(data.avatar || null); }
    if (data.workspacePath !== undefined) { updates.push('workspace_path = ?'); values.push(data.workspacePath); }
    if (data.role !== undefined) { updates.push('role = ?'); values.push(data.role || null); }
    if ((data as any).department !== undefined) { updates.push('department = ?'); values.push((data as any).department || null); }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(data.tags ? JSON.stringify(data.tags) : null); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    if ((data as any).isPinned !== undefined) { updates.push('is_pinned = ?'); values.push((data as any).isPinned ? 1 : 0); }
    
    updates.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);
    
    if (updates.length > 1) {
      const stmt = db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(values);
      saveDatabase();
    }
    
    return this.findById(id);
  }

  static delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
    const result = stmt.run([id]);
    saveDatabase();
    return (result as any).changes > 0;
  }

  private static rowToAgent(row: any): AgentType {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      avatar: row.avatar || undefined,
      workspacePath: row.workspace_path,
      role: row.role || undefined,
      department: row.department || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      isActive: !!row.is_active,
      isPinned: !!row.is_pinned,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
