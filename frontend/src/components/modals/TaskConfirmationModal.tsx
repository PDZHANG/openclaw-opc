
import { useState } from 'react';
import { X, CheckCircle, XCircle, Users } from 'lucide-react';
import type { CollaborationTask, Agent } from '../../types';
import { updateCollaborationTask } from '../../services/api';

interface TaskConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CollaborationTask | null;
  agents: Agent[];
  onConfirm: (taskId: string, groupId: string) => void;
  onReject: (taskId: string, groupId: string) => void;
  isLoading: boolean;
}

export default function TaskConfirmationModal({
  isOpen,
  onClose,
  task,
  agents,
  onConfirm,
  onReject,
  isLoading
}: TaskConfirmationModalProps) {
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(task?.priority || 'medium');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(task?.assignees || []);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !task) return null;

  const handlePriorityChange = (newPriority: 'low' | 'medium' | 'high' | 'urgent') => {
    setPriority(newPriority);
  };

  const handleAssigneeToggle = (agentId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleConfirm = async () => {
    setIsUpdating(true);
    try {
      if (priority !== task.priority || JSON.stringify(selectedAssignees) !== JSON.stringify(task.assignees)) {
        await updateCollaborationTask(task.id, {
          priority,
          assignees: selectedAssignees
        });
      }
      onConfirm(task.id, task.groupId!);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getAssigneeNames = () => {
    const assigneeIds = selectedAssignees.length > 0 ? selectedAssignees : task.assignees || [];
    if (assigneeIds.length === 0) return '无';
    return assigneeIds
      .map((assigneeId) => agents.find((agent) => agent.id === assigneeId)?.name || assigneeId)
      .join(', ');
  };

  const priorityLabels = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-700 border-green-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    urgent: 'bg-red-100 text-red-700 border-red-300'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl font-bold text-gray-900">确认协作任务</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">检测到协作任务</p>
                <p className="mt-1">系统检测到您希望创建一个协作任务，请确认是否开始执行。</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务标题</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {task.title}
              </div>
            </div>

            {task.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 max-h-32 overflow-y-auto">
                  {task.description}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
              <div className="flex gap-2">
                {Object.keys(priorityLabels).map((p) => {
                  const priorityKey = p as keyof typeof priorityLabels;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePriorityChange(priorityKey)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        priority === priorityKey
                          ? priorityColors[priorityKey]
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {priorityLabels[priorityKey]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分配给</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {agents.map((agent) => {
                  const isSelected = selectedAssignees.includes(agent.id) || 
                    (selectedAssignees.length === 0 && task.assignees?.includes(agent.id));
                  return (
                    <label
                      key={agent.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleAssigneeToggle(agent.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.role || 'AI 员工'}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                当前选择：{getAssigneeNames()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => task.groupId && onReject(task.id, task.groupId)}
            disabled={isLoading || isUpdating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <XCircle size={18} />
            拒绝
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || isUpdating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle size={18} />
            {isLoading || isUpdating ? '确认中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}
