
import { useState, useRef, useEffect, useCallback } from 'react'
import { Smile, Paperclip, Send, Mic, ThumbsUp, MoreVertical, AtSign, Trash2, Check, CheckCheck, User, CheckSquare, Square } from 'lucide-react'
import TaskDetailSidebar from './TaskDetailSidebar'
import TaskConfirmationModal from './modals/TaskConfirmationModal'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { 
  fetchMessages, 
  deleteMessage, 
  deleteConversation, 
  fetchCollaborationTasks, 
  updateCollaborationTask,
  fetchMessagesWithReadStatus,
  markConversationAsRead,
  markMessageAsRead
} from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuthStore } from '../store/authStore'
import type { Agent, Message, Group, Human, CollaborationTask, MessageWithReadStatus } from '../types'

interface ChatWindowProps {
  selectedAgent: Agent | null
  selectedGroup: Group | null
  selectedHuman: Human | null
  agents: Agent[]
  humans: Human[]
  refreshKey?: number
  onNewMessage?: (message: Message) => void
  tasks: CollaborationTask[]
  onTasksChange?: (tasks: CollaborationTask[]) => void
  selectedTask: CollaborationTask | null
  onSelectedTaskChange?: (task: CollaborationTask | null) => void
  onTaskStatusChange?: (taskId: string, status: CollaborationTask['status']) => void
}

