import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { Human as HumanType } from '../types';

export class Human {
  static create(data: Partial<Omit<HumanType, 'createdAt' | 'updatedAt' | 'id'>> & { id?: string }): HumanType {
    const db = getDatabase();
    const id = data.id || uuidv4();
    const now = new Date();
    
    const stmt = db.prepare(`
      INSERT INTO humans (id, name, email, avatar, password_hash, role, permissions, is_active, is_approved, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      data.name,
      data.email,
      data.avatar || null,
      data.passwordHash || null,
      data.role || 'user',
      data.permissions ? JSON.stringify(data.permissions) : null,
      data.isActive ? 1 : 1,
      data.isApproved !== undefined ? (data.isApproved ? 1 : 0) : 0,
      now.toISOString(),
      now.toISOString()
    ]);
    
    saveDatabase();
    return this.findById(id) as HumanType;
  }

  static findAll(): HumanType[] {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM humans ORDER BY created_at DESC');
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToHuman(obj);
    });
  }

  static findById(id: string): HumanType | null {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM humans WHERE id = '${id}'`);
    
    if (!result || !result.length) {
      return null;
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = values[i];
    });
    
    return this.rowToHuman(obj);
  }

  static findByEmail(email: string): HumanType | null {
    const db = getDatabase();
    console.log('findByEmail - email:', email);
    const result = db.exec(`SELECT * FROM humans WHERE email = '${email}'`);
    
    if (!result || !result.length) {
      console.log('findByEmail - no result');
      return null;
    }
    
    console.log('findByEmail - columns:', result[0].columns);
    console.log('findByEmail - values:', result[0].values[0]);
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = values[i];
    });
    
    const human = this.rowToHuman(obj);
    console.log('findByEmail - human:', human);
    return human;
  }

  static update(id: string, data: Partial<Omit<HumanType, 'id' | 'createdAt'>>): HumanType | null {
    const db = getDatabase();
    const now = new Date();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
    if (data.avatar !== undefined) { updates.push('avatar = ?'); values.push(data.avatar || null); }
    if (data.passwordHash !== undefined) { updates.push('password_hash = ?'); values.push(data.passwordHash || null); }
    if (data.role !== undefined) { updates.push('role = ?'); values.push(data.role); }
    if (data.permissions !== undefined) { updates.push('permissions = ?'); values.push(data.permissions ? JSON.stringify(data.permissions) : null); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    if (data.isApproved !== undefined) { updates.push('is_approved = ?'); values.push(data.isApproved ? 1 : 0); }
    
    updates.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);
    
    if (updates.length > 1) {
      const stmt = db.prepare(`UPDATE humans SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(values);
      saveDatabase();
    }
    
    return this.findById(id);
  }

  static delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM humans WHERE id = ?');
    const result = stmt.run([id]);
    saveDatabase();
    return (result as any).changes > 0;
  }

  private static rowToHuman(row: any): HumanType {
    // console.log('rowToHuman - raw row:', row);
    const result = {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar || undefined,
      passwordHash: row.password_hash || undefined,
      role: row.role || 'user',
      permissions: row.permissions ? JSON.parse(row.permissions) : undefined,
      isActive: !!row.is_active,
      isApproved: !!row.is_approved,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
    // console.log('rowToHuman - result:', result);
    return result;
  }
}
