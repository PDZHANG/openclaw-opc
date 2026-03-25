import { useState } from 'react';
import { X } from 'lucide-react';
import type { Agent, Human } from '../../types';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  humans?: Human[];
  selectedMembers: string[];
  setSelectedMembers: (members: string[]) => void;
  onAddMembers: (agentIds: string[]) => void;
  isLoading: boolean;
}

export default function AddMembersModal({
  isOpen,
  onClose,
  agents,
  humans,
  selectedMembers,
  setSelectedMembers,
  onAddMembers,
  isLoading
}: AddMembersModalProps) {
  const [activeTab, setActiveTab] = useState<'agents' | 'humans'>('agents');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">添加成员</h2>
          <button
            onClick={() => {
              onClose();
              setSelectedMembers([]);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex border-b border-gray-200 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'agents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              AI 员工
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('humans')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'humans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              真人用户
            </button>
          </div>

          <div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {activeTab === 'agents' ? (
                agents?.map((agent) => (
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
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.role || 'AI助手'}</p>
                    </div>
                  </label>
                ))
              ) : (
                humans?.map((human) => (
                  <label
                    key={human.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(human.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers([...selectedMembers, human.id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter((id) => id !== human.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {human.avatar ? (
                      <img
                        src={human.avatar}
                        alt={human.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {human.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{human.name}</p>
                      <p className="text-xs text-gray-500">{human.email || '用户'}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setSelectedMembers([]);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onAddMembers(selectedMembers);
                setSelectedMembers([]);
              }}
              disabled={isLoading || selectedMembers.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '添加中...' : `添加 ${selectedMembers.length} 人`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
