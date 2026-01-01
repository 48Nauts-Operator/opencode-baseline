#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs"
import { join, basename } from "path"

interface HookInput {
  session_id?: string
  transcript_path?: string
  trigger?: string
  custom_instructions?: string
}

function getBackupDir(): string {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const backupDir = join(projectDir, ".opencode", "backup")
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  return backupDir
}

function getLogDir(): string {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const logDir = join(projectDir, ".opencode", "logs")
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
  return logDir
}

function backupTranscript(transcriptPath: string, trigger: string): string | null {
  if (!transcriptPath || !existsSync(transcriptPath)) return null
  
  try {
    const backupDir = join(getBackupDir(), "transcripts")
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const sessionName = basename(transcriptPath, ".jsonl")
    const backupPath = join(backupDir, `${sessionName}_pre_compact_${trigger}_${timestamp}.jsonl`)
    
    copyFileSync(transcriptPath, backupPath)
    
    const backups = require("fs").readdirSync(backupDir)
      .filter((f: string) => f.endsWith(".jsonl"))
      .sort()
    
    for (const old of backups.slice(0, -10)) {
      require("fs").unlinkSync(join(backupDir, old))
    }
    
    return backupPath
  } catch {
    return null
  }
}

function backupTodos(): string | null {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const todoFile = join(projectDir, ".opencode", "logs", "todos.json")
  
  if (!existsSync(todoFile)) return null
  
  try {
    const backupDir = getBackupDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupPath = join(backupDir, `todos_pre_compact_${timestamp}.json`)
    
    copyFileSync(todoFile, backupPath)
    return backupPath
  } catch {
    return null
  }
}

function backupContextState(): string | null {
  const logDir = getLogDir()
  const stateFile = join(logDir, "context_state.json")
  
  if (!existsSync(stateFile)) return null
  
  try {
    const backupDir = getBackupDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupPath = join(backupDir, `context_state_pre_compact_${timestamp}.json`)
    
    copyFileSync(stateFile, backupPath)
    return backupPath
  } catch {
    return null
  }
}

function logPreCompact(input: HookInput): void {
  const logFile = join(getLogDir(), "pre_compact.json")
  
  try {
    let logData: Array<Record<string, unknown>> = []
    if (existsSync(logFile)) {
      logData = JSON.parse(readFileSync(logFile, "utf-8"))
    }
    
    logData.push({ ...input, logged_at: new Date().toISOString() })
    
    if (logData.length > 100) logData = logData.slice(-100)
    
    writeFileSync(logFile, JSON.stringify(logData, null, 2))
  } catch {
    // continue
  }
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    const shouldBackup = args.includes("--backup")
    const verbose = args.includes("--verbose")
    
    const inputData = readFileSync(0, "utf-8")
    const input: HookInput = JSON.parse(inputData)
    
    const sessionId = input.session_id || "unknown"
    const transcriptPath = input.transcript_path || ""
    const trigger = input.trigger || "unknown"
    
    logPreCompact(input)
    
    let transcriptBackup: string | null = null
    let todosBackup: string | null = null
    let stateBackup: string | null = null
    
    if (shouldBackup) {
      if (transcriptPath) transcriptBackup = backupTranscript(transcriptPath, trigger)
      todosBackup = backupTodos()
      stateBackup = backupContextState()
    }
    
    if (verbose) {
      const message = trigger === "manual"
        ? `Preparing for manual compaction (session: ${sessionId.slice(0, 8)}...)`
        : `Auto-compaction triggered (session: ${sessionId.slice(0, 8)}...)`
      
      const backups = [transcriptBackup, todosBackup, stateBackup].filter(Boolean)
      if (backups.length > 0) {
        console.log(`${message}\nBackups created: ${backups.length}`)
      } else {
        console.log(message)
      }
    }
    
    process.exit(0)
  } catch {
    process.exit(0)
  }
}

main()
