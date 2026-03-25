
import { useState } from 'react';
import { X, ClipboardList, Trash2 } from 'lucide-react';
import type { CollaborationTask, Agent, Group } from '../types';
import { deleteAllCollaborationTasks, deleteCollaborationTasksByGroup } from '../services/api';
import TaskCard from './TaskCard';

interface TaskListSidebarProps {
  tasks: CollaborationTask[];
  agents: Agent[];
  onClose: () => void;
  onTaskClick: (task: CollaborationTask) => void;
  onTasksChange?: (tasks: CollaborationTask[]) => void;
  selectedGroup?: Group | null;
}

export default function TaskListSidebar({ tasks, agents, onClose, onTaskClick, onTasksChange, selectedGroup }: TaskListSidebarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearAll = async () => {
    setIsDeleting(true);
    try {
      if (selectedGroup) {
        await deleteCollaborationTasksByGroup(selectedGroup.id);
        if (onTasksChange) {
          onTasksChange([]);
        }
      } else {
        await deleteAllCollaborationTasks();
        if (onTasksChange) {
          onTasksChange([]);
        }
      }
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to clear tasks:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ClipboardList size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">协作任务</h2>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="清空所有任务"
              >
                <Trash2 size={18} className="text-red-500" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              暂无协作任务
            </div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="min-w-0">
                <TaskCard
                  task={task}
                  agents={agents}
                  onClick={() => onTaskClick(task)}
                />
              </div>
            ))
          )}
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">确认清空任务</h3>
              <p className="text-gray-600 mb-6">
                确定要清空所有协作任务吗？此操作不可撤销。
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '清空中...' : '清空所有'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
