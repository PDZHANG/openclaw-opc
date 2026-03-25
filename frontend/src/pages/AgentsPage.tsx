import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Plus, Bot, Edit, Trash2, FileText, MessageSquare, Users, Briefcase, LayoutGrid } from 'lucide-react'
import { fetchAgents, createAgent, deleteAgent, fetchAgentConfig, updateAgentConfig, updateAgent } from '../services/api'
import type { Agent } from '../types'

type GroupBy = 'department' | 'role' | 'none'
type ConfigFileType = 'SOUL.md' | 'IDENTITY.md' | 'TOOLS.md' | 'BOOTSTRAP.md' | 'USER.md'

const CONFIG_FILES: ConfigFileType[] = ['SOUL.md', 'IDENTITY.md', 'TOOLS.md', 'BOOTSTRAP.md', 'USER.md']

interface AgentsPageProps {
  onAgentSelect?: (agent: Agent) => void
}

export default function AgentsPage({ onAgentSelect }: AgentsPageProps) {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<{ agent: Agent, configs: { [key: string]: string }, activeFile: ConfigFileType } | null>(null)
  const [createConfigs, setCreateConfigs] = useState<{ [key: string]: string }>({})
  const [createActiveFile, setCreateActiveFile] = useState<ConfigFileType>('SOUL.md')
  const [groupBy, setGroupBy] = useState<GroupBy>('department')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; agent: Agent | null }>({ show: false, agent: null })

  const { data: agents, isLoading } = useQuery('agents', fetchAgents)

  const groupedAgents = useMemo(() => {
    if (!agents || groupBy === 'none') {
      return { '全部员工': agents || [] }
    }

    const groups: Record<string, Agent[]> = {}
    agents.forEach((agent: any) => {
      let key = '未分类'
      if (groupBy === 'department') {
        key = agent.department || '未分类'
      } else if (groupBy === 'role') {
        key = agent.role || '未分类'
      }
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(agent)
    })
    return groups
  }, [agents, groupBy])

  const createMutation = useMutation(createAgent, {
    onSuccess: () => {
      queryClient.invalidateQueries('agents')
      setShowCreateModal(false)
      setCreateConfigs({})
      setCreateActiveFile('SOUL.md')
    }
  })

  const deleteMutation = useMutation(deleteAgent, {
    onSuccess: () => {
      queryClient.invalidateQueries('agents')
      setShowDeleteConfirm({ show: false, agent: null })
    }
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => updateAgent(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents')
        setEditingAgent(null)
      }
    }
  )

  const handleDelete = (agent: Agent) => {
    setShowDeleteConfirm({ show: true, agent })
  }

  const confirmDelete = () => {
    if (showDeleteConfirm.agent) {
      deleteMutation.mutate(showDeleteConfirm.agent.id)
    }
  }

  const handleUpdateAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingAgent) return
    const formData = new FormData(e.currentTarget)
    updateMutation.mutate({
      id: editingAgent.id,
      data: {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        role: formData.get('role') as string,
        department: formData.get('department') as string,
        tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
      }
    })
  }

  const handleCreateAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      agentId: formData.get('agentId') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      role: formData.get('role') as string,
      department: formData.get('department') as string,
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
      soul: createConfigs['SOUL.md'],
      identity: createConfigs['IDENTITY.md'],
      tools: createConfigs['TOOLS.md'],
      bootstrap: createConfigs['BOOTSTRAP.md'],
      user: createConfigs['USER.md']
    })
  }

  const handleOpenConfig = async (agent: Agent) => {
    const configs = await fetchAgentConfig(agent.id)
    setSelectedAgentConfig({ agent, configs, activeFile: 'SOUL.md' })
    setShowConfigModal(true)
  }

  const handleSaveConfig = async () => {
    if (!selectedAgentConfig) return
    await updateAgentConfig(selectedAgentConfig.agent.id, selectedAgentConfig.configs)
    setShowConfigModal(false)
  }

  const handleConfigChange = (content: string) => {
    if (!selectedAgentConfig) return
    setSelectedAgentConfig({
      ...selectedAgentConfig,
      configs: {
        ...selectedAgentConfig.configs,
        [selectedAgentConfig.activeFile]: content
      }
    })
  }

  const handleCreateConfigChange = (content: string) => {
    setCreateConfigs({
      ...createConfigs,
      [createActiveFile]: content
    })
  }

  return (
    <div className="flex flex-col h-full p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI员工</h1>
          <p className="text-gray-500 mt-1">管理你的AI团队成员</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setGroupBy('department')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                groupBy === 'department' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Briefcase size={16} />
              按部门
            </button>
            <button
              onClick={() => setGroupBy('role')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                groupBy === 'role' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users size={16} />
              按职位
            </button>
            <button
              onClick={() => setGroupBy('none')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                groupBy === 'none' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <LayoutGrid size={16} />
              全部
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            创建AI员工
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : agents?.length === 0 ? (
        <div className="text-center py-12">
          <Bot size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">还没有AI员工，点击上方按钮创建</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAgents).map(([groupName, groupAgents]) => (
            <div key={groupName} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{groupName}</h2>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {groupAgents.length}人
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupAgents.map((agent: Agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => setEditingAgent(agent)}
                    onDelete={() => handleDelete(agent)}
                    onConfig={() => handleOpenConfig(agent)}
                    onSelect={onAgentSelect ? () => onAgentSelect(agent) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAgent}
          isLoading={createMutation.isLoading}
          configs={createConfigs}
          activeFile={createActiveFile}
          onActiveFileChange={setCreateActiveFile}
          onConfigChange={handleCreateConfigChange}
        />
      )}

      {showConfigModal && selectedAgentConfig && (
        <ConfigEditorModal
          agent={selectedAgentConfig.agent}
          configs={selectedAgentConfig.configs}
          activeFile={selectedAgentConfig.activeFile}
          onActiveFileChange={(file) => setSelectedAgentConfig({ ...selectedAgentConfig, activeFile: file })}
          onConfigChange={handleConfigChange}
          onSave={handleSaveConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onSubmit={handleUpdateAgent}
          isLoading={updateMutation.isLoading}
        />
      )}

      {showDeleteConfirm.show && showDeleteConfirm.agent && (
        <DeleteConfirmModal
          agent={showDeleteConfirm.agent}
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm({ show: false, agent: null })}
          isLoading={deleteMutation.isLoading}
        />
      )}
    </div>
  )
}

function AgentCard({ 
  agent, 
  onEdit, 
  onDelete, 
  onConfig,
  onSelect
}: { 
  agent: Agent, 
  onEdit: () => void, 
  onDelete: () => void,
  onConfig: () => void,
  onSelect?: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={onSelect}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-xs text-gray-500">{agent.id}</p>
            {agent.role && (
              <span className="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {agent.role}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {onSelect && (
            <button 
              onClick={onSelect}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="开始聊天"
            >
              <MessageSquare size={18} />
            </button>
          )}
          <button 
            onClick={onConfig}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="编辑配置文件"
          >
            <FileText size={18} />
          </button>
          <button 
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      {agent.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
      )}
      
      {agent.tags && agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agent.tags.map(tag => (
            <span 
              key={tag} 
              className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          创建于 {new Date(agent.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>
    </div>
  )
}

function CreateAgentModal({ 
  onClose, 
  onSubmit, 
  isLoading,
  configs,
  activeFile,
  onActiveFileChange,
  onConfigChange
}: { 
  onClose: () => void, 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
  isLoading: boolean,
  configs: { [key: string]: string },
  activeFile: ConfigFileType,
  onActiveFileChange: (file: ConfigFileType) => void,
  onConfigChange: (content: string) => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">创建AI员工</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">英文名（Agent ID）</label>
                <input 
                  name="agentId"
                  required
                  pattern="[a-zA-Z0-9_-]+"
                  title="只能使用英文字母、数字、下划线和连字符"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：product_manager, developer"
                />
                <p className="text-xs text-gray-500 mt-1">这个ID将用于OpenClaw配置，创建后不可修改</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                <input 
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：产品经理"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <input 
                  name="department"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：产品部、技术部、设计部"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
                <input 
                  name="role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：产品经理、开发工程师"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea 
                  name="description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="描述这个AI员工的职责..."
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">标签（用逗号分隔）</label>
                <input 
                  name="tags"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：设计, 创意, 团队协作"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {CONFIG_FILES.map((file) => (
                  <button
                    key={file}
                    type="button"
                    onClick={() => onActiveFileChange(file)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeFile === file ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {file}
                  </button>
                ))}
              </div>
              
              <textarea
                value={configs[activeFile] || ''}
                onChange={(e) => onConfigChange(e.target.value)}
                className="w-full h-64 font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-4"
                placeholder={`# ${activeFile}\n\n在此定义AI员工的${activeFile.replace('.md', '')}配置...`}
              />
            </div>
          </div>
          
          <div className="flex gap-3 p-6 border-t border-gray-200">
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
  )
}

function ConfigEditorModal({
  agent,
  configs,
  activeFile,
  onActiveFileChange,
  onConfigChange,
  onSave,
  onClose
}: {
  agent: Agent,
  configs: { [key: string]: string },
  activeFile: ConfigFileType,
  onActiveFileChange: (file: ConfigFileType) => void,
  onConfigChange: (content: string) => void,
  onSave: () => void,
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">编辑配置文件</h2>
            <p className="text-sm text-gray-500">{agent.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex gap-1 bg-gray-100 p-1 border-b border-gray-200">
            {CONFIG_FILES.map((file) => (
              <button
                key={file}
                type="button"
                onClick={() => onActiveFileChange(file)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFile === file ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {file}
              </button>
            ))}
          </div>
          
          <div className="flex-1 p-6 overflow-hidden">
            <textarea
              value={configs[activeFile] || ''}
              onChange={(e) => onConfigChange(e.target.value)}
              className="w-full h-full font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`# ${activeFile}\n\n在此定义AI员工的${activeFile.replace('.md', '')}配置...`}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button 
            type="button"
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function EditAgentModal({ 
  agent, 
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  agent: Agent, 
  onClose: () => void, 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
  isLoading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">编辑AI员工</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">英文名（Agent ID）</label>
            <input 
              name="agentId"
              value={agent.id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Agent ID 不可修改</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
            <input 
              name="name"
              defaultValue={agent.name}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <input 
              name="department"
              defaultValue={agent.department || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
            <input 
              name="role"
              defaultValue={agent.role || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea 
              name="description"
              defaultValue={agent.description || ''}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签（用逗号分隔）</label>
            <input 
              name="tags"
              defaultValue={agent.tags?.join(', ') || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
  )
}

function DeleteConfirmModal({ 
  agent, 
  onConfirm, 
  onClose, 
  isLoading 
}: { 
  agent: Agent, 
  onConfirm: () => void, 
  onClose: () => void,
  isLoading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">确认删除</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          确定要删除 AI 员工 <span className="font-semibold text-gray-900">{agent.name}</span> 吗？此操作不可撤销。
        </p>
        
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? '删除中...' : '删除'}
          </button>
        </div>
      </div>
    </div>
  )
}
