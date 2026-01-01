#!/usr/bin/env node
/**
 * Session-Start CLI Hook
 * Loads context, logs session start, initializes state.
 * 
 * Usage: echo '{"session_id":"..."}' | opencode-session-start
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs"
import { join, basename } from "path"
import { execSync } from "child_process"

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
    if (logData.length > 100) {
      logData = logData.slice(-100)
    }
    writeFileSync(logPath, JSON.stringify(logData, null, 2))
  } catch {
    // Logging failures must not break execution
  }
}

function getGitStatus(): string {
  try {
    return execSync("git status --short 2>/dev/null", { encoding: "utf-8" }).trim()
  } catch {
    return ""
  }
}

function getGitBranch(): string {
  try {
    return execSync("git branch --show-current 2>/dev/null", { encoding: "utf-8" }).trim()
  } catch {
    return ""
  }
}

function loadContextFiles(): string[] {
  const projectDir = process.env.PROJECT_DIR || process.cwd()
  const contextDir = join(projectDir, ".opencode", "context", "project")
  const loaded: string[] = []
  
  try {
    if (existsSync(contextDir)) {
      const files = readdirSync(contextDir).filter(f => f.endsWith(".md"))
      for (const file of files.slice(0, 5)) {
        loaded.push(file)
      }
    }
  } catch {
    // Context loading is optional
  }
  
  return loaded
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    const inputData = readFileSync(0, "utf-8")
    const input = JSON.parse(inputData)
    
    const sessionId = input.session_id || `session_${Date.now()}`
    const projectDir = process.env.PROJECT_DIR || process.cwd()
    const projectName = basename(projectDir)
    const logDir = getLogDir()
    
    // Get git info
    const gitBranch = getGitBranch()
    const gitStatus = getGitStatus()
    const contextFiles = loadContextFiles()
    
    // Log session start
    appendLog(join(logDir, "sessions.json"), {
      type: "session.start",
      session_id: sessionId,
      project: projectName,
      branch: gitBranch,
      pending_changes: gitStatus.split("\n").filter(Boolean).length,
      context_files: contextFiles,
    })
    
    // Initialize context state
    const stateFile = join(logDir, "context_state.json")
    const state = {
      session_id: sessionId,
      session_start: new Date().toISOString(),
      cumulative_tokens: 0,
      message_count: 0,
      last_backup: null,
      warnings_issued: 0,
      prompts: [],
    }
    writeFileSync(stateFile, JSON.stringify(state, null, 2))
    
    // Output context info for AI
    const output = {
      project: projectName,
      branch: gitBranch,
      pending_changes: gitStatus ? gitStatus.split("\n").length : 0,
      context_loaded: contextFiles,
      message: `Session started for ${projectName}${gitBranch ? ` on branch ${gitBranch}` : ""}`,
    }
    
    console.log(JSON.stringify(output))
    process.exit(0)
  } catch {
    process.exit(0)
  }
}

main()
