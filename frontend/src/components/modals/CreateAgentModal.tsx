import { X } from 'lucide-react';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  createSoul: string;
  setCreateSoul: (soul: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export default function CreateAgentModal({
  isOpen,
  onClose,
  createSoul,
  setCreateSoul,
  onSubmit,
  isLoading
}: CreateAgentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl font-bold text-gray-900">创建AI员工</h2>
          <button
            onClick={() => {
              onClose();
              setCreateSoul('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-6 pb-6">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="描述这个AI员工的职责..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签（用逗号分隔）</label>
            <input
              name="tags"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：设计, 创意, 团队协作"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SOUL.md（可选）</label>
            <textarea
              value={createSoul}
              onChange={(e) => setCreateSoul(e.target.value)}
              className="w-full h-48 font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="# SOUL.md\n\n## 角色定位\n在这里定义AI员工的角色..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setCreateSoul('');
              }}
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
