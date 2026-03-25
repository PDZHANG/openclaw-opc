
import { useState, useEffect } from 'react'
import { X, ClipboardList, CheckCircle, Clock, Users, Download, Folder, FileText, Plus, Minus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { CollaborationTask, Agent, TaskFile } from '../types'
import { fetchTaskFiles, downloadTaskDeliverable, updateCollaborationTask } from '../services/api'

interface TaskDetailSidebarProps {
  task: CollaborationTask | null
  agents: Agent[]
  onClose: () => void
  onStatusChange?: (taskId: string, status: CollaborationTask['status']) => void
}

export default function TaskDetailSidebar({ task, agents, onClose, onStatusChange }: TaskDetailSidebarProps) {
  const [showFiles, setShowFiles] = useState(false)
  const [files, setFiles] = useState<TaskFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [localProgress, setLocalProgress] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (task) {
      setShowFiles(false)
      setFiles([])
      setLocalProgress(task.progress || 0)
    }
  }, [task])

  const handleProgressChange = async (newProgress: number) => {
    if (!task) return
    const clampedProgress = Math.max(0, Math.min(100, newProgress))
    setLocalProgress(clampedProgress)
    
    setIsUpdating(true)
    try {
      await updateCollaborationTask(task.id, { progress: clampedProgress })
    } catch (error) {
      console.error('Failed to update progress:', error)
      setLocalProgress(task.progress || 0)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!task) return null

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

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleToggleFiles = async () => {
    if (!showFiles && files.length === 0) {
      setLoadingFiles(true)
      try {
        const data = await fetchTaskFiles(task.id)
        setFiles(data.files || [])
      } catch (error) {
        console.error('Failed to fetch task files:', error)
      } finally {
        setLoadingFiles(false)
      }
    }
    setShowFiles(!showFiles)
  }

  const handleDownload = async () => {
    try {
      await downloadTaskDeliverable(task.id, task.title)
    } catch (error) {
      console.error('Failed to download deliverable:', error)
    }
  }

  const assigneeNames = task.assignees?.map(agentId => {
    const agent = agents.find(a => a.id === agentId)
    return agent?.name || agentId
  }).join(', ') || '未分配'

  const fileFiles = files.filter(f => f.type === 'file')
  const dirFiles = files.filter(f => f.type === 'directory')
  const hasDeliverable = task.status === 'completed' && task.deliverableGeneratedAt

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ClipboardList size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">任务详情</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 flex-1">{task.title}</h1>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)} ml-3`}>
                {getStatusText(task.status)}
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
          </div>

          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">描述</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Users size={14} />
                负责人
              </h3>
              <p className="text-gray-700">{assigneeNames}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Clock size={14} />
                进度
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleProgressChange(localProgress - 10)}
                    disabled={isUpdating || localProgress <= 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus size={16} className="text-gray-600" />
                  </button>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${localProgress}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleProgressChange(localProgress + 10)}
                    disabled={isUpdating || localProgress >= 100}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} className="text-gray-600" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {[0, 25, 50, 75, 100].map(percent => (
                      <button
                        key={percent}
                        onClick={() => handleProgressChange(percent)}
                        disabled={isUpdating}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          localProgress === percent 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{localProgress}%</span>
                </div>
              </div>
            </div>
          </div>

          {task.deliverableSummary && task.status === 'completed' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-medium text-green-700 mb-2">交付总结</h3>
              <div className="text-sm text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  p: ({ ...props }) => <p className="text-sm mb-2" {...props} />
                }}>
                  {task.deliverableSummary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {task.status === 'pending' && onStatusChange && (
            <button
              onClick={() => onStatusChange(task.id, 'in_progress')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isUpdating}
            >
              <CheckCircle size={18} />
              开始任务
            </button>
          )}
          
          {task.status === 'in_progress' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">任务进行中</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                AI 员工正在处理任务，完成后会自动标记为完成。你可以通过调整进度来反馈当前完成度。
              </p>
            </div>
          )}

          {task.status === 'completed' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {hasDeliverable ? (
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Download size={18} />
                    下载交付物
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
                  >
                    <Download size={18} />
                    暂无交付物
                  </button>
                )}
                <button
                  onClick={handleToggleFiles}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {showFiles ? '隐藏文件' : '查看文件'}
                </button>
              </div>

              {showFiles && (
                <div>
                  {loadingFiles ? (
                    <div className="text-center text-gray-500 py-4">加载中...</div>
                  ) : files.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">暂无文件</div>
                  ) : (
                    <div className="space-y-2 border rounded-lg p-3">
                      {dirFiles.length > 0 && (
                        <div className="space-y-1">
                          {dirFiles.map((file, idx) => (
                            <div key={`dir-${idx}`} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                              <Folder size={14} className="text-blue-500" />
                              <span className="flex-1 truncate">{file.path}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {fileFiles.length > 0 && (
                        <div className="space-y-1">
                          {fileFiles.map((file, idx) => (
                            <div key={`file-${idx}`} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                              <FileText size={14} className="text-gray-500" />
                              <span className="flex-1 truncate">{file.path}</span>
                              <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

