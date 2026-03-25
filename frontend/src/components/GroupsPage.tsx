import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Users, Trash2, X, Edit, Crown } from 'lucide-react';
import { fetchGroups, createGroup, deleteGroup, addGroupMember, fetchAgents, updateGroup, fetchAllUsers } from '../services/api';
import type { Group, Agent, Human } from '../types';

interface GroupsPageProps {
  onGroupSelect?: (group: Group) => void;
}

export default function GroupsPage({ onGroupSelect }: GroupsPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: groups } = useQuery('groups', fetchGroups);
  const { data: agents } = useQuery('agents', fetchAgents);
  const { data: humans } = useQuery('humans', fetchAllUsers);

  const createMutation = useMutation(createGroup, {
    onSuccess: () => {
      queryClient.invalidateQueries('groups');
      setShowCreateModal(false);
    }
  });

  const deleteMutation = useMutation(deleteGroup, {
    onSuccess: () => {
      queryClient.invalidateQueries('groups');
      setSelectedGroup(null);
    }
  });

  const addMemberMutation = useMutation(
    ({ groupId, userId, userType }: { groupId: string; userId: string; userType: 'human' | 'agent' }) => 
      addGroupMember(groupId, userId, userType, 'member'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        setShowAddMemberModal(false);
      }
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => updateGroup(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        setShowEditModal(false);
      }
    }
  );

  const handleCreateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const memberIds = formData.getAll('agentMembers') as string[];
    const humanMemberIds = formData.getAll('humanMembers') as string[];
    const leaderId = formData.get('leaderId') as string || undefined;
    
    createMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      isPublic: true,
      memberIds: [...memberIds, ...humanMemberIds],
      leaderId
    });
  };

  const handleEditGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGroup) return;
    
    const formData = new FormData(e.currentTarget);
    const leaderId = formData.get('leaderId') as string || undefined;
    
    updateMutation.mutate({
      id: selectedGroup.id,
      data: {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        leaderId
      }
    });
  };

  const handleAddMember = (userId: string, userType: 'human' | 'agent') => {
    if (selectedGroup) {
      addMemberMutation.mutate({ groupId: selectedGroup.id, userId, userType });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">群组管理</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          创建群组
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups?.map((group: Group) => (
          <div
            key={group.id}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedGroup(group);
              onGroupSelect?.(group);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                    {group.leaderId && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Crown size={12} />
                        {(() => {
                          const leader = agents?.find((a: any) => a.id === group.leaderId);
                          return leader?.name || '负责人';
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{group.members?.length || 0} 成员</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(group);
                    setShowAddMemberModal(true);
                  }}
                  className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-500"
                >
                  <Users size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(group);
                    setShowEditModal(true);
                  }}
                  className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(group.id);
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {group.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
            )}
            {group.members && group.members.length > 0 && (
              <div className="mt-3 flex -space-x-2">
                {group.members.slice(0, 5).map((member) => {
                  let avatarChar = '?';
                  let avatarTitle = member.userId;
                  let avatarImg = null;
                  let avatarColor = 'from-purple-400 to-blue-500';
                  
                  if (member.userType === 'agent') {
                    const agent = agents?.find((a: Agent) => a.id === member.userId);
                    if (agent) {
                      avatarChar = agent.name.charAt(0);
                      avatarTitle = agent.name;
                    }
                  } else if (member.userType === 'human') {
                    const human = humans?.find((h: Human) => h.id === member.userId);
                    if (human) {
                      avatarChar = human.name.charAt(0);
                      avatarTitle = human.name;
                      avatarImg = human.avatar;
                      avatarColor = 'from-green-400 to-blue-500';
                    }
                  }
                  
                  return (
                    avatarImg ? (
                      <img
                        key={`${member.groupId}-${member.userId}`}
                        src={avatarImg}
                        alt={avatarTitle}
                        className="w-8 h-8 rounded-full object-cover border-2 border-white"
                        title={avatarTitle}
                      />
                    ) : (
                      <div
                        key={`${member.groupId}-${member.userId}`}
                        className={`w-8 h-8 bg-gradient-to-br ${avatarColor} rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white`}
                        title={avatarTitle}
                      >
                        {avatarChar}
                      </div>
                    )
                  );
                })}
                {group.members.length > 5 && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {groups?.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">还没有群组，点击上方按钮创建</p>
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          agents={agents || []}
          humans={humans}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
          isLoading={createMutation.isLoading}
        />
      )}

      {showAddMemberModal && selectedGroup && (
        <AddMemberModal
          group={selectedGroup}
          agents={agents || []}
          humans={humans}
          onClose={() => setShowAddMemberModal(false)}
          onAdd={handleAddMember}
          isLoading={addMemberMutation.isLoading}
        />
      )}

      {showEditModal && selectedGroup && (
        <EditGroupModal
          group={selectedGroup}
          agents={agents || []}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditGroup}
          isLoading={updateMutation.isLoading}
        />
      )}
    </div>
  );
}

function CreateGroupModal({
  agents,
  humans,
  onClose,
  onSubmit,
  isLoading
}: {
  agents: Agent[];
  humans?: Human[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}) {
  const [selectedAgentMembers, setSelectedAgentMembers] = useState<string[]>([]);
  const [selectedHumanMembers, setSelectedHumanMembers] = useState<string[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'agents' | 'humans'>('agents');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">创建群组</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
            <input
              name="name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：产品团队"
            />
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
            <select
              name="leaderId"
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- 请选择负责人 --</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">负责人会在没有 @ 任何人时优先回复</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">添加成员</label>
            
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

            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {activeTab === 'agents' ? (
                agents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="agentMembers"
                      value={agent.id}
                      checked={selectedAgentMembers.includes(agent.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAgentMembers([...selectedAgentMembers, agent.id]);
                        } else {
                          setSelectedAgentMembers(selectedAgentMembers.filter(id => id !== agent.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {agent.name.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-700">{agent.name}</span>
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
                      name="humanMembers"
                      value={human.id}
                      checked={selectedHumanMembers.includes(human.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHumanMembers([...selectedHumanMembers, human.id]);
                        } else {
                          setSelectedHumanMembers(selectedHumanMembers.filter(id => id !== human.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {human.avatar ? (
                      <img
                        src={human.avatar}
                        alt={human.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {human.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{human.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{human.email}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      human.role === 'admin' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {human.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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

function EditGroupModal({
  group,
  agents,
  onClose,
  onSubmit,
  isLoading
}: {
  group: Group;
  agents: Agent[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}) {
  const [selectedLeader, setSelectedLeader] = useState<string>(group.leaderId || '');
  const [activeTab, setActiveTab] = useState<'members' | 'add'>('members');
  const [showAddMember, setShowAddMember] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">编辑群组</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
            <input
              name="name"
              defaultValue={group.name}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：产品团队"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              defaultValue={group.description || ''}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="群组描述..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">群组负责人</label>
            <select
              name="leaderId"
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- 无负责人 --</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">负责人会在没有 @ 任何人时优先回复</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({
  group,
  agents,
  humans,
  onClose,
  onAdd,
  isLoading
}: {
  group: Group;
  agents: Agent[];
  humans?: Human[];
  onClose: () => void;
  onAdd: (userId: string, userType: 'human' | 'agent') => void;
  isLoading: boolean;
}) {
  const existingMemberIds = group.members?.map(m => `${m.userType}-${m.userId}`) || [];
  const availableAgents = agents.filter(a => !existingMemberIds.includes(`agent-${a.id}`));
  const availableHumans = humans?.filter(h => !existingMemberIds.includes(`human-${h.id}`)) || [];
  const [activeTab, setActiveTab] = useState<'agents' | 'humans'>('agents');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">添加成员到 {group.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

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

        <div className="max-h-60 overflow-y-auto">
          {activeTab === 'agents' ? (
            availableAgents.length === 0 ? (
              <p className="text-center text-gray-500 py-4">没有可添加的 AI 员工</p>
            ) : (
              availableAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      {agent.name.charAt(0)}
                    </div>
                    <span className="text-gray-700">{agent.name}</span>
                  </div>
                  <button
                    onClick={() => onAdd(agent.id, 'agent')}
                    disabled={isLoading}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              ))
            )
          ) : (
            availableHumans.length === 0 ? (
              <p className="text-center text-gray-500 py-4">没有可添加的真人用户</p>
            ) : (
              availableHumans.map((human) => (
                <div
                  key={human.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {human.avatar ? (
                      <img
                        src={human.avatar}
                        alt={human.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                        {human.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="text-gray-700">{human.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{human.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onAdd(human.id, 'human')}
                    disabled={isLoading}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
