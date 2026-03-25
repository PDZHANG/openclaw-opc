import React, { useState, useEffect } from 'react';
import { X, User, Search, MessageSquare } from 'lucide-react';
import { useQuery } from 'react-query';
import { fetchHumanUsers } from '../../services/api';
import type { Human } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface SelectHumanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (human: Human) => void;
}

export default function SelectHumanModal({ isOpen, onClose, onSelect }: SelectHumanModalProps) {
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: humans, isLoading } = useQuery('humanUsers', fetchHumanUsers);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredHumans = (humans || []).filter((h: Human) => 
    h.id !== currentUser?.id && 
    (h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     h.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">选择用户</h2>
              <p className="text-sm text-gray-500">选择要开始聊天的用户</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredHumans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User size={48} className="mx-auto mb-4 opacity-20" />
                <p>没有找到匹配的用户</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHumans.map((human: Human) => (
                  <button
                    key={human.id}
                    onClick={() => {
                      onSelect(human);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                  >
                    {human.avatar ? (
                      <img
                        src={human.avatar}
                        alt={human.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-medium text-lg">
                        {human.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{human.name}</h3>
                      <p className="text-sm text-gray-500">{human.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600">
                      <MessageSquare size={20} />
                      <span className="text-sm font-medium">开始聊天</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
