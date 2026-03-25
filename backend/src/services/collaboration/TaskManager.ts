import { CollaborationTaskModel } from '../../models/CollaborationTask';
import { openclawService } from '../../services/openclawService';
import type { ParsedMessage, CollaborationContext } from './types';
import type { CollaborationTask } from '../../types';

export class TaskManager {
  static async maybeCreateTask(
    parsed: ParsedMessage,
    context: CollaborationContext,
    autoConfirm?: boolean,
    autoAssignee?: string
  ): Promise<CollaborationTask | null> {
    if (!parsed.hasTaskIntent || !parsed.taskTitle) {
      return null;
    }

    try {
      let assignees = parsed.mentions;
      
      if (autoAssignee && (!assignees || assignees.length === 0)) {
        assignees = [autoAssignee];
      }

      const taskData: any = {
        title: parsed.taskTitle,
        description: context.messageData.content,
        priority: 'medium',
        status: autoConfirm ? 'pending' : 'pending_confirmation',
        type: 'collaborative',
        createdBy: context.messageData.fromId,
        groupId: context.groupId,
        assignees: assignees,
        progress: 0,
        proposedAt: new Date(),
        confirmedAt: autoConfirm ? new Date() : undefined
      };

      let task: CollaborationTask | null = null;

      if (autoConfirm) {
        const tempTask = CollaborationTaskModel.create(taskData);
        const centralWorkspacePath = await openclawService.createCentralTaskWorkspace(
          tempTask.id,
          tempTask.title
        );
        const updatedTask = CollaborationTaskModel.update(tempTask.id, {
          workspacePath: centralWorkspacePath
        });
        task = updatedTask;
      } else {
        task = CollaborationTaskModel.create(taskData);
      }

      if (!task) {
        return null;
      }

      if (context.io && task) {
        if (autoConfirm) {
          context.io.to(`group:${context.groupId}`).emit('task:new', task);
          context.io.to(`group:${context.groupId}`).emit('task:confirmed', task);
        } else {
          context.io.to(`group:${context.groupId}`).emit('task:proposal', task);
        }
      }

      console.log(`Collaboration task ${autoConfirm ? 'created and confirmed' : 'proposal created'}:`, task.id);
      return task;
    } catch (error) {
      console.error('Failed to create collaboration task:', error);
      return null;
    }
  }

  static async confirmTask(
    taskId: string,
    context: CollaborationContext
  ): Promise<CollaborationTask | null> {
    console.log('=== TaskManager.confirmTask ===');
    console.log('Task ID:', taskId);

    const task = CollaborationTaskModel.findById(taskId);
    if (!task || task.status !== 'pending_confirmation') {
      console.log('Task not found or not in pending_confirmation state');
      return null;
    }

    try {
      const centralWorkspacePath = await openclawService.createCentralTaskWorkspace(
        taskId,
        task.title
      );

      const updatedTask = CollaborationTaskModel.update(taskId, {
        status: 'pending',
        workspacePath: centralWorkspacePath,
        confirmedAt: new Date()
      });

      if (context.io && updatedTask) {
        context.io.to(`group:${context.groupId}`).emit('task:new', updatedTask);
        context.io.to(`group:${context.groupId}`).emit('task:confirmed', updatedTask);
      }

      console.log('Collaboration task confirmed:', updatedTask?.id);
      return updatedTask;
    } catch (error) {
      console.error('Failed to confirm collaboration task:', error);
      return null;
    }
  }

  static rejectTask(
    taskId: string,
    context: CollaborationContext
  ): CollaborationTask | null {
    console.log('=== TaskManager.rejectTask ===');
    console.log('Task ID:', taskId);

    const task = CollaborationTaskModel.findById(taskId);
    if (!task || task.status !== 'pending_confirmation') {
      console.log('Task not found or not in pending_confirmation state');
      return null;
    }

    const updatedTask = CollaborationTaskModel.update(taskId, {
      status: 'rejected',
      rejectedAt: new Date()
    });

    if (context.io && updatedTask) {
      context.io.to(`group:${context.groupId}`).emit('task:rejected', updatedTask);
    }

    console.log('Collaboration task rejected:', updatedTask?.id);
    return updatedTask;
  }

  static checkTaskCompletion(task: CollaborationTask): boolean {
    console.log('=== TaskManager.checkTaskCompletion ===');
    console.log('Task ID:', task.id);
    console.log('Task progress:', task.progress);
    console.log('Task status:', task.status);

    if (task.status === 'completed') {
      console.log('Task already completed');
      return false;
    }

    const isComplete = task.progress >= 100;
    console.log('Task completion check result:', isComplete);
    return isComplete;
  }

  static markTaskAsCompleted(taskId: string, summary: string): CollaborationTask | null {
    console.log('=== TaskManager.markTaskAsCompleted ===');
    console.log('Task ID:', taskId);

    const updatedTask = CollaborationTaskModel.update(taskId, {
      status: 'completed',
      progress: 100,
      deliverableSummary: summary,
      deliverableGeneratedAt: new Date()
    });

    console.log('Task marked as completed:', updatedTask?.id);
    return updatedTask;
  }
}
