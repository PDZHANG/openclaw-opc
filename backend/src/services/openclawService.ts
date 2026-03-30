import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { KnowledgeRetrievalService } from './KnowledgeRetrievalService';
import {
  GatewayConfig,
  openclawCall,
  openclawConnectMetadata,
  sendMessage as gatewaySendMessage,
  OpenClawGatewayError,
  openClawResponsesService,
} from './openclaw-gateway';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const GATEWAY_WS_URL = process.env.OPENCLAW_GATEWAY_WS_URL || 'ws://localhost:18789';
const USE_WEBSOCKET_RPC = process.env.OPENCLAW_USE_WEBSOCKET_RPC === 'true';
const USE_RESPONSES_API = process.env.OPENCLAW_USE_RESPONSES_API === 'true';
const GATEWAY_WS_ORIGIN = process.env.OPENCLAW_GATEWAY_WS_ORIGIN;

export class OpenClawService {
  private openclawPath: string;
  private gatewayUrl: string;
  private gatewayToken: string;
  private gatewayWsUrl: string;
  private useWebSocketRpc: boolean;
  private gatewayConfig: GatewayConfig;

  constructor() {
    this.openclawPath = config.openclawPath;
    this.gatewayUrl = GATEWAY_URL;
    this.gatewayToken = GATEWAY_TOKEN;
    this.gatewayWsUrl = GATEWAY_WS_URL;
    this.useWebSocketRpc = USE_WEBSOCKET_RPC;
    this.gatewayConfig = {
      url: this.gatewayWsUrl,
      token: this.gatewayToken || undefined,
      allowInsecureTls: process.env.OPENCLAW_ALLOW_INSECURE_TLS === 'true',
      disableDevicePairing: process.env.OPENCLAW_DISABLE_DEVICE_PAIRING === 'true',
      origin: GATEWAY_WS_ORIGIN,
    };
  }

  private async isGatewayWebSocketAvailable(): Promise<boolean> {
    try {
      const metadata = await openclawConnectMetadata(this.gatewayConfig);
      console.log('[OpenClawService] WebSocket gateway available:', metadata);
      return true;
    } catch (error) {
      console.warn('[OpenClawService] WebSocket gateway not available:', error);
      return false;
    }
  }

