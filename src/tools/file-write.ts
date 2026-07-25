import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import type { ToolDefinition, ToolContext } from '../types'

export const fileWriteTool: ToolDefinition = {
  name: 'file_write',
  description: 'Write a new file (will not overwrite)',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
      content: { type: 'string', description: 'File content' },
    },
    required: ['path', 'content'],
  },
  execute: async (args, context) => {
    const filePath = resolve(context.cwd, args.path as string)
    try {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, args.content as string, 'utf-8')
      return `Written ${filePath}`
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  },
}
