import { cursorTo, clearLine, cursorHide, cursorShow, eraseLines } from '../ui/ansi'

export function getTerminalSize(): { rows: number; cols: number } {
  return {
    rows: process.stdout.rows || 24,
    cols: process.stdout.columns || 80,
  }
}

export function setupRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
}

export function restoreTerminal(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false)
  }
  process.stdin.pause()
  process.stdout.write(cursorShow())
}

export function redrawArea(lines: string[], startRow: number): void {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    out.push(`${cursorTo(0, startRow + i)}${clearLine()}${lines[i]}`)
  }
  process.stdout.write(out.join(''))
}

export function clearArea(row: number, count: number): void {
  process.stdout.write(eraseLines(count))
}
