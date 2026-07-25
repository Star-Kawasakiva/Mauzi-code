import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import type { ToolDefinition, ToolContext } from '../types'

export const grepTool: ToolDefinition = {
  name: 'grep',
  description: 'Search file contents with regex',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex pattern' },
      include: { type: 'string', description: 'File glob filter' },
    },
    required: ['pattern'],
  },
  execute: async (args, context) => {
    const pattern = args.pattern as string
    const include = args.include as string | undefined
    try {
      let cmd = `rg -n --no-heading "${pattern.replace(/"/g, '\\"')}"`
      if (include) cmd += ` -g "${include}"`
      cmd += ` "${context.cwd}"`

      const output = execSync(cmd, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 15000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const lines = output.trim().split('\n').filter(Boolean)
      if (lines.length === 0) return `No matches for "${pattern}"`
      const shown = lines.slice(0, 100)
      const rest = lines.length - shown.length
      return shown.join('\n') + (rest > 0 ? `\n\n... +${rest} more` : '') + `\n(${lines.length} matches)`
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('exited with code') || msg.includes('process terminated')) return `No matches for "${pattern}"`
      return `Error: ${msg}`
    }
  },
}
