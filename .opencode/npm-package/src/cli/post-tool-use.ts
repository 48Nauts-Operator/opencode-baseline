#!/usr/bin/env node
/**
 * Post-Tool-Use CLI Hook
 * Logs tool outputs, tracks errors, monitors file changes.
 * 
 * Usage: echo '{"tool":"bash","output":"..."}' | opencode-post-tool
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

// ============================================================================
// Types
// ============================================================================

interface HookInput {
  tool: string
  output?: string
  args?: Record<string, unknown>
  input?: Record<string, unknown>
}

interface UsageStats {
  date: string
  toolCalls: number
  errors: number
  estimatedTokens: number
}

// ============================================================================
// Constants
// ============================================================================

const CHARS_PER_TOKEN = 4
const ERROR_INDICATORS = ["error:", "failed:", "exception:", "fatal:", "panic:"]

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

function appendLog(logPath: string, entry: Record<string, unknown>, maxEntries = 500): void {
  try {
    let logData: Array<Record<string, unknown>> = []
    if (existsSync(logPath)) {
      logData = JSON.parse(readFileSync(logPath, "utf-8"))
    }
    logData.push({ ...entry, timestamp: new Date().toISOString() })
    if (logData.length > maxEntries) {
      logData = logData.slice(-maxEntries)
    }
    writeFileSync(logPath, JSON.stringify(logData, null, 2))
  } catch {
    // Logging failures must not break execution
  }
}

function updateDailyStats(logDir: string, updates: Partial<UsageStats>): void {
  const today = new Date().toISOString().split("T")[0]
  const statsPath = join(logDir, "daily_stats.json")
  
  try {
    let allStats: Record<string, UsageStats> = {}
    if (existsSync(statsPath)) {
      allStats = JSON.parse(readFileSync(statsPath, "utf-8"))
    }
    
    if (!allStats[today]) {
      allStats[today] = {
        date: today,
        toolCalls: 0,
        errors: 0,
        estimatedTokens: 0,
      }
    }
    
    if (updates.toolCalls) allStats[today].toolCalls += updates.toolCalls
    if (updates.errors) allStats[today].errors += updates.errors
    if (updates.estimatedTokens) allStats[today].estimatedTokens += updates.estimatedTokens
    
    // Keep only last 90 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const cutoffStr = cutoff.toISOString().split("T")[0]
    for (const date of Object.keys(allStats)) {
      if (date < cutoffStr) delete allStats[date]
    }
    
    writeFileSync(statsPath, JSON.stringify(allStats, null, 2))
  } catch {
    // Stats failures must not break execution
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function hasError(output: string): boolean {
  const lower = output.toLowerCase()
  return ERROR_INDICATORS.some(indicator => lower.includes(indicator))
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    const inputData = readFileSync(0, "utf-8")
    const input: HookInput = JSON.parse(inputData)
    
    const tool = input.tool || ""
    const output = input.output || ""
    const args = input.args || input.input || {}
    const logDir = getLogDir()
    
    // Truncate output for logging
    const truncatedOutput = output.length > 2000 
      ? output.slice(0, 2000) + "... [truncated]" 
      : output
    
    // Log tool output
    appendLog(join(logDir, "post_tool_use.json"), { 
      tool, 
      output: truncatedOutput,
      args_summary: Object.keys(args).join(", ")
    })
    
    // Update stats
    const tokens = estimateTokens(output)
    updateDailyStats(logDir, { toolCalls: 1, estimatedTokens: tokens })
    
    // Check for errors
    if (hasError(output)) {
      updateDailyStats(logDir, { errors: 1 })
      appendLog(join(logDir, "errors.json"), {
        tool,
        output: truncatedOutput,
      }, 100)
    }
    
    process.exit(0)
  } catch {
    process.exit(0)
  }
}

main()
