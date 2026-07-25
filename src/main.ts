import { emitKeypressEvents } from 'node:readline'
import chalk from 'chalk'
import { darkTheme } from './ui/theme'
import { cursorHide, cursorShow, clearScreen, enableAltScreen, disableAltScreen } from './ui/ansi'
import { renderMessages, renderStatusBar, renderInputLine, renderWelcome } from './ui/components'
import { getTerminalSize, setupRawMode, restoreTerminal } from './utils/terminal'
import { ApiClient } from './services/api'
import { HistoryStore } from './services/history'
import { createSession, addMessage, saveSession } from './services/session'
import { getAllTools, getTool } from './tools/registry'
import { findCommand } from './commands'
import { getApiKey, getDefaultModel } from './utils/env'
import type { Session, Message } from './types'
import { randomUUID } from 'node:crypto'

interface MainOptions {
  apiKey?: string
  model?: string
  directory: string
  apiBase?: string
  verbose?: boolean
}

export async function runMain(options: MainOptions): Promise<void> {
  const apiKey = options.apiKey || getApiKey()
  if (!apiKey) {
    console.log(`
  ${chalk.hex(darkTheme.accent).bold('MauziCode v1.0')}
  ${chalk.hex(darkTheme.dim)('Terminal AI assistant with tool execution')}

  ${chalk.hex(darkTheme.error)('No API key configured.')}

  ${chalk.hex(darkTheme.foreground)('To use MauziCode, set your Anthropic API key:')}

    ${chalk.hex(darkTheme.accent)('Option 1:')}  set ANTHROPIC_API_KEY=sk-ant-...
    ${chalk.hex(darkTheme.accent)('Option 2:')}  mauzi --api-key sk-ant-...
    ${chalk.hex(darkTheme.accent)('Option 3:')}  create a .env file with ANTHROPIC_API_KEY

  ${chalk.hex(darkTheme.dim)('Run')} ${chalk.hex(darkTheme.accent)('mauzi --help')} ${chalk.hex(darkTheme.dim)('for more options.')}
`)
    process.exit(1)
  }

  const model = options.model || getDefaultModel()
  const cwd = options.directory
  const apiBase = options.apiBase || 'https://api.anthropic.com'

  let session: Session = createSession('Interactive session', cwd)
  const history = new HistoryStore(cwd)
  const api = new ApiClient({
    apiKey,
    model,
    apiBase,
    maxTokens: 8192,
    systemPrompt: `You are MauziCode, a terminal-based AI assistant.
You help users with software engineering tasks by executing tools.
You have access to bash, file_read, file_write, file_edit, glob, and grep tools.
Always think step by step and explain your reasoning.`,
  })

  let inputBuffer = ''
  let cursorPos = 0
  let running = true

  let statusText = 'ready'
  let abortController: AbortController | null = null

  process.stdout.write(enableAltScreen())
  process.stdout.write(cursorHide())
  process.stdout.write(clearScreen())

  emitKeypressEvents(process.stdin)
  setupRawMode()

  process.stdin.on('keypress', (_key: string, data: { name?: string; ctrl?: boolean; meta?: boolean; sequence?: string }) => {
    if (!data) return

    if (data.ctrl && data.name === 'c') {
      if (abortController) {
        abortController.abort()
        abortController = null
        statusText = 'cancelled'
        render()
        return
      }
      void cleanup()
      return
    }

    if (data.ctrl && data.name === 'l') {
      process.stdout.write(clearScreen())
      render()
      return
    }

    if (data.ctrl && data.name === 'd') {
      void cleanup()
      return
    }

    if (data.name === 'return' || data.name === 'enter') {
      void handleSubmit()
      return
    }

    if (data.name === 'backspace') {
      if (cursorPos > 0) {
        inputBuffer = inputBuffer.slice(0, cursorPos - 1) + inputBuffer.slice(cursorPos)
        cursorPos--
      }
      render()
      return
    }

    if (data.name === 'delete') {
      if (cursorPos < inputBuffer.length) {
        inputBuffer = inputBuffer.slice(0, cursorPos) + inputBuffer.slice(cursorPos + 1)
      }
      render()
      return
    }

    if (data.name === 'left') {
      if (cursorPos > 0) cursorPos--
      render()
      return
    }

    if (data.name === 'right') {
      if (cursorPos < inputBuffer.length) cursorPos++
      render()
      return
    }

    if (data.name === 'home') {
      cursorPos = 0
      render()
      return
    }

    if (data.name === 'end') {
      cursorPos = inputBuffer.length
      render()
      return
    }

    if (data.name === 'up') {
      void (async () => {
        const prev = await history.previous()
        if (prev !== null) {
          inputBuffer = prev
          cursorPos = inputBuffer.length
          render()
        }
      })()
      return
    }

    if (data.name === 'down') {
      void (async () => {
        const next = await history.next()
        if (next !== null) {
          inputBuffer = next
          cursorPos = inputBuffer.length
          render()
        }
      })()
      return
    }

    if (key && key.length === 1) {
      inputBuffer = inputBuffer.slice(0, cursorPos) + key + inputBuffer.slice(cursorPos)
      cursorPos++
      render()
      return
    }
  })

  function render(): void {
    const width = getTerminalSize().cols
    const welcome = renderWelcome(width)
    const messages = renderMessages(session.messages, width)
    const allContent = [...welcome, ...messages, '']
    const statusBar = renderStatusBar(statusText, model, cwd, width)
    const inputLine = renderInputLine(inputBuffer, cursorPos, width)

    const combined = ['', ...allContent, statusBar, inputLine]
    process.stdout.write('\u001B[H' + clearScreen() + combined.join('\n'))
  }

  async function handleSubmit(): Promise<void> {
    const input = inputBuffer.trim()
    inputBuffer = ''
    cursorPos = 0

    if (!input) {
      render()
      return
    }

    await history.add(input)

    if (input.startsWith('/')) {
      const cmd = findCommand(input)
      if (cmd) {
        await cmd.handler([], {
          session,
          cwd,
          print: (text: string) => {
            const msg: Message = {
              id: 'sys-' + Date.now(),
              role: 'assistant',
              content: text,
              timestamp: Date.now(),
            }
            session.messages.push(msg)
          },
        })
        render()
        return
      }
    }

    const userMsg: Message = {
      id: randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }
    addMessage(session, userMsg)
    render()

    abortController = new AbortController()
    statusText = 'thinking'
    render()

    try {
      await processStream(session)
      statusText = 'ready'
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('abort') || abortController?.signal.aborted) {
        statusText = 'cancelled'
      } else {
        const errorMsg: Message = {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `Error: ${errMsg}`,
          timestamp: Date.now(),
        }
        addMessage(session, errorMsg)
        statusText = 'error'
      }
    } finally {
      abortController = null
      render()
    }
  }

  async function processStream(session: Session): Promise<void> {
    const tools = getAllTools()
    let toolUseDepth = 0
    const maxToolDepth = 10

    while (toolUseDepth < maxToolDepth) {
      toolUseDepth++
      let currentAssistantMsg: Message | null = null
      let textAccum = ''
      let pendingToolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = []
      let stopReason = ''

      statusText = toolUseDepth > 1 ? 'thinking...' : 'thinking'
      render()

      const stream = api.streamComplete(session.messages, tools, abortController!.signal)

      for await (const chunk of stream) {
        if (chunk.content) {
          if (!currentAssistantMsg) {
            currentAssistantMsg = {
              id: randomUUID(),
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              toolCalls: [],
            }
            session.messages.push(currentAssistantMsg)
          }
          textAccum += chunk.content
          currentAssistantMsg.content = textAccum
          render()
        }

        if (chunk.toolCalls) {
          if (!currentAssistantMsg) {
            currentAssistantMsg = {
              id: randomUUID(),
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              toolCalls: [],
            }
            session.messages.push(currentAssistantMsg)
          }
          for (const tc of chunk.toolCalls) {
            pendingToolCalls.push(tc)
            currentAssistantMsg.toolCalls!.push(tc)
          }
          render()
        }

        if (chunk.stopReason) {
          stopReason = chunk.stopReason
        }
      }

      if (pendingToolCalls.length === 0) {
        break
      }

      for (const tc of pendingToolCalls) {
        const tool = getTool(tc.name)
        if (!tool) {
          const toolResult: Message = {
            id: tc.id,
            role: 'tool',
            content: `Unknown tool: ${tc.name}`,
            timestamp: Date.now(),
            toolResults: [{ id: tc.id, name: tc.name, output: '', error: 'Unknown tool' }],
          }
          session.messages.push(toolResult)
          continue
        }
        let output: string
        let error: string | undefined

        statusText = `executing ${tc.name}`
        render()

        try {
          output = await tool.execute(tc.args as Record<string, unknown>, {
            cwd,
            session,
            abortSignal: abortController!.signal,
          })
        } catch (err) {
          output = ''
          error = err instanceof Error ? err.message : String(err)
        }

        const toolResult: Message = {
          id: tc.id,
          role: 'tool',
          content: error ? `Error: ${error}` : output,
          timestamp: Date.now(),
          toolResults: [{ id: tc.id, name: tc.name, output, error }],
        }
        session.messages.push(toolResult)
        render()
      }

      if (stopReason === 'end_turn' || stopReason === 'stop') {
        break
      }
    }

    if (toolUseDepth >= maxToolDepth) {
      session.messages.push({
        id: 'sys-' + Date.now(),
        role: 'assistant',
        content: '[Maximum tool use depth reached]',
        timestamp: Date.now(),
      })
    }
  }

  async function cleanup(): Promise<void> {
    running = false
    await saveSession(cwd, session).catch(() => {})
    process.stdout.write(disableAltScreen())
    process.stdout.write(cursorShow())
    restoreTerminal()
    process.exit(0)
  }

  render()

  await new Promise<void>((resolve) => {
    const check = () => {
      if (!running) resolve()
      else setTimeout(check, 100)
    }
    setTimeout(check, 100)
  })

  await cleanup()
}
