import { execSync } from 'node:child_process'

interface GitInfo {
  branch: string | null
  repoRoot: string | null
  hasUncommitted: boolean
  currentBranch: string | null
}

export function getGitInfo(cwd: string): GitInfo {
  const info: GitInfo = {
    branch: null,
    repoRoot: null,
    hasUncommitted: false,
    currentBranch: null,
  }

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    info.currentBranch = branch
    info.branch = branch

    const root = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    info.repoRoot = root

    const status = execSync('git status --porcelain', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    info.hasUncommitted = status.length > 0
  } catch {}

  return info
}

export function gitDiff(cwd: string, staged = false): string {
  try {
    const cmd = staged ? 'git diff --cached' : 'git diff'
    return execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

export function gitLog(cwd: string, count = 10): string {
  try {
    return execSync(`git log --oneline -${count}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}
