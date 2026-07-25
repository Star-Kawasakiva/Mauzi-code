import React, { useState, useRef, useEffect } from 'react'

interface Props {
  onSend: (text: string) => void
  onAbort: () => void
  isStreaming: boolean
}

export function InputBox({ onSend, onAbort, isStreaming }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [rows, setRows] = useState(1)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim()) {
        onSend(text)
        setText('')
        setRows(1)
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    const lineCount = (e.target.value.match(/\n/g) || []).length + 1
    setRows(Math.min(lineCount, 6))
  }

  return (
    <div style={{
      padding: '8px 12px 12px',
      background: '#0D0D0D',
      borderTop: '1px solid #1A1A1A',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={rows}
          placeholder={isStreaming ? 'Waiting for response...' : 'Type a message...'}
          disabled={isStreaming}
          style={{
            flex: 1,
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#E0E0E0',
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            minHeight: 36,
          }}
        />
        {isStreaming ? (
          <button
            onClick={onAbort}
            style={{
              background: '#FF4444', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => { if (text.trim()) { onSend(text); setText(''); setRows(1) } }}
            disabled={!text.trim()}
            style={{
              background: text.trim() ? '#6EB5FF' : '#2A2A2A',
              color: text.trim() ? '#000' : '#666',
              border: 'none', borderRadius: 8,
              padding: '8px 16px', cursor: text.trim() ? 'pointer' : 'default',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            Send
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#444', marginTop: 4, textAlign: 'right' }}>
        Enter to send &middot; Shift+Enter for new line
      </div>
    </div>
  )
}
