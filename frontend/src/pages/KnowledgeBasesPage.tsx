import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Database, CheckCircle, XCircle, Settings, Link2, Server, BookOpen, Globe, HelpCircle } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import type { KnowledgeBase, KnowledgeBaseType } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function fetchKnowledgeBases(): Promise<KnowledgeBase[]> {
  const response = await fetch(`${API_BASE}/knowledge-bases`);
  const data = await response.json();
  return data.data || [];
}

async function createKnowledgeBase(kb: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeBase> {
  const response = await fetch(`${API_BASE}/knowledge-bases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(kb),
  });
  const data = await response.json();
  return data.data;
}

async function updateKnowledgeBase(id: string, kb: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
  const response = await fetch(`${API_BASE}/knowledge-bases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(kb),
  });
  const data = await response.json();
  return data.data;
}

async function deleteKnowledgeBase(id: string): Promise<void> {
  await fetch(`${API_BASE}/knowledge-bases/${id}`, {
    method: 'DELETE',
  });
}

async function testConnection(id: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/knowledge-bases/${id}/test`, {
    method: 'POST',
  });
  const data = await response.json();
  return data.success;
}

const KnowledgeBaseIcon = ({ type }: { type: KnowledgeBaseType }) => {
  switch (type) {
    case 'aliyun':
      return <Server className="w-5 h-5 text-orange-500" />;
    case 'dify':
      return <Database className="w-5 h-5 text-blue-500" />;
    case 'lexiang':
      return <BookOpen className="w-5 h-5 text-green-500" />;
    default:
      return <Settings className="w-5 h-5 text-gray-500" />;
  }
};

const getKnowledgeBaseLabel = (type: KnowledgeBaseType) => {
  switch (type) {
    case 'aliyun': return '阿里云知识库';
    case 'dify': return 'Dify 知识库';
    case 'lexiang': return '乐享知识库';
    default: return '自定义知识库';
  }
};

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (kb: any) => void;
  isLoading: boolean;
  editingKb?: KnowledgeBase | null;
}

function KnowledgeBaseModal({ isOpen, onClose, onSubmit, isLoading, editingKb }: KnowledgeBaseModalProps) {
  const [type, setType] = useState<KnowledgeBaseType>('dify');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  
  const [difyConfig, setDifyConfig] = useState({ apiKey: '', baseUrl: '', datasetId: '' });
  const [aliyunConfig, setAliyunConfig] = useState({ accessKeyId: '', accessKeySecret: '', regionId: '', instanceId: '' });
  const [lexiangConfig, setLexiangConfig] = useState({ apiKey: '', baseUrl: '', workspaceId: '' });
  const [customConfig, setCustomConfig] = useState({ apiKey: '', baseUrl: '' });

  useEffect(() => {
    if (editingKb) {
      setType(editingKb.type);
      setName(editingKb.name);
      setDescription(editingKb.description || '');
      setIsGlobal(editingKb.isGlobal);
      
      const config = editingKb.config;
      if (editingKb.type === 'dify') {
        setDifyConfig({
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl || '',
          datasetId: config.datasetId || ''
        });
      } else if (editingKb.type === 'aliyun') {
        setAliyunConfig({
          accessKeyId: config.accessKeyId || '',
          accessKeySecret: config.accessKeySecret || '',
          regionId: config.regionId || '',
          instanceId: config.instanceId || ''
        });
      } else if (editingKb.type === 'lexiang') {
        setLexiangConfig({
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl || '',
          workspaceId: config.workspaceId || ''
        });
      } else {
        setCustomConfig({
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl || ''
        });
      }
    } else {
      resetForm();
    }
  }, [editingKb, isOpen]);

  const resetForm = () => {
    setType('dify');
    setName('');
    setDescription('');
    setIsGlobal(false);
    setDifyConfig({ apiKey: '', baseUrl: '', datasetId: '' });
    setAliyunConfig({ accessKeyId: '', accessKeySecret: '', regionId: '', instanceId: '' });
    setLexiangConfig({ apiKey: '', baseUrl: '', workspaceId: '' });
    setCustomConfig({ apiKey: '', baseUrl: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let config: any;
    switch (type) {
      case 'dify':
        config = { type: 'dify', ...difyConfig };
        break;
      case 'aliyun':
        config = { type: 'aliyun', ...aliyunConfig };
        break;
      case 'lexiang':
        config = { type: 'lexiang', ...lexiangConfig };
        break;
      default:
        config = { type: 'custom', ...customConfig };
    }
    
    onSubmit({ name, type, config, description, isGlobal, isActive: editingKb?.isActive ?? true });
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingKb ? '编辑知识库' : '添加知识库'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">知识库类型</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as KnowledgeBaseType)}
              disabled={!!editingKb}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="dify">Dify 知识库</option>
              <option value="aliyun">阿里云知识库</option>
              <option value="lexiang">乐享知识库</option>
              <option value="custom">自定义知识库</option>
            </select>
            {type === 'custom' && (
              <p className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>自定义知识库允许你连接任何符合 REST API 规范的知识库服务。需要实现 /retrieve 和 /health 接口。</span>
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">名称</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入知识库名称"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入知识库描述"
            />
          </div>
          
          {type === 'dify' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input 
                  type="password"
                  value={difyConfig.apiKey}
                  onChange={(e) => setDifyConfig({ ...difyConfig, apiKey: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                <input 
                  type="text"
                  value={difyConfig.baseUrl}
                  onChange={(e) => setDifyConfig({ ...difyConfig, baseUrl: e.target.value })}
                  required={!editingKb}
                  placeholder="https://api.dify.ai/v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dataset ID</label>
                <input 
                  type="text"
                  value={difyConfig.datasetId}
                  onChange={(e) => setDifyConfig({ ...difyConfig, datasetId: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
          
          {type === 'aliyun' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Key ID</label>
                <input 
                  type="text"
                  value={aliyunConfig.accessKeyId}
                  onChange={(e) => setAliyunConfig({ ...aliyunConfig, accessKeyId: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Key Secret</label>
                <input 
                  type="password"
                  value={aliyunConfig.accessKeySecret}
                  onChange={(e) => setAliyunConfig({ ...aliyunConfig, accessKeySecret: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Region ID</label>
                <input 
                  type="text"
                  value={aliyunConfig.regionId}
                  onChange={(e) => setAliyunConfig({ ...aliyunConfig, regionId: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instance ID</label>
                <input 
                  type="text"
                  value={aliyunConfig.instanceId}
                  onChange={(e) => setAliyunConfig({ ...aliyunConfig, instanceId: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
          
          {type === 'lexiang' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input 
                  type="password"
                  value={lexiangConfig.apiKey}
                  onChange={(e) => setLexiangConfig({ ...lexiangConfig, apiKey: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                <input 
                  type="text"
                  value={lexiangConfig.baseUrl}
                  onChange={(e) => setLexiangConfig({ ...lexiangConfig, baseUrl: e.target.value })}
                  required={!editingKb}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Workspace ID（可选）</label>
                <input 
                  type="text"
                  value={lexiangConfig.workspaceId}
                  onChange={(e) => setLexiangConfig({ ...lexiangConfig, workspaceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
          
          {type === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key（可选）</label>
                <input 
                  type="password"
                  value={customConfig.apiKey}
                  onChange={(e) => setCustomConfig({ ...customConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                <input 
                  type="text"
                  value={customConfig.baseUrl}
                  onChange={(e) => setCustomConfig({ ...customConfig, baseUrl: e.target.value })}
                  required={!editingKb}
                  placeholder="https://your-custom-kb.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600">
                <p className="font-medium mb-2">自定义知识库 API 规范：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>POST /retrieve</code> - 接收 {'{ query, top_k }'}，返回 {'{ results: [{ content, source, score }] }'}</li>
                  <li><code>GET /health</code> - 健康检查，返回 200 OK</li>
                </ul>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isGlobal"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isGlobal" className="text-sm text-gray-700">
              <Globe className="w-4 h-4 inline mr-1" />
              全局知识库（所有 Agent 都可用）
            </label>
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
              {isLoading ? (editingKb ? '保存中...' : '添加中...') : (editingKb ? '保存' : '添加')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KnowledgeBasesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { data: knowledgeBases = [] } = useQuery('knowledgeBases', fetchKnowledgeBases);
  
  const createMutation = useMutation(createKnowledgeBase, {
    onSuccess: () => {
      queryClient.invalidateQueries('knowledgeBases');
      setShowModal(false);
      setEditingKb(null);
    },
  });
  
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<KnowledgeBase> }) => updateKnowledgeBase(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('knowledgeBases');
        setShowModal(false);
        setEditingKb(null);
      },
    }
  );
  
  const deleteMutation = useMutation(deleteKnowledgeBase, {
    onSuccess: () => {
      queryClient.invalidateQueries('knowledgeBases');
    },
  });

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      await testConnection(id);
    } finally {
      setTestingId(null);
    }
  };

  const handleEdit = (kb: KnowledgeBase) => {
    setEditingKb(kb);
    setShowModal(true);
  };

  const handleSubmit = (kb: any) => {
    if (editingKb) {
      updateMutation.mutate({ id: editingKb.id, data: kb });
    } else {
      createMutation.mutate(kb);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">知识库管理</h1>
        <p className="text-gray-600">管理和配置第三方知识库，为 AI 员工提供知识支持</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            <Database className="w-4 h-4" />
            {knowledgeBases.length} 个知识库
          </span>
        </div>
        <button
          onClick={() => {
            setEditingKb(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加知识库
        </button>
      </div>

      <div className="grid gap-4">
        {knowledgeBases.map((kb) => (
          <div key={kb.id} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <KnowledgeBaseIcon type={kb.type} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{kb.name}</h3>
                    {kb.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">
                        <CheckCircle className="w-3 h-3" />
                        已启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                        <XCircle className="w-3 h-3" />
                        已禁用
                      </span>
                    )}
                    {kb.isGlobal && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
                        <Globe className="w-3 h-3" />
                        全局
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{getKnowledgeBaseLabel(kb.type)}</p>
                  {kb.description && (
                    <p className="text-sm text-gray-600 mt-2">{kb.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestConnection(kb.id)}
                  disabled={testingId === kb.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4" />
                  {testingId === kb.id ? '测试中...' : '测试连接'}
                </button>
                <button
                  onClick={() => updateMutation.mutate({ id: kb.id, data: { isActive: !kb.isActive } })}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title={kb.isActive ? '禁用' : '启用'}
                >
                  {kb.isActive ? <XCircle className="w-4 h-4 text-gray-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                </button>
                <button
                  onClick={() => handleEdit(kb)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="编辑"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(kb.id)}
                  className="p-2 hover:bg-red-50 rounded-lg"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {knowledgeBases.length === 0 && (
          <div className="text-center py-16">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无知识库</h3>
            <p className="text-gray-500 mb-6">添加一个知识库来为 AI 员工提供知识支持</p>
            <button
              onClick={() => {
                setEditingKb(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              添加知识库
            </button>
          </div>
        )}
      </div>

      <KnowledgeBaseModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingKb(null);
        }}
        onSubmit={handleSubmit}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
        editingKb={editingKb}
      />
    </div>
  );
}
