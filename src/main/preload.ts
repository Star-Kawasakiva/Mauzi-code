import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('mauzi', {
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (s: Record<string, unknown>) => ipcRenderer.invoke('settings:save', s),
  },
  providers: {
    list: () => ipcRenderer.invoke('providers:list'),
  },
  session: {
    create: (t: string) => ipcRenderer.invoke('session:create', t),
    get: () => ipcRenderer.invoke('session:get'),
    save: () => ipcRenderer.invoke('session:save'),
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
  },
  cwd: { get: () => ipcRenderer.invoke('cwd:get') },
  send: (t: string) => ipcRenderer.invoke('send:message', t),
  abort: () => ipcRenderer.invoke('abort'),
  tools: { list: () => ipcRenderer.invoke('tools:list') },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const valid = ['stream:content', 'stream:tool-call', 'stream:tool-result', 'stream:status', 'stream:error', 'stream:done']
    if (valid.includes(channel)) {
      const sub = (_e: Electron.IpcRendererEvent, ...a: unknown[]) => callback(...a)
      ipcRenderer.on(channel, sub)
      return () => ipcRenderer.removeListener(channel, sub)
    }
    return () => {}
  },
})
