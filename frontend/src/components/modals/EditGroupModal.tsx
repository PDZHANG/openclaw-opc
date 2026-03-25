import { X, Info } from 'lucide-react';
import type { Agent, Group } from '../../types';
import GroupAvatar from '../GroupAvatar';
import { deleteGroup } from '../../services/api';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  agents: Agent[];
  editGroupLeader: string;
  setEditGroupLeader: (leader: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export default function EditGroupModal({
  isOpen,
  onClose,
  group,
  agents,
  editGroupLeader,
  setEditGroupLeader,
  onSubmit,
  isLoading
}: EditGroupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl font-bold text-gray-900">编辑群组</h2>
          <button
            onClick={() => onClose()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-6 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <GroupAvatar name={group.name} size={64} />
              <span className="text-xs text-gray-500">根据名称自动生成</span>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
              <input
                name="name"
                defaultValue={group.name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              defaultValue={group.description || ''}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">群组负责人</label>
            <select
              name="leaderId"
              value={editGroupLeader}
              onChange={(e) => setEditGroupLeader(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- 无负责人 --</option>
              {agents?.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>

            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">负责人职责</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>记录和跟进群内事项</li>
                    <li>跟踪任务进度，督促其他AI</li>
                    <li>可以访问所有群聊历史</li>
                    <li>协调整个团队的工作</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onClose()}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('确定要解散群组吗？此操作不可撤销。')) {
                  // 调用解散群组的 API
                  deleteGroup(group.id)
                  .then(data => {
                    if (data.success) {
                      onClose();
                      // 刷新群组列表
                      window.location.reload();
                    }
                  })
                  .catch(error => {
                    console.error('Error deleting group:', error);
                    alert('解散群组失败，请重试');
                  });
                }
              }}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              解散群组
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