export default function ChatWindow({ 
  selectedAgent, 
  selectedGroup, 
  selectedHuman, 
  agents, 
  humans, 
  refreshKey, 
  onNewMessage,
  tasks,
  onTasksChange,
  selectedTask,
  onSelectedTaskChange,
  onTaskStatusChange
}: ChatWindowProps) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<MessageWithReadStatus[]>([])
  const [input, setInput] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [typingUsers, setTypingUsers] = useState<{ userId?: string; agentId?: string }[]>([])
  const [isSendingDirect, setIsSendingDirect] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showTaskConfirm, setShowTaskConfirm] = useState(false)
  const [pendingTask, setPendingTask] = useState<CollaborationTask | null>(null)
  const [isTaskConfirming, setIsTaskConfirming] = useState(false)
  const [isTaskMode, setIsTaskMode] = useState(false)

  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
    '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
    '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
    '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
    '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '👍',
    '👎', '👏', '🙌', '🤝', '❤️', '💛', '💚', '💙'
  ]

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getCurrentTargetId = () => {
    if (selectedAgent) return selectedAgent.id
    if (selectedGroup) return selectedGroup.id
    if (selectedHuman) return selectedHuman.id
    return ''
  }

  const getCurrentTargetType = () => {
    if (selectedAgent) return 'agent'
    if (selectedGroup) return 'group'
    if (selectedHuman) return 'human'
    return ''
  }

  const handleNewMessage = useCallback((message: Message) => {
    const currentTargetId = getCurrentTargetId()
    const currentTargetType = getCurrentTargetType()
    
    const isRelevant = 
      (selectedAgent && (message.fromId === selectedAgent.id || message.toId === selectedAgent.id)) ||
      (selectedGroup && message.toId === selectedGroup.id && message.toType === 'group') ||
      (selectedHuman && ((message.fromId === selectedHuman.id && message.toId === user?.id) ||
      (message.fromId === user?.id && message.toId === selectedHuman.id)))
    
    if (isRelevant) {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev
        if (message.fromType === 'human') {
          const filtered = prev.filter(m => !m.id.startsWith('temp-'))
          return [...filtered, message]
        }
        const newMessages = [...prev, message]
        return newMessages
      })
      onNewMessage?.(message)
    }
  }, [selectedAgent, selectedGroup, selectedHuman, user, onNewMessage])

  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    const isRelevant = 
      (selectedAgent && (updatedMessage.fromId === selectedAgent.id || updatedMessage.toId === selectedAgent.id)) ||
      (selectedGroup && updatedMessage.toId === selectedGroup.id && updatedMessage.toType === 'group') ||
      (selectedHuman && (updatedMessage.fromId === selectedHuman.id || updatedMessage.toId === selectedHuman.id))
    
    if (isRelevant) {
      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === updatedMessage.id) {
            return { 
              ...msg, 
              ...updatedMessage,
              readBy: msg.readBy
            }
          }
          return msg
        })
      })
    }
  }, [selectedAgent, selectedGroup, selectedHuman])

  const handleTypingIndicator = useCallback((data: { userId?: string; agentId?: string; isTyping: boolean }) => {
    if (data.isTyping) {
      setTypingUsers(prev => {
        if (prev.some(u => u.agentId === data.agentId || u.userId === data.userId)) return prev
        return [...prev, data]
      })
    } else {
      setTypingUsers(prev => prev.filter(u => u.agentId !== data.agentId && u.userId !== data.userId))
    }
  }, [])

  const handleTaskNew = useCallback((task: CollaborationTask) => {
    const isRelevant = selectedGroup && task.groupId === selectedGroup.id;
    if (isRelevant && onTasksChange) {
      onTasksChange([task, ...tasks]);
    }
  }, [selectedGroup, tasks, onTasksChange]);

  const handleTaskUpdate = useCallback((updatedTask: CollaborationTask) => {
    const isRelevant = selectedGroup && updatedTask.groupId === selectedGroup.id;
    if (isRelevant && onTasksChange) {
      onTasksChange(tasks.map(t => 
        t.id === updatedTask.id ? updatedTask : t
      ));
    }
  }, [selectedGroup, tasks, onTasksChange]);

  const handleTaskProposal = useCallback((task: CollaborationTask) => {
    const isRelevant = selectedGroup && task.groupId === selectedGroup.id;
    if (isRelevant) {
      setPendingTask(task);
      setShowTaskConfirm(true);
    }
  }, [selectedGroup]);

  const handleTaskConfirmed = useCallback((task: CollaborationTask) => {
    const isRelevant = selectedGroup && task.groupId === selectedGroup.id;
    if (isRelevant) {
      if (onTasksChange) {
        onTasksChange([task, ...tasks]);
      }
    }
  }, [selectedGroup, tasks, onTasksChange]);

  const handleTaskRejected = useCallback((task: CollaborationTask) => {
    const isRelevant = selectedGroup && task.groupId === selectedGroup.id;
    if (isRelevant) {
      console.log('Task rejected:', task.id);
    }
  }, [selectedGroup]);

  const { sendMessage: wsSendMessage, startTyping, stopTyping, joinGroup, leaveGroup, authenticate, confirmTask, rejectTask } = useWebSocket({
    onMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate,
    onTypingIndicator: handleTypingIndicator,
    onTaskNew: handleTaskNew,
    onTaskUpdate: handleTaskUpdate,
    onTaskProposal: handleTaskProposal,
    onTaskConfirmed: handleTaskConfirmed,
    onTaskRejected: handleTaskRejected
  })

  useEffect(() => {
    if (user) {
      authenticate(user.id, 'human');
    }
  }, [user, authenticate])

  const loadMessages = useCallback(async () => {
    setTypingUsers([])
    if (selectedAgent) {
      try {
        const msgs = await fetchMessagesWithReadStatus('direct', selectedAgent.id, 50, user?.id, 'human')
        setMessages(msgs)
        await markConversationAsRead('direct', selectedAgent.id, user?.id || '', 'human')
      } catch (e) {
        console.error('Failed to load messages:', e)
      }
    } else if (selectedHuman) {
      try {
        const msgs = await fetchMessagesWithReadStatus('direct', selectedHuman.id, 50, user?.id, 'human')
        setMessages(msgs)
        await markConversationAsRead('direct', selectedHuman.id, user?.id || '', 'human')
      } catch (e) {
        console.error('Failed to load messages:', e)
      }
    } else if (selectedGroup) {
      try {
        const msgs = await fetchMessagesWithReadStatus('group', selectedGroup.id, 50, user?.id, 'human')
        setMessages(msgs)
        await markConversationAsRead('group', selectedGroup.id, user?.id || '', 'human')
      } catch (e) {
        console.error('Failed to load messages:', e)
      }
      joinGroup(selectedGroup.id)
    }
  }, [selectedAgent, selectedHuman, selectedGroup, joinGroup, user])

  const loadTasks = useCallback(async () => {
    if (!selectedGroup || !onTasksChange) return
    try {
      const groupTasks = await fetchCollaborationTasks({ groupId: selectedGroup.id })
      onTasksChange(groupTasks)
    } catch (e) {
      console.error('Failed to load tasks:', e)
    }
  }, [selectedGroup, onTasksChange])

  useEffect(() => {
    loadMessages()
    loadTasks()

    return () => {
      if (selectedGroup) {
        leaveGroup(selectedGroup.id)
      }
    }
  }, [loadMessages, loadTasks, selectedGroup, leaveGroup])

  useEffect(() => {
    if (refreshKey !== undefined) {
      loadMessages()
      loadTasks()
    }
  }, [refreshKey, loadMessages, loadTasks])

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

  const parseMentions = (content: string): string[] => {
    const mentions: string[] = []
    
    for (const agent of agents) {
      const mentionPattern = new RegExp(`@${agent.name}`, 'g')
      if (mentionPattern.test(content) && !mentions.includes(agent.id)) {
        mentions.push(agent.id)
      }
    }
    
    return mentions
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)

    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1)
      const spaceAfterAt = textAfterAt.includes(' ')
      
      if (!spaceAfterAt) {
        setMentionFilter(textAfterAt.toLowerCase())
        setShowMentions(true)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const handleMentionSelect = (agent: Agent) => {
    const lastAtIndex = input.lastIndexOf('@')
    const newInput = input.slice(0, lastAtIndex) + `@${agent.name} `
    setInput(newInput)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(mentionFilter) ||
    agent.id.toLowerCase().includes(mentionFilter)
  )

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId)
      setMessages(prev => prev.filter(m => m.id !== messageId))
      setShowDeleteConfirm(null)
    } catch (e) {
      console.error('Failed to delete message:', e)
      loadMessages()
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSendingDirect) return

    const mentions = parseMentions(input)
    const now = new Date()
    const userInput = input
    setInput('')
    setShowMentions(false)

    const getToId = () => {
      if (selectedAgent) return selectedAgent.id
      if (selectedGroup) return selectedGroup.id
      if (selectedHuman) return selectedHuman.id
      return ''
    }

    const getToType = () => {
      if (selectedAgent) return 'direct'
      if (selectedGroup) return 'group'
      if (selectedHuman) return 'direct'
      return 'direct'
    }

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      type: 'text',
      fromId: 'user',
      fromType: 'human',
      fromName: user?.name || 'User',
      toType: getToType(),
      toId: getToId(),
      content: userInput,
      status: 'sent',
      mentions: selectedGroup ? mentions : undefined,
      createdAt: now.toISOString()
    }
    setMessages(prev => [...prev, tempMessage])
    
    if (selectedHuman) {
      wsSendMessage({
        fromId: user?.id || 'user',
        fromType: 'human',
        fromName: user?.name || 'User',
        toType: 'direct',
        toId: selectedHuman.id,
        content: userInput
      })
    } else if (selectedGroup) {
      wsSendMessage({
        fromId: user?.id || 'user',
        fromType: 'human',
        fromName: user?.name || 'User',
        toType: 'group',
        toId: selectedGroup.id,
        content: userInput,
        mentions,
        isTaskMode
      })
    } else if (selectedAgent) {
      setIsSendingDirect(true)
      wsSendMessage({
        fromId: user?.id || 'user',
        fromType: 'human',
        fromName: user?.name || 'User',
        toType: 'direct',
        toId: selectedAgent.id,
        content: userInput,
        mentions
      })
      setIsSendingDirect(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const renderContent = (content: string) => {
    let result: any[] = [content]
    
    for (const agent of agents) {
      const mention = `@${agent.name}`
      result = result.flatMap(part => {
        if (typeof part === 'string') {
          const parts: any[] = []
          let remaining = part
          let index
          while ((index = remaining.indexOf(mention)) !== -1) {
            if (index > 0) {
              parts.push(remaining.slice(0, index))
            }
            parts.push({ type: 'mention', agent, text: mention })
            remaining = remaining.slice(index + mention.length)
          }
          if (remaining.length > 0) {
            parts.push(remaining)
          }
          return parts
        }
        return part
      })
    }
    
    return result.map((part, index) => {
      if (typeof part === 'object' && part.type === 'mention') {
        return (
          <span
            key={index}
            className="px-2 py-0.5 rounded bg-blue-600 text-white font-medium"
          >
            {part.text}
          </span>
        )
      }
      
      if (typeof part === 'string') {
        const toolCallMatch = part.match(/^\[Tool Call\]\s*\((\w+)\)/i)
        if (toolCallMatch) {
          return (
            <div key={index} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              <span>🔧</span>
              <span>工具调用: {toolCallMatch[1]}</span>
            </div>
          )
        }
        
        if (part.startsWith('[Tool Call]')) {
          return (
            <div key={index} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              <span>🔧</span>
              <span>工具调用</span>
            </div>
          )
        }
      }
      
      return (
        <ReactMarkdown
          key={index}
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ ...props }) => <h1 className="text-xl font-bold my-2" {...props} />,
            h2: ({ ...props }) => <h2 className="text-lg font-bold my-2" {...props} />,
            h3: ({ ...props }) => <h3 className="text-base font-bold my-1" {...props} />,
            p: ({ ...props }) => <p className="my-1 break-words" {...props} />,
            ul: ({ ...props }) => <ul className="list-disc list-inside my-1" {...props} />,
            ol: ({ ...props }) => <ol className="list-decimal list-inside my-1" {...props} />,
            li: ({ ...props }) => <li className="my-0.5 break-words" {...props} />,
            code: ({ ...props }) => (
              <code className="bg-gray-200 rounded px-1 py-0.5 text-sm font-mono break-all" {...props} />
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
          {part}
        </ReactMarkdown>
      )
    })
  }

  const handleConfirmTask = async (taskId: string, groupId: string) => {
    setIsTaskConfirming(true);
    try {
      confirmTask(taskId, groupId);
      setShowTaskConfirm(false);
      setPendingTask(null);
    } catch (error) {
      console.error('Error confirming task:', error);
    } finally {
      setIsTaskConfirming(false);
    }
  };

  const handleRejectTask = async (taskId: string, groupId: string) => {
    setIsTaskConfirming(true);
    try {
      rejectTask(taskId, groupId);
      setShowTaskConfirm(false);
      setPendingTask(null);
    } catch (error) {
      console.error('Error rejecting task:', error);
    } finally {
      setIsTaskConfirming(false);
    }
  };

  if (!selectedAgent && !selectedGroup && !selectedHuman) {
    return null
  }

  const chatName = selectedAgent?.name || selectedGroup?.name || selectedHuman?.name || ''

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Send size={40} className="text-gray-300" />
            </div>
            <p className="text-base">开始与 {chatName} 聊天</p>
            {selectedGroup && (
              <p className="text-sm mt-2">使用 @ 提及 AI 员工</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map(message => (
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
                  className={`flex ${message.fromId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[70%] ${message.fromId === user?.id ? 'flex-row-reverse' : ''}`}>
                    {message.fromId === user?.id ? (
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
                    
                    <div className={`flex flex-col ${message.fromId === user?.id ? 'items-end' : 'items-start'}`}>
                      {message.fromId !== user?.id && (
                        <span className="text-xs text-gray-500 mb-1">{message.fromName}</span>
                      )}
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.fromId === user?.id
                            ? 'bg-blue-600 text-white rounded-tr-md'
                            : 'bg-gray-100 text-gray-900 rounded-tl-md'
                        }`}
                      >
                        <div className="text-sm leading-relaxed [&amp;>:first-child]:mt-0 [&amp;>:last-child]:mb-0">
                          {renderContent(message.content)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.fromId === user?.id && (
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
                              {message.readBy.map(read => {
                                let userName: string;
                                if (read.userType === 'human') {
                                  if (read.userId === user?.id) {
                                    userName = '我';
                                  } else {
                                    userName = humans.find(h => h.id === read.userId)?.name || read.userId;
                                  }
                                } else {
                                  userName = agents.find(a => a.id === read.userId)?.name || read.userId;
                                }
                                return (
                                  <div key={read.id}>
                                    {userName}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <button 
                          className="p-1 hover:bg-gray-100 rounded"
                          onClick={() => setShowDeleteConfirm(message.id)}
                        >
                          <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                        </button>
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
                  {typingUsers.map(u => {
                    const agent = agents.find(a => a.id === u.agentId)
                    return agent?.name || '正在输入...'
                  }).join(', ')}{' '}
                  正在输入...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认删除消息？</h3>
            <p className="text-gray-600 mb-6">删除后无法恢复，确定要删除这条消息吗？</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteMessage(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskConfirmationModal
        isOpen={showTaskConfirm}
        onClose={() => setShowTaskConfirm(false)}
        task={pendingTask}
        agents={agents}
        onConfirm={handleConfirmTask}
        onReject={handleRejectTask}
        isLoading={isTaskConfirming}
      />

      {selectedTask && onSelectedTaskChange && (
        <TaskDetailSidebar
          task={selectedTask}
          agents={agents}
          onClose={() => onSelectedTaskChange(null)}
          onStatusChange={onTaskStatusChange}
        />
      )}

      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="flex flex-col gap-3">
          {isTaskMode && selectedGroup && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <CheckSquare size={16} className="text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">任务模式已开启</span>
              <span className="text-xs text-orange-600">发送的消息将被创建为协作任务，点击右上角任务列表查看</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                type="button" 
                className="p-2 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile size={20} className="text-gray-500" />
              </button>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-80 z-20">
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors w-9 h-9 flex items-center justify-center"
                        onClick={() => {
                          setInput(prev => prev + emoji)
                          setShowEmojiPicker(false)
                          inputRef.current?.focus()
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
              <Paperclip size={20} className="text-gray-500" />
            </button>
            <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
              <Mic size={20} className="text-gray-500" />
            </button>
            {selectedGroup && (
              <button 
                type="button" 
                onClick={() => {
                  setInput(prev => prev + '@')
                  setShowMentions(true)
                  inputRef.current?.focus()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <AtSign size={20} className="text-gray-500" />
              </button>
            )}
            {selectedGroup && (
              <button 
                type="button" 
                onClick={() => setIsTaskMode(!isTaskMode)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                  isTaskMode 
                    ? 'bg-orange-100 text-orange-600 border border-orange-300' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title={isTaskMode ? '关闭任务模式' : '开启任务模式'}
              >
                {isTaskMode ? (
                  <CheckSquare size={20} />
                ) : (
                  <Square size={20} />
                )}
                {isTaskMode && <span className="text-xs font-medium">任务模式</span>}
              </button>
            )}
          </div>
          
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={isTaskMode ? '请输入任务内容...' : `发送消息给 ${chatName}${selectedGroup ? ' (使用 @ 提及)' : ''}...`}
              className={`w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 min-h-[52px] max-h-32 ${
                isTaskMode 
                  ? 'bg-orange-50 border-2 border-orange-300 focus:ring-orange-500' 
                  : 'bg-gray-100 focus:ring-blue-500'
              }`}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
            />
            
            {showMentions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredAgents.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">没有匹配的 AI 员工</div>
                ) : (
                  filteredAgents.map(agent => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleMentionSelect(agent)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                        {agent.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        <div className="text-xs text-gray-500">{agent.role || 'AI助手'}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!input.trim() || isSendingDirect}
              className={`p-3 rounded-xl transition-colors ${
                input.trim() && !isSendingDirect
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
