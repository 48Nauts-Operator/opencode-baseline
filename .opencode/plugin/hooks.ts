import type { Plugin } from "@opencode-ai/plugin"
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "fs"
import { join, basename } from "path"
import { tmpdir } from "os"

const ENABLED = true
const VOICE_ENABLED = process.env.OPENCODE_VOICE !== "false"
const KOKORO_PORT = parseInt(process.env.KOKORO_PORT || "8880", 10)
const ENGINEER_NAME = process.env.ENGINEER_NAME || "Sir"

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
  const logDir = join(directory, "logs")
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

// JARVIS-style voice notification templates
const NOTIFICATION_TEMPLATES = {
  input: [
    `${ENGINEER_NAME}, I need your input on {project}`,
    `Shall I render {project} for you, ${ENGINEER_NAME}?`,
    `${ENGINEER_NAME}, {project} requires your attention`,
    `If you please ${ENGINEER_NAME}, {project} awaits your decision`,
  ],
  error: [
    `${ENGINEER_NAME}, we have a problem with {project}`,
    `${ENGINEER_NAME}, there is a potentially fatal issue in {project}`,
    `I'm afraid {project} is malfunctioning, ${ENGINEER_NAME}`,
    `Not good ${ENGINEER_NAME}. {project} has experienced a severe issue`,
  ],
  complete: [
    `All wrapped up with {project}, ${ENGINEER_NAME}. Will there be anything else?`,
    `As always ${ENGINEER_NAME}, a great pleasure working on {project}`,
    `{project} is online and ready, ${ENGINEER_NAME}`,
    `Congratulations ${ENGINEER_NAME}, {project} is operational`,
  ],
  default: [
    `${ENGINEER_NAME}, you have an update on {project}`,
    `${ENGINEER_NAME}, I have an update from {project}`,
    `${ENGINEER_NAME}, {project} requires your attention`,
  ],
}

function getNotificationMessage(type: keyof typeof NOTIFICATION_TEMPLATES, projectName: string): string {
  const templates = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES.default
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template.replace("{project}", projectName)
}

async function speakWithKokoro(text: string, $: any): Promise<boolean> {
  try {
    const tempFile = join(tmpdir(), `opencode-tts-${Date.now()}.mp3`)
    
    // Call Kokoro TTS API
    await $`curl -s -X POST "http://localhost:${KOKORO_PORT}/v1/audio/speech" \
      -H "Content-Type: application/json" \
      -d '{"model": "tts-1", "input": "${text.replace(/'/g, "\\'")}", "voice": "bf_emma(2)+af_sarah(1)"}' \
      -o ${tempFile}`
    
    // Play audio (macOS)
    if (process.platform === "darwin") {
      await $`afplay ${tempFile}`
    } else {
      // Linux fallback
      try {
        await $`aplay ${tempFile}`
      } catch {
        await $`mpv --no-video ${tempFile}`
      }
    }
    
    // Cleanup
    try { unlinkSync(tempFile) } catch {}
    return true
  } catch {
    return false
  }
}

async function speakWithMacosSay(text: string, $: any): Promise<boolean> {
  if (process.platform !== "darwin") return false
  try {
    await $`say -v Daniel "${text.replace(/"/g, '\\"')}"`
    return true
  } catch {
    return false
  }
}

async function announce(text: string, $: any): Promise<void> {
  if (!VOICE_ENABLED) return
  
  // Try Kokoro first, then macOS say
  const success = await speakWithKokoro(text, $)
  if (!success) {
    await speakWithMacosSay(text, $)
  }
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
    /* intentionally silent - logging must not break tool execution */
  }
}

export const HooksPlugin: Plugin = async ({ directory, $ }) => {
  if (!ENABLED) return {}

  return {
    "tool.execute.before": async (input, output) => {
      const tool = input.tool
      const args = output.args as Record<string, unknown>
      
      const logDir = ensureLogDir(directory)
      appendLog(join(logDir, "pre_tool_use.json"), { tool, args }, 1000)
      
      if (tool.toLowerCase() === "bash") {
        const command = String(args.command || "")
        if (isDangerousRmCommand(command)) {
          throw new Error(`BLOCKED: Dangerous rm command detected.\nCommand: ${command}\nUse safer alternatives or be more specific.`)
        }
      }
      
      const [isBlocked, reason] = isSensitiveFileAccess(tool, args)
      if (isBlocked) {
        throw new Error(`BLOCKED: ${reason}`)
      }
    },

    "tool.execute.after": async (input) => {
      const tool = input.tool
      const args = input.metadata?.args as Record<string, unknown> | undefined
      const success = !input.metadata?.error
      
      const logDir = ensureLogDir(directory)
      
      let output = input.metadata?.output
      if (typeof output === "string" && output.length > 1000) {
        output = output.slice(0, 1000) + "... [truncated]"
      }
      
      appendLog(join(logDir, "post_tool_use.json"), { tool, args, output, success })
      
      const errorCountFile = join(logDir, ".error_count")
      if (!success) {
        let count = 0
        try {
          if (existsSync(errorCountFile)) {
            count = parseInt(readFileSync(errorCountFile, "utf-8"), 10)
          }
        } catch {}
        count++
        writeFileSync(errorCountFile, String(count))
      } else {
        try {
          if (existsSync(errorCountFile)) {
            writeFileSync(errorCountFile, "0")
          }
        } catch {}
      }
      
      if (["edit", "write"].includes(tool.toLowerCase()) && args?.filePath) {
        appendLog(join(logDir, "file_changes.json"), {
          file: args.filePath,
          tool,
        }, 100)
      }
    },

    event: async ({ event }) => {
      const projectName = basename(directory)
      const logDir = ensureLogDir(directory)
      
      if (event.type === "session.created") {
        appendLog(join(logDir, "sessions.json"), {
          type: event.type,
          directory,
        }, 100)
      }

      if (event.type === "session.idle") {
        const message = getNotificationMessage("complete", projectName)
        await announce(message, $)
        
        try {
          await $`osascript -e 'display notification "${message}" with title "OpenCode"'`
        } catch {}
      }
      
      if (event.type === "session.waiting") {
        const message = getNotificationMessage("input", projectName)
        await announce(message, $)
      }
      
      if (event.type === "session.error") {
        const message = getNotificationMessage("error", projectName)
        await announce(message, $)
      }
    },
  }
}
