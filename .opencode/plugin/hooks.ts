import type { Plugin } from "@opencode-ai/plugin"
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join, basename } from "path"

const DANGEROUS_RM_PATTERNS = [
  /\brm\s+.*-[a-z]*r[a-z]*f/i,
  /\brm\s+.*-[a-z]*f[a-z]*r/i,
  /\brm\s+--recursive\s+--force/i,
  /\brm\s+--force\s+--recursive/i,
]

const SENSITIVE_FILE_PATTERNS: Array<[RegExp, string]> = [
  [/\.env(?!\.example)/i, "Access to .env files is blocked. Use .env.example instead."],
  [/credentials\.json/i, "Access to credentials files is blocked."],
  [/secrets?\.(json|yaml|yml)/i, "Access to secrets files is blocked."],
  [/\.ssh\//i, "Access to SSH directory is blocked."],
  [/id_rsa/i, "Access to SSH keys is blocked."],
]

function isDangerousRmCommand(command: string): boolean {
  const normalized = command.toLowerCase().replace(/\s+/g, " ")
  for (const pattern of DANGEROUS_RM_PATTERNS) {
    if (pattern.test(normalized)) return true
  }
  if (/\brm\s+.*-[a-z]*r/i.test(normalized)) {
    const dangerousPaths = [/\/\s*$/, /\/\*/, /~/, /\$HOME/, /\.\./, /^\*/]
    for (const path of dangerousPaths) {
      if (path.test(normalized)) return true
    }
  }
  return false
}

function isSensitiveFileAccess(tool: string, args: Record<string, unknown>): [boolean, string] {
  let filePath = ""
  if (["read", "edit", "write"].includes(tool.toLowerCase())) {
    filePath = String(args.filePath || args.file_path || "")
  } else if (tool.toLowerCase() === "bash") {
    filePath = String(args.command || "")
  }
  
  for (const [pattern, reason] of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(filePath)) {
      return [true, reason]
    }
  }
  return [false, ""]
}

function ensureLogDir(directory: string): string {
  const logDir = join(directory, ".opencode", "logs")
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

function appendLog(logPath: string, entry: Record<string, unknown>, maxEntries = 500): void {
  try {
    let logData: Array<Record<string, unknown>> = []
    if (existsSync(logPath)) {
      const content = readFileSync(logPath, "utf-8")
      logData = JSON.parse(content)
    }
    logData.push({ ...entry, timestamp: new Date().toISOString() })
    if (logData.length > maxEntries) {
      logData = logData.slice(-maxEntries)
    }
    writeFileSync(logPath, JSON.stringify(logData, null, 2))
  } catch {
    // Logging must not break tool execution
  }
}

const plugin: Plugin = async ({ directory }) => {
  return {
    "tool.execute.before": async (input, output) => {
      const tool = input.tool
      const args = output.args as Record<string, unknown>
      
      const logDir = ensureLogDir(directory)
      appendLog(join(logDir, "pre_tool_use.json"), { tool, args }, 1000)
      
      // Block dangerous rm commands
      if (tool.toLowerCase() === "bash") {
        const command = String(args.command || "")
        if (isDangerousRmCommand(command)) {
          throw new Error(`BLOCKED: Dangerous rm command detected.\nCommand: ${command}\nUse safer alternatives or be more specific.`)
        }
      }
      
      // Block sensitive file access
      const [isBlocked, reason] = isSensitiveFileAccess(tool, args)
      if (isBlocked) {
        throw new Error(`BLOCKED: ${reason}`)
      }
    },

    "tool.execute.after": async (input, output) => {
      const tool = input.tool
      const logDir = ensureLogDir(directory)
      
      let outputText = output.output
      if (typeof outputText === "string" && outputText.length > 1000) {
        outputText = outputText.slice(0, 1000) + "... [truncated]"
      }
      
      appendLog(join(logDir, "post_tool_use.json"), { 
        tool, 
        title: output.title,
        output: outputText 
      })
    },

    event: async ({ event }) => {
      const logDir = ensureLogDir(directory)
      
      if (event.type === "session.created") {
        appendLog(join(logDir, "sessions.json"), {
          type: event.type,
          directory,
        }, 100)
      }

      // macOS notification on session idle
      if (event.type === "session.idle") {
        const projectName = basename(directory)
        try {
          const { exec } = await import("child_process")
          exec(`osascript -e 'display notification "Task complete" with title "OpenCode - ${projectName}"'`)
        } catch {
          // Notifications are optional
        }
      }
    },
  }
}

export default plugin
