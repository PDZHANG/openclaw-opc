const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '登录失败');
  }
  return res.json();
}

export async function register(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '注册失败');
  }
  return res.json();
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch current user');
  return res.json();
}

export async function updateProfile(data: { name?: string; avatar?: string; password?: string }) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

export async function fetchAllUsers() {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function updateUserRole(userId: string, role: 'admin' | 'user') {
  const res = await fetch(`${API_BASE}/auth/users/role`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, role })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update user role');
  }
  return res.json();
}

export async function createUser(name: string, email: string, password: string, role: 'admin' | 'user') {
  const res = await fetch(`${API_BASE}/auth/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password, role })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '创建用户失败');
  }
  return res.json();
}

export async function approveUser(userId: string, isApproved: boolean) {
  const res = await fetch(`${API_BASE}/auth/users/approve`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, isApproved })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '审核用户失败');
  }
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/agents`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function createAgent(data: any) {
  const res = await fetch(`${API_BASE}/agents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create agent');
  }
  return res.json();
}

export async function updateAgent(id: string, data: any) {
  const res = await fetch(`${API_BASE}/agents/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update agent');
  return res.json();
}

export async function fetchAgentConfig(id: string) {
  const res = await fetch(`${API_BASE}/agents/${id}/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch agent config');
  return res.json();
}

export async function updateAgentConfig(id: string, data: any) {
  const res = await fetch(`${API_BASE}/agents/${id}/config`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update agent config');
  return res.json();
}

export async function deleteAgent(id: string) {
  const res = await fetch(`${API_BASE}/agents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete agent');
  return res.json();
}

export async function sendMessage(agentId: string, message: string) {
  const res = await fetch(`${API_BASE}/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function fetchMessages(conversationType: 'direct' | 'group', conversationId: string, limit?: number) {
  const params = new URLSearchParams({ conversationType, conversationId });
  if (limit) params.append('limit', limit.toString());
  const res = await fetch(`${API_BASE}/messages?${params}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function fetchGroups() {
  const res = await fetch(`${API_BASE}/groups`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}

export async function createGroup(data: { name: string; description?: string; isPublic?: boolean; memberIds?: string[]; leaderId?: string }) {
  const res = await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create group');
  return res.json();
}

export async function fetchGroup(id: string) {
  const res = await fetch(`${API_BASE}/groups/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch group');
  return res.json();
}

export async function updateGroup(id: string, data: Partial<{ name: string; description: string; isPublic: boolean; leaderId?: string }>) {
  const res = await fetch(`${API_BASE}/groups/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update group');
  return res.json();
}

export async function deleteGroup(id: string) {
  const res = await fetch(`${API_BASE}/groups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete group');
  return res.json();
}

export async function addGroupMember(groupId: string, userId: string, userType: 'human' | 'agent', role: 'admin' | 'member' = 'member') {
  const res = await fetch(`${API_BASE}/groups/${groupId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, userType, role })
  });
  if (!res.ok) throw new Error('Failed to add member');
  return res.json();
}

export async function removeGroupMember(groupId: string, userId: string, userType: 'human' | 'agent') {
  const res = await fetch(`${API_BASE}/groups/${groupId}/members`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, userType })
  });
  if (!res.ok) throw new Error('Failed to remove member');
  return res.json();
}

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/status/dashboard`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchAgentStatus(agentId: string) {
  const res = await fetch(`${API_BASE}/status/${agentId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch agent status');
  return res.json();
}

export async function fetchAllStatuses() {
  const res = await fetch(`${API_BASE}/status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch statuses');
  return res.json();
}

export async function fetchCollaborationTasks(params?: { status?: string; groupId?: string; assigneeId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.groupId) searchParams.append('groupId', params.groupId);
  if (params?.assigneeId) searchParams.append('assigneeId', params.assigneeId);
  
  const query = searchParams.toString();
  const res = await fetch(`${API_BASE}/collaborations${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch collaboration tasks');
  return res.json();
}


export async function deleteMessage(id: string) {
  const res = await fetch(`${API_BASE}/messages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete message');
  return res.json();
}

export async function deleteConversation(conversationType: 'direct' | 'group', conversationId: string) {
  const res = await fetch(`${API_BASE}/messages/conversation/${conversationType}/${conversationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return res.json();
}

export async function createCollaborationTask(data: {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: 'independent' | 'collaborative';
  groupId?: string;
  parentMessageId?: string;
  assignees?: string[];
  dependencies?: string[];
  dueAt?: string;
}) {
  const res = await fetch(`${API_BASE}/collaborations`, {
    method: 'POST',
    headers: getAuthHeaders(),  
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create collaboration task');
  return res.json();
}

export async function updateCollaborationTask(id: string, data: Partial<{
  title: string;
  description: string;
  status: 'pending_confirmation' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected';
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
}>) {
  const res = await fetch(`${API_BASE}/collaborations/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update collaboration task');
  return res.json();
}

export async function updateTaskProgress(id: string, progress: number) {
  const res = await fetch(`${API_BASE}/collaborations/${id}/progress`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ progress })
  });
  if (!res.ok) throw new Error('Failed to update task progress');
  return res.json();
}

export async function fetchMessagesWithReadStatus(
  conversationType: 'direct' | 'group', 
  conversationId: string, 
  limit?: number,
  userId?: string,
  userType?: 'human' | 'agent'
) {
  const params = new URLSearchParams({ conversationType, conversationId });
  if (limit) params.append('limit', limit.toString());
  if (userId) params.append('userId', userId);
  if (userType) params.append('userType', userType);
  const res = await fetch(`${API_BASE}/messages/with-read-status?${params}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch messages with read status');
  return res.json();
}

export async function markMessageAsRead(messageId: string, userId: string, userType: 'human' | 'agent') {
  const res = await fetch(`${API_BASE}/messages/mark-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, userId, userType })
  });
  if (!res.ok) throw new Error('Failed to mark message as read');
  return res.json();
}

export async function markConversationAsRead(
  conversationType: 'direct' | 'group', 
  conversationId: string, 
  userId: string, 
  userType: 'human' | 'agent'
) {
  const res = await fetch(`${API_BASE}/messages/mark-conversation-read`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ conversationType, conversationId, userId, userType })
  });
  if (!res.ok) throw new Error('Failed to mark conversation as read');
  return res.json();
}

export async function fetchUnreadCount(
  conversationType: 'direct' | 'group', 
  conversationId: string, 
  userId: string, 
  userType: 'human' | 'agent'
) {
  const params = new URLSearchParams({ conversationType, conversationId, userId, userType });
  const res = await fetch(`${API_BASE}/messages/unread-count?${params}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch unread count');
  return res.json();
}

export async function fetchMessageReadStatus(messageId: string) {
  const res = await fetch(`${API_BASE}/messages/${messageId}/read-status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch message read status');
  return res.json();
}

export async function fetchInteractionEvents(params?: { 
  taskId?: string; 
  agentId?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.taskId) searchParams.append('taskId', params.taskId);
  if (params?.agentId) searchParams.append('agentId', params.agentId);
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  
  const query = searchParams.toString();
  const res = await fetch(`${API_BASE}/interactions${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch interaction events');
  return res.json();
}

export async function createInteractionEvent(data: any) {
  const res = await fetch(`${API_BASE}/interactions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create interaction event');
  return res.json();
}

export async function fetchHumanUsers() {
  const res = await fetch(`${API_BASE}/messages/humans`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch human users');
  return res.json();
}

export async function fetchConversations() {
  const res = await fetch(`${API_BASE}/messages/conversations`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function triggerGroupSupervision(groupId: string) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/trigger-supervision`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to trigger supervision');
  }
  return res.json();
}

export async function getGroupSupervisionState(groupId: string) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/supervision-state`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get supervision state');
  }
  return res.json();
}

export async function toggleGroupSupervision(groupId: string) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/toggle-supervision`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to toggle supervision');
  }
  return res.json();
}

export async function fetchTaskFiles(taskId: string) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/files`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch task files');
  return res.json();
}

export async function downloadTaskDeliverable(taskId: string, taskTitle: string) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/download`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to download deliverable');
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${taskTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-交付物.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function deleteAllCollaborationTasks() {
  const res = await fetch(`${API_BASE}/collaborations`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete all collaboration tasks');
  return res.json();
}

export async function deleteCollaborationTasksByGroup(groupId: string) {
  const res = await fetch(`${API_BASE}/collaborations/group/${groupId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete collaboration tasks by group');
  return res.json();
}
