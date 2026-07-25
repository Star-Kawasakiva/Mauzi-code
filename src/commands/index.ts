import type { CommandDefinition } from '../types'
import { saveSession, listSessions, deleteSession } from '../services/session'

export function getCommands(): CommandDefinition[] {
  return [
    {
      name: 'help',
      aliases: ['h', '?'],
      description: 'Show available commands',
      handler: async (_args, context) => {
        context.print(`
Available commands:
  /help, /h        Show this help
  /clear, /cls     Clear the screen
  /exit, /quit     Exit MauziCode
  /save            Save current session
  /sessions, /ss   List saved sessions
  /delete <id>     Delete a session
  /model <name>    Switch model
  /status          Show current status
  /cost            Show token usage
  /reset           Reset conversation
`)
      },
    },
    {
      name: 'clear',
      aliases: ['cls'],
      description: 'Clear the screen',
      handler: async () => {
        process.stdout.write('\u001B[2J\u001B[H')
      },
    },
    {
      name: 'exit',
      aliases: ['quit', 'q'],
      description: 'Exit MauziCode',
      handler: async () => {
        process.exit(0)
      },
    },
    {
      name: 'save',
      aliases: [],
      description: 'Save current session',
      handler: async (_args, context) => {
        await saveSession(context.cwd, context.session)
        context.print(`Session saved: ${context.session.id}`)
      },
    },
    {
      name: 'sessions',
      aliases: ['ss'],
      description: 'List saved sessions',
      handler: async (_args, context) => {
        const sessions = await listSessions(context.cwd)
        if (sessions.length === 0) {
          context.print('No saved sessions')
          return
        }
        context.print(`Saved sessions (${sessions.length}):`)
        for (const s of sessions.slice(0, 20)) {
          const date = new Date(s.updatedAt).toLocaleString()
          const count = s.messages.length
          context.print(`  ${s.id}  ${s.title.slice(0, 40).padEnd(40)} ${count} msgs  ${date}`)
        }
      },
    },
    {
      name: 'delete',
      aliases: [],
      description: 'Delete a session by ID',
      handler: async (args, context) => {
        const id = args[0]
        if (!id) {
          context.print('Usage: /delete <session-id>')
          return
        }
        const ok = await deleteSession(context.cwd, id)
        context.print(ok ? `Deleted session ${id}` : `Session ${id} not found`)
      },
    },
    {
      name: 'model',
      aliases: [],
      description: 'Switch AI model',
      handler: async (args, context) => {
        if (!args[0]) {
          context.print('Usage: /model <model-name>')
          return
        }
        context.session.messages.push({
          id: 'sys-' + Date.now(),
          role: 'user',
          content: `[System: Model switched to ${args[0]}]`,
          timestamp: Date.now(),
        })
        context.print(`Model set to ${args[0]}`)
      },
    },
    {
      name: 'status',
      aliases: [],
      description: 'Show current status',
      handler: async (_args, context) => {
        const msgCount = context.session.messages.length
        const dir = context.cwd
        context.print(`Directory: ${dir}`)
        context.print(`Messages: ${msgCount}`)
        context.print(`Session ID: ${context.session.id}`)
      },
    },
    {
      name: 'cost',
      aliases: [],
      description: 'Show token usage',
      handler: async (_args, context) => {
        const totalChars = context.session.messages.reduce((s, m) => s + m.content.length, 0)
        context.print(`Total characters: ${totalChars}`)
        context.print(`Messages: ${context.session.messages.length}`)
      },
    },
    {
      name: 'reset',
      aliases: ['new'],
      description: 'Reset conversation',
      handler: async (_args, context) => {
        context.session.messages = []
        context.session.title = `Session ${new Date().toLocaleString()}`
        context.print('Conversation reset')
      },
    },
  ]
}

export function findCommand(input: string): CommandDefinition | null {
  if (!input.startsWith('/')) return null
  const parts = input.slice(1).split(/\s+/)
  const name = parts[0].toLowerCase()
  const args = parts.slice(1)
  for (const cmd of getCommands()) {
    if (cmd.name === name || cmd.aliases.includes(name)) {
      return { ...cmd, handler: async (ctx) => cmd.handler(args, ctx as any) } as CommandDefinition
    }
  }
  return null
}
