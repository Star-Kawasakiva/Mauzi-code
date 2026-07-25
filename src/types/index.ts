export interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  isStreaming?: boolean
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  id: string
  name: string
  output: string
  error?: string
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  directory: string
  model: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<string>
}

export interface ToolContext {
  cwd: string
  abortSignal: AbortSignal
}

export interface AppSettings {
  provider: string
  apiKey: string
  model: string
  apiBase: string
  maxTokens: number
  systemPrompt: string
}
