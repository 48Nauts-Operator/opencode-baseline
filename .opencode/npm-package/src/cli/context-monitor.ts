#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

interface HookInput {
  message?: {
    role?: string
    content?: string
  }
}

interface ContextState {
  session_id: string
  session_start: string
  cumulative_tokens: number
  message_count: number
  last_backup: string | null
  warnings_issued: number
  prompts: Array<{ timestamp: string; content: string }>
  last_updated?: string
}

const MAX_CONTEXT_TOKENS = 180000
const WARNING_THRESHOLD = 0.70
const CRITICAL_THRESHOLD = 0.85
const CHARS_PER_TOKEN = 4

function getLogDir(): string {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const logDir = join(projectDir, ".opencode", "logs")
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
  return logDir
}

function getBackupDir(): string {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const backupDir = join(projectDir, ".opencode", "backup")
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  return backupDir
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function loadState(): ContextState {
  const stateFile = join(getLogDir(), "context_state.json")
  
  if (existsSync(stateFile)) {
    try {
      return JSON.parse(readFileSync(stateFile, "utf-8"))
    } catch {
      // fall through
    }
  }
  
  return {
    session_id: new Date().toISOString().replace(/[:.]/g, "-"),
    session_start: new Date().toISOString(),
    cumulative_tokens: 0,
    message_count: 0,
    last_backup: null,
    warnings_issued: 0,
    prompts: [],
  }
}

function saveState(state: ContextState): void {
  const stateFile = join(getLogDir(), "context_state.json")
  state.last_updated = new Date().toISOString()
  writeFileSync(stateFile, JSON.stringify(state, null, 2))
}

function getPendingTodos(): Array<{ content: string; status: string }> {
  const todoFile = join(getLogDir(), "todos.json")
  
  if (existsSync(todoFile)) {
    try {
      const todos = JSON.parse(readFileSync(todoFile, "utf-8"))
      return todos.filter((t: { status: string }) => 
        t.status === "pending" || t.status === "in_progress"
      )
    } catch {
      // fall through
    }
  }
  
  return []
}

function backupContext(state: ContextState, trigger: string): string {
  const backupDir = getBackupDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupFile = join(backupDir, `context_backup_${trigger}_${timestamp}.json`)
  
  const todos = getPendingTodos()
  const usageRatio = state.cumulative_tokens / MAX_CONTEXT_TOKENS
  
  const backupData = {
    timestamp: new Date().toISOString(),
    session_id: state.session_id,
    trigger,
    stats: {
      cumulative_tokens: state.cumulative_tokens,
      message_count: state.message_count,
      usage_percent: Math.round(usageRatio * 100),
      session_duration: state.session_start,
    },
    pending_todos: todos,
    recent_prompts: state.prompts.slice(-5),
    recovery_instructions: "Review pending_todos and recent_prompts to continue",
  }
  
  writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
  
  const backups = require("fs").readdirSync(backupDir)
    .filter((f: string) => f.startsWith("context_backup_"))
    .sort()
  
  for (const old of backups.slice(0, -5)) {
    try {
      require("fs").unlinkSync(join(backupDir, old))
    } catch {
      // continue
    }
  }
  
  return backupFile
}

function logMessage(state: ContextState, role: string, content: string): void {
  const logFile = join(getLogDir(), "messages.jsonl")
  
  const entry = {
    timestamp: new Date().toISOString(),
    session_id: state.session_id,
    role,
    content_length: content.length,
    tokens_estimate: estimateTokens(content),
  }
  
  try {
    const fs = require("fs")
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n")
    
    const lines = fs.readFileSync(logFile, "utf-8").split("\n")
    if (lines.length > 1000) {
      fs.writeFileSync(logFile, lines.slice(-1000).join("\n"))
    }
  } catch {
    // continue
  }
}

async function main(): Promise<void> {
  try {
    const inputData = readFileSync(0, "utf-8")
    const input: HookInput = JSON.parse(inputData)
    
    const message = input.message || {}
    const content = message.content || ""
    const role = message.role || ""
    
    if (!content) {
      process.exit(0)
    }
    
    const state = loadState()
    const newTokens = estimateTokens(String(content))
    state.cumulative_tokens += newTokens
    state.message_count += 1
    
    if (role === "user" && content.length > 10) {
      state.prompts.push({
        timestamp: new Date().toISOString(),
        content: String(content).slice(0, 200),
      })
      if (state.prompts.length > 20) {
        state.prompts = state.prompts.slice(-20)
      }
    }
    
    logMessage(state, role, String(content))
    
    const usageRatio = state.cumulative_tokens / MAX_CONTEXT_TOKENS
    
    if (usageRatio >= CRITICAL_THRESHOLD) {
      const backupFile = backupContext(state, "critical")
      state.last_backup = backupFile
      state.warnings_issued += 1
      
      const todos = getPendingTodos()
      const output = {
        type: "context_warning",
        level: "critical",
        message: `CRITICAL: Context at ${Math.round(usageRatio * 100)}% capacity! Backup saved. Pending todos: ${todos.length}. Wrap up current task.`,
        usage_percent: Math.round(usageRatio * 100),
        backup_file: backupFile,
      }
      console.log(JSON.stringify(output))
    } else if (usageRatio >= WARNING_THRESHOLD && state.warnings_issued === 0) {
      const backupFile = backupContext(state, "warning")
      state.last_backup = backupFile
      state.warnings_issued += 1
      
      const todos = getPendingTodos()
      const output = {
        type: "context_warning",
        level: "warning",
        message: `Context at ${Math.round(usageRatio * 100)}% capacity. Backup saved. Pending todos: ${todos.length}. Consider wrapping up soon.`,
        usage_percent: Math.round(usageRatio * 100),
      }
      console.log(JSON.stringify(output))
    }
    
    saveState(state)
    process.exit(0)
  } catch {
    process.exit(0)
  }
}

main()
