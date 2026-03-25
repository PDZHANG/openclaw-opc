import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { KnowledgeBase, KnowledgeBaseConfig, KnowledgeBaseType } from '../types';

export class KnowledgeBaseModel {
  static create(
    name: string,
    type: KnowledgeBaseType,
    config: KnowledgeBaseConfig,
    description?: string,
    isGlobal: boolean = false
  ): KnowledgeBase {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    db.run(`
      INSERT INTO knowledge_bases (
        id, name, type, config, description, is_active, is_global, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name,
      type,
      JSON.stringify(config),
      description || null,
      1,
      isGlobal ? 1 : 0,
      now.toISOString(),
      now.toISOString()
    ]);
    
    saveDatabase();
    return this.findById(id) as KnowledgeBase;
  }

  static findById(id: string): KnowledgeBase | null {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM knowledge_bases WHERE id = '${id}'`);
    
    if (!result || !result.length) {
      return null;
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = values[i];
    });
    
    return this.rowToKnowledgeBase(obj);
  }

  static findAll(): KnowledgeBase[] {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM knowledge_bases ORDER BY created_at DESC');
    
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToKnowledgeBase(obj);
    });
  }

  static findActive(): KnowledgeBase[] {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM knowledge_bases WHERE is_active = 1 ORDER BY created_at DESC');
    
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToKnowledgeBase(obj);
    });
  }

  static findGlobal(): KnowledgeBase[] {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM knowledge_bases WHERE is_active = 1 AND is_global = 1 ORDER BY created_at DESC');
    
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToKnowledgeBase(obj);
    });
  }

  static update(id: string, data: Partial<Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>>): KnowledgeBase | null {
    const db = getDatabase();
    const now = new Date();
    
    const fields: string[] = [];
    const params: any[] = [];
    
    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      params.push(data.type);
    }
    if (data.config !== undefined) {
      fields.push('config = ?');
      params.push(JSON.stringify(data.config));
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description || null);
    }
    if (data.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.isGlobal !== undefined) {
      fields.push('is_global = ?');
      params.push(data.isGlobal ? 1 : 0);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    fields.push('updated_at = ?');
    params.push(now.toISOString());
    params.push(id);
    
    const stmt = db.prepare(`UPDATE knowledge_bases SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(params);
    
    saveDatabase();
    return this.findById(id);
  }

  static delete(id: string): boolean {
    const db = getDatabase();
    const result = db.exec(`SELECT COUNT(*) as count FROM knowledge_bases WHERE id = '${id}'`);
    const exists = result.length > 0 && result[0].values.length > 0 && result[0].values[0][0] > 0;
    
    if (exists) {
      db.run(`DELETE FROM knowledge_bases WHERE id = '${id}'`);
      saveDatabase();
    }
    
    return exists;
  }

  private static rowToKnowledgeBase(row: any): KnowledgeBase {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      config: row.config ? JSON.parse(row.config) : {},
      description: row.description,
      isActive: row.is_active === 1,
      isGlobal: row.is_global === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    } as KnowledgeBase;
  }
}
