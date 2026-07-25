import React from 'react'

interface Props {
  status: string
  model: string
  cwd: string
  messageCount: number
}

const statusColors: Record<string, string> = {
  ready: '#69DB7C',
  thinking: '#6EB5FF',
  error: '#FF6B6B',
}

export function StatusBar({ status, model, cwd, messageCount }: Props) {
  const color = statusColors[status] || '#888'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '3px 12px', background: '#1A1A1A',
      borderTop: '1px solid #222', fontSize: 12, color: '#888',
      userSelect: 'none', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#6EB5FF', fontWeight: 700 }}>MAUZI</span>
        <span style={{ color }}>&#9679; {status}</span>
        <span style={{ color: '#555' }}>msgs: {messageCount}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#555' }}>{model}</span>
        <span style={{ color: '#444', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cwd}
        </span>
      </div>
    </div>
  )
}
