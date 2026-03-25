import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { AgentStatus } from '../types';

export class AgentStatusModel {
  static create(agentId: string): AgentStatus {
    const db = getDatabase();
    const now = new Date();
    
    const stmt = db.prepare(`
      INSERT INTO agent_status (
        agent_id, connection_status, availability_status, 
        uptime, messages_sent, messages_received, tasks_completed, 
        average_response_time, health_status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      agentId,
      'offline',
      'idle',
      0,
      0,
      0,
      0,
      0,
      'healthy',
      now.toISOString()
    ]);
    
    saveDatabase();
    return this.findByAgentId(agentId) as AgentStatus;
  }

  static findByAgentId(agentId: string): AgentStatus | null {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM agent_status WHERE agent_id = '${agentId}'`);
    
    if (!result || !result.length) {
      return null;
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = values[i];
    });
    
    return this.rowToStatus(obj);
  }

  static findAll(): AgentStatus[] {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM agent_status');
    if (!result || !result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToStatus(obj);
    });
  }

  static update(agentId: string, data: Partial<Omit<AgentStatus, 'id' | 'agentId' | 'updatedAt'>>): AgentStatus | null {
    const db = getDatabase();
    const now = new Date();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.connectionStatus !== undefined) {
      fields.push('connection_status = ?');
      values.push(data.connectionStatus);
    }
    if (data.availabilityStatus !== undefined) {
      fields.push('availability_status = ?');
      values.push(data.availabilityStatus);
    }
    if (data.currentTask !== undefined) {
      fields.push('current_task = ?');
      values.push(data.currentTask ? JSON.stringify(data.currentTask) : null);
    }
    if (data.taskQueue !== undefined) {
      fields.push('task_queue = ?');
      values.push(data.taskQueue ? JSON.stringify(data.taskQueue) : null);
    }
    if (data.lastActiveAt !== undefined) {
      fields.push('last_active_at = ?');
      values.push(data.lastActiveAt?.toISOString() || null);
    }
    if (data.lastMessageAt !== undefined) {
      fields.push('last_message_at = ?');
      values.push(data.lastMessageAt?.toISOString() || null);
    }
    if (data.lastTaskCompletedAt !== undefined) {
      fields.push('last_task_completed_at = ?');
      values.push(data.lastTaskCompletedAt?.toISOString() || null);
    }
    if (data.uptime !== undefined) {
      fields.push('uptime = ?');
      values.push(data.uptime);
    }
    if (data.messagesSent !== undefined) {
      fields.push('messages_sent = ?');
      values.push(data.messagesSent);
    }
    if (data.messagesReceived !== undefined) {
      fields.push('messages_received = ?');
      values.push(data.messagesReceived);
    }
    if (data.tasksCompleted !== undefined) {
      fields.push('tasks_completed = ?');
      values.push(data.tasksCompleted);
    }
    if (data.averageResponseTime !== undefined) {
      fields.push('average_response_time = ?');
      values.push(data.averageResponseTime);
    }
    if (data.collaborationStats !== undefined) {
      fields.push('collaboration_stats = ?');
      values.push(data.collaborationStats ? JSON.stringify(data.collaborationStats) : null);
    }
    if (data.resourceUsage !== undefined) {
      fields.push('resource_usage = ?');
      values.push(data.resourceUsage ? JSON.stringify(data.resourceUsage) : null);
    }
    if (data.healthStatus !== undefined) {
      fields.push('health_status = ?');
      values.push(data.healthStatus);
    }
    if (data.healthChecks !== undefined) {
      fields.push('health_checks = ?');
      values.push(data.healthChecks ? JSON.stringify(data.healthChecks) : null);
    }
    if (data.tags !== undefined) {
      fields.push('tags = ?');
      values.push(data.tags ? JSON.stringify(data.tags) : null);
    }
    
    if (fields.length === 0) return this.findByAgentId(agentId);
    
    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(agentId);
    
    const stmt = db.prepare(`UPDATE agent_status SET ${fields.join(', ')} WHERE agent_id = ?`);
    stmt.run(values);
    
    saveDatabase();
    return this.findByAgentId(agentId);
  }

  static upsert(agentId: string, data: Partial<Omit<AgentStatus, 'id' | 'agentId' | 'updatedAt'>>): AgentStatus {
    const existing = this.findByAgentId(agentId);
    if (existing) {
      return this.update(agentId, data) as AgentStatus;
    }
    const status = this.create(agentId);
    return this.update(agentId, data) || status;
  }

  static incrementMessagesSent(agentId: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE agent_status SET messages_sent = messages_sent + 1, last_message_at = ?, updated_at = ? WHERE agent_id = ?');
    stmt.run([now, now, agentId]);
    saveDatabase();
  }

  static incrementMessagesReceived(agentId: string): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE agent_status SET messages_received = messages_received + 1, updated_at = ? WHERE agent_id = ?');
    stmt.run([new Date().toISOString(), agentId]);
    saveDatabase();
  }

  static incrementTasksCompleted(agentId: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE agent_status SET tasks_completed = tasks_completed + 1, last_task_completed_at = ?, updated_at = ? WHERE agent_id = ?');
    stmt.run([now, now, agentId]);
    saveDatabase();
  }

  static delete(agentId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM agent_status WHERE agent_id = ?');
    const result = stmt.run([agentId]);
    saveDatabase();
    return (result as any).changes > 0;
  }

  private static rowToStatus(row: any): AgentStatus {
    return {
      id: row.id,
      agentId: row.agent_id,
      connectionStatus: row.connection_status,
      availabilityStatus: row.availability_status,
      currentTask: row.current_task ? JSON.parse(row.current_task) : undefined,
      taskQueue: row.task_queue ? JSON.parse(row.task_queue) : undefined,
      lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : undefined,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
      lastTaskCompletedAt: row.last_task_completed_at ? new Date(row.last_task_completed_at) : undefined,
      uptime: row.uptime,
      messagesSent: row.messages_sent,
      messagesReceived: row.messages_received,
      tasksCompleted: row.tasks_completed,
      averageResponseTime: row.average_response_time,
      collaborationStats: row.collaboration_stats ? JSON.parse(row.collaboration_stats) : undefined,
      resourceUsage: row.resource_usage ? JSON.parse(row.resource_usage) : undefined,
      healthStatus: row.health_status,
      healthChecks: row.health_checks ? JSON.parse(row.health_checks) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      updatedAt: new Date(row.updated_at)
    };
  }
}
