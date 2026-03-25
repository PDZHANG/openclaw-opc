import { getDatabase, saveDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { CollaborationTask } from '../types';

export class CollaborationTaskModel {
  static create(data: Omit<CollaborationTask, 'id' | 'createdAt' | 'updatedAt'>): CollaborationTask {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    const stmt = db.prepare(`
      INSERT INTO collaboration_tasks (
        id, title, description, priority, status, type, created_by,
        group_id, parent_message_id, assignees, dependencies, progress, workspace_path, created_at, updated_at, due_at,
        deliverable_summary, deliverable_generated_at, proposed_at, confirmed_at, rejected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      data.title,
      data.description || null,
      data.priority || 'medium',
      data.status || 'pending',
      data.type || 'collaborative',
      data.createdBy,
      data.groupId || null,
      data.parentMessageId || null,
      data.assignees ? JSON.stringify(data.assignees) : null,
      data.dependencies ? JSON.stringify(data.dependencies) : null,
      data.progress || 0,
      data.workspacePath || null,
      now.toISOString(),
      now.toISOString(),
      data.dueAt?.toISOString() || null,
      data.deliverableSummary || null,
      data.deliverableGeneratedAt?.toISOString() || null,
      data.proposedAt?.toISOString() || null,
      data.confirmedAt?.toISOString() || null,
      data.rejectedAt?.toISOString() || null
    ]);
    
    saveDatabase();
    return this.findById(id) as CollaborationTask;
  }

  static findById(id: string): CollaborationTask | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM collaboration_tasks WHERE id = ?');
    const result = stmt.get([id]);
    
    if (!result) {
      return null;
    }
    
    const columns = [
      'id', 'title', 'description', 'priority', 'status', 'type', 'created_by',
      'group_id', 'parent_message_id', 'assignees', 'dependencies', 'progress', 
      'workspace_path', 'created_at', 'updated_at', 'due_at',
      'deliverable_summary', 'deliverable_generated_at', 'proposed_at', 'confirmed_at', 'rejected_at'
    ];
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = result[i];
    });
    
    return this.rowToTask(obj);
  }

  static findAll(): CollaborationTask[] {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM collaboration_tasks ORDER BY created_at DESC');
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToTask(obj);
    });
  }

  static findByStatus(status: 'pending' | 'in_progress' | 'completed' | 'failed'): CollaborationTask[] {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM collaboration_tasks WHERE status = '${status}' ORDER BY created_at DESC`);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToTask(obj);
    });
  }

  static findByGroup(groupId: string): CollaborationTask[] {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM collaboration_tasks WHERE group_id = '${groupId}' ORDER BY created_at DESC`);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToTask(obj);
    });
  }

  static findByAssignee(assigneeId: string): CollaborationTask[] {
    const allTasks = this.findAll();
    return allTasks.filter(task => {
      if (!task.assignees) return false;
      return task.assignees.includes(assigneeId);
    });
  }

  static findByCreator(createdBy: string): CollaborationTask[] {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM collaboration_tasks WHERE created_by = '${createdBy}' ORDER BY created_at DESC`);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return this.rowToTask(obj);
    });
  }

  static update(id: string, data: Partial<Omit<CollaborationTask, 'id' | 'createdAt'>>): CollaborationTask | null {
    const db = getDatabase();
    const now = new Date();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.groupId !== undefined) {
      fields.push('group_id = ?');
      values.push(data.groupId);
    }
    if (data.parentMessageId !== undefined) {
      fields.push('parent_message_id = ?');
      values.push(data.parentMessageId);
    }
    if (data.assignees !== undefined) {
      fields.push('assignees = ?');
      values.push(data.assignees ? JSON.stringify(data.assignees) : null);
    }
    if (data.dependencies !== undefined) {
      fields.push('dependencies = ?');
      values.push(data.dependencies ? JSON.stringify(data.dependencies) : null);
    }
    if (data.progress !== undefined) {
      fields.push('progress = ?');
      values.push(data.progress);
    }
    if (data.dueAt !== undefined) {
      fields.push('due_at = ?');
      values.push(data.dueAt?.toISOString() || null);
    }
    if (data.workspacePath !== undefined) {
      fields.push('workspace_path = ?');
      values.push(data.workspacePath);
    }
    if (data.deliverableSummary !== undefined) {
      fields.push('deliverable_summary = ?');
      values.push(data.deliverableSummary);
    }
    if (data.deliverableGeneratedAt !== undefined) {
      fields.push('deliverable_generated_at = ?');
      values.push(data.deliverableGeneratedAt?.toISOString() || null);
    }
    if (data.proposedAt !== undefined) {
      fields.push('proposed_at = ?');
      values.push(data.proposedAt?.toISOString() || null);
    }
    if (data.confirmedAt !== undefined) {
      fields.push('confirmed_at = ?');
      values.push(data.confirmedAt?.toISOString() || null);
    }
    if (data.rejectedAt !== undefined) {
      fields.push('rejected_at = ?');
      values.push(data.rejectedAt?.toISOString() || null);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);
    
    const stmt = db.prepare(`UPDATE collaboration_tasks SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(values);
    
    saveDatabase();
    return this.findById(id);
  }

  static updateProgress(id: string, progress: number): CollaborationTask | null {
    return this.update(id, { progress: Math.min(100, Math.max(0, progress)) });
  }

  static updateStatus(id: string, status: 'pending_confirmation' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'): CollaborationTask | null {
    return this.update(id, { status });
  }

  static addAssignee(id: string, assigneeId: string): CollaborationTask | null {
    const task = this.findById(id);
    if (!task) return null;
    
    const assignees = task.assignees || [];
    if (!assignees.includes(assigneeId)) {
      assignees.push(assigneeId);
    }
    
    return this.update(id, { assignees });
  }

  static removeAssignee(id: string, assigneeId: string): CollaborationTask | null {
    const task = this.findById(id);
    if (!task) return null;
    
    const assignees = (task.assignees || []).filter(a => a !== assigneeId);
    return this.update(id, { assignees });
  }

  static delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM collaboration_tasks WHERE id = ?');
    const result = stmt.run([id]);
    saveDatabase();
    return (result as any).changes > 0;
  }

  static deleteAll(): number {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM collaboration_tasks');
    const result = stmt.run();
    saveDatabase();
    return (result as any).changes || 0;
  }

  static deleteByGroup(groupId: string): number {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM collaboration_tasks WHERE group_id = ?');
    const result = stmt.run([groupId]);
    saveDatabase();
    return (result as any).changes || 0;
  }

  private static rowToTask(row: any): CollaborationTask {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      priority: row.priority,
      status: row.status,
      type: row.type,
      createdBy: row.created_by,
      groupId: row.group_id || undefined,
      parentMessageId: row.parent_message_id || undefined,
      assignees: row.assignees ? JSON.parse(row.assignees) : undefined,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined,
      progress: row.progress,
      workspacePath: row.workspace_path || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dueAt: row.due_at ? new Date(row.due_at) : undefined,
      deliverableSummary: row.deliverable_summary || undefined,
      deliverableGeneratedAt: row.deliverable_generated_at ? new Date(row.deliverable_generated_at) : undefined,
      proposedAt: row.proposed_at ? new Date(row.proposed_at) : undefined,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
      rejectedAt: row.rejected_at ? new Date(row.rejected_at) : undefined
    };
  }
}
