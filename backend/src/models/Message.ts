import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { Message as MessageType, MessageWithReadStatus, MessageRead } from '../types';
import { MessageReadModel } from './MessageRead';

export class Message {
  static create(data: Omit<MessageType, 'id' | 'createdAt'>): MessageType {
    const id = uuidv4();
    const now = new Date();
    
    console.log('=== Message.create called ===');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Generated ID:', id);
    
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO messages (
        id, type, from_id, from_type, from_name, to_type, to_id, content,
        attachments, status, thread_id, collaboration_type, task_id, mentions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      data.type,
      data.fromId,
      data.fromType,
      data.fromName,
      data.toType,
      data.toId,
      data.content,
      data.attachments ? JSON.stringify(data.attachments) : null,
      data.status || 'sent',
      data.threadId || null,
      data.collaborationType || null,
      data.taskId || null,
      data.mentions ? JSON.stringify(data.mentions) : null,
      now.toISOString()
    ]);
    
    console.log('INSERT executed, calling saveDatabase...');
    saveDatabase();
    console.log('saveDatabase called, now finding by ID...');
    
    const savedMessage = this.findById(id);
    console.log('Saved message found:', savedMessage);
    
    return savedMessage as MessageType;
  }

  static findByConversation(toType: 'direct' | 'group', toId: string, fromType?: string, fromId?: string, limit: number = 50): MessageType[] {
    const db = getDatabase();
    let query: string;
    
    console.log('findByConversation called with:', { toType, toId, fromType, fromId });
    
    if (toType === 'direct' && fromType === 'human' && fromId) {
      query = `
        SELECT * FROM messages 
        WHERE to_type = 'direct' 
        AND ((to_id = '${toId}' AND from_id = '${fromId}') OR (to_id = '${fromId}' AND from_id = '${toId}'))
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else if (toType === 'direct') {
      query = `
        SELECT * FROM messages 
        WHERE to_type = 'direct' AND (to_id = '${toId}' OR from_id = '${toId}')
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else {
      query = `
        SELECT * FROM messages 
        WHERE to_type = 'group' AND to_id = '${toId}' 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    }
    
    console.log('findByConversation query:', query);
    const result = db.exec(query);
    
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToMessage(obj);
    }).reverse();
  }

  static findById(id: string): MessageType | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    const result = stmt.get([id]);
    
    if (!result) {
      return null;
    }
    
    const columns = [
      'id', 'type', 'from_id', 'from_type', 'from_name', 'to_type', 'to_id', 'content',
      'attachments', 'status', 'thread_id', 'collaboration_type', 'task_id', 'mentions', 'created_at', 'updated_at'
    ];
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = result[i];
    });
    
    return this.rowToMessage(obj);
  }

  static updateStatus(id: string, status: 'sent' | 'delivered' | 'read'): MessageType | null {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE messages SET status = ? WHERE id = ?');
    stmt.run([status, id]);
    saveDatabase();
    return this.findById(id);
  }

  static update(id: string, updates: Partial<Omit<MessageType, 'id' | 'createdAt'>>): MessageType | null {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.attachments !== undefined) {
      fields.push('attachments = ?');
      values.push(updates.attachments ? JSON.stringify(updates.attachments) : null);
    }
    if (updates.mentions !== undefined) {
      fields.push('mentions = ?');
      values.push(updates.mentions ? JSON.stringify(updates.mentions) : null);
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(values);
      saveDatabase();
    }
    
    return this.findById(id);
  }

  static delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    const result = stmt.run([id]);
    saveDatabase();
    return result.changes > 0;
  }

  static deleteByConversation(toType: 'direct' | 'group', toId: string): number {
    const db = getDatabase();
    let query: string;
    
    if (toType === 'direct') {
      query = `DELETE FROM messages WHERE (to_type = 'direct' AND to_id = ?) OR (to_type = 'direct' AND from_id = ?)`;
    } else {
      query = `DELETE FROM messages WHERE to_type = 'group' AND to_id = ?`;
    }
    
    const stmt = db.prepare(query);
    const params = toType === 'direct' ? [toId, toId] : [toId];
    const result = stmt.run(params);
    saveDatabase();
    return result.changes;
  }

  static findByConversationWithReadStatus(
    toType: 'direct' | 'group', 
    toId: string, 
    limit: number = 50,
    userId?: string,
    userType?: 'human' | 'agent'
  ): MessageWithReadStatus[] {
    const messages = this.findByConversation(toType, toId, userType, userId, limit);
    
    return messages.map(message => {
      const readBy = MessageReadModel.findByMessageId(message.id);
      let unreadCount: number | undefined;
      
      if (userId && userType) {
        const isRead = MessageReadModel.isReadByUser(message.id, userId, userType);
        unreadCount = isRead ? 0 : 1;
      }
      
      return {
        ...message,
        readBy,
        unreadCount
      };
    });
  }

  static findDirectConversationsForHuman(humanId: string): Array<{
    partnerId: string;
    partnerType: 'human' | 'agent';
    lastMessage?: MessageType;
    unreadCount: number;
  }> {
    const db = getDatabase();
    
    const query = `
      SELECT DISTINCT 
        CASE 
          WHEN from_id = '${humanId}' THEN to_id
          ELSE from_id
        END as partner_id,
        CASE 
          WHEN from_id = '${humanId}' THEN to_type
          ELSE from_type
        END as partner_type
      FROM messages
      WHERE to_type = 'direct'
        AND ((from_id = '${humanId}' AND from_type = 'human') 
             OR (to_id = '${humanId}' AND to_type = 'direct'))
      ORDER BY created_at DESC
    `;
    
    const result = db.exec(query);
    
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    const conversations = values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      
      const partnerId = obj.partner_id;
      const partnerType = obj.partner_type;
      
      const lastMessage = this.findLastMessageForConversation('direct', partnerId, humanId);
      const unreadCount = MessageReadModel.getUnreadCount('direct', partnerId, humanId, 'human');
      
      return {
        partnerId,
        partnerType: partnerType as 'human' | 'agent',
        lastMessage,
        unreadCount
      };
    });
    
    return conversations;
  }

  static findLastMessageForConversation(
    toType: 'direct' | 'group', 
    toId: string, 
    fromId?: string
  ): MessageType | null {
    const messages = this.findByConversation(toType, toId, fromId ? 'human' : undefined, fromId, 1);
    return messages.length > 0 ? messages[0] : null;
  }

  private static rowToMessage(row: any): MessageType {
    return {
      id: row.id,
      type: row.type,
      fromId: row.from_id,
      fromType: row.from_type,
      fromName: row.from_name,
      toType: row.to_type,
      toId: row.to_id,
      content: row.content,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      status: row.status,
      threadId: row.thread_id || undefined,
      collaborationType: row.collaboration_type || undefined,
      taskId: row.task_id || undefined,
      mentions: row.mentions ? JSON.parse(row.mentions) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }
}
