import { Users, Zap, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import type { CollaborationTask } from '../types';

interface AgentInteractionProps {
  tasks?: CollaborationTask[];
  agents?: Array<{ id: string; name: string }>;
}

export default function AgentInteraction({ tasks = [], agents = [] }: AgentInteractionProps) {
  const mockTasks: CollaborationTask[] = [
    {
      id: '1',
      title: '设计登录页面UI',
      description: '为移动端设计登录页面',
      priority: 'high',
      status: 'in_progress',
      type: 'collaborative',
      createdBy: '产品经理',
      groupId: '1',
      assignees: ['agent-1'],
      progress: 60,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: '2',
      title: '编写API文档',
      description: '更新用户管理模块API',
      priority: 'medium',
      status: 'pending',
      type: 'collaborative',
      createdBy: '技术负责人',
      groupId: '1',
      assignees: ['agent-2'],
      progress: 0,
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
    }
  ];

  const displayTasks = tasks.length > 0 ? tasks : mockTasks;

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'pending':
      default:
        return '待处理';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'high':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      default:
        return <Zap className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-sm">
      <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        AI 交互任务
      </h3>

      <div className="space-y-4">
        {displayTasks.map((task) => (
          <div key={task.id} className="bg-white/60 border border-white/60 rounded-xl p-4 hover:border-blue-200 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getPriorityIcon(task.priority)}
                <h4 className="font-medium text-gray-900">{task.title}</h4>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </span>
            </div>

            {task.description && (
              <p className="text-sm text-gray-600 mb-3">{task.description}</p>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <span className="text-gray-500">{task.createdBy}</span>
              <ArrowRight className="w-4 h-4" />
              {task.assignees?.map((assigneeId, index) => (
                <span key={assigneeId} className="font-medium text-gray-800">
                  {getAgentName(assigneeId)}
                  {index < (task.assignees?.length || 0) - 1 && ', '}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>进度</span>
                <span>{task.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>创建于 {new Date(task.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayTasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无交互任务</p>
        </div>
      )}
    </div>
  );
}
