import { useRef, useEffect } from 'react';
import { Send, Trash2, Check, CheckCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageWithReadStatus, Agent } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface MessageListProps {
  messages: MessageWithReadStatus[];
  chatName: string;
  isGroup?: boolean;
  agents: Agent[];
  typingUsers: Array<{ userId?: string; agentId?: string }>;
  onDeleteMessage?: (messageId: string) => void;
  showDeleteConfirm?: string | null;
  onShowDeleteConfirm?: (messageId: string | null) => void;
}

export default function MessageList({
  messages,
  chatName,
  isGroup = false,
  agents,
  typingUsers,
  onDeleteMessage,
  onShowDeleteConfirm
}: MessageListProps) {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => <h1 className="text-xl font-bold my-2" {...props} />,
          h2: ({ ...props }) => <h2 className="text-lg font-bold my-2" {...props} />,
          h3: ({ ...props }) => <h3 className="text-base font-bold my-1" {...props} />,
          p: ({ ...props }) => <p className="my-1" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc list-inside my-1" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal list-inside my-1" {...props} />,
          li: ({ ...props }) => <li className="my-0.5" {...props} />,
          code: ({ ...props }) => (
            <code className="bg-gray-200 rounded px-1 py-0.5 text-sm font-mono" {...props} />
          ),
          pre: ({ ...props }) => (
            <pre className="bg-gray-100 rounded p-3 my-2 overflow-x-auto" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-3 my-2" {...props} />
          ),
          a: ({ ...props }) => (
            <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full border-collapse border border-gray-300" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th className="border border-gray-300 px-3 py-1 bg-gray-100 font-bold" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border border-gray-300 px-3 py-1" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Send size={40} className="text-gray-300" />
          </div>
          <p className="text-base">开始与 {chatName} 聊天</p>
          {isGroup && (
            <p className="text-sm mt-2">使用 @ 提及 AI 员工</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {messages.map((message) => (
            message.fromType === 'system' ? (
              <div key={message.id} className="flex justify-center my-4">
                <div className="bg-yellow-50 border border-yellow-200 px-6 py-3 rounded-xl max-w-[80%]">
                  <div className="text-sm text-yellow-800 leading-relaxed">
                    {renderContent(message.content)}
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={message.id}
                className={`flex ${message.fromType === 'human' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[70%] ${message.fromType === 'human' ? 'flex-row-reverse' : ''}`}>
                  {message.fromType === 'human' ? (
                    user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt="我"
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-medium shrink-0">
                        我
                      </div>
                    )
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-medium shrink-0">
                      {message.fromName?.charAt(0) || '?'}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${message.fromType === 'human' ? 'items-end' : 'items-start'}`}>
                    {message.fromType !== 'human' && (
                      <span className="text-xs text-gray-500 mb-1">{message.fromName}</span>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.fromType === 'human'
                          ? 'bg-blue-600 text-white rounded-tr-md'
                          : 'bg-gray-100 text-gray-900 rounded-tl-md'
                      }`}
                    >
                      <div className="text-sm leading-relaxed [&>:first-child]:mt-0 [&>:last-child]:mb-0">
                        {renderContent(message.content)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {formatTime(message.createdAt)}
                      </span>
                      {message.fromType === 'human' && (
                        <div className="flex items-center gap-1">
                          {message.readBy && message.readBy.length > 0 ? (
                            <>
                              <CheckCheck size={14} className="text-blue-500" />
                              {message.readBy.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {message.readBy.length}人已读
                                </span>
                              )}
                            </>
                          ) : (
                            <Check size={14} className="text-gray-400" />
                          )}
                        </div>
                      )}
                      {message.readBy && message.readBy.length > 0 && (
                        <div className="group relative">
                          <span className="text-xs text-gray-400 cursor-help">
                            已读
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                            {message.readBy.map((read) => (
                              <div key={read.id}>
                                {read.userType === 'human' ? '我' : agents.find((a) => a.id === read.userId)?.name || read.userId}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {onDeleteMessage && onShowDeleteConfirm && (
                        <button 
                          className="p-1 hover:bg-gray-100 rounded"
                          onClick={() => onShowDeleteConfirm(message.id)}
                        >
                          <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}
          
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.map((u) => {
                  const agent = agents.find((a) => a.id === u.agentId);
                  return agent?.name || '正在输入...';
                }).join(', ')}{' '}
                正在输入...
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
