import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const HISTORY_FILE = '.mauzicode/history.json'

interface HistoryEntry {
  input: string
  timestamp: number
}

export class HistoryStore {
  private entries: HistoryEntry[] = []
  private filePath: string
  private maxEntries = 1000
  private loaded = false
  private index = -1

  constructor(cwd: string) {
    this.filePath = resolve(cwd, HISTORY_FILE)
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    try {
      const data = await readFile(this.filePath, 'utf-8')
      this.entries = JSON.parse(data)
    } catch {
      this.entries = []
    }
    this.loaded = true
    this.index = this.entries.length
  }

  async add(input: string): Promise<void> {
    await this.ensureLoaded()
    if (this.entries.length > 0 && this.entries[this.entries.length - 1].input === input) {
      this.index = this.entries.length
      return
    }
    this.entries.push({ input, timestamp: Date.now() })
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }
    this.index = this.entries.length
    await this.flush()
  }

  async previous(): Promise<string | null> {
    await this.ensureLoaded()
    if (this.index <= 0) return null
    this.index--
    return this.entries[this.index].input
  }

  async next(): Promise<string | null> {
    await this.ensureLoaded()
    if (this.index >= this.entries.length - 1) {
      this.index = this.entries.length
      return null
    }
    this.index++
    return this.entries[this.index].input
  }

  async search(prefix: string): Promise<string[]> {
    await this.ensureLoaded()
    return this.entries
      .filter(e => e.input.startsWith(prefix))
      .map(e => e.input)
      .reverse()
      .slice(0, 10)
  }

  private async flush(): Promise<void> {
    const dir = resolve(this.filePath, '..')
    await mkdir(dir, { recursive: true })
    await writeFile(this.filePath, JSON.stringify(this.entries), 'utf-8')
  }
}
