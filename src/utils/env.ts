import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function loadEnvFile(cwd: string): Promise<void> {
  const envPath = resolve(cwd, '.env')
  try {
    const content = await readFile(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let value = trimmed.slice(eqIdx + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  } catch {}
}

export function getApiKey(): string | undefined {
  return process.env['ANTHROPIC_API_KEY'] || process.env['MAUZI_API_KEY']
}

export function getDefaultModel(): string {
  return process.env['MAUZI_MODEL'] || 'claude-sonnet-4-20250514'
}
