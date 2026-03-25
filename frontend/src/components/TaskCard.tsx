
import { ClipboardList, Users } from 'lucide-react'
import type { CollaborationTask, Agent } from '../types'

interface TaskCardProps {
  task: CollaborationTask
  agents: Agent[]
  onClick: () => void
}

export default function TaskCard({ task, agents, onClick }: TaskCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'failed': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待开始'
      case 'in_progress': return '进行中'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      default: return status
    }
  }

  const assigneeNames = task.assignees?.map(agentId => {
    const agent = agents.find(a => a.id === agentId)
    return agent?.name || agentId
  }).join(', ') || '未分配'

  return (
    <div 
      className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300 overflow-hidden"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClipboardList size={16} className="text-gray-500 flex-shrink-0" />
          <h3 className="font-medium text-gray-900 truncate flex-1" title={task.title}>
            {task.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)} whitespace-nowrap`}>
            {getStatusText(task.status)}
          </div>
        </div>
      </div>

      <div className="flex items-center text-sm text-gray-500 min-w-0">
        <Users size={14} className="flex-shrink-0 mr-1" />
        <span className="truncate" title={assigneeNames}>{assigneeNames}</span>
        <span className="mx-2 flex-shrink-0">·</span>
        <span className="flex-shrink-0">{task.progress}%</span>
      </div>
    </div>
  )
}