  private async isGatewayAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gatewayUrl}/health`, { method: 'GET' });
      return response.ok;
    } catch (error) {
      console.warn('OpenClaw gateway not available:', error);
      return false;
    }
  }

  async getWorkspacePath(agentId: string): Promise<string> {
    return path.join(this.openclawPath, `workspace-${agentId}`);
  }

  async getCentralTaskWorkspacePath(taskId: string): Promise<string> {
    return path.join(this.openclawPath, 'shared-task', `shared-task-${taskId}`);
  }

  async createCentralTaskWorkspace(taskId: string, taskTitle: string): Promise<string> {
    const centralWorkspacePath = await this.getCentralTaskWorkspacePath(taskId);
    
    if (!fs.existsSync(centralWorkspacePath)) {
      fs.mkdirSync(centralWorkspacePath, { recursive: true });
    }

    const prdDir = path.join(centralWorkspacePath, 'prd');
    if (!fs.existsSync(prdDir)) {
      fs.mkdirSync(prdDir, { recursive: true });
    }

    const codeDir = path.join(centralWorkspacePath, 'code');
    if (!fs.existsSync(codeDir)) {
      fs.mkdirSync(codeDir, { recursive: true });
    }

    const docsDir = path.join(centralWorkspacePath, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const readmePath = path.join(centralWorkspacePath, 'README.md');
    fs.writeFileSync(readmePath, `# ${taskTitle}\n\n任务 ID: ${taskId}\n\n## 目录结构\n\n- \`prd/\` - 产品需求文档\n- \`code/\` - 代码实现\n- \`docs/\` - 其他文档\n\n请在对应目录下存放相关文件。这是所有参与协作的 agent 共享的中央工作区。`);

    return centralWorkspacePath;
  }

  async linkTaskWorkspaceToAgent(agentId: string, taskId: string, centralWorkspacePath: string): Promise<string> {
    const agentWorkspacePath = await this.getWorkspacePath(agentId);
    const agentTaskPath = path.join(agentWorkspacePath, `task-${taskId}`);
    
    if (fs.existsSync(agentTaskPath)) {
      const stat = fs.lstatSync(agentTaskPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(agentTaskPath);
      } else if (stat.isDirectory()) {
        fs.rmSync(agentTaskPath, { recursive: true, force: true });
      }
    }

    fs.symlinkSync(centralWorkspacePath, agentTaskPath, 'junction');
    
    return agentTaskPath;
  }

  async createWorkspace(agentId: string, configs?: { soul?: string, identity?: string, tools?: string, bootstrap?: string, user?: string }): Promise<void> {
    const workspacePath = await this.getWorkspacePath(agentId);
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    const soulPath = path.join(workspacePath, 'SOUL.md');
    fs.writeFileSync(soulPath, configs?.soul || '# SOUL.md\n\n## 角色定位\n你是一位专业的AI助手。\n');

    const identityPath = path.join(workspacePath, 'IDENTITY.md');
    if (!fs.existsSync(identityPath) || configs?.identity) {
      fs.writeFileSync(identityPath, configs?.identity || '# IDENTITY.md\n\n## 身份信息\n在此定义AI员工的身份信息。\n');
    }

    const toolsPath = path.join(workspacePath, 'TOOLS.md');
    if (!fs.existsSync(toolsPath) || configs?.tools) {
      fs.writeFileSync(toolsPath, configs?.tools || '# TOOLS.md\n\n## 可用工具\n在此定义AI员工的可用工具。\n');
    }

    const bootstrapPath = path.join(workspacePath, 'BOOTSTRAP.md');
    if (!fs.existsSync(bootstrapPath) || configs?.bootstrap) {
      fs.writeFileSync(bootstrapPath, configs?.bootstrap || '# BOOTSTRAP.md\n\n## 启动配置\n在此定义AI员工的启动配置。\n');
    }

    const userPath = path.join(workspacePath, 'USER.md');
    if (!fs.existsSync(userPath) || configs?.user) {
      fs.writeFileSync(userPath, configs?.user || '# USER.md\n\n## 用户指南\n在此定义与用户交互的指导原则。\n');
    }

    const agentDir = path.join(this.openclawPath, 'agents', agentId, 'agent');
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    const sessionsDir = path.join(this.openclawPath, 'agents', agentId, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    await this.updateOpenClawConfig(agentId, workspacePath, agentDir);
  }

  async updateOpenClawConfig(agentId: string, workspacePath: string, agentDir: string): Promise<void> {
    const configPath = path.join(this.openclawPath, 'openclaw.json');
    console.log('=== updateOpenClawConfig ===');
    
    let configData: any = {};

    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        configData = JSON.parse(configContent);
      } catch (e) {
        console.error('Failed to parse existing openclaw.json:', e);
      }
    }

    if (!configData.agents) configData.agents = {};
    if (!configData.agents.list) configData.agents.list = [];
    if (!configData.bindings) configData.bindings = [];

    const existingAgentIndex = configData.agents.list.findIndex((agent: any) => agent.id === agentId);
    
    if (existingAgentIndex === -1) {
      const isFirstAgent = configData.agents.list.length === 0;
      const homeDir = process.env.USERPROFILE || process.env.HOMEPATH || process.env.HOME || '';
      
      let relativeWorkspacePath = workspacePath;
      let relativeAgentDir = agentDir;
      
      if (homeDir) {
        const normalizedHomeDir = path.normalize(homeDir);
        relativeWorkspacePath = workspacePath.replace(normalizedHomeDir, '~');
        relativeAgentDir = agentDir.replace(normalizedHomeDir, '~');
        
        // Use forward slashes for cross-platform compatibility
        relativeWorkspacePath = relativeWorkspacePath.replace(/\\/g, '/');
        relativeAgentDir = relativeAgentDir.replace(/\\/g, '/');
      }

      const newAgentConfig: any = {
        id: agentId,
        name: agentId,
        default: isFirstAgent,
        workspace: relativeWorkspacePath,
        agentDir: relativeAgentDir
      };
      
      if (configData.agents.defaults && configData.agents.defaults.model) {
        newAgentConfig.model = configData.agents.defaults.model.primary;
      }
      
      configData.agents.list.push(newAgentConfig);
      
      try {
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
        console.log(`Added agent ${agentId} to OpenClaw config`);
      } catch (writeError) {
        console.error('Failed to write config file:', writeError);
        throw writeError;
      }
    }
  }

  async updateSoul(agentId: string, soulContent: string): Promise<void> {
    const workspacePath = await this.getWorkspacePath(agentId);
    const soulPath = path.join(workspacePath, 'SOUL.md');
    fs.writeFileSync(soulPath, soulContent);
  }

  async getSoul(agentId: string): Promise<string> {
    const workspacePath = await this.getWorkspacePath(agentId);
    const soulPath = path.join(workspacePath, 'SOUL.md');
    
    if (fs.existsSync(soulPath)) {
      return fs.readFileSync(soulPath, 'utf-8');
    }
    return '';
  }

  async updateConfig(agentId: string, fileName: string, content: string): Promise<void> {
    const workspacePath = await this.getWorkspacePath(agentId);
    const filePath = path.join(workspacePath, fileName);
    fs.writeFileSync(filePath, content);
  }

  async getConfig(agentId: string, fileName: string): Promise<string> {
    const workspacePath = await this.getWorkspacePath(agentId);
    const filePath = path.join(workspacePath, fileName);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return '';
  }

  async getAllConfigs(agentId: string): Promise<{ [key: string]: string }> {
    const files = ['SOUL.md', 'IDENTITY.md', 'TOOLS.md', 'BOOTSTRAP.md', 'USER.md'];
    const configs: { [key: string]: string } = {};
    
    for (const file of files) {
      configs[file] = await this.getConfig(agentId, file);
    }
    
    return configs;
  }

  async updateAllConfigs(agentId: string, configs: { [key: string]: string }): Promise<void> {
    for (const [fileName, content] of Object.entries(configs)) {
      await this.updateConfig(agentId, fileName, content);
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    const configPath = path.join(this.openclawPath, 'openclaw.json');

    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const configData = JSON.parse(configContent);
        
        if (configData.agents && configData.agents.list) {
          const originalLength = configData.agents.list.length;
          configData.agents.list = configData.agents.list.filter((agent: any) => agent.id !== agentId);
          
          if (configData.agents.list.length !== originalLength) {
            if (configData.agents.list.length > 0 && !configData.agents.list.some((agent: any) => agent.default)) {
              configData.agents.list[0].default = true;
            }
            
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
            console.log(`Removed agent ${agentId} from config`);
          }
        }
      } catch (e) {
        console.error('Error updating config:', e);
      }
    }

    const workspacePath = await this.getWorkspacePath(agentId);
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }

    const agentDir = path.join(this.openclawPath, 'agents', agentId);
    if (fs.existsSync(agentDir)) {
      fs.rmSync(agentDir, { recursive: true, force: true });
    }
  }

  async sendMessage(agentId: string, message: string, user?: string): Promise<string> {
    console.log(`[OpenClawService] sendMessage called, agentId=${agentId}, message="${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    
    const knowledgeContent = await KnowledgeRetrievalService.retrieveAndFormat(agentId, message);
    let finalMessage = message;
    if (knowledgeContent) {
      finalMessage = `${message}\n\n${knowledgeContent}`;
      console.log(`[OpenClawService] Injected knowledge for agent ${agentId}`);
    }
    
    console.log(`[OpenClawService] Final message to send: "${finalMessage.substring(0, 100)}${finalMessage.length > 100 ? '...' : ''}"`);

    if (USE_RESPONSES_API) {
      console.log('[OpenClawService] Using OpenResponses API');
      return this.sendMessageViaResponsesApi(agentId, finalMessage, user);
    }

    if (this.useWebSocketRpc) {
      return this.sendMessageViaWebSocket(agentId, finalMessage, user);
    }

    return this.sendMessageViaHttp(agentId, finalMessage, user);
  }

  private async sendMessageViaResponsesApi(agentId: string, message: string, user?: string): Promise<string> {
    try {
      console.log('[OpenClawService] Calling OpenResponses API for agent:', agentId);
      const response = await openClawResponsesService.createResponse(
        agentId,
        message,
        { user, injectKnowledge: false }
      );
      
      const text = openClawResponsesService.extractTextFromResponse(response);
      console.log('[OpenClawService] OpenResponses API response received');
      return text;
    } catch (error) {
      console.error('Error calling OpenResponses API:', error);
      return this.getMockResponse(agentId, message);
    }
  }

  private async sendMessageViaHttp(agentId: string, message: string, user?: string): Promise<string> {
    const gatewayAvailable = await this.isGatewayAvailable();
    
    if (!gatewayAvailable) {
      console.warn('OpenClaw HTTP gateway not available, using mock response');
      return this.getMockResponse(agentId, message);
    }

    try {
      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.gatewayToken && { 'Authorization': `Bearer ${this.gatewayToken}` })
        },
        body: JSON.stringify({
          model: `openclaw:${agentId}`,
          messages: [{ role: 'user', content: message }],
          stream: false,
          ...(user && { user })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      const rawContent = data.choices[0]?.message?.content;
      console.log('[OpenClawService] Raw HTTP response content:', rawContent, 'type:', typeof rawContent);
      
      let content: string;
      if (typeof rawContent === 'string') {
        content = rawContent;
      } else if (rawContent && typeof rawContent === 'object') {
        content = JSON.stringify(rawContent);
      } else {
        content = String(rawContent || 'No response from OpenClaw');
      }
      
      console.log('[OpenClawService] Returning HTTP content:', content.substring(0, 100) + '...');
      return content;
    } catch (error) {
      console.error('Error calling OpenClaw HTTP:', error);
      return this.getMockResponse(agentId, message);
    }
  }

  private async sendMessageViaWebSocket(agentId: string, message: string, user?: string): Promise<string> {
    const gatewayAvailable = await this.isGatewayWebSocketAvailable();
    
    if (!gatewayAvailable) {
      console.warn('OpenClaw WebSocket gateway not available, falling back to HTTP');
      return this.sendMessageViaHttp(agentId, message, user);
    }

    try {
      const sessionKey = `agent:${agentId}:opc-session`;
      
      console.log('[OpenClawService] Ensuring session exists:', sessionKey);
      
      console.log('[OpenClawService] Listing agents...');
      const agents = await openclawCall('agents.list', null, this.gatewayConfig);
      console.log('[OpenClawService] Agents:', JSON.stringify(agents, null, 2));
      
      await openclawCall('sessions.patch', { key: sessionKey, label: `OPC Session for ${agentId}` }, this.gatewayConfig);
      
      const initialHistory = await openclawCall('chat.history', { sessionKey, limit: 50 }, this.gatewayConfig);
      const initialMessageCount = initialHistory?.messages?.length || 0;
      
      console.log('[OpenClawService] Sending message to OpenClaw:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
      await gatewaySendMessage(message, sessionKey, this.gatewayConfig, true);
      
      console.log('[OpenClawService] WebSocket message sent, polling for response...');
      
      let retryCount = 0;
      const maxRetries = 120;
      let lastProcessedMessageIndex = initialMessageCount;
      let finalContent = '';
      
      while (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const history = await openclawCall('chat.history', { sessionKey, limit: 100 }, this.gatewayConfig);
        console.log(`[OpenClawService] Poll #${retryCount}: history=${JSON.stringify(history, null, 2)}`);
        
        if (history && history.messages && history.messages.length > lastProcessedMessageIndex) {
          console.log(`[OpenClawService] New messages! total=${history.messages.length}, new=${history.messages.length - lastProcessedMessageIndex}`);
          const newMessages = history.messages.slice(lastProcessedMessageIndex);
          console.log('[OpenClawService] All messages:', JSON.stringify(history.messages, null, 2));
          lastProcessedMessageIndex = history.messages.length;
          
          for (const message of newMessages) {
            if (message.role === 'assistant') {
              const rawContent = message.content;
              console.log('[OpenClawService] Assistant message:', JSON.stringify(message, null, 2));
              
              let content: string;
              
              if (typeof rawContent === 'string') {
                content = rawContent;
              } else if (Array.isArray(rawContent)) {
                const parts: string[] = [];
                for (const item of rawContent) {
                  if (item.type === 'text') {
                    parts.push(item.text);
                  } else if (item.type === 'toolCall') {
                    parts.push(`[Tool Call](${item.name})`);
                  } else {
                    parts.push(JSON.stringify(item));
                  }
                }
                content = parts.join('\n');
              } else if (rawContent && typeof rawContent === 'object') {
                content = JSON.stringify(rawContent);
              } else {
                content = String(rawContent || '');
              }
              
              console.log('[OpenClawService] Processed content:', content);
              
              if (content && content.trim()) {
                if (finalContent && finalContent.trim()) {
                  finalContent = finalContent + '\n' + content;
                } else {
                  finalContent = content;
                }
              }
              
              const isComplete = message.stopReason && message.stopReason !== 'toolUse';
              console.log('[OpenClawService] Message check - stopReason:', message.stopReason, ', isComplete:', isComplete, ', finalContent length:', finalContent.length);
              
              if (isComplete) {
                console.log('[OpenClawService] Message complete, returning content');
                return finalContent;
              }
            }
          }
        }
        
        retryCount++;
      }
      
      console.warn('[OpenClawService] Timed out waiting for assistant response, falling back to HTTP');
      return this.sendMessageViaHttp(agentId, message, user);
    } catch (error) {
      console.error('Error calling OpenClaw WebSocket:', error);
      console.warn('Falling back to HTTP');
      return this.sendMessageViaHttp(agentId, message, user);
    }
  }

  async sendMessageStreaming(
    agentId: string, 
    message: string, 
    onChunk: (chunk: string) => Promise<void>,
    user?: string,
    chatHistory?: Array<{ role: 'user' | 'assistant', content: string }>
  ): Promise<void> {
    console.log(`[OpenClawService] sendMessageStreaming called, agentId=${agentId}, message="${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    
    const knowledgeContent = await KnowledgeRetrievalService.retrieveAndFormat(agentId, message);
    let finalMessage = message;
    if (knowledgeContent) {
      finalMessage = `${message}\n\n${knowledgeContent}`;
      console.log(`[OpenClawService] Injected knowledge for agent ${agentId}`);
    }
    
    console.log(`[OpenClawService] Final message to send: "${finalMessage.substring(0, 100)}${finalMessage.length > 100 ? '...' : ''}"`);

    if (USE_RESPONSES_API) {
      console.log('[OpenClawService] Using OpenResponses API for streaming');
      return this.sendMessageStreamingViaResponsesApi(agentId, finalMessage, onChunk, user);
    }

    if (this.useWebSocketRpc) {
      return this.sendMessageStreamingViaWebSocket(agentId, finalMessage, onChunk, user, chatHistory);
    }

    return this.sendMessageStreamingViaHttp(agentId, finalMessage, onChunk, user, chatHistory);
  }

  private async sendMessageStreamingViaResponsesApi(
    agentId: string, 
    message: string, 
    onChunk: (chunk: string) => Promise<void>,
    user?: string
  ): Promise<void> {
    try {
      console.log('[OpenClawService] Calling OpenResponses API streaming for agent:', agentId);
      
      await openClawResponsesService.createResponseStreaming(
        agentId,
        message,
        async (item) => {
          if (item.content) {
            await onChunk(item.content);
          }
        },
        async (response) => {
          console.log('[OpenClawService] OpenResponses API streaming complete');
        },
        { user, injectKnowledge: false }
      );
    } catch (error) {
      console.error('Error calling OpenResponses API streaming:', error);
      const mockResponse = this.getMockResponse(agentId, message);
      await onChunk(mockResponse);
    }
  }

  private async sendMessageStreamingViaHttp(
    agentId: string, 
    message: string, 
    onChunk: (chunk: string) => Promise<void>,
    user?: string,
    chatHistory?: Array<{ role: 'user' | 'assistant', content: string }>
  ): Promise<void> {
    const gatewayAvailable = await this.isGatewayAvailable();
    
    if (!gatewayAvailable) {
      console.warn('OpenClaw HTTP gateway not available, using mock streaming response');
      const mockResponse = this.getMockResponse(agentId, message);
      for (let i = 0; i < mockResponse.length; i += 3) {
        const chunk = mockResponse.slice(0, i + 3);
        await onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    try {
      console.log(`Starting streaming request to OpenClaw for agent: ${agentId}`);
      
      const messages: Array<{ role: 'user' | 'assistant', content: string }> = [];
      if (chatHistory) {
        messages.push(...chatHistory);
      }
      messages.push({ role: 'user', content: message });
      
      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.gatewayToken && { 'Authorization': `Bearer ${this.gatewayToken}` })
        },
        body: JSON.stringify({
          model: `openclaw:${agentId}`,
          messages: messages,
          stream: true,
          ...(user && { user })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data:')) {
              const dataStr = trimmedLine.slice(5).trim();
              if (dataStr === '[DONE]') continue;
              
              try {
                const data = JSON.parse(dataStr);
                // console.log('Received SSE data:', JSON.stringify(data, null, 2));
                
                const rawContent = data.choices[0]?.delta?.content;
                if (rawContent) {
                  let content: string;
                  if (typeof rawContent === 'string') {
                    content = rawContent;
                  } else if (rawContent && typeof rawContent === 'object') {
                    content = JSON.stringify(rawContent);
                  } else {
                    content = String(rawContent);
                  }
                  fullContent += content;
                  await onChunk(fullContent);
                }
              } catch (e) {
                if (!(e as Error).message?.includes('Unexpected end')) {
                  console.warn('Failed to parse SSE data:', dataStr);
                }
              }
            }
          }
        }
      }
      
      if (fullContent) {
        await onChunk(fullContent);
      }
    } catch (error) {
      console.error('Error calling OpenClaw HTTP streaming:', error);
      
      const mockResponse = this.getMockResponse(agentId, message);
      for (let i = 0; i < mockResponse.length; i += 3) {
        const chunk = mockResponse.slice(0, i + 3);
        await onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  private async sendMessageStreamingViaWebSocket(
    agentId: string, 
    message: string, 
    onChunk: (chunk: string) => Promise<void>,
    user?: string,
    chatHistory?: Array<{ role: 'user' | 'assistant', content: string }>
  ): Promise<void> {
    const gatewayAvailable = await this.isGatewayWebSocketAvailable();
    
    if (!gatewayAvailable) {
      console.warn('OpenClaw WebSocket gateway not available, falling back to HTTP');
      return this.sendMessageStreamingViaHttp(agentId, message, onChunk, user, chatHistory);
    }

    try {
      console.log(`Starting WebSocket streaming request to OpenClaw for agent: ${agentId}`);
      
      const sessionKey = `agent:${agentId}:opc-session`;
      
      console.log('[OpenClawService] Ensuring session exists:', sessionKey);
      await openclawCall('sessions.patch', { key: sessionKey, label: `OPC Session for ${agentId}` }, this.gatewayConfig);
      
      console.log('[OpenClawService] Sending message to OpenClaw:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
      await gatewaySendMessage(message, sessionKey, this.gatewayConfig, true);
      
      console.log('[OpenClawService] WebSocket message sent, polling for response...');
      
      let lastContent = '';
      let retryCount = 0;
      const maxRetries = 120;
      
      console.log('[OpenClawService] Getting initial history...');
      const initialHistory = await openclawCall('chat.history', { sessionKey, limit: 100 }, this.gatewayConfig);
      let lastProcessedMessageIndex = initialHistory?.messages?.length || 0;
      console.log(`[OpenClawService] Initial message count: ${lastProcessedMessageIndex}`);
      
      while (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const history = await openclawCall('chat.history', { sessionKey, limit: 100 }, this.gatewayConfig);
        console.log(`[OpenClawService] Streaming Poll #${retryCount}: history=${JSON.stringify(history, null, 2)}`);
        
        if (history && history.messages && history.messages.length > lastProcessedMessageIndex) {
          console.log(`[OpenClawService] New messages! total=${history.messages.length}, new=${history.messages.length - lastProcessedMessageIndex}`);
          const newMessages = history.messages.slice(lastProcessedMessageIndex);
          console.log('[OpenClawService] All messages:', JSON.stringify(history.messages, null, 2));
          lastProcessedMessageIndex = history.messages.length;
          
          for (const message of newMessages) {
            if (message.role === 'assistant') {
              const rawContent = message.content;
              console.log('[OpenClawService] Assistant message:', JSON.stringify(message, null, 2));
              
              let content: string;
              
              if (typeof rawContent === 'string') {
                content = rawContent;
              } else if (Array.isArray(rawContent)) {
                const parts: string[] = [];
                for (const item of rawContent) {
                  if (item.type === 'text') {
                    parts.push(item.text);
                  } else if (item.type === 'toolCall') {
                    parts.push(`[Tool Call](${item.name})`);
                  } else {
                    parts.push(JSON.stringify(item));
                  }
                }
                content = parts.join('\n');
              } else if (rawContent && typeof rawContent === 'object') {
                content = JSON.stringify(rawContent);
              } else {
                content = String(rawContent || '');
              }
              
              console.log('[OpenClawService] Processed content:', content);
              
              let accumulatedContent: string;
              if (lastContent && lastContent.trim()) {
                accumulatedContent = lastContent + '\n' + content;
              } else {
                accumulatedContent = content;
              }
              
              if (accumulatedContent && accumulatedContent !== lastContent) {
                lastContent = accumulatedContent;
                await onChunk(lastContent);
              }
              
              const isComplete = message.stopReason && message.stopReason !== 'toolUse';
              console.log('[OpenClawService] Stream check - stopReason:', message.stopReason, ', isComplete:', isComplete, ', lastContent length:', lastContent.length);
              
              if (isComplete) {
                console.log('[OpenClawService] Message complete, but continue polling for more messages');
              }
            }
          }
        }
        
        retryCount++;
      }
      
      if (lastContent) {
        await onChunk(lastContent);
      }
    } catch (error) {
      console.error('Error calling OpenClaw WebSocket streaming:', error);
      console.warn('Falling back to HTTP');
      return this.sendMessageStreamingViaHttp(agentId, message, onChunk, user, chatHistory);
    }
  }

  private getMockResponse(agentId: string, message: string): string {
    return `[Mock Response] 收到消息: "${message}"`;
  }
}

export const openclawService = new OpenClawService();
