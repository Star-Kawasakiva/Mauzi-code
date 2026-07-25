"use strict";

// src/main/index.ts
var import_electron = require("electron");
var import_node_path5 = require("node:path");
var import_node_fs = require("node:fs");
var import_node_crypto = require("node:crypto");

// src/tools/bash.ts
var import_node_child_process = require("node:child_process");
var bashTool = {
  name: "bash",
  description: "Execute shell commands",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Shell command to execute" },
      timeout: { type: "number", description: "Timeout in ms (default 30000)" }
    },
    required: ["command"]
  },
  execute: async (args, context) => {
    const command = args.command;
    const timeout = args.timeout || 3e4;
    return new Promise((resolve5) => {
      const child = (0, import_node_child_process.exec)(command, {
        cwd: context.cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024
      }, (error, stdout, stderr) => {
        const parts = [];
        if (stdout) parts.push(stdout);
        if (stderr) parts.push(`STDERR:
${stderr}`);
        if (error && !stdout && !stderr) parts.push(error.message);
        parts.push(`
Exit code: ${error?.code ?? 0}`);
        resolve5(parts.join(""));
      });
      context.abortSignal.addEventListener("abort", () => child.kill("SIGTERM"));
    });
  }
};

// src/tools/file-read.ts
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
var fileReadTool = {
  name: "file_read",
  description: "Read file contents",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file" },
      offset: { type: "number", description: "Line offset (1-indexed)" },
      limit: { type: "number", description: "Max lines to read" }
    },
    required: ["path"]
  },
  execute: async (args, context) => {
    const filePath = (0, import_node_path.resolve)(context.cwd, args.path);
    try {
      const content = await (0, import_promises.readFile)(filePath, "utf-8");
      const lines = content.split("\n");
      const offset = args.offset ?? 1;
      const limit = args.limit ?? lines.length;
      const slice = lines.slice(offset - 1, offset - 1 + limit);
      return slice.map((l, i) => `${offset + i}:${l}`).join("\n") + `

(Lines ${offset}-${offset + slice.length - 1} of ${lines.length})`;
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
};

// src/tools/file-write.ts
var import_promises2 = require("node:fs/promises");
var import_node_path2 = require("node:path");
var fileWriteTool = {
  name: "file_write",
  description: "Write a new file (will not overwrite)",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path" },
      content: { type: "string", description: "File content" }
    },
    required: ["path", "content"]
  },
  execute: async (args, context) => {
    const filePath = (0, import_node_path2.resolve)(context.cwd, args.path);
    try {
      await (0, import_promises2.mkdir)((0, import_node_path2.dirname)(filePath), { recursive: true });
      await (0, import_promises2.writeFile)(filePath, args.content, "utf-8");
      return `Written ${filePath}`;
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
};

// src/tools/file-edit.ts
var import_promises3 = require("node:fs/promises");
var import_node_path3 = require("node:path");
var fileEditTool = {
  name: "file_edit",
  description: "Edit a file via find-and-replace",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path" },
      oldString: { type: "string", description: "Text to replace" },
      newString: { type: "string", description: "Replacement text" }
    },
    required: ["path", "oldString", "newString"]
  },
  execute: async (args, context) => {
    const filePath = (0, import_node_path3.resolve)(context.cwd, args.path);
    try {
      const content = await (0, import_promises3.readFile)(filePath, "utf-8");
      const count = content.split(args.oldString).length - 1;
      if (count === 0) return "Error: oldString not found";
      if (count > 1) return `Error: ${count} matches \u2014 provide more context`;
      await (0, import_promises3.writeFile)(filePath, content.replace(args.oldString, args.newString), "utf-8");
      return `Edited ${filePath} (1 replacement)`;
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
};

// src/tools/glob.ts
var import_promises4 = require("node:fs/promises");
var globTool = {
  name: "glob",
  description: "Find files by glob pattern",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob pattern (e.g. **/*.ts)" }
    },
    required: ["pattern"]
  },
  execute: async (args, context) => {
    const pattern = args.pattern;
    try {
      const results = [];
      for await (const entry of (0, import_promises4.glob)(pattern, { cwd: context.cwd })) {
        results.push(entry);
        if (results.length >= 200) break;
      }
      if (results.length === 0) return `No files matching "${pattern}"`;
      return results.sort().join("\n") + `

(${results.length} file(s))`;
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
};

// src/tools/grep.ts
var import_node_child_process2 = require("node:child_process");
var grepTool = {
  name: "grep",
  description: "Search file contents with regex",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regex pattern" },
      include: { type: "string", description: "File glob filter" }
    },
    required: ["pattern"]
  },
  execute: async (args, context) => {
    const pattern = args.pattern;
    const include = args.include;
    try {
      let cmd = `rg -n --no-heading "${pattern.replace(/"/g, '\\"')}"`;
      if (include) cmd += ` -g "${include}"`;
      cmd += ` "${context.cwd}"`;
      const output = (0, import_node_child_process2.execSync)(cmd, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 15e3,
        stdio: ["pipe", "pipe", "pipe"]
      });
      const lines = output.trim().split("\n").filter(Boolean);
      if (lines.length === 0) return `No matches for "${pattern}"`;
      const shown = lines.slice(0, 100);
      const rest = lines.length - shown.length;
      return shown.join("\n") + (rest > 0 ? `

... +${rest} more` : "") + `
(${lines.length} matches)`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("exited with code") || msg.includes("process terminated")) return `No matches for "${pattern}"`;
      return `Error: ${msg}`;
    }
  }
};

// src/tools/registry.ts
var tools = [
  bashTool,
  fileReadTool,
  fileWriteTool,
  fileEditTool,
  globTool,
  grepTool
];
function getAllTools() {
  return tools;
}
function getTool(name) {
  return tools.find((t) => t.name === name);
}

// src/services/providers.ts
var PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    apiFormat: "anthropic",
    defaultBase: "https://api.anthropic.com",
    authHeader: "x-api-key",
    authPrefix: "",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      "claude-sonnet-4-20250514",
      "claude-4-opus-20250514",
      "claude-4-5-sonnet-20260514",
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-haiku-20240307"
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: "https://console.anthropic.com/"
  },
  {
    id: "openai",
    name: "OpenAI",
    apiFormat: "openai",
    defaultBase: "https://api.openai.com/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "OPENAI_API_KEY",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
      "o1",
      "o1-mini",
      "o3-mini"
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: "https://platform.openai.com/"
  },
  {
    id: "gemini",
    name: "Gemini",
    apiFormat: "gemini",
    defaultBase: "https://generativelanguage.googleapis.com/v1beta",
    authHeader: "x-goog-api-key",
    authPrefix: "",
    envKey: "GEMINI_API_KEY",
    models: [
      "gemini-2.5-pro-exp-03-25",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash"
    ],
    supportsTools: false,
    supportsStreaming: true,
    docsUrl: "https://aistudio.google.com/"
  },
  {
    id: "xai",
    name: "xAI",
    apiFormat: "openai",
    defaultBase: "https://api.x.ai/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "XAI_API_KEY",
    models: [
      "grok-2-1212",
      "grok-2-vision-1212",
      "grok-beta"
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: "https://console.x.ai/"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    apiFormat: "openai",
    defaultBase: "https://api.deepseek.com/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "DEEPSEEK_API_KEY",
    models: [
      "deepseek-chat",
      "deepseek-reasoner"
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: "https://platform.deepseek.com/"
  },
  {
    id: "groq",
    name: "Groq",
    apiFormat: "openai",
    defaultBase: "https://api.groq.com/openai/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "GROQ_API_KEY",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
      "deepseek-r1-distill-llama-70b",
      "qwen-2.5-32b"
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: "https://console.groq.com/"
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    apiFormat: "openai",
    defaultBase: "https://openrouter.ai/api/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "OPENROUTER_API_KEY",
    models: [
      "anthropic/claude-sonnet-4",
      "anthropic/claude-4-opus",
      "openai/gpt-4o",
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "x-ai/grok-2",
      "qwen/qwen-2.5-72b-instruct"
    ],
    supportsTools: true,
    supportsStreaming: true,
    docsUrl: "https://openrouter.ai/keys"
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    apiFormat: "openai",
    defaultBase: "http://localhost:1234/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "",
    models: ["local-model"],
    supportsTools: false,
    supportsStreaming: true,
    docsUrl: "https://lmstudio.ai/"
  },
  {
    id: "ollama",
    name: "Ollama",
    apiFormat: "openai",
    defaultBase: "http://localhost:11434/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "",
    models: [
      "llama3.3",
      "llama3.2",
      "mistral",
      "codellama",
      "mixtral",
      "qwen2.5",
      "deepseek-r1"
    ],
    supportsTools: false,
    supportsStreaming: true,
    docsUrl: "https://ollama.ai/"
  }
];
function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

// src/services/api.ts
function convertMessages(messages, format) {
  if (format === "anthropic") {
    return messages.map((m) => {
      if (m.role === "user") return { role: "user", content: m.content };
      if (m.role === "tool") {
        const tr = m.toolResults?.[0];
        return {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: tr?.id ?? "", content: m.content }]
        };
      }
      const parts = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      if (m.toolCalls) {
        for (const tc of m.toolCalls) {
          parts.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args });
        }
      }
      return { role: "assistant", content: parts };
    });
  }
  return messages.map((m) => {
    if (m.role === "tool") {
      const tr = m.toolResults?.[0];
      return {
        role: "tool",
        tool_call_id: tr?.id ?? m.id,
        content: m.content
      };
    }
    if (m.role === "assistant") {
      const msg = { role: "assistant", content: m.content || "" };
      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args) }
        }));
      }
      return msg;
    }
    return { role: "user", content: m.content };
  });
}
function getToolSchemas(tools2, format) {
  return tools2.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}
async function* streamAnthropic(body, settings, signal) {
  const response = await fetch(`${settings.apiBase}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body),
    signal
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Anthropic API ${response.status}: ${errText}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const d = t.slice(6);
      if (d === "[DONE]") return;
      try {
        const p = JSON.parse(d);
        if (p.type === "content_block_delta" && p.delta?.text) yield { content: p.delta.text };
        if (p.type === "content_block_start" && p.content_block?.type === "tool_use") {
          yield { toolCalls: [{ id: p.content_block.id, name: p.content_block.name, args: p.content_block.input ?? {} }] };
        }
        if (p.type === "message_delta" && p.delta?.stop_reason) yield { stopReason: p.delta.stop_reason };
        if (p.type === "message_start" && p.message?.stop_reason) yield { stopReason: p.message.stop_reason };
        if (p.type === "message_stop") yield { stopReason: "end_turn" };
      } catch {
      }
    }
  }
}
async function* streamOpenAI(body, settings, signal) {
  const url = `${settings.apiBase}/chat/completions`;
  const headers = {
    "Content-Type": "application/json"
  };
  headers[settings.provider.authHeader] = settings.provider.authPrefix + settings.apiKey;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`${settings.provider.name} API ${response.status}: ${errText}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let currentToolCalls = /* @__PURE__ */ new Map();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const d = t.slice(6);
      if (d === "[DONE]") {
        yield { stopReason: "stop" };
        return;
      }
      try {
        const p = JSON.parse(d);
        const choice = p.choices?.[0];
        if (!choice) continue;
        if (choice.delta?.content) {
          yield { content: choice.delta.content };
        }
        if (choice.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const idx = tc.index ?? 0;
            const key = String(idx);
            if (!currentToolCalls.has(key)) {
              currentToolCalls.set(key, {
                id: tc.id || `call_${idx}`,
                name: tc.function?.name || "",
                args: tc.function?.arguments || ""
              });
            } else {
              const existing = currentToolCalls.get(key);
              if (tc.function?.name) existing.name += tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
            }
          }
        }
        if (choice.finish_reason) {
          if (choice.finish_reason === "tool_calls" && currentToolCalls.size > 0) {
            const calls = Array.from(currentToolCalls.values()).map((tc) => {
              let args = {};
              try {
                args = JSON.parse(tc.args);
              } catch {
                args = { _raw: tc.args };
              }
              return { id: tc.id, name: tc.name, args };
            });
            yield { toolCalls: calls };
            currentToolCalls.clear();
          }
          if (choice.finish_reason === "stop") {
            yield { stopReason: "end_turn" };
          }
        }
      } catch {
      }
    }
  }
}
async function* streamGemini(body, settings, signal) {
  const model = body.model;
  const url = `${settings.apiBase}/models/${model}:streamGenerateContent?alt=sse&key=${settings.apiKey}`;
  const { model: _m, ...reqBody } = body;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
    signal
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Gemini API ${response.status}: ${errText}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const d = t.slice(6);
      if (d === "[DONE]") return;
      try {
        const p = JSON.parse(d);
        const candidate = p.candidates?.[0];
        if (!candidate) continue;
        const text = candidate.content?.parts?.map((p2) => p2.text).filter(Boolean).join("");
        if (text) yield { content: text };
        if (candidate.finishReason) {
          yield { stopReason: candidate.finishReason.toLowerCase() === "stop" ? "end_turn" : candidate.finishReason };
        }
      } catch {
      }
    }
  }
}
async function* streamComplete(messages, tools2, settings, signal) {
  const provider = getProvider(settings.provider);
  const formattedMessages = convertMessages(messages, provider.apiFormat);
  if (provider.apiFormat === "anthropic") {
    const body = {
      model: settings.model,
      max_tokens: settings.maxTokens,
      system: settings.systemPrompt,
      messages: formattedMessages,
      stream: true
    };
    if (provider.supportsTools) {
      body.tools = tools2.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      }));
    }
    yield* streamAnthropic(body, settings, signal);
  } else if (provider.apiFormat === "gemini") {
    const contents = [];
    const systemMsg = settings.systemPrompt;
    for (const m of formattedMessages) {
      if (m.role === "user") {
        contents.push({ role: "user", parts: [{ text: m.content }] });
      } else {
        contents.push({ role: "model", parts: [{ text: m.content }] });
      }
    }
    const body = {
      model: settings.model,
      contents,
      generationConfig: { maxOutputTokens: settings.maxTokens }
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg }] };
    }
    yield* streamGemini(body, settings, signal);
  } else {
    const body = {
      model: settings.model,
      messages: formattedMessages,
      max_tokens: settings.maxTokens,
      stream: true
    };
    if (settings.systemPrompt) {
      body.system = settings.systemPrompt;
    }
    if (provider.supportsTools && tools2.length > 0) {
      body.tools = getToolSchemas(tools2, "openai");
    }
    yield* streamOpenAI(body, settings, signal);
  }
}

