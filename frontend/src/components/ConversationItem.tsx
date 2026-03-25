import { Users, Pin, PinOff, User } from 'lucide-react';
import type { Agent, Group, Human } from '../types';
import GroupAvatar from './GroupAvatar';

interface Conversation {
  id: string;
  name: string;
  type: 'agent' | 'group' | 'human';
  data?: Agent | Group | Human;
  avatar?: string;
  email?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    fromType: 'human' | 'agent' | 'system';
    fromName?: string;
  };
  unreadCount?: number;
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onTogglePin?: () => void;
}

export default function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onTogglePin
}: ConversationItemProps) {
  const avatarColors = [
    'from-purple-400 to-purple-600',
    'from-blue-400 to-blue-600',
    'from-pink-400 to-pink-600',
    'from-cyan-400 to-cyan-600',
    'from-orange-400 to-orange-600',
  ];
  const colorIndex = conversation.name.charCodeAt(0) % avatarColors.length;
  
  const agent = conversation.type === 'agent' ? (conversation.data as Agent) : null;
  const isPinned = agent?.isPinned || false;

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin();
    }
  };

  const renderAvatar = () => {
    if (conversation.type === 'human') {
      if (conversation.avatar) {
        return (
          <img
            src={conversation.avatar}
            alt={conversation.name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        );
      }
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          <User size={20} />
        </div>
      );
    } else if (conversation.type === 'agent') {
      return (
        <div className="relative">
          <div
            className={`w-10 h-10 bg-gradient-to-br ${avatarColors[colorIndex]} rounded-lg flex items-center justify-center text-white font-bold`}
          >
            {conversation.name.charAt(0)}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
        </div>
      );
    } else {
      return <GroupAvatar name={conversation.name} size={40} />;
    }
  };

  const renderSubtitle = () => {
    if (conversation.type === 'human') {
      return conversation.email || '真人用户';
    } else if (conversation.type === 'agent') {
      return agent?.description || agent?.role || 'AI 员工';
    } else {
      return '群组';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      {renderAvatar()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className={`font-medium ${
              isSelected ? 'text-blue-700' : 'text-gray-900'
            } text-left`}
          >
            {conversation.name}
          </span>
          {conversation.type === 'agent' && onTogglePin && (
            <span
              onClick={handlePinClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTogglePin?.();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={isPinned ? '取消置顶' : '置顶'}
              className={`p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0 ml-2 cursor-pointer ${
                isPinned ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isPinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
            </span>
          )}
          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <span className="flex-shrink-0 ml-2 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
              {conversation.unreadCount}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate text-left">
          {conversation.lastMessage?.content || renderSubtitle()}
        </p>
      </div>
    </button>
  );
}
