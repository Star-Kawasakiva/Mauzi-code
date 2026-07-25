import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { getAllTools, getTool } from '../tools/registry'
import { streamComplete } from '../services/api'
import { createSession, saveSession, listSessions } from '../services/session'
import { getProvider, PROVIDERS } from '../services/providers'
import type { Message, ToolContext } from '../types'

let mainWindow: BrowserWindow | null = null
let session: ReturnType<typeof createSession>
const cwd: string = process.cwd()
let abortController: AbortController | null = null

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

function loadSettings() {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'))
      return {
        provider: data.provider || 'anthropic',
        apiKey: data.apiKey || process.env['ANTHROPIC_API_KEY'] || '',
        model: data.model || 'claude-sonnet-4-20250514',
        apiBase: data.apiBase || 'https://api.anthropic.com',
        maxTokens: data.maxTokens || 8192,
      }
    }
  } catch {}
  const envKey = process.env['ANTHROPIC_API_KEY']
  return {
    provider: 'anthropic',
    apiKey: envKey || '',
    model: 'claude-sonnet-4-20250514',
    apiBase: 'https://api.anthropic.com',
    maxTokens: 8192,
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 600,
    minHeight: 400,
    title: 'MauziCode',
    backgroundColor: '#0D0D0D',
    icon: join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    frame: true,
  })

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function handleApiStream(
  messages: Message[],
  settings: ReturnType<typeof loadSettings>,
  win: BrowserWindow
): Promise<void> {
  abortController = new AbortController()
  let toolUseDepth = 0
  const maxDepth = 10
  const tools = getAllTools()
  const provider = getProvider(settings.provider)

  while (toolUseDepth < maxDepth) {
    toolUseDepth++
    let textAccum = ''
    let pendingTools: Array<{ id: string; name: string; args: Record<string, unknown> }> = []
    let stopReason = ''

    win.webContents.send('stream:status', toolUseDepth > 1 ? 'thinking...' : 'thinking')

    const stream = streamComplete(messages, tools, {
      provider: settings.provider,
      apiKey: settings.apiKey,
      apiBase: settings.apiBase,
      model: settings.model,
      maxTokens: settings.maxTokens,
      systemPrompt: `You are MauziCode, a desktop AI coding assistant.
You have tools available: bash, file_read, file_write, file_edit, glob, grep.
Use them when the user asks you to interact with files or run commands.
Be concise and helpful.`,
    }, abortController.signal)

    try {
      for await (const chunk of stream) {
        if (chunk.content) {
          textAccum += chunk.content
          win.webContents.send('stream:content', chunk.content)
        }
        if (chunk.toolCalls) {
          for (const tc of chunk.toolCalls) {
            pendingTools.push(tc)
            win.webContents.send('stream:tool-call', tc)
          }
        }
        if (chunk.stopReason) {
          stopReason = chunk.stopReason
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('abort') || abortController?.signal.aborted) {
        win.webContents.send('stream:error', 'Cancelled')
      } else {
        win.webContents.send('stream:error', msg)
      }
      return
    }

    if (textAccum) {
      messages.push({
        id: randomUUID(),
        role: 'assistant',
        content: textAccum,
        timestamp: Date.now(),
        toolCalls: pendingTools.length > 0 ? pendingTools : undefined,
      })
    }

    if (pendingTools.length === 0) break

    if (!provider.supportsTools) {
      messages.push({
        id: randomUUID(),
        role: 'assistant',
        content: `[Tool calls requested but ${provider.name} does not support them]`,
        timestamp: Date.now(),
      })
      break
    }

    for (const tc of pendingTools) {
      const tool = getTool(tc.name)
      if (!tool) {
        messages.push({
          id: tc.id, role: 'tool', content: `Unknown tool: ${tc.name}`,
          timestamp: Date.now(),
          toolResults: [{ id: tc.id, name: tc.name, output: '', error: 'Unknown tool' }],
        })
        continue
      }

      win.webContents.send('stream:status', `running ${tc.name}`)

      const context: ToolContext = { cwd, abortSignal: abortController.signal }
      try {
        const output = await tool.execute(tc.args, context)
        messages.push({
          id: tc.id, role: 'tool', content: output,
          timestamp: Date.now(),
          toolResults: [{ id: tc.id, name: tc.name, output }],
        })
        win.webContents.send('stream:tool-result', { id: tc.id, name: tc.name, output })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        messages.push({
          id: tc.id, role: 'tool', content: `Error: ${error}`,
          timestamp: Date.now(),
          toolResults: [{ id: tc.id, name: tc.name, output: '', error }],
        })
        win.webContents.send('stream:tool-result', { id: tc.id, name: tc.name, output: '', error })
      }
    }

    if (stopReason === 'end_turn' || stopReason === 'stop') break
  }

  win.webContents.send('stream:done')
}

ipcMain.handle('settings:load', () => loadSettings())

ipcMain.handle('settings:save', (_, s: Record<string, unknown>) => {
  writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2))
  return true
})

ipcMain.handle('providers:list', () => {
  return PROVIDERS.map(p => ({
    id: p.id,
    name: p.name,
    defaultBase: p.defaultBase,
    authHeader: p.authHeader,
    authPrefix: p.authPrefix,
    models: p.models,
    supportsTools: p.supportsTools,
    docsUrl: p.docsUrl,
  }))
})

ipcMain.handle('session:create', (_, title: string) => {
  session = createSession(title, cwd, loadSettings().model)
  return session
})

ipcMain.handle('session:get', () => session)
ipcMain.handle('session:save', async () => {
  if (session) await saveSession(cwd, session).catch(() => {})
  return true
})

ipcMain.handle('sessions:list', async () => listSessions(cwd))
ipcMain.handle('cwd:get', () => cwd)

ipcMain.handle('send:message', async (_, text: string) => {
  if (!mainWindow) return

  const settings = loadSettings()
  if (!settings.apiKey) {
    mainWindow.webContents.send('stream:error', 'No API key configured. Open Settings to set one.')
    return
  }

  const userMsg: Message = {
    id: randomUUID(),
    role: 'user',
    content: text,
    timestamp: Date.now(),
  }
  session.messages.push(userMsg)

  const msgCopy = [...session.messages]
  await handleApiStream(msgCopy, settings, mainWindow)

  session.messages = msgCopy
  await saveSession(cwd, session).catch(() => {})
})

ipcMain.handle('abort', () => {
  abortController?.abort()
  abortController = null
  mainWindow?.webContents.send('stream:done')
})

ipcMain.handle('tools:list', () => {
  return getAllTools().map(t => ({ name: t.name, description: t.description }))
})

app.whenReady().then(() => {
  const settings = loadSettings()
  session = createSession('Default', cwd, settings.model)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
