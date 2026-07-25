import { program } from 'commander'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface CliOptions {
  apiKey?: string
  model?: string
  directory?: string
  apiBase?: string
  verbose?: boolean
}

function getDirname(): string {
  try {
    return dirname(fileURLToPath((import.meta as any).url))
  } catch {
    return typeof __dirname !== 'undefined' ? __dirname : '.'
  }
}

function readPackageJson(): { version: string } {
  try {
    const base = getDirname()
    const pkg = JSON.parse(
      readFileSync(resolve(base, '../../package.json'), 'utf-8')
    )
    return { version: pkg.version }
  } catch {
    return { version: '1.0.0' }
  }
}

function handleError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`\n  MauziCode startup error: ${msg}\n`)
  process.exit(1)
}

export function parseArgs(argv: string[]): CliOptions {
  let pkg: { version: string }
  try {
    pkg = readPackageJson()
  } catch {
    pkg = { version: '1.0.0' }
  }

  try {
    program
      .name('mauzi')
      .description('Terminal AI assistant with tool execution')
      .version(pkg.version)
      .option('-k, --api-key <key>', 'Anthropic API key')
      .option('-m, --model <model>', 'Model to use', 'claude-sonnet-4-20250514')
      .option('-b, --api-base <url>', 'API base URL', 'https://api.anthropic.com')
      .option('-d, --directory <path>', 'Working directory')
      .option('-v, --verbose', 'Enable verbose output')
      .helpOption('-h, --help', 'Show help')
      .showHelpAfterError(true)

    const opts = program.parse(argv, { from: 'user' }).opts()

    return {
      apiKey: opts.apiKey || process.env['ANTHROPIC_API_KEY'] || process.env['MAUZI_API_KEY'],
      model: opts.model,
      directory: opts.directory ? resolve(opts.directory) : process.cwd(),
      apiBase: opts.apiBase,
      verbose: !!opts.verbose,
    }
  } catch (err) {
    handleError(err)
  }
}

export function printHelp(): void {
  program.help()
}
