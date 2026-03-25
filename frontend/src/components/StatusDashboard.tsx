import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Activity, RefreshCw, Search, Bot, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchDashboard } from '../services/api';
import type { DashboardData } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

interface StatusDashboardProps {
  onAgentClick?: (agentId: string) => void;
}

type FilterType = 'all' | 'online' | 'busy' | 'idle' | 'offline';

export default function StatusDashboard({ onAgentClick }: StatusDashboardProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: dashboard, isLoading, error, refetch } = useQuery<DashboardData>('dashboard', fetchDashboard, {
    refetchInterval: 10000,
    onError: (err) => {
      console.error('Error fetching dashboard:', err);
    }
  });

  useWebSocket({
    onStatusUpdate: () => {
      queryClient.invalidateQueries('dashboard');
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getAgentStatus = (agent: any) => {
    if (agent.availability === 'busy') return 'busy';
    return 'idle';
  };

  const filteredAgents = useMemo(() => {
    if (!dashboard) return [];
    
    return dashboard.agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (agent.role?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      
      const status = getAgentStatus(agent);
      let matchesFilter = true;
      if (filter === 'online') matchesFilter = true;
      else if (filter === 'busy') matchesFilter = status === 'busy';
      else if (filter === 'idle') matchesFilter = status === 'idle';
      else if (filter === 'offline') matchesFilter = false;
      
      return matchesSearch && matchesFilter;
    });
  }, [dashboard, searchQuery, filter]);

  const stats = useMemo(() => {
    if (!dashboard) return { total: 0, online: 0, busy: 0, idle: 0, offline: 0 };
    
    let busy = 0, idle = 0;
    
    dashboard.agents.forEach(agent => {
      const status = getAgentStatus(agent);
      if (status === 'busy') busy++;
      if (status === 'idle') idle++;
    });
    
    return {
      total: dashboard.agents.length,
      online: dashboard.agents.length,
      busy,
      idle,
      offline: 0
    };
  }, [dashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 mb-4">加载错误</div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="text-blue-600" />
              状态看板
            </h1>
            <p className="text-gray-500 mt-1">实时监控 AI 员工的工作状态</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="总员工数" value={stats.total} color="gray" />
          <StatCard label="在线" value={stats.online} color="green" />
          <StatCard label="忙碌" value={stats.busy} color="yellow" />
          <StatCard label="空闲" value={stats.idle} color="blue" />
          <StatCard label="离线" value={stats.offline} color="gray" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索 AI 员工..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: '全部' },
              { key: 'online', label: '在线' },
              { key: 'busy', label: '忙碌' },
              { key: 'idle', label: '空闲' },
              { key: 'offline', label: '离线' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as FilterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredAgents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>没有找到匹配的 AI 员工</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => onAgentClick?.(agent.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className={`p-4 rounded-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

function AgentCard({ agent, onClick }: { agent: any; onClick: () => void }) {
  const getStatusInfo = () => {
    if (agent.availability === 'busy') {
      return { color: 'bg-yellow-500', text: '忙碌中', badgeColor: 'bg-yellow-100 text-yellow-700' };
    }
    return { color: 'bg-green-500', text: '空闲中', badgeColor: 'bg-green-100 text-green-700' };
  };

  const statusInfo = getStatusInfo();

  const formatLastActive = () => {
    if (!agent.lastActiveAt) return '暂无活动';
    const lastActive = new Date(agent.lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return lastActive.toLocaleDateString('zh-CN');
  };

  const avatarColors = [
    'from-purple-400 to-purple-600',
    'from-blue-400 to-blue-600',
    'from-pink-400 to-pink-600',
    'from-cyan-400 to-cyan-600',
    'from-orange-400 to-orange-600',
  ];
  const colorIndex = agent.name.charCodeAt(0) % avatarColors.length;

  const getCurrentActivity = () => {
    if (agent.currentActivity) return agent.currentActivity;
    if (agent.currentTask) return agent.currentTask.title;
    if (agent.availability === 'busy') return '正在处理任务...';
    return '等待任务中';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 bg-gradient-to-br ${avatarColors[colorIndex]} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
            {agent.name.charAt(0)}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${statusInfo.color} animate-pulse`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.badgeColor}`}>
              {statusInfo.text}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{agent.role || 'AI员工'}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            {agent.currentTask ? (
              <CheckCircle2 className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Bot className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 line-clamp-2">{getCurrentActivity()}</p>
              {agent.currentTask && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>进度</span>
                    <span>{agent.currentTask.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${agent.currentTask.progress || 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>最后活动: {formatLastActive()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>消息: {agent.messagesSent || 0}</span>
              <span>任务: {agent.tasksCompleted || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