// src/services/session.ts
var import_promises5 = require("node:fs/promises");
var import_node_path4 = require("node:path");
var SESSIONS_DIR = ".mauzicode/sessions";
function sessionDir(cwd2) {
  return (0, import_node_path4.resolve)(cwd2, SESSIONS_DIR);
}
function sessionPath(cwd2, id) {
  return (0, import_node_path4.join)(sessionDir(cwd2), `${id}.json`);
}
async function listSessions(cwd2) {
  try {
    const dir = sessionDir(cwd2);
    const files = await (0, import_promises5.readdir)(dir);
    const sessions = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        sessions.push(JSON.parse(await (0, import_promises5.readFile)((0, import_node_path4.join)(dir, f), "utf-8")));
      } catch {
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}
async function saveSession(cwd2, session2) {
  const dir = sessionDir(cwd2);
  await (0, import_promises5.mkdir)(dir, { recursive: true });
  session2.updatedAt = Date.now();
  await (0, import_promises5.writeFile)(sessionPath(cwd2, session2.id), JSON.stringify(session2, null, 2), "utf-8");
}
function createSession(title, cwd2, model) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title || `Session ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    directory: cwd2,
    model
  };
}

// src/main/index.ts
var mainWindow = null;
var session;
var cwd = process.cwd();
var abortController = null;
var SETTINGS_PATH = (0, import_node_path5.join)(import_electron.app.getPath("userData"), "settings.json");
function loadSettings() {
  try {
    if ((0, import_node_fs.existsSync)(SETTINGS_PATH)) {
      const data = JSON.parse((0, import_node_fs.readFileSync)(SETTINGS_PATH, "utf-8"));
      return {
        provider: data.provider || "anthropic",
        apiKey: data.apiKey || process.env["ANTHROPIC_API_KEY"] || "",
        model: data.model || "claude-sonnet-4-20250514",
        apiBase: data.apiBase || "https://api.anthropic.com",
        maxTokens: data.maxTokens || 8192
      };
    }
  } catch {
  }
  const envKey = process.env["ANTHROPIC_API_KEY"];
  return {
    provider: "anthropic",
    apiKey: envKey || "",
    model: "claude-sonnet-4-20250514",
    apiBase: "https://api.anthropic.com",
    maxTokens: 8192
  };
}
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 600,
    minHeight: 400,
    title: "MauziCode",
    backgroundColor: "#0D0D0D",
    icon: (0, import_node_path5.join)(__dirname, "../../assets/icon.png"),
    webPreferences: {
      preload: (0, import_node_path5.join)(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    frame: true
  });
  mainWindow.loadFile((0, import_node_path5.join)(__dirname, "../renderer/index.html"));
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
async function handleApiStream(messages, settings, win) {
  abortController = new AbortController();
  let toolUseDepth = 0;
  const maxDepth = 10;
  const tools2 = getAllTools();
  const provider = getProvider(settings.provider);
  while (toolUseDepth < maxDepth) {
    toolUseDepth++;
    let textAccum = "";
    let pendingTools = [];
    let stopReason = "";
    win.webContents.send("stream:status", toolUseDepth > 1 ? "thinking..." : "thinking");
    const stream = streamComplete(messages, tools2, {
      provider: settings.provider,
      apiKey: settings.apiKey,
      apiBase: settings.apiBase,
      model: settings.model,
      maxTokens: settings.maxTokens,
      systemPrompt: `You are MauziCode, a desktop AI coding assistant.
You have tools available: bash, file_read, file_write, file_edit, glob, grep.
Use them when the user asks you to interact with files or run commands.
Be concise and helpful.`
    }, abortController.signal);
    try {
      for await (const chunk of stream) {
        if (chunk.content) {
          textAccum += chunk.content;
          win.webContents.send("stream:content", chunk.content);
        }
        if (chunk.toolCalls) {
          for (const tc of chunk.toolCalls) {
            pendingTools.push(tc);
            win.webContents.send("stream:tool-call", tc);
          }
        }
        if (chunk.stopReason) {
          stopReason = chunk.stopReason;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("abort") || abortController?.signal.aborted) {
        win.webContents.send("stream:error", "Cancelled");
      } else {
        win.webContents.send("stream:error", msg);
      }
      return;
    }
    if (textAccum) {
      messages.push({
        id: (0, import_node_crypto.randomUUID)(),
        role: "assistant",
        content: textAccum,
        timestamp: Date.now(),
        toolCalls: pendingTools.length > 0 ? pendingTools : void 0
      });
    }
    if (pendingTools.length === 0) break;
    if (!provider.supportsTools) {
      messages.push({
        id: (0, import_node_crypto.randomUUID)(),
        role: "assistant",
        content: `[Tool calls requested but ${provider.name} does not support them]`,
        timestamp: Date.now()
      });
      break;
    }
    for (const tc of pendingTools) {
      const tool = getTool(tc.name);
      if (!tool) {
        messages.push({
          id: tc.id,
          role: "tool",
          content: `Unknown tool: ${tc.name}`,
          timestamp: Date.now(),
          toolResults: [{ id: tc.id, name: tc.name, output: "", error: "Unknown tool" }]
        });
        continue;
      }
      win.webContents.send("stream:status", `running ${tc.name}`);
      const context = { cwd, abortSignal: abortController.signal };
      try {
        const output = await tool.execute(tc.args, context);
        messages.push({
          id: tc.id,
          role: "tool",
          content: output,
          timestamp: Date.now(),
          toolResults: [{ id: tc.id, name: tc.name, output }]
        });
        win.webContents.send("stream:tool-result", { id: tc.id, name: tc.name, output });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        messages.push({
          id: tc.id,
          role: "tool",
          content: `Error: ${error}`,
          timestamp: Date.now(),
          toolResults: [{ id: tc.id, name: tc.name, output: "", error }]
        });
        win.webContents.send("stream:tool-result", { id: tc.id, name: tc.name, output: "", error });
      }
    }
    if (stopReason === "end_turn" || stopReason === "stop") break;
  }
  win.webContents.send("stream:done");
}
import_electron.ipcMain.handle("settings:load", () => loadSettings());
import_electron.ipcMain.handle("settings:save", (_, s) => {
  (0, import_node_fs.writeFileSync)(SETTINGS_PATH, JSON.stringify(s, null, 2));
  return true;
});
import_electron.ipcMain.handle("providers:list", () => {
  return PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    defaultBase: p.defaultBase,
    authHeader: p.authHeader,
    authPrefix: p.authPrefix,
    models: p.models,
    supportsTools: p.supportsTools,
    docsUrl: p.docsUrl
  }));
});
import_electron.ipcMain.handle("session:create", (_, title) => {
  session = createSession(title, cwd, loadSettings().model);
  return session;
});
import_electron.ipcMain.handle("session:get", () => session);
import_electron.ipcMain.handle("session:save", async () => {
  if (session) await saveSession(cwd, session).catch(() => {
  });
  return true;
});
import_electron.ipcMain.handle("sessions:list", async () => listSessions(cwd));
import_electron.ipcMain.handle("cwd:get", () => cwd);
import_electron.ipcMain.handle("send:message", async (_, text) => {
  if (!mainWindow) return;
  const settings = loadSettings();
  if (!settings.apiKey) {
    mainWindow.webContents.send("stream:error", "No API key configured. Open Settings to set one.");
    return;
  }
  const userMsg = {
    id: (0, import_node_crypto.randomUUID)(),
    role: "user",
    content: text,
    timestamp: Date.now()
  };
  session.messages.push(userMsg);
  const msgCopy = [...session.messages];
  await handleApiStream(msgCopy, settings, mainWindow);
  session.messages = msgCopy;
  await saveSession(cwd, session).catch(() => {
  });
});
import_electron.ipcMain.handle("abort", () => {
  abortController?.abort();
  abortController = null;
  mainWindow?.webContents.send("stream:done");
});
import_electron.ipcMain.handle("tools:list", () => {
  return getAllTools().map((t) => ({ name: t.name, description: t.description }));
});
import_electron.app.whenReady().then(() => {
  const settings = loadSettings();
  session = createSession("Default", cwd, settings.model);
  createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
