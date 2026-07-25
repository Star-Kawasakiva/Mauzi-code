"use strict";

// src/main/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("mauzi", {
  settings: {
    load: () => import_electron.ipcRenderer.invoke("settings:load"),
    save: (s) => import_electron.ipcRenderer.invoke("settings:save", s)
  },
  providers: {
    list: () => import_electron.ipcRenderer.invoke("providers:list")
  },
  session: {
    create: (t) => import_electron.ipcRenderer.invoke("session:create", t),
    get: () => import_electron.ipcRenderer.invoke("session:get"),
    save: () => import_electron.ipcRenderer.invoke("session:save")
  },
  sessions: {
    list: () => import_electron.ipcRenderer.invoke("sessions:list")
  },
  cwd: { get: () => import_electron.ipcRenderer.invoke("cwd:get") },
  send: (t) => import_electron.ipcRenderer.invoke("send:message", t),
  abort: () => import_electron.ipcRenderer.invoke("abort"),
  tools: { list: () => import_electron.ipcRenderer.invoke("tools:list") },
  on: (channel, callback) => {
    const valid = ["stream:content", "stream:tool-call", "stream:tool-result", "stream:status", "stream:error", "stream:done"];
    if (valid.includes(channel)) {
      const sub = (_e, ...a) => callback(...a);
      import_electron.ipcRenderer.on(channel, sub);
      return () => import_electron.ipcRenderer.removeListener(channel, sub);
    }
    return () => {
    };
  }
});
