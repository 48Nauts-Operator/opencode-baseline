#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

interface HookInput {
  session_id?: string
  prompt?: string
}

const BLOCKED_PATTERNS: Array<[string, string]> = [
  ["rm -rf /", "Dangerous root deletion command"],
  [":(){ :|:& };:", "Fork bomb"],
]

function getLogDir(): string {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const logDir = join(projectDir, ".opencode", "logs")
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
  return logDir
}

function getSessionsDir(): string {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const sessionsDir = join(projectDir, ".opencode", "data", "sessions")
  if (!existsSync(sessionsDir)) mkdirSync(sessionsDir, { recursive: true })
  return sessionsDir
}

function logUserPrompt(input: HookInput): void {
  const logFile = join(getLogDir(), "user_prompts.json")
  
  try {
    let logData: Array<Record<string, unknown>> = []
    if (existsSync(logFile)) {
      logData = JSON.parse(readFileSync(logFile, "utf-8"))
    }
    
    logData.push({ ...input, logged_at: new Date().toISOString() })
    
    if (logData.length > 500) logData = logData.slice(-500)
    
    writeFileSync(logFile, JSON.stringify(logData, null, 2))
  } catch {
    // continue
  }
}

function storeSessionPrompt(sessionId: string, prompt: string): void {
  const sessionFile = join(getSessionsDir(), `${sessionId}.json`)
  
  try {
    let sessionData = {
      session_id: sessionId,
      prompts: [] as Array<{ timestamp: string; content: string }>,
      created_at: null as string | null,
      last_updated: null as string | null,
    }
    
    if (existsSync(sessionFile)) {
      sessionData = JSON.parse(readFileSync(sessionFile, "utf-8"))
    }
    
    if (!sessionData.created_at) {
      sessionData.created_at = new Date().toISOString()
    }
    
    sessionData.prompts.push({
      timestamp: new Date().toISOString(),
      content: prompt.slice(0, 500),
    })
    
    if (sessionData.prompts.length > 50) {
      sessionData.prompts = sessionData.prompts.slice(-50)
    }
    
    sessionData.last_updated = new Date().toISOString()
    
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2))
  } catch {
    // continue
  }
}

function storeLastPrompt(prompt: string): void {
  const lastPromptFile = join(getLogDir(), "last_prompt.json")
  
  try {
    writeFileSync(lastPromptFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      prompt: prompt.slice(0, 1000),
    }, null, 2))
  } catch {
    // continue
  }
}

function validatePrompt(prompt: string): [boolean, string] {
  const promptLower = prompt.toLowerCase()
  
  for (const [pattern, reason] of BLOCKED_PATTERNS) {
    if (promptLower.includes(pattern.toLowerCase())) {
      return [false, reason]
    }
  }
  
  return [true, ""]
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    const shouldValidate = args.includes("--validate")
    const logOnly = args.includes("--log-only")
    const storeLastPromptArg = args.includes("--store-last-prompt")
    
    const inputData = readFileSync(0, "utf-8")
    const input: HookInput = JSON.parse(inputData)
    
    const sessionId = input.session_id || "unknown"
    const prompt = input.prompt || ""
    
    logUserPrompt(input)
    
    if (prompt) {
      storeSessionPrompt(sessionId, prompt)
    }
    
    if (storeLastPromptArg && prompt) {
      storeLastPrompt(prompt)
    }
    
    if (shouldValidate && !logOnly) {
      const [isValid, reason] = validatePrompt(prompt)
      if (!isValid) {
        console.error(`Prompt blocked: ${reason}`)
        process.exit(2)
      }
    }
    
    process.exit(0)
  } catch {
    process.exit(0)
  }
}

main()
