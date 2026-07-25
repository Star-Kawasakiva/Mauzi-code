import chalk from 'chalk'
import type { ThemeConfig } from '../types'

export const darkTheme: ThemeConfig = {
  background: '#000000',
  foreground: '#E8E8E8',
  accent: '#6EB5FF',
  dim: '#666666',
  error: '#FF6B6B',
  success: '#69DB7C',
  border: '#333333',
  selection: '#264F78',
}

export const theme = {
  fg: chalk.hex(darkTheme.foreground),
  accent: chalk.hex(darkTheme.accent),
  dim: chalk.hex(darkTheme.dim),
  error: chalk.hex(darkTheme.error),
  success: chalk.hex(darkTheme.success),
  border: chalk.hex(darkTheme.border),

  prompt: (text: string) => chalk.hex(darkTheme.accent).bold(text),
  heading: (text: string) => chalk.hex(darkTheme.foreground).bold(text),
  label: (text: string) => chalk.hex(darkTheme.dim)(text),
  code: (text: string) => chalk.hex('#D4D4D4').italic(text),
  highlight: (text: string) => chalk.hex(darkTheme.accent)(text),
  errorText: (text: string) => chalk.hex(darkTheme.error)(text),
  successText: (text: string) => chalk.hex(darkTheme.success)(text),
}

export function separator(width: number): string {
  return chalk.hex(darkTheme.border)('\u2500'.repeat(Math.min(width, 80)))
}

export function boxed(text: string, width: number): string {
  const lines = text.split('\n')
  const w = Math.min(width - 4, 76)
  const top = chalk.hex(darkTheme.border)(`\u2554${'\u2550'.repeat(w)}\u2557`)
  const bottom = chalk.hex(darkTheme.border)(`\u255A${'\u2550'.repeat(w)}\u255D`)
  const middle = lines.map(l =>
    chalk.hex(darkTheme.border)('\u2551 ') + l.padEnd(w) + chalk.hex(darkTheme.border)(' \u2551')
  )
  return [top, ...middle, bottom].join('\n')
}
