import { exec } from 'node:child_process'
import type { ToolDefinition, ToolContext } from '../types'

export const bashTool: ToolDefinition = {
  name: 'bash',
  description: 'Execute shell commands',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
    },
    required: ['command'],
  },
  execute: async (args, context) => {
    const command = args.command as string
    const timeout = (args.timeout as number) || 30000

    return new Promise((resolve) => {
      const child = exec(command, {
        cwd: context.cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        const parts: string[] = []
        if (stdout) parts.push(stdout)
        if (stderr) parts.push(`STDERR:\n${stderr}`)
        if (error && !stdout && !stderr) parts.push(error.message)
        parts.push(`\nExit code: ${error?.code ?? 0}`)
        resolve(parts.join(''))
      })

      context.abortSignal.addEventListener('abort', () => child.kill('SIGTERM'))
    })
  },
}
