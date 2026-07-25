import type { Message, ToolDefinition } from '../types'
import type { ProviderId, ApiFormat, ProviderConfig } from './providers'
import { getProvider } from './providers'

export interface StreamChunk {
  content?: string
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>
  stopReason?: string
}

function convertMessages(messages: Message[], format: ApiFormat): Record<string, unknown>[] {
  if (format === 'anthropic') {
    return messages.map(m => {
      if (m.role === 'user') return { role: 'user', content: m.content }
      if (m.role === 'tool') {
        const tr = m.toolResults?.[0]
        return {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: tr?.id ?? '', content: m.content }],
        }
      }
      const parts: Record<string, unknown>[] = []
      if (m.content) parts.push({ type: 'text', text: m.content })
      if (m.toolCalls) {
        for (const tc of m.toolCalls) {
          parts.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args })
        }
      }
      return { role: 'assistant', content: parts }
    })
  }

  return messages.map(m => {
    if (m.role === 'tool') {
      const tr = m.toolResults?.[0]
      return {
        role: 'tool',
        tool_call_id: tr?.id ?? m.id,
        content: m.content,
      }
    }
    if (m.role === 'assistant') {
      const msg: Record<string, unknown> = { role: 'assistant', content: m.content || '' }
      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        }))
      }
      return msg
    }
    return { role: 'user', content: m.content }
  })
}

function getToolSchemas(tools: ToolDefinition[], format: ApiFormat): Record<string, unknown>[] {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as Record<string, unknown>,
    },
  }))
}

async function* streamAnthropic(
  body: Record<string, unknown>,
  settings: { apiKey: string; apiBase: string },
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${settings.apiBase}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Anthropic API ${response.status}: ${errText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data: ')) continue
      const d = t.slice(6)
      if (d === '[DONE]') return
      try {
        const p = JSON.parse(d)
        if (p.type === 'content_block_delta' && p.delta?.text) yield { content: p.delta.text }
        if (p.type === 'content_block_start' && p.content_block?.type === 'tool_use') {
          yield { toolCalls: [{ id: p.content_block.id, name: p.content_block.name, args: p.content_block.input ?? {} }] }
        }
        if (p.type === 'message_delta' && p.delta?.stop_reason) yield { stopReason: p.delta.stop_reason }
        if (p.type === 'message_start' && p.message?.stop_reason) yield { stopReason: p.message.stop_reason }
        if (p.type === 'message_stop') yield { stopReason: 'end_turn' }
      } catch { }
    }
  }
}

async function* streamOpenAI(
  body: Record<string, unknown>,
  settings: { apiKey: string; apiBase: string; provider: ProviderConfig },
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const url = `${settings.apiBase}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  headers[settings.provider.authHeader] = settings.provider.authPrefix + settings.apiKey

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error')
    throw new Error(`${settings.provider.name} API ${response.status}: ${errText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''
  let currentToolCalls: Map<string, { id: string; name: string; args: string }> = new Map()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data: ')) continue
      const d = t.slice(6)
      if (d === '[DONE]') {
        yield { stopReason: 'stop' }
        return
      }
      try {
        const p = JSON.parse(d)
        const choice = p.choices?.[0]
        if (!choice) continue

        if (choice.delta?.content) {
          yield { content: choice.delta.content }
        }

        if (choice.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const idx = tc.index ?? 0
            const key = String(idx)
            if (!currentToolCalls.has(key)) {
              currentToolCalls.set(key, {
                id: tc.id || `call_${idx}`,
                name: tc.function?.name || '',
                args: tc.function?.arguments || '',
              })
            } else {
              const existing = currentToolCalls.get(key)!
              if (tc.function?.name) existing.name += tc.function.name
              if (tc.function?.arguments) existing.args += tc.function.arguments
            }
          }
        }

        if (choice.finish_reason) {
          if (choice.finish_reason === 'tool_calls' && currentToolCalls.size > 0) {
            const calls = Array.from(currentToolCalls.values()).map(tc => {
              let args: Record<string, unknown> = {}
              try { args = JSON.parse(tc.args) } catch { args = { _raw: tc.args } }
              return { id: tc.id, name: tc.name, args }
            })
            yield { toolCalls: calls }
            currentToolCalls.clear()
          }
          if (choice.finish_reason === 'stop') {
            yield { stopReason: 'end_turn' }
          }
        }
      } catch { }
    }
  }
}

async function* streamGemini(
  body: Record<string, unknown>,
  settings: { apiKey: string; apiBase: string },
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const model = body.model as string
  const url = `${settings.apiBase}/models/${model}:streamGenerateContent?alt=sse&key=${settings.apiKey}`
  const { model: _m, ...reqBody } = body

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Gemini API ${response.status}: ${errText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data: ')) continue
      const d = t.slice(6)
      if (d === '[DONE]') return
      try {
        const p = JSON.parse(d)
        const candidate = p.candidates?.[0]
        if (!candidate) continue
        const text = candidate.content?.parts?.map((p: any) => p.text).filter(Boolean).join('')
        if (text) yield { content: text }
        if (candidate.finishReason) {
          yield { stopReason: candidate.finishReason.toLowerCase() === 'stop' ? 'end_turn' : candidate.finishReason }
        }
      } catch { }
    }
  }
}

export async function* streamComplete(
  messages: Message[],
  tools: ToolDefinition[],
  settings: {
    provider: ProviderId
    apiKey: string
    apiBase: string
    model: string
    maxTokens: number
    systemPrompt: string
  },
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const provider = getProvider(settings.provider)
  const formattedMessages = convertMessages(messages, provider.apiFormat)

  if (provider.apiFormat === 'anthropic') {
    const body: Record<string, unknown> = {
      model: settings.model,
      max_tokens: settings.maxTokens,
      system: settings.systemPrompt,
      messages: formattedMessages,
      stream: true,
    }
    if (provider.supportsTools) {
      body.tools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Record<string, unknown>,
      }))
    }
    yield* streamAnthropic(body, settings, signal)
  } else if (provider.apiFormat === 'gemini') {
    const contents: Record<string, unknown>[] = []
    const systemMsg = settings.systemPrompt
    for (const m of formattedMessages) {
      if (m.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: m.content as string }] })
      } else {
        contents.push({ role: 'model', parts: [{ text: m.content as string }] })
      }
    }
    const body: Record<string, unknown> = {
      model: settings.model,
      contents,
      generationConfig: { maxOutputTokens: settings.maxTokens },
    }
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg }] }
    }
    yield* streamGemini(body, settings, signal)
  } else {
    const body: Record<string, unknown> = {
      model: settings.model,
      messages: formattedMessages,
      max_tokens: settings.maxTokens,
      stream: true,
    }
    if (settings.systemPrompt) {
      body.system = settings.systemPrompt
    }
    if (provider.supportsTools && tools.length > 0) {
      body.tools = getToolSchemas(tools, 'openai')
    }
    yield* streamOpenAI(body, settings, signal)
  }
}
