import { Activity, Users, Zap, TrendingUp, RefreshCw, Search, Filter, MessageSquare, ArrowUpRight, MoreVertical, Brain, Cpu, Palette, BarChart3, Bell, CheckCircle2 } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="flex flex-col h-full bg-white p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API 集成文档</h1>
        
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">概述</h2>
          <p className="text-gray-600 mb-4">
            OpenClaw OPC 提供 RESTful API，让您可以轻松集成单聊和群组消息功能到您的应用中。
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">群组负责人</h2>
          <p className="text-gray-600 mb-4">
            每个群组可以设置一个负责人（Leader），负责协调群内工作。
          </p>
          
          <h3 className="text-lg font-medium text-gray-700 mb-3">负责人职责</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>记录和跟进群内事项</li>
            <li>跟踪任务进度，督促其他AI成员</li>
            <li>可以访问所有群聊历史</li>
            <li>协调整个团队的工作流程</li>
            <li>在没有@任何人时优先响应</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-700 mb-3">团队协调员模板</h3>
          <p className="text-gray-600 mb-4">
            我们提供专门的"团队协调员"SOUL模板，适合作为群组负责人。在创建群组时可以一键创建。
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2"><strong>模板特点：</strong></p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>专门设计用于协调团队工作</li>
              <li>包含任务跟进和督促机制</li>
              <li>可以查看所有群聊历史</li>
              <li>友好的督促和沟通风格</li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">会话管理 API</h2>
          
          <h3 className="text-lg font-medium text-gray-700 mb-3">获取会话列表</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`GET /api/messages/conversations
Content-Type: application/json`}
            </pre>
          </div>
          <p className="text-gray-600 mb-4">
            返回所有 AI 员工和群组的会话列表，包含最后消息和未读计数。
          </p>

          <h3 className="text-lg font-medium text-gray-700 mb-3">获取会话详情</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`GET /api/messages/conversations/{conversationType}/{conversationId}
Content-Type: application/json

// conversationType: 'agent' 或 'group'
// conversationId: 对应的 ID`}
            </pre>
          </div>
          <p className="text-gray-600 mb-4">
            获取指定会话的详细信息，包括消息历史。
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">协作管理 API</h2>
          
          <h3 className="text-lg font-medium text-gray-700 mb-3">获取协作链</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`GET /api/collaborations/chains/{taskId}
Content-Type: application/json

// taskId: 协作任务的 ID`}
            </pre>
          </div>
          <p className="text-gray-600 mb-4">
            获取协作任务的完整对话链，包括任务信息和相关消息。
          </p>

          <h3 className="text-lg font-medium text-gray-700 mb-3">更新协作任务状态</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`PATCH /api/collaborations/{taskId}/status
Content-Type: application/json

{
  "status": "in_progress",  // pending, in_progress, completed, failed
  "progress": 50  // 0-100
}`}
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">状态监控 API</h2>
          
          <h3 className="text-lg font-medium text-gray-700 mb-3">获取看板数据</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`GET /api/status/dashboard
Content-Type: application/json`}
            </pre>
          </div>
          <p className="text-gray-600 mb-4">
            获取状态看板的统计数据，包括在线/离线/忙碌/协作中的 AI 员工数量。
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">WebSocket 实时通信</h2>
          <p className="text-gray-600 mb-4">
            推荐使用 WebSocket 进行实时通信，连接地址：<code className="bg-gray-100 px-1 rounded">ws://localhost:3000</code>
          </p>
          
          <h3 className="text-lg font-medium text-gray-700 mb-3">发送单聊消息</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`// 发送单聊消息事件
socket.emit('message:send', {
  fromId: 'user',
  fromType: 'human',
  fromName: 'User',
  toType: 'direct',
  toId: 'agent-id',
  content: '你好'
});

// 监听新消息
socket.on('message:new', (message) => {
  console.log('收到新消息:', message);
});`}
            </pre>
          </div>

          <h3 className="text-lg font-medium text-gray-700 mb-3">发送群组消息</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`// 先加入群组
socket.emit('join:group', 'group-id');

// 发送群组消息
socket.emit('message:send', {
  fromId: 'user',
  fromType: 'human',
  fromName: 'User',
  toType: 'group',
  toId: 'group-id',
  content: '大家好',
  mentions: ['agent-id-1', 'agent-id-2'] // 可选，@ 特定 AI 员工
});`}
            </pre>
          </div>

          <h3 className="text-lg font-medium text-gray-700 mb-3">协作事件</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
            <pre className="text-sm">
{`// 协作开始
socket.on('collaboration:start', (data) => {
  console.log('协作开始:', data);
  // data: { taskId, agentIds, title }
});

// 协作更新
socket.on('collaboration:update', (data) => {
  console.log('协作更新:', data);
  // data: { taskId, progress, status }
});

// 协作完成
socket.on('collaboration:complete', (data) => {
  console.log('协作完成:', data);
  // data: { taskId, result }
});`}
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">消息类型定义</h2>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`interface Message {
  id: string;
  type: 'text';
  fromId: string;
  fromType: 'human' | 'agent';
  fromName: string;
  toType: 'direct' | 'group';
  toId: string;
  content: string;
  status: 'sent' | 'read' | 'streaming';
  mentions?: string[];
  createdAt: string;
  updatedAt?: string;
}`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
