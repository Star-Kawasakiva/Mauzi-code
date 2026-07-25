import React, { useState, useEffect } from 'react'

interface ProviderInfo {
  id: string
  name: string
  defaultBase: string
  authHeader: string
  authPrefix: string
  models: string[]
  supportsTools: boolean
  docsUrl: string
}

interface Props {
  onSave: (provider: string, apiKey: string, model: string, apiBase: string) => void
  onClose: () => void
}

export function SettingsDialog({ onSave, onClose }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [providerId, setProviderId] = useState('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [apiBase, setApiBase] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    window.mauzi.providers.list().then(setProviders)
    window.mauzi.settings.load().then(s => {
      if (s.provider) setProviderId(s.provider)
      if (s.apiKey) setApiKey(s.apiKey)
      if (s.model) setModel(s.model)
      if (s.apiBase) setApiBase(s.apiBase)
    })
  }, [])

  const currentProvider = providers.find(p => p.id === providerId)
  const models = currentProvider?.models ?? []

  function handleProviderChange(id: string) {
    setProviderId(id)
    const p = providers.find(x => x.id === id)
    if (p) {
      setApiBase(p.defaultBase)
      setModel(p.models[0] || '')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#151515', borderRadius: 12, padding: 24,
        width: 480, border: '1px solid #2A2A2A', maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#E0E0E0', marginBottom: 20 }}>
          Settings
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
          Provider
        </label>
        <select
          value={providerId}
          onChange={e => handleProviderChange(e.target.value)}
          style={{
            width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A',
            borderRadius: 6, padding: '8px 10px', color: '#E0E0E0',
            fontSize: 13, outline: 'none', marginBottom: 16,
          }}
        >
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
          API Key {currentProvider?.docsUrl &&
            <span style={{ color: '#555', marginLeft: 8, fontSize: 11 }}>({currentProvider.docsUrl})</span>
          }
        </label>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={currentProvider?.authPrefix + '...'}
            style={{
              flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A',
              borderRadius: 6, padding: '8px 10px', color: '#E0E0E0',
              fontSize: 13, fontFamily: 'monospace', outline: 'none',
            }}
          />
          <button onClick={() => setShowKey(!showKey)}
            style={{
              background: '#1A1A1A', border: '1px solid #2A2A2A',
              borderRadius: 6, padding: '8px 10px', color: '#888',
              cursor: 'pointer', fontSize: 12,
            }}>
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
          API Base URL
        </label>
        <input
          type="text"
          value={apiBase}
          onChange={e => setApiBase(e.target.value)}
          style={{
            width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A',
            borderRadius: 6, padding: '8px 10px', color: '#E0E0E0',
            fontSize: 13, fontFamily: 'monospace', outline: 'none', marginBottom: 16,
          }}
        />

        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
          Model
        </label>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{
            width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A',
            borderRadius: 6, padding: '8px 10px', color: '#E0E0E0',
            fontSize: 13, outline: 'none', marginBottom: 12,
          }}
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {currentProvider && (
          <div style={{ fontSize: 11, color: '#555', marginBottom: 20 }}>
            Tools: {currentProvider.supportsTools ?
              <span style={{ color: '#69DB7C' }}>supported</span> :
              <span style={{ color: '#FF6B6B' }}>not supported</span>}
            {' | '}
            Auth: {currentProvider.authHeader}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{
              background: '#1A1A1A', border: '1px solid #2A2A2A',
              borderRadius: 6, padding: '8px 16px', color: '#888',
              cursor: 'pointer', fontSize: 13,
            }}>
            Cancel
          </button>
          <button onClick={() => onSave(providerId, apiKey, model, apiBase)}
            style={{
              background: '#6EB5FF', border: 'none', borderRadius: 6,
              padding: '8px 16px', color: '#000', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
            }}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
