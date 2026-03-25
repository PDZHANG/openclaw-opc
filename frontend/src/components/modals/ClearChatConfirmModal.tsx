import { X } from 'lucide-react';

interface ClearChatConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearChatConfirmModal({
  isOpen,
  onClose,
  onConfirm
}: ClearChatConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">确认清空聊天记录？</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-600 mb-6">此操作将删除所有聊天记录，无法恢复，确定要继续吗？</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            清空
          </button>
        </div>
      </div>
    </div>
  );
}
