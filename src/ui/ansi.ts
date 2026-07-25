export const ESC = '\u001B'
export const CSI = `${ESC}[`

export function cursorUp(n = 1): string { return `${CSI}${n}A` }
export function cursorDown(n = 1): string { return `${CSI}${n}B` }
export function cursorRight(n = 1): string { return `${CSI}${n}C` }
export function cursorLeft(n = 1): string { return `${CSI}${n}D` }
export function cursorTo(x: number, y?: number): string { return y !== undefined ? `${CSI}${y + 1};${x + 1}H` : `${CSI}${x + 1}G` }
export function cursorHide(): string { return `${CSI}?25l` }
export function cursorShow(): string { return `${CSI}?25h` }
export function cursorSave(): string { return `${CSI}s` }
export function cursorRestore(): string { return `${CSI}u` }

export function clearScreen(): string { return `${CSI}2J` }
export function clearLine(): string { return `${CSI}2K` }
export function clearToEnd(): string { return `${CSI}0J` }

export function eraseLines(count: number): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    out += `${i > 0 ? cursorUp() : ''}${clearLine()}`
  }
  return out
}

export function scrollDown(n = 1): string { return `${CSI}${n}S` }
export function scrollUp(n = 1): string { return `${CSI}${n}T` }

export function setMode(mode: string): string { return `${CSI}?${mode}h` }
export function resetMode(mode: string): string { return `${CSI}?${mode}l` }

export function enableAltScreen(): string { return setMode('1049') }
export function disableAltScreen(): string { return resetMode('1049') }

export function enableBracketedPaste(): string { return `${CSI}?2004h` }
export function disableBracketedPaste(): string { return `${CSI}?2004l` }

export function setWindowTitle(title: string): string { return `${ESC}]0;${title}\u0007` }

export function getCursorPosition(): string { return `${CSI}6n` }

export function hyperlink(text: string, url: string): string {
  return `${ESC}]8;;${url}\u0007${text}${ESC}]8;;\u0007`
}
