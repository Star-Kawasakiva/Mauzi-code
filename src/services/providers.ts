export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'xai' | 'deepseek' | 'groq' | 'openrouter' | 'lmstudio' | 'ollama'
export type ApiFormat = 'anthropic' | 'openai' | 'gemini'

export interface ProviderConfig {
  id: ProviderId
  name: string
  apiFormat: ApiFormat
  defaultBase: string
  authHeader: string
  authPrefix: string
  envKey: string
  models: string[]
  supportsTools: boolean
  supportsStreaming: boolean
  docsUrl: string
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiFormat: 'anthropic',
    defaultBase: 'https://api.anthropic.com',
    authHeader: 'x-api-key',
    authPrefix: '',
    envKey: 'ANTHROPIC_API_KEY',
    models: [
      'claude-sonnet-4-20250514',
      'claude-4-opus-20250514',
      'claude-4-5-sonnet-20260514',
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: 'https://console.anthropic.com/',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiFormat: 'openai',
    defaultBase: 'https://api.openai.com/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    envKey: 'OPENAI_API_KEY',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1',
      'o1-mini',
      'o3-mini',
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: 'https://platform.openai.com/',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    apiFormat: 'gemini',
    defaultBase: 'https://generativelanguage.googleapis.com/v1beta',
    authHeader: 'x-goog-api-key',
    authPrefix: '',
    envKey: 'GEMINI_API_KEY',
    models: [
      'gemini-2.5-pro-exp-03-25',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
    supportsTools: false,
    supportsStreaming: true,
    docsUrl: 'https://aistudio.google.com/',
  },
  {
    id: 'xai',
    name: 'xAI',
    apiFormat: 'openai',
    defaultBase: 'https://api.x.ai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    envKey: 'XAI_API_KEY',
    models: [
      'grok-2-1212',
      'grok-2-vision-1212',
      'grok-beta',
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: 'https://console.x.ai/',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiFormat: 'openai',
    defaultBase: 'https://api.deepseek.com/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    envKey: 'DEEPSEEK_API_KEY',
    models: [
      'deepseek-chat',
      'deepseek-reasoner',
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: 'https://platform.deepseek.com/',
  },
  {
    id: 'groq',
    name: 'Groq',
    apiFormat: 'openai',
    defaultBase: 'https://api.groq.com/openai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    envKey: 'GROQ_API_KEY',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-32b',
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: 'https://console.groq.com/',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiFormat: 'openai',
    defaultBase: 'https://openrouter.ai/api/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    envKey: 'OPENROUTER_API_KEY',
    models: [
      'anthropic/claude-sonnet-4',
      'anthropic/claude-4-opus',
      'openai/gpt-4o',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
      'x-ai/grok-2',
      'qwen/qwen-2.5-72b-instruct',
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    apiFormat: 'openai',
    defaultBase: 'http://localhost:1234/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    envKey: '',
    models: ['local-model'],
    supportsTools: false,
    supportsStreaming: true,
    docsUrl: 'https://lmstudio.ai/',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    apiFormat: 'openai',
    defaultBase: 'http://localhost:11434/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    envKey: '',
    models: [
      'llama3.3',
      'llama3.2',
      'mistral',
      'codellama',
      'mixtral',
      'qwen2.5',
      'deepseek-r1',
    ],
    supportsTools: false,
    supportsStreaming: true,
    docsUrl: 'https://ollama.ai/',
  },
]

export function getProvider(id: ProviderId): ProviderConfig {
  return PROVIDERS.find(p => p.id === id) ?? PROVIDERS[0]
}

export function getDefaultProvider(): ProviderConfig {
  return PROVIDERS[0]
}
