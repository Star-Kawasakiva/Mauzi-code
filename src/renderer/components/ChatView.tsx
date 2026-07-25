import React, { useRef, useEffect } from 'react'
import type { Message } from '../../types'

const roles = {
  user: { label: 'You', color: '#6EB5FF' },
  assistant: { label: 'Mauzi', color: '#69DB7C' },
  tool: { label: 'Tool', color: '#888' },
}

function CodeBlock({ text }: { text: string }) {
  const isLong = text.length > 200
  return (
    <pre style={{
      background: '#1A1A1A', borderRadius: 6, padding: '8px 12px',
      fontSize: 13, lineHeight: 1.4, overflowX: 'auto',
      whiteSpace: isLong ? 'pre-wrap' : 'pre',
      wordBreak: 'break-all', color: '#D4D4D4',
    }}>
      {isLong ? text.slice(0, 1000) + (text.length > 1000 ? '\n...(truncated)' : '') : text}
    </pre>
  )
}

function ToolCallView({ name, args }: { name: string; args: Record<string, unknown> }) {
  return (
    <div style={{
      background: '#1A1A1A', borderRadius: 6, padding: '6px 10px', marginTop: 4,
      fontSize: 13, color: '#6EB5FF', fontFamily: 'monospace',
    }}>
      <span style={{ color: '#6EB5FF' }}>&#9654;</span> Using {name}
      {Object.keys(args).length > 0 && (
        <span style={{ color: '#666', marginLeft: 8 }}>
          {Object.entries(args).map(([k, v]) => `${k}=${String(v).slice(0, 50)}`).join(', ')}
        </span>
      )}
    </div>
  )
}

export function ChatView({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function renderContent(msg: Message) {
    const text = msg.content
    if (!text) return null

    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/g)
      return parts.map((part, i) => {
        if (part.startsWith('```')) {
          const code = part.replace(/```\w*\n?/, '').replace(/```$/, '')
          return <CodeBlock key={i} text={code} />
        }
        return <span key={i}>{part}</span>
      })
    }

    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</span>
  }

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#555', padding: 20,
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#444', marginBottom: 8 }}>MauziCode</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>Desktop AI Coding Assistant</div>
        <div style={{ fontSize: 13, color: '#444', lineHeight: 2 }}>
          <div>Type a message to start</div>
          <div>Ask me to write code, analyze files, or run commands</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '12px 16px',
      background: '#0D0D0D',
    }}>
      {messages.map((msg) => {
        const role = roles[msg.role]
        return (
          <div key={msg.id} style={{ marginBottom: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 4, fontSize: 12, color: role.color,
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <span>{role.label}</span>
              <span style={{ color: '#333', fontWeight: 400, textTransform: 'none' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: msg.role === 'user' ? '#1A1A2E' : msg.role === 'tool' ? '#1A1A1A' : '#121212',
              borderLeft: `3px solid ${role.color}44`,
              fontSize: 14, lineHeight: 1.6, color: msg.role === 'user' ? '#D0D0FF' : '#E0E0E0',
            }}>
              {msg.toolCalls?.map((tc, i) => (
                <ToolCallView key={i} name={tc.name} args={tc.args} />
              ))}
              {renderContent(msg)}
              {msg.isStreaming && <span style={{ animation: 'blink 1s infinite', color: '#69DB7C' }}>|</span>}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
      <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
    </div>
  )
}
