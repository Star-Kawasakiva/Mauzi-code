import { glob } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ToolDefinition, ToolContext } from '../types'

export const globTool: ToolDefinition = {
  name: 'glob',
  description: 'Find files by glob pattern',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern (e.g. **/*.ts)' },
    },
    required: ['pattern'],
  },
  execute: async (args, context) => {
    const pattern = args.pattern as string
    try {
      const results: string[] = []
      for await (const entry of glob(pattern, { cwd: context.cwd })) {
        results.push(entry)
        if (results.length >= 200) break
      }
      if (results.length === 0) return `No files matching "${pattern}"`
      return results.sort().join('\n') + `\n\n(${results.length} file(s))`
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  },
}
