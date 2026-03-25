import { MoreHorizontal } from 'lucide-react';
import { Agent, Group, Human } from '../../types';
import GroupAvatar from '../GroupAvatar';

interface ChatHeaderProps {
  type: 'agent' | 'group' | 'human';
  target: Agent | Group | Human;
  onMenuClick?: () => void;
}

export default function ChatHeader({ type, target, onMenuClick }: ChatHeaderProps) {
  const renderAvatar = () => {
    if (type === 'agent') {
      const agent = target as Agent;
      return (
        <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-medium">
          {agent.name.charAt(0)}
        </div>
      );
    } else if (type === 'human') {
      const human = target as Human;
      return human.avatar ? (
        <img
          src={human.avatar}
          alt={human.name}
          className="w-9 h-9 rounded-lg object-cover"
        />
      ) : (
        <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-medium">
          {human.name.charAt(0)}
        </div>
      );
    } else {
      const group = target as Group;
      return <GroupAvatar name={group.name} size={36} />;
    }
  };

  const getSubtitle = () => {
    if (type === 'agent') return '在线';
    if (type === 'group') return '群组';
    if (type === 'human') {
      const human = target as Human;
      return human.email || '用户';
    }
    return '';
  };

  return (
    <div className="h-14 px-5 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center gap-3">
        {renderAvatar()}
        <div>
          <h2 className="font-semibold text-gray-900">{target.name}</h2>
          <p className="text-sm text-gray-500">{getSubtitle()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            className="p-2 hover:bg-gray-100 rounded-lg"
            onClick={onMenuClick}
          >
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
