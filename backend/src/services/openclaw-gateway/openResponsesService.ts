import { KnowledgeRetrievalService } from '../KnowledgeRetrievalService';
import {
  OpenResponsesRequest,
  OpenResponsesResponse,
  OpenResponsesInputItem,
  OpenResponsesOutputItem,
  OpenResponsesStreamEvent,
} from './openResponsesTypes';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export class OpenClawResponsesService {
  private gatewayUrl: string;
  private gatewayToken: string;

  constructor() {
    this.gatewayUrl = GATEWAY_URL;
    this.gatewayToken = GATEWAY_TOKEN;
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

  private getMockResponse(agentId: string, input: string): OpenResponsesResponse {
    return {
      id: `resp-${Date.now()}`,
      object: 'response',
      created: Math.floor(Date.now() / 1000),
      model: `openclaw/${agentId}`,
      status: 'completed',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: `[Mock Response] 收到消息: "${input}"`,
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  async createResponse(
    agentId: string,
    input: string | OpenResponsesInputItem[],
    options?: {
      instructions?: string;
      tools?: OpenResponsesRequest['tools'];
      tool_choice?: OpenResponsesRequest['tool_choice'];
      max_output_tokens?: number;
      user?: string;
      previous_response_id?: string;
      injectKnowledge?: boolean;
    }
  ): Promise<OpenResponsesResponse> {
    const gatewayAvailable = await this.isGatewayAvailable();

    if (!gatewayAvailable) {
      console.warn('OpenClaw gateway not available, using mock response');
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
      return this.getMockResponse(agentId, inputStr);
    }

    try {
      let finalInput = input;
      
      if (options?.injectKnowledge && typeof input === 'string') {
        const knowledgeContent = await KnowledgeRetrievalService.retrieveAndFormat(agentId, input);
        if (knowledgeContent) {
          finalInput = `${input}\n\n${knowledgeContent}`;
          console.log(`[OpenClawResponsesService] Injected knowledge for agent ${agentId}`);
        }
      }

      const requestBody: OpenResponsesRequest = {
        input: finalInput,
        instructions: options?.instructions,
        tools: options?.tools,
        tool_choice: options?.tool_choice,
        stream: false,
        max_output_tokens: options?.max_output_tokens,
        user: options?.user,
        previous_response_id: options?.previous_response_id,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
      };

      if (this.gatewayToken) {
        headers['Authorization'] = `Bearer ${this.gatewayToken}`;
      }

      const response = await fetch(`${this.gatewayUrl}/v1/responses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as OpenResponsesResponse;
      console.log('[OpenClawResponsesService] Response received:', data.id);
      return data;
    } catch (error) {
      console.error('Error calling OpenClaw Responses API:', error);
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
      return this.getMockResponse(agentId, inputStr);
    }
  }

  async createResponseStreaming(
    agentId: string,
    input: string | OpenResponsesInputItem[],
    onChunk: (item: OpenResponsesOutputItem) => Promise<void>,
    onComplete?: (response: OpenResponsesResponse) => Promise<void>,
    options?: {
      instructions?: string;
      tools?: OpenResponsesRequest['tools'];
      tool_choice?: OpenResponsesRequest['tool_choice'];
      max_output_tokens?: number;
      user?: string;
      previous_response_id?: string;
      injectKnowledge?: boolean;
    }
  ): Promise<void> {
    const gatewayAvailable = await this.isGatewayAvailable();

    if (!gatewayAvailable) {
      console.warn('OpenClaw gateway not available, using mock streaming response');
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
      const mockResponse = this.getMockResponse(agentId, inputStr);
      const content = mockResponse.output[0]?.content || '';
      
      for (let i = 0; i < content.length; i += 3) {
        await onChunk({
          type: 'message',
          role: 'assistant',
          content: content.slice(0, i + 3),
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (onComplete) {
        await onComplete(mockResponse);
      }
      return;
    }

    try {
      let finalInput = input;
      
      if (options?.injectKnowledge && typeof input === 'string') {
        const knowledgeContent = await KnowledgeRetrievalService.retrieveAndFormat(agentId, input);
        if (knowledgeContent) {
          finalInput = `${input}\n\n${knowledgeContent}`;
          console.log(`[OpenClawResponsesService] Injected knowledge for agent ${agentId}`);
        }
      }

      const requestBody: OpenResponsesRequest = {
        input: finalInput,
        instructions: options?.instructions,
        tools: options?.tools,
        tool_choice: options?.tool_choice,
        stream: true,
        max_output_tokens: options?.max_output_tokens,
        user: options?.user,
        previous_response_id: options?.previous_response_id,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
      };

      if (this.gatewayToken) {
        headers['Authorization'] = `Bearer ${this.gatewayToken}`;
      }

      const response = await fetch(`${this.gatewayUrl}/v1/responses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let finalResponse: OpenResponsesResponse | null = null;

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
                const event = JSON.parse(dataStr) as OpenResponsesStreamEvent;
                console.log('[OpenClawResponsesService] Stream event:', event.event);

                if (event.event === 'response.output_item.delta') {
                  const item = event.data as OpenResponsesOutputItem;
                  if (item.content) {
                    fullContent += item.content;
                    await onChunk({
                      type: 'message',
                      role: 'assistant',
                      content: fullContent,
                    });
                  }
                } else if (event.event === 'response.completed') {
                  finalResponse = event.data as OpenResponsesResponse;
                }
              } catch (e) {
                if (!(e as Error).message?.includes('Unexpected end')) {
                  console.warn('Failed to parse stream data:', dataStr);
                }
              }
            }
          }
        }
      }

      if (onComplete && finalResponse) {
        await onComplete(finalResponse);
      }
    } catch (error) {
      console.error('Error calling OpenClaw Responses streaming API:', error);
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
      const mockResponse = this.getMockResponse(agentId, inputStr);
      const content = mockResponse.output[0]?.content || '';
      
      for (let i = 0; i < content.length; i += 3) {
        await onChunk({
          type: 'message',
          role: 'assistant',
          content: content.slice(0, i + 3),
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (onComplete) {
        await onComplete(mockResponse);
      }
    }
  }

  extractTextFromResponse(response: OpenResponsesResponse): string {
    const textParts: string[] = [];
    for (const item of response.output) {
      if (item.type === 'message' && item.content) {
        textParts.push(item.content);
      }
    }
    return textParts.join('\n');
  }

  extractFunctionCalls(response: OpenResponsesResponse): Array<{ call_id: string; name: string; arguments: string }> {
    const calls: Array<{ call_id: string; name: string; arguments: string }> = [];
    for (const item of response.output) {
      if (item.type === 'function_call' && item.call_id && item.name && item.arguments) {
        calls.push({
          call_id: item.call_id,
          name: item.name,
          arguments: item.arguments,
        });
      }
    }
    return calls;
  }
}

export const openClawResponsesService = new OpenClawResponsesService();
