import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ToolDefinition, ToolContext } from '../types'

export const fileReadTool: ToolDefinition = {
  name: 'file_read',
  description: 'Read file contents',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' },
      offset: { type: 'number', description: 'Line offset (1-indexed)' },
      limit: { type: 'number', description: 'Max lines to read' },
    },
    required: ['path'],
  },
  execute: async (args, context) => {
    const filePath = resolve(context.cwd, args.path as string)
    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      const offset = (args.offset as number) ?? 1
      const limit = (args.limit as number) ?? lines.length
      const slice = lines.slice(offset - 1, offset - 1 + limit)
      return slice.map((l, i) => `${offset + i}:${l}`).join('\n') +
        `\n\n(Lines ${offset}-${offset + slice.length - 1} of ${lines.length})`
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  },
}
