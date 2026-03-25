import { X, UserPlus, Info } from 'lucide-react';
import { useState } from 'react';
import type { Agent } from '../../types';
import GroupAvatar from '../GroupAvatar';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  selectedMembers: string[];
  setSelectedMembers: (members: string[]) => void;
  selectedLeader: string;
  setSelectedLeader: (leader: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  onCreateCoordinator?: () => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  agents,
  selectedMembers,
  setSelectedMembers,
  selectedLeader,
  setSelectedLeader,
  onSubmit,
  isLoading,
  onCreateCoordinator
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl font-bold text-gray-900">创建群组</h2>
          <button
            onClick={() => {
              onClose();
              setSelectedMembers([]);
              setGroupName('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-6 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <GroupAvatar name={groupName || '?'} size={64} />
              <span className="text-xs text-gray-500">根据名称自动生成</span>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
              <input
                name="name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例如：产品团队"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="群组描述..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">群组负责人（可选）</label>
            
            <div className="flex gap-2 mb-3">
              {onCreateCoordinator && (
                <button
                  type="button"
                  onClick={onCreateCoordinator}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <UserPlus size={16} />
                  创建团队协调员
                </button>
              )}
            </div>

            <select
              name="leaderId"
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- 请选择负责人 --</option>
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
                  <p className="mt-2">
                    💡 建议使用"团队协调员"模板创建专门的负责人！
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">添加成员</label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {agents?.map((agent) => (
                <label
                  key={agent.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(agent.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, agent.id]);
                      } else {
                        setSelectedMembers(selectedMembers.filter((id) => id !== agent.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                    {agent.name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-700">{agent.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setSelectedMembers([]);
                setGroupName('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
