import chalk from 'chalk'
import stripAnsi from 'strip-ansi'
import { theme, darkTheme, separator } from './theme'
import type { Message, ToolCall, ToolResult } from '../types'

function wordWrap(text: string, width: number): string[] {
  const cleaned = text.replace(/\r\n/g, '\n')
  const paragraphs = cleaned.split('\n')
  const result: string[] = []
  for (const para of paragraphs) {
    if (para.length === 0) { result.push(''); continue }
    const words = para.split(/\s+/)
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (stripAnsi(candidate).length > width && line) {
        result.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) result.push(line)
  }
  return result
}

export function renderMessage(msg: Message, width: number): string[] {
  const lines: string[] = []
  const w = Math.max(20, width - 4)

  if (msg.role === 'user') {
    lines.push(theme.prompt(`\u276F  ${msg.content}`))
  } else if (msg.role === 'tool') {
    const name = msg.toolResults?.[0]?.name ?? 'tool'
    const output = msg.content.slice(0, 500)
    lines.push(theme.label(`\u21AA ${name}`), ...wordWrap(output, w))
  } else {
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      for (const tc of msg.toolCalls) {
        lines.push(theme.label(`\u21E8 Using ${tc.name}`))
      }
    }
    const content = msg.content || '(thinking...)'
    if (content) {
      const wrapped = wordWrap(content, w)
      lines.push(...wrapped.map(l => theme.fg(l)))
    }
  }
  return lines.length ? lines : ['']
}

export function renderMessages(messages: Message[], width: number): string[] {
  const result: string[] = []
  for (let i = 0; i < messages.length; i++) {
    if (i > 0 && messages[i - 1].role !== messages[i].role) {
      result.push(theme.dim('\u2500'))
    }
    const rendered = renderMessage(messages[i], width)
    result.push(...rendered)
  }
  return result
}

export function renderStatusBar(
  mode: string,
  model: string,
  cwd: string,
  width: number
): string {
  const left = `${chalk.hex(darkTheme.accent).bold(' mauzi ')} ${theme.label(mode)}`
  const right = `${theme.label(model)} ${theme.label(cwd.slice(-30))}`
  const pad = width - stripAnsi(left).length - stripAnsi(right).length
  const dots = pad > 0 ? chalk.hex(darkTheme.border)('\u2500'.repeat(pad)) : ' '
  return chalk.hex(darkTheme.background).bgHex(darkTheme.border)(`${left}${dots}${right}`)
}

export function renderInputLine(
  input: string,
  cursor: number,
  width: number
): string {
  const prompt = theme.prompt(' \u276F ')
  const pLen = 2
  const maxInput = width - pLen - 2
  let display = input
  let offset = 0
  if (stripAnsi(display).length > maxInput) {
    offset = stripAnsi(display).length - maxInput
    display = '...' + display.slice(offset + 3)
  }
  const line = prompt + display + ' '.repeat(Math.max(0, maxInput - stripAnsi(display).length))
  return line
}

export function renderToolCall(tc: ToolCall): string {
  const argsStr = Object.entries(tc.args)
    .map(([k, v]) => `  ${theme.label(k)}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')
  return `${theme.highlight('\u25B6')} ${theme.accent(tc.name)}\n${argsStr}`
}

export function renderToolResult(tr: ToolResult): string {
  const output = tr.output.slice(0, 300)
  if (tr.error) {
    return theme.errorText(`\u2717 ${tr.name}: ${tr.error}`)
  }
  return theme.dim(`\u2713 ${tr.name}: ${output}`)
}

export function renderWelcome(width: number): string[] {
  const lines = [
    theme.heading('  MauziCode v1.0'),
    theme.dim('  Terminal AI assistant'),
    '',
    theme.label('  \u2737 /help for commands'),
    theme.label('  \u2737 Ctrl+C to exit'),
    theme.label('  \u2737 Ctrl+L to clear'),
    '',
  ]
  return lines
}
