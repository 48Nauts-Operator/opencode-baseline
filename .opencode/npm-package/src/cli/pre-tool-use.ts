#!/usr/bin/env node
/**
 * Pre-Tool-Use CLI Hook
 * Validates commands before execution, blocks dangerous operations.
 * 
 * Usage: echo '{"tool":"bash","args":{"command":"rm -rf /"}}' | opencode-pre-tool
 * Exit codes: 0 = allow, 2 = block
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

// ============================================================================
// Types
// ============================================================================

interface HookInput {
  tool: string
  args?: Record<string, unknown>
  input?: Record<string, unknown>
}

// ============================================================================
// Security Patterns
// ============================================================================

const DANGEROUS_RM_PATTERNS = [
  /\brm\s+.*-[a-z]*r[a-z]*f/i,
  /\brm\s+.*-[a-z]*f[a-z]*r/i,
  /\brm\s+--recursive\s+--force/i,
  /\brm\s+--force\s+--recursive/i,
]

const DANGEROUS_PATHS = [/\/\s*$/, /\/\*/, /~/, /\$HOME/, /\.\./, /^\*/]

const SENSITIVE_FILE_PATTERNS: Array<[RegExp, string]> = [
  [/\.env(?!\.example)/i, "Environment file access blocked"],
  [/credentials\.json/i, "Credentials file access blocked"],
  [/secrets?\.(json|yaml|yml)/i, "Secrets file access blocked"],
  [/\.ssh\//i, "SSH directory access blocked"],
  [/id_rsa/i, "SSH key access blocked"],
  [/\.aws\/credentials/i, "AWS credentials access blocked"],
]

const DANGEROUS_COMMAND_PATTERNS: Array<[RegExp, string]> = [
  [/\bsudo\s+/i, "sudo commands blocked"],
  [/\bsu\s+-/i, "su commands blocked"],
  [/\bchmod\s+777\b/i, "chmod 777 blocked"],
  [/\bcurl\s+.*\|\s*(ba)?sh/i, "Piping curl to shell blocked"],
  [/\bwget\s+.*\|\s*(ba)?sh/i, "Piping wget to shell blocked"],
  [/\bdocker\s+system\s+prune\s+-a/i, "docker system prune -a blocked"],
  [/\bkill\s+-9\s+1\b/i, "Killing init process blocked"],
  [/\bmkfs\./i, "Filesystem creation blocked"],
  [/\bdd\s+.*of=\/dev\//i, "dd to device blocked"],
]

const GIT_BLOCKED_PATTERNS: Array<[RegExp, string]> = [
  [/\bgit\s+push\s+.*--force.*\s+(origin\s+)?(main|master)\b/i, "Force push to main blocked"],
  [/\bgit\s+push\s+-f\s+.*\s+(origin\s+)?(main|master)\b/i, "Force push to main blocked"],
]

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/AKIA[0-9A-Z]{16}/, "AWS Access Key ID detected"],
  [/ghp_[A-Za-z0-9]{36}/, "GitHub token detected"],
  [/sk_live_[A-Za-z0-9]{24}/, "Stripe live key detected"],
  [/-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, "Private key detected"],
]

// ============================================================================
// Helpers
// ============================================================================

function getLogDir(): string {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const logDir = join(projectDir, ".opencode", "logs")
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

function appendLog(logPath: string, entry: Record<string, unknown>): void {
  try {
    let logData: Array<Record<string, unknown>> = []
    if (existsSync(logPath)) {
      logData = JSON.parse(readFileSync(logPath, "utf-8"))
    }
    logData.push({ ...entry, timestamp: new Date().toISOString() })
    if (logData.length > 1000) {
      logData = logData.slice(-1000)
    }
    writeFileSync(logPath, JSON.stringify(logData, null, 2))
  } catch {
    // Logging failures must not break execution
  }
}

function isDangerousRmCommand(command: string): boolean {
  const normalized = command.toLowerCase().replace(/\s+/g, " ")
  for (const pattern of DANGEROUS_RM_PATTERNS) {
    if (pattern.test(normalized)) return true
  }
  if (/\brm\s+.*-[a-z]*r/i.test(normalized)) {
    for (const path of DANGEROUS_PATHS) {
      if (path.test(normalized)) return true
    }
  }
  return false
}

function checkDangerousCommand(command: string): [boolean, string] {
  for (const [pattern, reason] of DANGEROUS_COMMAND_PATTERNS) {
    if (pattern.test(command)) return [true, reason]
  }
  return [false, ""]
}

function checkGitCommand(command: string): [boolean, string] {
  for (const [pattern, reason] of GIT_BLOCKED_PATTERNS) {
    if (pattern.test(command)) return [true, reason]
  }
  return [false, ""]
}

function isSensitiveFile(filePath: string): [boolean, string] {
  for (const [pattern, reason] of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(filePath)) return [true, reason]
  }
  return [false, ""]
}

function detectSecrets(content: string): string[] {
  const detected: string[] = []
  for (const [pattern, reason] of SECRET_PATTERNS) {
    if (pattern.test(content)) detected.push(reason)
  }
  return detected
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    const inputData = readFileSync(0, "utf-8")
    const input: HookInput = JSON.parse(inputData)
    
    const tool = input.tool?.toLowerCase() || ""
    const args = input.args || input.input || {}
    const logDir = getLogDir()
    
    // Log tool usage
    appendLog(join(logDir, "pre_tool_use.json"), { tool, args })
    
    // Check bash commands
    if (tool === "bash") {
      const command = String(args.command || "")
      
      if (isDangerousRmCommand(command)) {
        appendLog(join(logDir, "blocked.json"), { tool, command, reason: "dangerous rm" })
        console.error(`BLOCKED: Dangerous rm command: ${command}`)
        process.exit(2)
      }
      
      const [isDangerous, dangerReason] = checkDangerousCommand(command)
      if (isDangerous) {
        appendLog(join(logDir, "blocked.json"), { tool, command, reason: dangerReason })
        console.error(`BLOCKED: ${dangerReason}`)
        process.exit(2)
      }
      
      const [isGitDangerous, gitReason] = checkGitCommand(command)
      if (isGitDangerous) {
        appendLog(join(logDir, "blocked.json"), { tool, command, reason: gitReason })
        console.error(`BLOCKED: ${gitReason}`)
        process.exit(2)
      }
    }
    
    // Check file access
    if (["read", "edit", "write"].includes(tool)) {
      const filePath = String(args.filePath || args.file_path || "")
      const [isBlocked, reason] = isSensitiveFile(filePath)
      if (isBlocked) {
        appendLog(join(logDir, "blocked.json"), { tool, filePath, reason })
        console.error(`BLOCKED: ${reason}`)
        process.exit(2)
      }
    }
    
    // Check for secrets in write operations
    if (["write", "edit"].includes(tool)) {
      const content = String(args.content || args.newString || "")
      const secrets = detectSecrets(content)
      if (secrets.length > 0) {
        appendLog(join(logDir, "blocked.json"), { tool, secrets })
        console.error(`BLOCKED: Secrets detected: ${secrets.join(", ")}`)
        process.exit(2)
      }
    }
    
    // Allow
    process.exit(0)
  } catch (e) {
    // On parse error, allow (don't block legitimate operations)
    process.exit(0)
  }
}

main()
