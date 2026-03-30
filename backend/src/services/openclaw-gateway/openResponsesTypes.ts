export interface OpenResponsesMessageItem {
  type: 'message';
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string;
}

export interface OpenResponsesFunctionCallOutputItem {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

export interface OpenResponsesInputImageItem {
  type: 'input_image';
  source: {
    type: 'url' | 'base64';
    url?: string;
    media_type?: string;
    data?: string;
  };
}

export interface OpenResponsesInputFileItem {
  type: 'input_file';
  source: {
    type: 'url' | 'base64';
    url?: string;
    media_type: string;
    data?: string;
    filename?: string;
  };
}

export type OpenResponsesInputItem =
  | OpenResponsesMessageItem
  | OpenResponsesFunctionCallOutputItem
  | OpenResponsesInputImageItem
  | OpenResponsesInputFileItem;

export interface OpenResponsesFunctionTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

export type OpenResponsesTool = OpenResponsesFunctionTool;

export interface OpenResponsesRequest {
  input: string | OpenResponsesInputItem[];
  instructions?: string;
  tools?: OpenResponsesTool[];
  tool_choice?: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  max_output_tokens?: number;
  user?: string;
  previous_response_id?: string;
  max_tool_calls?: number;
  reasoning?: any;
  metadata?: Record<string, any>;
  store?: any;
  truncation?: any;
}

export interface OpenResponsesFunctionCall {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
}

export interface OpenResponsesOutputItem {
  type: 'message' | 'function_call' | 'reasoning' | 'item_reference';
  role?: 'assistant';
  content?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
}

export interface OpenResponsesResponse {
  id: string;
  object: 'response';
  created: number;
  model: string;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired';
  error?: {
    code: string;
    message: string;
  };
  output: OpenResponsesOutputItem[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface OpenResponsesStreamEvent {
  event:
    | 'response.created'
    | 'response.in_progress'
    | 'response.output_item.added'
    | 'response.output_item.delta'
    | 'response.output_item.done'
    | 'response.completed'
    | 'response.failed'
    | 'response.cancelled'
    | 'response.expired';
  data: any;
}
