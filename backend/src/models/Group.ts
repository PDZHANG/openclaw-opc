import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { Group, GroupMember } from '../types';

export class GroupModel {
  static create(data: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Group {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    const stmt = db.prepare(`
      INSERT INTO groups (id, name, description, avatar, created_by, is_public, leader_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      data.name,
      data.description || null,
      data.avatar || null,
      data.createdBy,
      data.isPublic ? 1 : 0,
      data.leaderId || null,
      now.toISOString(),
      now.toISOString()
    ]);
    
    saveDatabase();
    return this.findById(id) as Group;
  }

  static findAll(): Group[] {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM groups ORDER BY created_at DESC');
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToGroup(obj);
    });
  }

  static findById(id: string): Group | null {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM groups WHERE id = '${id}'`);
    
    if (!result || !result.length) {
      return null;
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = values[i];
    });
    
    return this.rowToGroup(obj);
  }

  static update(id: string, data: Partial<Omit<Group, 'id' | 'createdAt'>>): Group | null {
    const db = getDatabase();
    const now = new Date();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null); }
    if (data.avatar !== undefined) { fields.push('avatar = ?'); values.push(data.avatar || null); }
    if (data.isPublic !== undefined) { fields.push('is_public = ?'); values.push(data.isPublic ? 1 : 0); }
    if (data.leaderId !== undefined) { fields.push('leader_id = ?'); values.push(data.leaderId || null); }
    
    if (fields.length === 0) return this.findById(id);
    
    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);
    
    const stmt = db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(values);
    
    saveDatabase();
    return this.findById(id);
  }

  static delete(id: string): boolean {
    const db = getDatabase();
    try {
      db.exec('PRAGMA foreign_keys = ON');
      
      const memberStmt = db.prepare('DELETE FROM group_members WHERE group_id = ?');
      memberStmt.run([id]);
      
      const messageStmt = db.prepare('DELETE FROM messages WHERE to_type = ? AND to_id = ?');
      messageStmt.run(['group', id]);
      
      const taskStmt = db.prepare('DELETE FROM collaboration_tasks WHERE group_id = ?');
      taskStmt.run([id]);
      
      const groupStmt = db.prepare('DELETE FROM groups WHERE id = ?');
      const result = groupStmt.run([id]);
      
      saveDatabase();
      return (result as any).changes > 0;
    } catch (error) {
      console.error('Error deleting group:', error);
      return false;
    }
  }

  static addMember(groupId: string, userId: string, userType: 'human' | 'agent', role: 'admin' | 'member' = 'member'): GroupMember | null {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    try {
      const stmt = db.prepare(`
        INSERT INTO group_members (id, group_id, user_id, user_type, role, joined_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run([id, groupId, userId, userType, role, now.toISOString()]);
      saveDatabase();
      
      return {
        id,
        groupId,
        userId,
        userType,
        role,
        joinedAt: now
      };
    } catch (error) {
      console.error('Failed to add member:', error);
      return null;
    }
  }

  static removeMember(groupId: string, userId: string, userType: 'human' | 'agent'): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND user_type = ?');
    const result = stmt.run([groupId, userId, userType]);
    saveDatabase();
    return (result as any).changes > 0;
  }

  static getMembers(groupId: string): GroupMember[] {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM group_members WHERE group_id = '${groupId}'`);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return {
        id: obj.id,
        groupId: obj.group_id,
        userId: obj.user_id,
        userType: obj.user_type,
        role: obj.role,
        joinedAt: new Date(obj.joined_at)
      };
    });
  }

  static getGroupsByMember(userId: string, userType: 'human' | 'agent'): Group[] {
    const db = getDatabase();
    const result = db.exec(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = '${userId}' AND gm.user_type = '${userType}'
      ORDER BY g.created_at DESC
    `);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToGroup(obj);
    });
  }

  private static rowToGroup(row: any): Group {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      avatar: row.avatar || undefined,
      createdBy: row.created_by,
      isPublic: row.is_public === 1,
      leaderId: row.leader_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
