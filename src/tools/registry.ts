import type { ToolDefinition } from '../types'
import { bashTool } from './bash'
import { fileReadTool } from './file-read'
import { fileWriteTool } from './file-write'
import { fileEditTool } from './file-edit'
import { globTool } from './glob'
import { grepTool } from './grep'

const tools: ToolDefinition[] = [
  bashTool,
  fileReadTool,
  fileWriteTool,
  fileEditTool,
  globTool,
  grepTool,
]

export function getAllTools(): ToolDefinition[] {
  return tools
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.find(t => t.name === name)
}

export function getToolSchemas() {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Record<string, unknown>,
  }))
}
