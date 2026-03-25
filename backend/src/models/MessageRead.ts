import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { MessageRead as MessageReadType } from '../types';

export class MessageReadModel {
  static markAsRead(messageId: string, userId: string, userType: 'human' | 'agent'): MessageReadType | null {
    const db = getDatabase();
    const now = new Date();

    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO message_read (message_id, user_id, user_type, read_at)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run([messageId, userId, userType, now.toISOString()]);
      saveDatabase();

      // Find by message_id, user_id, user_type since we don't have the auto-generated id
      const result = db.exec(`SELECT * FROM message_read WHERE message_id = '${messageId}' AND user_id = '${userId}' AND user_type = '${userType}'`);
      if (!result.length || !result[0].values.length) return null;
      
      const columns = ['id', 'message_id', 'user_id', 'user_type', 'read_at'];
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = result[0].values[0][i];
      });

      return this.rowToMessageRead(obj);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      return null;
    }
  }

  static markConversationAsRead(
    conversationType: 'direct' | 'group',
    conversationId: string,
    userId: string,
    userType: 'human' | 'agent'
  ): number {
    const db = getDatabase();
    
    let messageIdsQuery: string;
    if (conversationType === 'direct') {
      messageIdsQuery = `
        SELECT id FROM messages 
        WHERE (to_type = 'direct' AND to_id = '${conversationId}') 
           OR (to_type = 'direct' AND from_id = '${conversationId}')
      `;
    } else {
      messageIdsQuery = `
        SELECT id FROM messages 
        WHERE to_type = 'group' AND to_id = '${conversationId}'
      `;
    }

    const result = db.exec(messageIdsQuery);
    if (!result.length) return 0;

    const messageIds = result[0].values.map((row: any) => row[0]);
    let count = 0;

    messageIds.forEach((messageId: string) => {
      if (this.markAsRead(messageId, userId, userType)) {
        count++;
      }
    });

    return count;
  }

  static findById(id: string): MessageReadType | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM message_read WHERE id = ?');
    const result = stmt.get([id]);

    if (!result) return null;

    const columns = ['id', 'message_id', 'user_id', 'user_type', 'read_at'];
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = result[i];
    });

    return this.rowToMessageRead(obj);
  }

  static findByMessageId(messageId: string): MessageReadType[] {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM message_read WHERE message_id = '${messageId}'`);
    if (!result.length) return [];

    const columns = result[0].columns;
    const values = result[0].values;

    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToMessageRead(obj);
    });
  }

  static getUnreadCount(
    conversationType: 'direct' | 'group',
    conversationId: string,
    userId: string,
    userType: 'human' | 'agent'
  ): number {
    const db = getDatabase();
    
    let messageCountQuery: string;
    if (conversationType === 'direct') {
      messageCountQuery = `
        SELECT COUNT(*) as total FROM messages 
        WHERE (to_type = 'direct' AND to_id = '${conversationId}') 
           OR (to_type = 'direct' AND from_id = '${conversationId}')
      `;
    } else {
      messageCountQuery = `
        SELECT COUNT(*) as total FROM messages 
        WHERE to_type = 'group' AND to_id = '${conversationId}'
      `;
    }

    const totalResult = db.exec(messageCountQuery);
    if (!totalResult.length) return 0;
    const totalMessages = totalResult[0].values[0][0];

    const readCountQuery = `
      SELECT COUNT(*) as read_count FROM message_read mr
      JOIN messages m ON mr.message_id = m.id
      WHERE mr.user_id = '${userId}' 
        AND mr.user_type = '${userType}'
        AND ((m.to_type = 'direct' AND (m.to_id = '${conversationId}' OR m.from_id = '${conversationId}'))
             OR (m.to_type = 'group' AND m.to_id = '${conversationId}'))
    `;

    const readResult = db.exec(readCountQuery);
    if (!readResult.length) return totalMessages;
    const readCount = readResult[0].values[0][0];

    return Math.max(0, totalMessages - readCount);
  }

  static isReadByUser(messageId: string, userId: string, userType: 'human' | 'agent'): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 1 FROM message_read 
      WHERE message_id = ? AND user_id = ? AND user_type = ?
    `);
    const result = stmt.get([messageId, userId, userType]);
    return !!result;
  }

  private static rowToMessageRead(row: any): MessageReadType {
    return {
      id: row.id,
      messageId: row.message_id,
      userId: row.user_id,
      userType: row.user_type,
      readAt: new Date(row.read_at)
    };
  }
}
