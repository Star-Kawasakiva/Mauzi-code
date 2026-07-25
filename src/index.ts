#!/usr/bin/env node

import { parseArgs } from './cli/parser'
import { loadEnvFile } from './utils/env'
import { runMain } from './main'

async function main(): Promise<void> {
  const options = parseArgs(process.argv)

  if (!options.apiKey && !process.env['ANTHROPIC_API_KEY'] && !process.env['MAUZI_API_KEY']) {
    await loadEnvFile(options.directory || process.cwd()).catch(() => {})
  }

  await runMain({
    apiKey: options.apiKey,
    model: options.model,
    directory: options.directory || process.cwd(),
    apiBase: options.apiBase,
    verbose: options.verbose,
  })
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
