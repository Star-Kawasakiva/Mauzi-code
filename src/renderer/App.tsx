import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChatView } from './components/ChatView'
import { InputBox } from './components/InputBox'
import { StatusBar } from './components/StatusBar'
import { Sidebar } from './components/Sidebar'
import { SettingsDialog } from './components/SettingsDialog'
import type { Message } from '../types'

declare global {
  interface Window {
    mauzi: {
      settings: { load: () => Promise<Record<string, string>>; save: (s: Record<string, string>) => Promise<boolean> }
      providers: { list: () => Promise<Array<Record<string, unknown>>> }
      session: { create: (t: string) => Promise<unknown>; get: () => Promise<unknown>; save: () => Promise<boolean> }
      sessions: { list: () => Promise<unknown[]> }
      cwd: { get: () => Promise<string> }
      send: (t: string) => Promise<void>
      abort: () => Promise<void>
      tools: { list: () => Promise<Array<{ name: string; description: string }>> }
      on: (c: string, cb: (...a: unknown[]) => void) => () => void
    }
  }
}

export function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState('ready')
  const [model, setModel] = useState('')
  const [providerName, setProviderName] = useState('')
  const [cwd, setCwd] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tools, setTools] = useState<Array<{ name: string; description: string }>>([])
  const streamingRef = useRef(false)

  useEffect(() => {
    async function init() {
      const settings = await window.mauzi.settings.load()
      if (settings.model) setModel(settings.model)
      if (settings.provider) {
        const providers = await window.mauzi.providers.list()
        const p = providers.find((x: any) => x.id === settings.provider)
        setProviderName(p ? (p as any).name : settings.provider)
      }
      const dir = await window.mauzi.cwd.get()
      setCwd(dir)
      await window.mauzi.session.create('Default')
      const toolList = await window.mauzi.tools.list()
      setTools(toolList)
    }
    init()
  }, [])

  useEffect(() => {
    const unsubs: Array<() => void> = []

    unsubs.push(window.mauzi.on('stream:status', (s) => {
      setStatus(s as string)
    }))

    unsubs.push(window.mauzi.on('stream:content', (text) => {
      streamingRef.current = true
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last && last.role === 'assistant' && last.isStreaming) {
          last.content += text as string
        } else {
          copy.push({
            id: Date.now().toString(),
            role: 'assistant',
            content: text as string,
            timestamp: Date.now(),
            isStreaming: true,
          })
        }
        return copy
      })
    }))

    unsubs.push(window.mauzi.on('stream:tool-call', (tc) => {
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last && last.role === 'assistant') {
          last.toolCalls = [...(last.toolCalls || []), tc as any]
        }
        return copy
      })
    }))

    unsubs.push(window.mauzi.on('stream:tool-result', (tr) => {
      setMessages(prev => [...prev, {
        id: (tr as any).id,
        role: 'tool',
        content: (tr as any).error ? `Error: ${(tr as any).error}` : (tr as any).output,
        timestamp: Date.now(),
        toolResults: [(tr as any)],
      }])
    }))

    unsubs.push(window.mauzi.on('stream:error', (err) => {
      streamingRef.current = false
      setStatus('error')
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `Error: ${err}`,
        timestamp: Date.now(),
      }])
    }))

    unsubs.push(window.mauzi.on('stream:done', () => {
      streamingRef.current = false
      setStatus('ready')
    }))

    return () => unsubs.forEach(u => u())
  }, [])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || streamingRef.current) return

    const settings = await window.mauzi.settings.load()
    if (!settings.apiKey) {
      setSettingsOpen(true)
      return
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }])

    setStatus('thinking')
    streamingRef.current = true
    await window.mauzi.send(text.trim())
  }, [])

  const handleAbort = useCallback(() => {
    window.mauzi.abort()
    streamingRef.current = false
    setStatus('ready')
  }, [])

  const handleNewChat = useCallback(async () => {
    await window.mauzi.session.create('New chat')
    setMessages([])
    setStatus('ready')
  }, [])

  const handleSettingsSave = useCallback(async (provider: string, key: string, mdl: string, apiBase: string) => {
    await window.mauzi.settings.save({
      provider,
      apiKey: key,
      model: mdl,
      apiBase,
      maxTokens: '8192',
    })
    setModel(mdl)
    const providers = await window.mauzi.providers.list()
    const p = providers.find((x: any) => x.id === provider)
    setProviderName(p ? (p as any).name : provider)
    setSettingsOpen(false)
  }, [])

  const statusModel = providerName ? `${providerName} / ${model}` : model

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0D0D0D', color: '#E0E0E0',
    }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={handleNewChat}
          onOpenSettings={() => setSettingsOpen(true)}
          tools={tools}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatView messages={messages} />
          <InputBox
            onSend={handleSend}
            onAbort={handleAbort}
            isStreaming={streamingRef.current}
          />
        </div>
      </div>
      <StatusBar
        status={status}
        model={statusModel}
        cwd={cwd}
        messageCount={messages.length}
      />
      {settingsOpen && (
        <SettingsDialog
          onSave={handleSettingsSave}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
