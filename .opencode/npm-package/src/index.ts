import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join, basename } from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface PluginContext {
  directory: string
  $: (cmd: string) => Promise<{ stdout: string; stderr: string }>
  client: unknown
}

interface ToolInput {
  tool: string
  [key: string]: unknown
}

interface ToolOutput {
  args: Record<string, unknown>
  output?: string
  title?: string
  [key: string]: unknown
}

interface SessionEvent {
  type: string
  [key: string]: unknown
}

type Hooks = {
  "tool.execute.before"?: (input: ToolInput, output: ToolOutput) => Promise<void>
  "tool.execute.after"?: (input: ToolInput, output: ToolOutput) => Promise<void>
  event?: (params: { event: SessionEvent }) => Promise<void>
}

type Plugin = (context: PluginContext) => Promise<Hooks>

const KOKORO_URL = process.env.KOKORO_URL || "http://localhost:8880"
const KOKORO_VOICE = process.env.KOKORO_VOICE || "bf_emma"
const VOICE_ENABLED = process.env.OPENCODE_VOICE !== "off"

const DANGEROUS_RM_PATTERNS = [
  /\brm\s+.*-[a-z]*r[a-z]*f/i,
  /\brm\s+.*-[a-z]*f[a-z]*r/i,
  /\brm\s+--recursive\s+--force/i,
  /\brm\s+--force\s+--recursive/i,
]

const SENSITIVE_FILE_PATTERNS: Array<[RegExp, string]> = [
  [/\.env(?!\.example)/i, "Environment file access blocked"],
  [/credentials\.json/i, "Credentials file access blocked"],
  [/secrets?\.(json|yaml|yml)/i, "Secrets file access blocked"],
  [/\.ssh\//i, "SSH directory access blocked"],
  [/id_rsa/i, "SSH key access blocked"],
  [/\.aws\/credentials/i, "AWS credentials access blocked"],
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
    // Logging failures must not break tool execution
  }
}

async function speakWithKokoro(text: string, priority: "high" | "normal" = "normal"): Promise<void> {
  if (!VOICE_ENABLED) return
  
  try {
    const response = await fetch(`${KOKORO_URL}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "kokoro",
        input: text,
        voice: KOKORO_VOICE,
        response_format: "mp3",
        speed: priority === "high" ? 1.1 : 1.0,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Kokoro API error: ${response.status}`)
    }
    
    const audioBuffer = await response.arrayBuffer()
    const tempFile = `/tmp/opencode_voice_${Date.now()}.mp3`
    writeFileSync(tempFile, Buffer.from(audioBuffer))
    
    await execAsync(`afplay "${tempFile}" && rm "${tempFile}"`)
  } catch {
    try {
      await execAsync(`osascript -e 'display notification "${text}" with title "OpenCode"'`)
    } catch {
      // Notifications optional
    }
  }
}

async function notifyWithSound(message: string, useVoice = true): Promise<void> {
  if (useVoice && VOICE_ENABLED) {
    await speakWithKokoro(message)
  } else {
    try {
      await execAsync(`osascript -e 'display notification "${message}" with title "OpenCode"'`)
      await execAsync("afplay /System/Library/Sounds/Glass.aiff")
    } catch {
      // Notifications optional
    }
  }
}

const plugin: Plugin = async ({ directory }) => {
  let taskStartTime: number | null = null
  let lastToolName = ""
  let toolCount = 0
  
  return {
    "tool.execute.before": async (input, output) => {
      const tool = input.tool
      const args = output.args as Record<string, unknown>
      
      if (!taskStartTime) taskStartTime = Date.now()
      toolCount++
      lastToolName = tool
      
      const logDir = ensureLogDir(directory)
      appendLog(join(logDir, "pre_tool_use.json"), { tool, args }, 1000)
      
      if (tool.toLowerCase() === "bash") {
        const command = String(args.command || "")
        if (isDangerousRmCommand(command)) {
          await speakWithKokoro("Blocked a dangerous command. Please review.", "high")
          throw new Error(`BLOCKED: Dangerous rm command detected.\nCommand: ${command}\nUse safer alternatives or be more specific.`)
        }
      }
      
      const [isBlocked, reason] = isSensitiveFileAccess(tool, args)
      if (isBlocked) {
        await speakWithKokoro("Access to sensitive file blocked.", "high")
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
      
      const errorIndicators = ["error:", "failed:", "exception:", "fatal:"]
      if (typeof outputText === "string") {
        const lowerOutput = outputText.toLowerCase()
        for (const indicator of errorIndicators) {
          if (lowerOutput.includes(indicator)) {
            appendLog(join(logDir, "errors.json"), {
              tool,
              output: outputText,
              indicator,
            }, 100)
            break
          }
        }
      }
    },

    event: async ({ event }) => {
      const logDir = ensureLogDir(directory)
      const projectName = basename(directory)
      
      if (event.type === "session.created") {
        appendLog(join(logDir, "sessions.json"), {
          type: event.type,
          directory,
        }, 100)
        
        await speakWithKokoro(`OpenCode session started for ${projectName}.`)
      }

      if (event.type === "session.idle") {
        const duration = taskStartTime 
          ? Math.round((Date.now() - taskStartTime) / 1000) 
          : 0
        
        let message = `Task complete in ${projectName}.`
        if (duration > 60) {
          const minutes = Math.floor(duration / 60)
          message = `Task complete after ${minutes} minute${minutes > 1 ? 's' : ''}.`
        }
        if (toolCount > 10) {
          message += ` Used ${toolCount} tools.`
        }
        
        await notifyWithSound(message, true)
        
        appendLog(join(logDir, "sessions.json"), {
          type: "task.complete",
          duration,
          toolCount,
          lastTool: lastToolName,
        }, 100)
        
        taskStartTime = null
        toolCount = 0
      }

      if (event.type === "session.error") {
        await speakWithKokoro("An error occurred. Your attention is needed.", "high")
      }
    },
  }
}

export default plugin
