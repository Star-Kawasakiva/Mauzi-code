import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import type { Session } from '../types'

const SESSIONS_DIR = '.mauzicode/sessions'

function sessionDir(cwd: string) { return resolve(cwd, SESSIONS_DIR) }
function sessionPath(cwd: string, id: string) { return join(sessionDir(cwd), `${id}.json`) }

export async function listSessions(cwd: string): Promise<Session[]> {
  try {
    const dir = sessionDir(cwd)
    const files = await readdir(dir)
    const sessions: Session[] = []
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      try { sessions.push(JSON.parse(await readFile(join(dir, f), 'utf-8'))) } catch { }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch { return [] }
}

export async function saveSession(cwd: string, session: Session): Promise<void> {
  const dir = sessionDir(cwd)
  await mkdir(dir, { recursive: true })
  session.updatedAt = Date.now()
  await writeFile(sessionPath(cwd, session.id), JSON.stringify(session, null, 2), 'utf-8')
}

export function createSession(title: string, cwd: string, model: string): Session {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title || `Session ${new Date().toLocaleString()}`,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    directory: cwd,
    model,
  }
}
