import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ToolDefinition, ToolContext } from '../types'

export const fileEditTool: ToolDefinition = {
  name: 'file_edit',
  description: 'Edit a file via find-and-replace',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' },
      oldString: { type: 'string', description: 'Text to replace' },
      newString: { type: 'string', description: 'Replacement text' },
    },
    required: ['path', 'oldString', 'newString'],
  },
  execute: async (args, context) => {
    const filePath = resolve(context.cwd, args.path as string)
    try {
      const content = await readFile(filePath, 'utf-8')
      const count = content.split(args.oldString as string).length - 1
      if (count === 0) return 'Error: oldString not found'
      if (count > 1) return `Error: ${count} matches — provide more context`
      await writeFile(filePath, content.replace(args.oldString as string, args.newString as string), 'utf-8')
      return `Edited ${filePath} (1 replacement)`
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  },
}
