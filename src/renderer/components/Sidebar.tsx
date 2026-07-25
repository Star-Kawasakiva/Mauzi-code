import React from 'react'

interface Props {
  open: boolean
  onToggle: () => void
  onNewChat: () => void
  onOpenSettings: () => void
  tools: Array<{ name: string; description: string }>
}

export function Sidebar({ open, onToggle, onNewChat, onOpenSettings, tools }: Props) {
  if (!open) {
    return (
      <div style={{
        width: 36, background: '#0D0D0D', borderRight: '1px solid #1A1A1A',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 0', gap: 8, flexShrink: 0,
      }}>
        <button onClick={onToggle} title="Open sidebar"
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 }}>
          &#9776;
        </button>
        <button onClick={onNewChat} title="New chat"
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 }}>
          +
        </button>
        <button onClick={onOpenSettings} title="Settings"
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16, marginTop: 'auto' }}>
          &#9881;
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: 220, background: '#0D0D0D', borderRight: '1px solid #1A1A1A',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #1A1A1A' }}>
        <button onClick={onToggle}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, float: 'right' }}>
          &#9776;
        </button>
        <button onClick={onNewChat}
          style={{
            background: '#1A1A1A', border: '1px solid #2A2A2A',
            borderRadius: 6, color: '#E0E0E0', cursor: 'pointer',
            padding: '6px 12px', width: '100%', fontSize: 13, textAlign: 'left',
          }}>
          + New Chat
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        <div style={{ padding: '4px 12px', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Tools
        </div>
        {tools.map(t => (
          <div key={t.name} style={{
            padding: '4px 12px', fontSize: 13, color: '#888',
            cursor: 'default',
          }}>
            <span style={{ color: '#6EB5FF' }}>{t.name}</span>
            <div style={{ fontSize: 11, color: '#555', marginLeft: 12 }}>{t.description}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #1A1A1A' }}>
        <button onClick={onOpenSettings}
          style={{
            background: 'none', border: 'none', color: '#666', cursor: 'pointer',
            fontSize: 13, width: '100%', textAlign: 'left', padding: '4px 0',
          }}>
          &#9881; Settings
        </button>
      </div>
    </div>
  )
}
