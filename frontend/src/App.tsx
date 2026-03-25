
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Users, Bot, Plus, Search, X, Settings, UserPlus, UserMinus, Edit, ChevronRight, Trash2, BookOpen, MoreHorizontal, Activity, Pin, LogOut, User, Database, MessageCircle, Crown, RefreshCw, Eye, EyeOff, ClipboardList } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { fetchAgents, fetchGroups, deleteConversation, createGroup, createAgent, updateAgent, updateGroup, addGroupMember, removeGroupMember, fetchHumanUsers, triggerGroupSupervision, getGroupSupervisionState, toggleGroupSupervision, deleteGroup, fetchCollaborationTasks, updateCollaborationTask } from './services/api';
import type { Agent, Group, Human, Message, CollaborationTask } from './types';
import ChatWindow from './components/ChatWindow';
import StatusDashboard from './components/StatusDashboard';
import AgentsPage from './pages/AgentsPage';
import DocsPage from './pages/DocsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';
import KnowledgeBasesPage from './pages/KnowledgeBasesPage';
import NavIcon from './components/NavIcon';
import ConversationItem from './components/ConversationItem';
import GroupAvatar from './components/GroupAvatar';
import CreateGroupModal from './components/modals/CreateGroupModal';
import CreateAgentModal from './components/modals/CreateAgentModal';
import EditGroupModal from './components/modals/EditGroupModal';
import AddMembersModal from './components/modals/AddMembersModal';
import ClearChatConfirmModal from './components/modals/ClearChatConfirmModal';
import SelectHumanModal from './components/modals/SelectHumanModal';
import TaskListSidebar from './components/TaskListSidebar';
import TaskDetailSidebar from './components/TaskDetailSidebar';
import { useAuthStore } from './store/authStore';
import { useNotification } from './hooks/useNotification';

type View = 'chats' | 'status' | 'agents' | 'docs' | 'profile' | 'users' | 'knowledge-bases';
type ConversationType = 'agent' | 'group' | 'human';

