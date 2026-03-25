import { useState, useMemo } from 'react';
import { Clock, MessageSquare, Zap, CheckCircle2, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import type { InteractionEvent as IEvent } from '../types';

interface InteractionTimelineProps {
  events?: IEvent[];
  agents?: Array<{ id: string; name: string }>;
}

export default function InteractionTimeline({ events = [], agents = [] }: InteractionTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);

  const toggleEvent = (id: string) => {
    setExpandedEvents(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const getAgentName = (agentId?: string) => {
    if (!agentId) return '系统';
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  };

  const displayEvents = useMemo(() => {
    if (events.length === 0) return [];
    
    return events.map(event => ({
      id: event.id,
      timestamp: event.createdAt,
      type: event.eventType as any,
      from: getAgentName(event.fromAgentId),
      to: event.toAgentId ? getAgentName(event.toAgentId) : undefined,
      content: event.content
    }));
  }, [events, agents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task_assignment':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'task_update':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'task_complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'message':
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-sm">
      <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        交互过程时间线
      </h3>
      
      <div className="space-y-4">
        {displayEvents.map((event, index) => (
        <div key={event.id} className="relative">
          {index < displayEvents.length - 1 && (
            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-blue-200" />
          )}
          
          <div className="flex gap-4">
            <div className="relative z-10 w-6 h-6 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center flex-shrink-0 shadow-sm">
              {getEventIcon(event.type)}
            </div>
            
            <div className="flex-1">
              <div 
                className="bg-white/60 border border-white/60 rounded-xl p-4 cursor-pointer hover:bg-white hover:shadow-md transition-all"
                onClick={() => toggleEvent(event.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{event.from}</span>
                    {event.to && <span className="text-gray-500">→</span>}
                    {event.to && <span className="font-medium text-gray-700">{event.to}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatTime(event.timestamp)}</span>
                    {expandedEvents.includes(event.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mt-2">{event.content}</p>
                
                {expandedEvents.includes(event.id) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">详细内容区域...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      </div>
      
      {displayEvents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无交互记录</p>
        </div>
      )}
    </div>
  );
}