interface Conversation {
  id: string;
  name: string;
  type: ConversationType;
  data?: Agent | Group | Human;
  avatar?: string;
  email?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    fromType: 'human' | 'agent' | 'system';
    fromName?: string;
  };
  unreadCount?: number;
}

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [createSoul, setCreateSoul] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupLeader, setEditGroupLeader] = useState<string>('');
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSelectHumanModal, setShowSelectHumanModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<CollaborationTask[]>([]);
  const [showTaskList, setShowTaskList] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CollaborationTask | null>(null);

  const { isAuthenticated, user, fetchCurrentUser, logout } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, user, fetchCurrentUser]);

  const currentView = (searchParams.get('view') as View) || 'chats';
  const convType = searchParams.get('convType') as ConversationType | null;
  const convId = searchParams.get('convId');

  const isAdmin = user?.role === 'admin';

  const queryClient = useQueryClient();
  const { data: agents } = useQuery('agents', fetchAgents, { enabled: isAuthenticated });
  const { data: groups } = useQuery('groups', fetchGroups, { enabled: isAuthenticated });
  const { data: humans } = useQuery('humanUsers', fetchHumanUsers, { enabled: isAuthenticated });

  const createMutation = useMutation(createGroup, {
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries('groups');
      setShowCreateModal(false);
      setSelectedMembers([]);
      // 自动选中新创建的群组
      setSelectedConversation({
        id: newGroup.id,
        name: newGroup.name,
        type: 'group',
        data: newGroup
      });
      // 刷新聊天窗口
      setChatRefreshKey((prev) => prev + 1);
    },
  });

  const createAgentMutation = useMutation(createAgent, {
    onSuccess: () => {
      queryClient.invalidateQueries('agents');
      setShowCreateAgentModal(false);
      setCreateSoul('');
    },
  });

  const updateAgentMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => updateAgent(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents');
      },
    }
  );

  const updateGroupMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => updateGroup(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        setShowEditGroupModal(false);
      },
    }
  );

  const addMemberMutation = useMutation(
    ({ groupId, userId, userType, role }: { groupId: string; userId: string; userType: 'human' | 'agent'; role: 'admin' | 'member' }) =>
      addGroupMember(groupId, userId, userType, role),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        setShowAddMembersModal(false);
      },
    }
  );

  const removeMemberMutation = useMutation(
    ({ groupId, userId, userType }: { groupId: string; userId: string; userType: 'human' | 'agent' }) =>
      removeGroupMember(groupId, userId, userType),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
      },
    }
  );

  const triggerSupervisionMutation = useMutation(
    (groupId: string) => triggerGroupSupervision(groupId),
    {
      onSuccess: () => {
        console.log('Supervision triggered successfully');
      },
      onError: (error) => {
        console.error('Failed to trigger supervision:', error);
      }
    }
  );

  // 获取监督状态的查询
  const supervisionStateQuery = useQuery(
    ['supervisionState', convId],
    () => convId && convType === 'group' ? getGroupSupervisionState(convId) : Promise.resolve(null),
    {
      enabled: !!convId && convType === 'group',
      refetchInterval: 5000, // 每5秒刷新一次状态
    }
  );

  // 切换监督开关的变异
  const toggleSupervisionMutation = useMutation(
    (groupId: string) => toggleGroupSupervision(groupId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['supervisionState', convId]);
      },
      onError: (error) => {
        console.error('Failed to toggle supervision:', error);
      }
    }
  );

  const handleTaskStatusChange = async (taskId: string, status: CollaborationTask['status']) => {
    try {
      await updateCollaborationTask(taskId, { status })
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status } : t
      ))
      setSelectedTask(prev => 
        prev && prev.id === taskId ? { ...prev, status } : prev
      )
    } catch (e) {
      console.error('Failed to update task status:', e)
    }
  };

  const agentConversations: Conversation[] = useMemo(() => {
    return (agents || []).map((agent: Agent) => ({
      id: agent.id,
      name: agent.name,
      type: 'agent' as ConversationType,
      data: agent,
    }));
  }, [agents]);

  const groupConversations: Conversation[] = useMemo(() => {
    return (groups || []).map((group: Group) => ({
      id: group.id,
      name: group.name,
      type: 'group' as ConversationType,
      data: group,
    }));
  }, [groups]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const getSelectedConversation = (): Conversation | null => {
    if (!convType || !convId) return null;

    if (convType === 'agent') {
      const agent = agents?.find((a: Agent) => a.id === convId);
      if (agent) {
        return { id: agent.id, name: agent.name, type: 'agent', data: agent };
      }
    } else if (convType === 'group') {
      const group = groups?.find((g: Group) => g.id === convId);
      if (group) {
        return { id: group.id, name: group.name, type: 'group', data: group };
      }
    } else if (convType === 'human') {
      const human = humans?.find((h: Human) => h.id === convId);
      if (human) {
        return { id: human.id, name: human.name, type: 'human', data: human, avatar: human.avatar, email: human.email };
      }
    }
    return null;
  };

  const selectedConversation = getSelectedConversation();

  const setCurrentView = (view: View) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', view);
    setSearchParams(newParams);
  };

  const setSelectedConversation = (conversation: Conversation | null) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', 'chats');
    if (conversation) {
      newParams.set('convType', conversation.type);
      newParams.set('convId', conversation.id);
      
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[`${conversation.type}-${conversation.id}`];
        return newCounts;
      });
    } else {
      newParams.delete('convType');
      newParams.delete('convId');
    }
    setSearchParams(newParams);
  };

  const handleNewMessage = (message: Message) => {
    if (!user) return;
    
    const isFromMe = message.fromId === user.id;
    if (!isFromMe) {
      let conversationId: string;
      let type: 'agent' | 'group' | 'human';
      
      if (message.toType === 'group') {
        conversationId = message.toId;
        type = 'group';
      } else {
        conversationId = message.fromId;
        type = message.fromType as 'agent' | 'human';
      }
      
      setUnreadCounts(prev => ({
        ...prev,
        [`${type}-${conversationId}`]: (prev[`${type}-${conversationId}`] || 0) + 1
      }));
    }
  };

  const handleCreateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const leaderId = formData.get('leaderId') as string || undefined;

    createMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      isPublic: true,
      memberIds: selectedMembers,
      leaderId,
    });
  };

  const handleCreateAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAgentMutation.mutate({
      agentId: formData.get('agentId') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      role: formData.get('role') as string,
      department: formData.get('department') as string,
      tags: (formData.get('tags') as string).split(',').map((t) => t.trim()).filter(Boolean),
      soul: createSoul,
    });
  };

  const handleQuickCreateCoordinator = () => {
    setShowCreateModal(false);
    setCreateSoul(`# 团队协调员 - SOUL.md

## 角色定位

你是一位专业的团队协调员/项目经理，负责协调群组内所有AI成员的工作，确保项目顺利推进。你善于组织、跟进和协调，是团队的"粘合剂"。

## 性格特征

- **思维方式**：全局视角，注重协作和进度
- **沟通风格**：清晰、有条理、善于协调不同意见
- **决策风格**：基于团队情况和项目优先级做决策
- **工作态度**：积极主动、负责任、有耐心

## 核心职责

1. **记录和跟进群内事项** - 把群聊中提到的待办事项记录下来，确保不遗漏
2. **跟踪任务进度** - 关注每个协作任务的状态和完成度
3. **督促团队成员** - 如果某个任务一段时间没有进展，主动@相关成员询问
4. **协调协作** - 帮助成员之间沟通，解决协作问题
5. **汇总成果** - 定期总结团队的工作成果和进度

## 工作流程

1. **查看群聊记录** - 定期回顾群聊历史，记录所有重要事项和待办任务
2. **跟踪协作任务** - 查看每个协作任务的状态、进度和最新更新
3. **识别阻塞点** - 发现哪个任务或成员遇到困难或进度停滞
4. **主动督促** - 如果超过一定时间（比如1-2小时）没有进展，主动@相关成员询问
5. **协调沟通** - 当成员之间需要配合时，帮助他们建立沟通
6. **汇总报告** - 定期向团队汇报整体进度和成果

## 重要工作规则

### 访问权限
- ✅ 可以查看**所有**群聊历史记录
- ✅ 可以@任何群成员
- ✅ 可以查看所有协作任务的详情
- ✅ 可以访问共享工作区的所有内容

### 关键提示
- **定期检查**：至少每1-2小时检查一次群聊和任务状态
- **记录事项**：看到重要的待办事项立即记录，不要依赖记忆
- **主动沟通**：不要等别人来问，主动去了解进度
- **语气友好**：督促时保持礼貌和鼓励的语气，不要责备
- **注意时间**：考虑到AI可能正在处理其他任务，给予合理的等待时间

### 如何督促
当发现任务进度停滞时，你可以这样做：
1. 先查看最后一条消息是什么时候
2. 如果超过合理时间没有更新，@相关成员：
   - "嗨 @成员，这个任务最近有什么进展吗？"
   - "@成员 需要我帮忙协调什么吗？"
   - "@成员 遇到什么问题了吗？我们可以一起讨论"
3. 如果对方回应，继续跟进；如果没有，过一段时间再提醒一次

### 共享工作区使用
- 任务会分配一个中央共享工作区，请直接使用系统告诉你的完整路径
- 可以在共享工作区中创建 \`task-tracker.md\` 或类似文件来记录任务进度
- 所有成员都可以访问和编辑共享工作区

## 说话风格

- 清晰有条理，使用列表和编号
- 专业但友好，避免生硬
- 善于总结和归纳
- 经常使用"我们"而不是"你"
- 鼓励和支持团队成员

## 核心价值观

- 团队协作至上
- 进度透明
- 主动负责
- 耐心细致
- 结果导向
`);
    setShowCreateAgentModal(true);
  };

  const handleEditGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedConversation || selectedConversation.type !== 'group') return;
    const formData = new FormData(e.currentTarget);
    const leaderId = formData.get('leaderId') as string || undefined;
    updateGroupMutation.mutate({
      id: selectedConversation.id,
      data: {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        leaderId,
      },
    });
  };

  const handleAddMembers = (memberIds: string[]) => {
    if (!selectedConversation || selectedConversation.type !== 'group') return;
    memberIds.forEach((memberId) => {
      // 检查是 AI 员工还是真人用户
      const isAgent = agents?.some((a: Agent) => a.id === memberId);
      addMemberMutation.mutate({
        groupId: selectedConversation.id,
        userId: memberId,
        userType: isAgent ? 'agent' : 'human',
        role: 'member',
      });
    });
  };

  const handleRemoveMember = (userId: string, userType: 'human' | 'agent') => {
    if (!selectedConversation || selectedConversation.type !== 'group') return;
    removeMemberMutation.mutate({
      groupId: selectedConversation.id,
      userId,
      userType,
    });
  };

  const handleClearChat = async () => {
    if (!selectedConversation) return;

    try {
      const conversationType = selectedConversation.type === 'agent' ? 'direct' : 'group';
      const conversationId = selectedConversation.id;
      await deleteConversation(conversationType, conversationId);
      setShowClearChatConfirm(false);
      setChatRefreshKey((prev) => prev + 1);
      queryClient.invalidateQueries('messages');
    } catch (e) {
      console.error('Failed to clear chat:', e);
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'docs':
        return <DocsPage />;
      case 'status':
        return (
          <StatusDashboard
            onAgentClick={(agentId) => {
              const agent = agents?.find((a: Agent) => a.id === agentId);
              if (agent) {
                setSelectedConversation({
                  id: agent.id,
                  name: agent.name,
                  type: 'agent',
                  data: agent,
                });
              }
            }}
          />
        );
      case 'agents':
        return (
          <AgentsPage
            onAgentSelect={(agent) => {
              setSelectedConversation({
                id: agent.id,
                name: agent.name,
                type: 'agent',
                data: agent,
              });
            }}
          />
        );
      case 'profile':
        return <ProfilePage />;
      case 'users':
        return <UserManagementPage />;
      case 'knowledge-bases':
        return <KnowledgeBasesPage />;
      default:
        return (
          <div className="flex flex-col h-full bg-white">
            {selectedConversation ? (
              <>
                <div className="h-14 px-5 flex items-center justify-between border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {selectedConversation.type === 'agent' ? (
                      <>
                        <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-medium">
                          {selectedConversation.name.charAt(0)}
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900">{selectedConversation.name}</h2>
                          <p className="text-sm text-gray-500">在线</p>
                        </div>
                      </>
                    ) : selectedConversation.type === 'human' ? (
                      <>
                        {selectedConversation.avatar ? (
                          <img
                            src={selectedConversation.avatar}
                            alt={selectedConversation.name}
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-medium">
                            {selectedConversation.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h2 className="font-semibold text-gray-900">{selectedConversation.name}</h2>
                          <p className="text-sm text-gray-500">{selectedConversation.email || '用户'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <GroupAvatar name={selectedConversation.name} size={36} />
                        <div>
                          <h2 className="font-semibold text-gray-900">{selectedConversation.name}</h2>
                          <p className="text-sm text-gray-500">群组</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation?.type === 'group' && tasks.length > 0 && (
                      <button
                        className="relative p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() => setShowTaskList(true)}
                      >
                        <ClipboardList size={20} className="text-gray-600" />
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                          {tasks.length}
                        </span>
                      </button>
                    )}

                    {selectedConversation?.type === 'group' && (selectedConversation.data as Group)?.leaderId && (
                      <div className="relative group">
                        <button
                          className={`p-2 rounded-lg flex items-center gap-1 transition-all ${
                            supervisionStateQuery.data?.state?.enabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          onClick={() => {
                            if (selectedConversation?.type === 'group') {
                              toggleSupervisionMutation.mutate(selectedConversation.id);
                            }
                          }}
                          disabled={toggleSupervisionMutation.isLoading}
                        >
                          {supervisionStateQuery.data?.state?.enabled ? (
                            <>
                              <Eye 
                                size={18} 
                                className="animate-pulse" 
                              />
                              <span className="text-xs font-medium">运行中</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={18} />
                              <span className="text-xs font-medium">监督</span>
                            </>
                          )}
                        </button>
                        {/* 悬浮提示 */}
                        {supervisionStateQuery.data?.state?.enabled && supervisionStateQuery.data?.state?.nextCheckTime && (
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-sm font-medium text-gray-900 mb-1">监督运行中</div>
                            <div className="text-xs text-gray-500">
                              下次跟进时间：
                              <br />
                              <span className="text-green-600 font-medium">
                                {new Date(supervisionStateQuery.data.state.nextCheckTime).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            {supervisionStateQuery.data?.state?.lastCheckTime && (
                              <div className="text-xs text-gray-400 mt-2">
                                上次检查：{new Date(supervisionStateQuery.data.state.lastCheckTime).toLocaleString('zh-CN')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="relative">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() => setShowAddMenu(!showAddMenu)}
                      >
                        <MoreHorizontal size={20} className="text-gray-600" />
                      </button>
                      {showAddMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          {selectedConversation?.type === 'group' && (
                            <>
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                                onClick={() => {
                                  setShowAddMenu(false);
                                  setShowSidebar(true);
                                }}
                              >
                                <Settings size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-700">群组设置</span>
                              </button>
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                                onClick={() => {
                                  setShowAddMenu(false);
                                  if (selectedConversation?.type === 'group') {
                                    setEditGroupLeader((selectedConversation.data as Group)?.leaderId || '');
                                  }
                                  setShowEditGroupModal(true);
                                }}
                              >
                                <Edit size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-700">编辑群组</span>
                              </button>
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                                onClick={() => {
                                  setShowAddMenu(false);
                                  setShowAddMembersModal(true);
                                }}
                              >
                                <UserPlus size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-700">添加成员</span>
                              </button>
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-red-600"
                                onClick={() => {
                                  setShowAddMenu(false);
                                  if (window.confirm('确定要解散群组吗？此操作不可撤销。')) {
                                    deleteGroup(selectedConversation.id)
                                      .then(data => {
                                        if (data.success) {
                                          setSelectedConversation(null);
                                          queryClient.invalidateQueries('groups');
                                        }
                                      })
                                      .catch(error => {
                                        console.error('Error deleting group:', error);
                                        alert('解散群组失败，请重试');
                                      });
                                  }
                                }}
                              >
                                <Trash2 size={18} />
                                <span className="text-sm">解散群组</span>
                              </button>
                            </>
                          )}
                          <button
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-red-600"
                            onClick={() => {
                              setShowAddMenu(false);
                              setShowClearChatConfirm(true);
                            }}
                          >
                            <Trash2 size={18} />
                            <span className="text-sm">清空聊天记录</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedConversation?.type === 'group' && (
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() => setShowSidebar(!showSidebar)}
                      >
                        <ChevronRight
                          size={20}
                          className={`text-gray-600 transition-transform ${showSidebar ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 min-w-0">
                    <ChatWindow
                      selectedAgent={selectedConversation.type === 'agent' ? (selectedConversation.data as Agent) : null}
                      selectedGroup={selectedConversation.type === 'group' ? (selectedConversation.data as Group) : null}
                      selectedHuman={selectedConversation.type === 'human' ? (selectedConversation.data as Human) : null}
                      agents={agents || []}
                      humans={humans || []}
                      refreshKey={chatRefreshKey}
                      onNewMessage={handleNewMessage}
                      tasks={tasks}
                      onTasksChange={setTasks}
                      selectedTask={selectedTask}
                      onSelectedTaskChange={setSelectedTask}
                    />
                  </div>

                  {showSidebar && selectedConversation?.type === 'group' && (
                    <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">群组信息</h3>
                          <button
                            onClick={() => setShowSidebar(false)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <X size={20} className="text-gray-500" />
                          </button>
                        </div>

                        <div className="space-y-4 mb-8">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
                            <div className="flex items-center gap-2">
                              <span className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                                {selectedConversation.name}
                              </span>
                              <button
                                onClick={() => {
                                  if (selectedConversation?.type === 'group') {
                                    setEditGroupLeader((selectedConversation.data as Group)?.leaderId || '');
                                  }
                                  setShowEditGroupModal(true);
                                }}
                                className="p-2 hover:bg-gray-100 rounded"
                              >
                                <Edit size={16} className="text-gray-500" />
                              </button>
                            </div>
                          </div>
                          {selectedConversation.data && (selectedConversation.data as Group).description && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                              <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-600 text-sm">
                                {(selectedConversation.data as Group).description}
                              </p>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">群组负责人</label>
                            {(() => {
                              const leaderId = (selectedConversation.data as Group)?.leaderId;
                              const leader = agents?.find((a: any) => a.id === leaderId);
                              return leader ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                                  <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                                    {leader.name.charAt(0)}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">{leader.name}</span>
                                </div>
                              ) : (
                                <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-400 text-sm">
                                  未设置负责人
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-700">成员</h4>
                            <button
                              onClick={() => setShowAddMembersModal(true)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <UserPlus size={14} />
                              添加
                            </button>
                          </div>

                          <div className="space-y-2">
                            {user && (
                              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  {user.avatar ? (
                                    <img
                                      src={user.avatar}
                                      alt={user.name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                                      {user.name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                    <p className="text-xs text-gray-500">管理员</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedConversation?.type === 'group' && (selectedConversation.data as Group).members?.map((member) => {
                              if (member.userType === 'agent') {
                                const agent = agents?.find((a: Agent) => a.id === member.userId);
                                if (agent) {
                                  return (
                                    <div
                                      key={member.userId}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                                          {agent.name.charAt(0)}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                                          <p className="text-xs text-gray-500">成员</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveMember(agent.id, 'agent')}
                                        className="p-1 hover:bg-red-50 rounded"
                                      >
                                        <UserMinus size={16} className="text-gray-400 hover:text-red-500" />
                                      </button>
                                    </div>
                                  );
                                }
                              } else if (member.userType === 'human') {
                                const human = humans?.find((h: Human) => h.id === member.userId);
                                if (human) {
                                  return (
                                    <div
                                      key={member.userId}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg"
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
                                          <p className="text-sm font-medium text-gray-900">{human.name}</p>
                                          <p className="text-xs text-gray-500">{human.email || '成员'}</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveMember(human.id, 'human')}
                                        className="p-1 hover:bg-red-50 rounded"
                                      >
                                        <UserMinus size={16} className="text-gray-400 hover:text-red-500" />
                                      </button>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            }) || []}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg">选择一个对话开始聊天</p>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-16 bg-[#1c2733] flex flex-col items-center py-4">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mb-6">
          P
        </div>
        <nav className="flex flex-col gap-2">
          <NavIcon
            icon={<MessageSquare size={24} />}
            active={currentView === 'chats'}
            onClick={() => setCurrentView('chats')}
            tooltip="聊天"
          />
          <NavIcon
            icon={<Bot size={24} />}
            active={currentView === 'agents'}
            onClick={() => setCurrentView('agents')}
            tooltip="AI员工"
          />
          <NavIcon
            icon={<BookOpen size={24} />}
            active={currentView === 'docs'}
            onClick={() => setCurrentView('docs')}
            tooltip="API文档"
          />
          <NavIcon
            icon={<Database size={24} />}
            active={currentView === 'knowledge-bases'}
            onClick={() => setCurrentView('knowledge-bases')}
            tooltip="知识库"
          />
          {isAdmin && (
            <NavIcon
              icon={<Users size={24} />}
              active={currentView === 'users'}
              onClick={() => setCurrentView('users')}
              tooltip="用户管理"
            />
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <NavIcon
            icon={<User size={24} />}
            active={currentView === 'profile'}
            onClick={() => setCurrentView('profile')}
            tooltip="个人设置"
          />
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut size={20} />
            </button>
            {showUserMenu && (
              <div className="absolute left-full ml-2 bottom-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentView === 'chats' && (
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => setShowCreateAgentModal(true)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="创建AI员工"
                >
                  <Plus size={20} />
                </button>
              )}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索"
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3">
              <button
                onClick={() => setCurrentView('status')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  (currentView as View) === 'status' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 hover:shadow-md'
                }`}
              >
                <Activity size={20} className={(currentView as View) === 'status' ? 'text-white' : 'text-blue-500'} />
                <span className="font-semibold">状态看板</span>
              </button>
            </div>
            
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </div>
              </div>
              <button
                onClick={() => setShowSelectHumanModal(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="开始聊天"
              >
                <MessageCircle size={16} className="text-gray-500" />
              </button>
            </div>
            
            {(() => {
              const allHumans = (humans || []).filter((h: Human) => h.id !== user?.id);
              if (allHumans.length === 0) return null;
              
              return (
                <>
                  {allHumans.map((human: Human) => (
                    <ConversationItem
                      key={`human-${human.id}`}
                      conversation={{
                        id: human.id,
                        name: human.name,
                        type: 'human',
                        avatar: human.avatar,
                        email: human.email,
                        data: human,
                        unreadCount: unreadCounts[`human-${human.id}`]
                      }}
                      isSelected={selectedConversation?.id === human.id && selectedConversation?.type === 'human'}
                      onClick={() => {
                        setSelectedConversation({
                          id: human.id,
                          name: human.name,
                          type: 'human',
                          data: human,
                          avatar: human.avatar,
                          email: human.email
                        });
                      }}
                    />
                  ))}
                </>
              );
            })()}
            
            <div className="px-4 py-3 flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  群组
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="创建群聊"
              >
                <Plus size={16} className="text-gray-500" />
              </button>
            </div>
            
            {groupConversations.length > 0 && (
              <>
                {groupConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={{
                      ...conv,
                      unreadCount: unreadCounts[`group-${conv.id}`]
                    }}
                    isSelected={selectedConversation?.id === conv.id && selectedConversation?.type === conv.type}
                    onClick={() => setSelectedConversation(conv)}
                  />
                ))}
              </>
            )}

            <div className="px-4 py-2 mt-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              AI 员工
            </div>
            {(() => {
              const pinnedAgents: Conversation[] = [];
              const groupedByRole: Record<string, Conversation[]> = {};
              
              agentConversations.forEach((conv) => {
                const agent = conv.data as Agent;
                if (agent?.isPinned) {
                  pinnedAgents.push(conv);
                } else {
                  const role = agent?.role || '未分类';
                  if (!groupedByRole[role]) {
                    groupedByRole[role] = [];
                  }
                  groupedByRole[role].push(conv);
                }
              });

              return (
                <>
                  {pinnedAgents.length > 0 && (
                    <div key="pinned">
                      <div className="px-4 py-2 text-xs font-medium text-amber-500 uppercase tracking-wider flex items-center gap-2">
                        <Pin size={12} fill="currentColor" />
                        已置顶
                      </div>
                      {pinnedAgents.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={{
                            ...conv,
                            unreadCount: unreadCounts[`agent-${conv.id}`]
                          }}
                          isSelected={selectedConversation?.id === conv.id && selectedConversation?.type === conv.type}
                          onClick={() => setSelectedConversation(conv)}
                          onTogglePin={() => {
                            const agent = conv.data as Agent;
                            updateAgentMutation.mutate({ id: agent.id, data: { isPinned: false } });
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {Object.entries(groupedByRole).map(([role, conversations]) => (
                    <div key={role}>
                      <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {role}
                      </div>
                      {conversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={{
                            ...conv,
                            unreadCount: unreadCounts[`agent-${conv.id}`]
                          }}
                          isSelected={selectedConversation?.id === conv.id && selectedConversation?.type === conv.type}
                          onClick={() => setSelectedConversation(conv)}
                          onTogglePin={() => {
                            const agent = conv.data as Agent;
                            updateAgentMutation.mutate({ id: agent.id, data: { isPinned: true } });
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {renderMainContent()}
      </div>

      {showTaskList && (
        <TaskListSidebar
          tasks={tasks}
          agents={agents || []}
          onClose={() => setShowTaskList(false)}
          onTaskClick={(task) => {
            setShowTaskList(false);
            setSelectedTask(task);
          }}
          onTasksChange={setTasks}
          selectedGroup={selectedConversation?.type === 'group' ? (selectedConversation.data as Group) : null}
        />
      )}

      {selectedTask && (
        <TaskDetailSidebar
          task={selectedTask}
          agents={agents || []}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleTaskStatusChange}
        />
      )}

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        agents={agents || []}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        selectedLeader={selectedLeader}
        setSelectedLeader={setSelectedLeader}
        onSubmit={handleCreateGroup}
        isLoading={createMutation.isLoading}
        onCreateCoordinator={handleQuickCreateCoordinator}
      />

      <CreateAgentModal
        isOpen={showCreateAgentModal}
        onClose={() => setShowCreateAgentModal(false)}
        createSoul={createSoul}
        setCreateSoul={setCreateSoul}
        onSubmit={handleCreateAgent}
        isLoading={createAgentMutation.isLoading}
      />

      {selectedConversation?.type === 'group' && (
        <EditGroupModal
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          group={selectedConversation.data as Group}
          agents={agents || []}
          editGroupLeader={editGroupLeader}
          setEditGroupLeader={setEditGroupLeader}
          onSubmit={handleEditGroup}
          isLoading={updateGroupMutation.isLoading}
        />
      )}

      {selectedConversation?.type === 'group' && (
        <AddMembersModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          agents={agents || []}
          humans={humans || []}
          selectedMembers={selectedMembers}
          setSelectedMembers={setSelectedMembers}
          onAddMembers={handleAddMembers}
          isLoading={addMemberMutation.isLoading}
        />
      )}

      <ClearChatConfirmModal
        isOpen={showClearChatConfirm}
        onClose={() => setShowClearChatConfirm(false)}
        onConfirm={handleClearChat}
      />
      
      <SelectHumanModal
        isOpen={showSelectHumanModal}
        onClose={() => setShowSelectHumanModal(false)}
        onSelect={(human) => {
          setSelectedConversation({
            id: human.id,
            name: human.name,
            type: 'human',
            data: human,
            avatar: human.avatar,
            email: human.email
          });
          setChatRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}

