import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join, basename } from "path"
import { homedir } from "os"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// ============================================================================
// Types
// ============================================================================

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

interface UsageStats {
  date: string
  sessions: number
  toolCalls: number
  blockedCommands: number
  errors: number
  estimatedTokens: number
  estimatedCost: number
}

type Hooks = {
  "tool.execute.before"?: (input: ToolInput, output: ToolOutput) => Promise<void>
  "tool.execute.after"?: (input: ToolInput, output: ToolOutput) => Promise<void>
  event?: (params: { event: SessionEvent }) => Promise<void>
}

type Plugin = (context: PluginContext) => Promise<Hooks>

// ============================================================================
// Configuration
// ============================================================================

const KOKORO_URL = process.env.KOKORO_URL || "http://localhost:8880"
const KOKORO_VOICE = process.env.KOKORO_VOICE || "bf_emma"
const VOICE_ENABLED = process.env.OPENCODE_VOICE !== "off"

// Cost estimation (approximate, based on Claude 3.5 Sonnet pricing)
const COST_PER_1K_INPUT_TOKENS = 0.003
const COST_PER_1K_OUTPUT_TOKENS = 0.015

// ============================================================================
// Smart Notification Configuration (v0.7.0)
// ============================================================================

type NotificationMode = "verbose" | "smart" | "quiet"
type NotificationCategory = "completion" | "error" | "blocked" | "build" | "test" | "warning" | "session"

const NOTIFICATION_MODE: NotificationMode = 
  (process.env.NOTIFICATION_MODE as NotificationMode) || "verbose"

const NOTIFICATION_SPEAK_CATEGORIES = new Set<NotificationCategory>(
  (process.env.NOTIFICATION_SPEAK || "completion,error")
    .split(",")
    .map(s => s.trim() as NotificationCategory)
)

// Aggregation state for smart mode
interface AggregatedNotificationState {
  blockedCount: number
  blockedReasons: string[]
  buildResult: "success" | "failed" | null
  testResult: "success" | "failed" | null
  warningCount: number
}

// ============================================================================
// Security Patterns
// ============================================================================

// Dangerous rm patterns
const DANGEROUS_RM_PATTERNS = [
  /\brm\s+.*-[a-z]*r[a-z]*f/i,
  /\brm\s+.*-[a-z]*f[a-z]*r/i,
  /\brm\s+--recursive\s+--force/i,
  /\brm\s+--force\s+--recursive/i,
]

const DANGEROUS_PATHS = [/\/\s*$/, /\/\*/, /~/, /\$HOME/, /\.\./, /^\*/]

// Sensitive file patterns
const SENSITIVE_FILE_PATTERNS: Array<[RegExp, string]> = [
  [/\.env(?!\.example)/i, "Environment file access blocked"],
  [/credentials\.json/i, "Credentials file access blocked"],
  [/secrets?\.(json|yaml|yml)/i, "Secrets file access blocked"],
  [/\.ssh\//i, "SSH directory access blocked"],
  [/id_rsa/i, "SSH key access blocked"],
  [/\.aws\/credentials/i, "AWS credentials access blocked"],
  [/\.npmrc/i, "npm credentials access blocked"],
  [/\.netrc/i, "netrc credentials access blocked"],
  [/\.docker\/config\.json/i, "Docker config access blocked"],
  [/\.kube\/config/i, "Kubernetes config access blocked"],
]

// Dangerous command patterns (new)
const DANGEROUS_COMMAND_PATTERNS: Array<[RegExp, string]> = [
  // Privilege escalation
  [/\bsudo\s+/i, "sudo commands blocked - request explicit permission"],
  [/\bsu\s+-/i, "su commands blocked - request explicit permission"],
  
  // Dangerous permissions
  [/\bchmod\s+777\b/i, "chmod 777 blocked - use more restrictive permissions"],
  [/\bchmod\s+-R\s+777\b/i, "Recursive chmod 777 blocked - extremely dangerous"],
  [/\bchmod\s+a\+rwx\b/i, "World-writable permissions blocked"],
  
  // Piping to shell (supply chain attack vector)
  [/\bcurl\s+.*\|\s*(ba)?sh/i, "Piping curl to shell blocked - download and review first"],
  [/\bwget\s+.*\|\s*(ba)?sh/i, "Piping wget to shell blocked - download and review first"],
  [/\bcurl\s+.*\|\s*sudo/i, "Piping curl to sudo blocked - extremely dangerous"],
  
  // Docker dangerous operations
  [/\bdocker\s+system\s+prune\s+-a/i, "docker system prune -a blocked - removes all unused data"],
  [/\bdocker\s+rm\s+-f\s+\$\(docker\s+ps/i, "Mass docker container removal blocked"],
  [/\bdocker\s+rmi\s+-f\s+\$\(docker\s+images/i, "Mass docker image removal blocked"],
  
  // Process killing
  [/\bkill\s+-9\s+1\b/i, "Killing init process blocked"],
  [/\bkillall\s+-9/i, "killall -9 blocked - use gentler signals first"],
  [/\bpkill\s+-9\s+(systemd|init|launchd)/i, "Killing system processes blocked"],
  
  // Disk operations
  [/\bmkfs\./i, "Filesystem creation blocked - extremely destructive"],
  [/\bdd\s+.*of=\/dev\//i, "dd to device blocked - extremely destructive"],
  [/\bfdisk\s+\/dev\//i, "Partition editing blocked"],
  
  // Network dangerous
  [/\biptables\s+-F/i, "Flushing iptables blocked - could lock you out"],
]

// Git safety patterns
const GIT_DANGEROUS_PATTERNS: Array<[RegExp, string, "block" | "warn"]> = [
  // Force push to protected branches
  [/\bgit\s+push\s+.*--force.*\s+(origin\s+)?(main|master|production|prod)\b/i, 
   "Force push to protected branch blocked", "block"],
  [/\bgit\s+push\s+-f\s+.*\s+(origin\s+)?(main|master|production|prod)\b/i, 
   "Force push to protected branch blocked", "block"],
  [/\bgit\s+push\s+.*\s+(origin\s+)?(main|master|production|prod)\s+--force/i, 
   "Force push to protected branch blocked", "block"],
  
  // Dangerous resets
  [/\bgit\s+reset\s+--hard\s+(HEAD~|origin\/)/i, 
   "Hard reset may lose commits - proceed with caution", "warn"],
  
  // Clean operations
  [/\bgit\s+clean\s+-[a-z]*f[a-z]*d/i, 
   "git clean -fd removes untracked files permanently", "warn"],
  [/\bgit\s+clean\s+-[a-z]*d[a-z]*f/i, 
   "git clean -df removes untracked files permanently", "warn"],
  
  // Dangerous rebases
  [/\bgit\s+rebase\s+.*--force/i, 
   "Force rebase may rewrite shared history", "warn"],
]

// Secret detection patterns (for code writes)
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  // API Keys
  [/['"][A-Za-z0-9_-]{20,}['"]/, "Potential API key detected"],
  [/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, "API key assignment detected"],
  [/secret[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, "Secret key assignment detected"],
  
  // AWS
  [/AKIA[0-9A-Z]{16}/, "AWS Access Key ID detected"],
  [/aws[_-]?secret[_-]?access[_-]?key\s*[:=]/i, "AWS Secret Key pattern detected"],
  
  // GitHub/GitLab
  [/ghp_[A-Za-z0-9]{36}/, "GitHub Personal Access Token detected"],
  [/github[_-]?token\s*[:=]\s*['"][^'"]+['"]/i, "GitHub token detected"],
  [/glpat-[A-Za-z0-9-]{20}/, "GitLab Personal Access Token detected"],
  
  // Stripe
  [/sk_live_[A-Za-z0-9]{24}/, "Stripe Live Secret Key detected"],
  [/sk_test_[A-Za-z0-9]{24}/, "Stripe Test Secret Key detected"],
  
  // JWT
  [/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, "JWT token detected"],
  
  // Private keys
  [/-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, "Private key detected"],
  [/-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/, "SSH private key detected"],
  
  // Database URLs with passwords
  [/postgres(ql)?:\/\/[^:]+:[^@]+@/i, "Database URL with password detected"],
  [/mysql:\/\/[^:]+:[^@]+@/i, "MySQL URL with password detected"],
  [/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/i, "MongoDB URL with password detected"],
  
  // npm tokens
  [/npm_[A-Za-z0-9]{36}/, "npm token detected"],
  
  // Generic patterns
  [/password\s*[:=]\s*['"][^'"]{8,}['"]/i, "Hardcoded password detected"],
  [/bearer\s+[A-Za-z0-9_-]{20,}/i, "Bearer token detected"],
]

// ============================================================================
// Helper Functions
// ============================================================================

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
    if (pattern.test(command)) {
      return [true, reason]
    }
  }
  return [false, ""]
}

function checkGitCommand(command: string): [boolean, string, "block" | "warn"] {
  for (const [pattern, reason, action] of GIT_DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return [true, reason, action]
    }
  }
  return [false, "", "warn"]
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

function detectSecrets(content: string): Array<string> {
  const detected: Array<string> = []
  for (const [pattern, reason] of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      detected.push(reason)
    }
  }
  return detected
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4)
}

// ============================================================================
// Logging Functions
// ============================================================================

function ensureLogDir(directory: string | any): string {
  // Aggressively coerce to string and validate
  let dirStr = ""

  try {
    if (typeof directory === "string") {
      dirStr = directory
    } else if (directory && typeof directory === "object" && directory.directory) {
      dirStr = String(directory.directory)
    } else if (directory) {
      dirStr = String(directory)
    }
  } catch {
    dirStr = ""
  }

  // Smart fallback: try current working directory first, then home directory
  let baseDir = dirStr
  if (!baseDir || baseDir === "/" || baseDir === "." || baseDir === "[object Object]" || !existsSync(baseDir)) {
    // Try to use current working directory (project-specific logs)
    const cwd = process.cwd()
    if (cwd && cwd !== "/" && existsSync(cwd)) {
      baseDir = cwd
    } else {
      // Last resort: user's home directory
      baseDir = join(homedir(), ".opencode")
    }
  }

  const logDir = join(baseDir, ".opencode", "logs")
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
        sessions: 0,
        toolCalls: 0,
        blockedCommands: 0,
        errors: 0,
        estimatedTokens: 0,
        estimatedCost: 0,
      }
    }
    
    // Update stats
    if (updates.sessions) allStats[today].sessions += updates.sessions
    if (updates.toolCalls) allStats[today].toolCalls += updates.toolCalls
    if (updates.blockedCommands) allStats[today].blockedCommands += updates.blockedCommands
    if (updates.errors) allStats[today].errors += updates.errors
    if (updates.estimatedTokens) {
      allStats[today].estimatedTokens += updates.estimatedTokens
      // Estimate cost (assuming 50% input, 50% output)
      const inputTokens = updates.estimatedTokens * 0.5
      const outputTokens = updates.estimatedTokens * 0.5
      allStats[today].estimatedCost += 
        (inputTokens / 1000) * COST_PER_1K_INPUT_TOKENS +
        (outputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS
    }
    
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

function generateUsageGraph(logDir: string | any): string {
  // Ensure logDir is a string
  let logDirStr = ""
  try {
    if (typeof logDir === "string") {
      logDirStr = logDir
    } else if (logDir && typeof logDir === "object" && logDir.directory) {
      logDirStr = String(logDir.directory)
    } else if (logDir) {
      logDirStr = String(logDir)
    }
  } catch {
    logDirStr = ""
  }

  if (!logDirStr || logDirStr === "[object Object]") {
    return "Invalid log directory provided."
  }

  const statsPath = join(logDirStr, "daily_stats.json")
  const graphPath = join(logDirStr, "usage_graph.html")
  
  try {
    if (!existsSync(statsPath)) {
      return "No usage data available yet."
    }
    
    const allStats: Record<string, UsageStats> = JSON.parse(readFileSync(statsPath, "utf-8"))
    const dates = Object.keys(allStats).sort()
    const last30Days = dates.slice(-30)
    
    const labels = last30Days.map(d => d.slice(5)) // MM-DD format
    const toolCalls = last30Days.map(d => allStats[d].toolCalls)
    const costs = last30Days.map(d => Number(allStats[d].estimatedCost.toFixed(4)))
    const blocked = last30Days.map(d => allStats[d].blockedCommands)
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>OpenCode Usage Statistics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; 
      color: #eee; 
      padding: 20px;
      margin: 0;
    }
    h1 { color: #00d4ff; text-align: center; }
    .container { max-width: 1200px; margin: 0 auto; }
    .chart-container { 
      background: #16213e; 
      border-radius: 12px; 
      padding: 20px; 
      margin: 20px 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      background: #16213e;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .stat-value { font-size: 2em; color: #00d4ff; }
    .stat-label { color: #888; margin-top: 5px; }
    .generated { text-align: center; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 OpenCode Usage Statistics</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${toolCalls.reduce((a, b) => a + b, 0).toLocaleString()}</div>
        <div class="stat-label">Total Tool Calls (30d)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">$${costs.reduce((a, b) => a + b, 0).toFixed(2)}</div>
        <div class="stat-label">Estimated Cost (30d)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${blocked.reduce((a, b) => a + b, 0)}</div>
        <div class="stat-label">Blocked Commands (30d)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${last30Days.length}</div>
        <div class="stat-label">Active Days</div>
      </div>
    </div>
    
    <div class="chart-container">
      <canvas id="toolCallsChart"></canvas>
    </div>
    
    <div class="chart-container">
      <canvas id="costChart"></canvas>
    </div>
    
    <p class="generated">Generated: ${new Date().toLocaleString()}</p>
  </div>
  
  <script>
    const labels = ${JSON.stringify(labels)};
    
    new Chart(document.getElementById('toolCallsChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tool Calls',
          data: ${JSON.stringify(toolCalls)},
          backgroundColor: 'rgba(0, 212, 255, 0.6)',
          borderColor: 'rgba(0, 212, 255, 1)',
          borderWidth: 1
        }, {
          label: 'Blocked',
          data: ${JSON.stringify(blocked)},
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Daily Tool Calls', color: '#fff' },
          legend: { labels: { color: '#fff' } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#333' } },
          x: { ticks: { color: '#888' }, grid: { color: '#333' } }
        }
      }
    });
    
    new Chart(document.getElementById('costChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Estimated Cost ($)',
          data: ${JSON.stringify(costs)},
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Daily Estimated Cost', color: '#fff' },
          legend: { labels: { color: '#fff' } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#333' } },
          x: { ticks: { color: '#888' }, grid: { color: '#333' } }
        }
      }
    });
  </script>
</body>
</html>`
    
    writeFileSync(graphPath, html)
    return graphPath
  } catch (e) {
    return `Error generating graph: ${e}`
  }
}

// ============================================================================
// Voice/Notification Functions
// ============================================================================

function shouldSpeakCategory(category: NotificationCategory): boolean {
  if (NOTIFICATION_MODE === "quiet") return false
  if (NOTIFICATION_MODE === "verbose") return true
  return NOTIFICATION_SPEAK_CATEGORIES.has(category)
}

function shouldAggregateCategory(category: NotificationCategory): boolean {
  if (NOTIFICATION_MODE !== "smart") return false
  return ["blocked", "warning"].includes(category)
}

async function visualNotificationOnly(message: string): Promise<void> {
  try {
    const escaped = message.replace(/"/g, '\\"').replace(/'/g, "'")
    await execAsync(`osascript -e 'display notification "${escaped}" with title "OpenCode"'`)
  } catch {
    // Visual notifications are optional
  }
}

async function smartNotify(
  text: string,
  category: NotificationCategory,
  priority: "high" | "normal" = "normal",
  aggregatedState?: AggregatedNotificationState,
  projectName?: string
): Promise<void> {
  const prefixedText = projectName ? `${projectName}: ${text}` : text

  if (NOTIFICATION_MODE === "quiet") {
    await visualNotificationOnly(prefixedText)
    return
  }

  if (shouldAggregateCategory(category) && aggregatedState) {
    if (category === "blocked") {
      aggregatedState.blockedCount++
      if (!aggregatedState.blockedReasons.includes(text)) {
        aggregatedState.blockedReasons.push(text)
      }
    } else if (category === "warning") {
      aggregatedState.warningCount++
    }
    await visualNotificationOnly(prefixedText)
    return
  }

  if (shouldSpeakCategory(category)) {
    await speakWithKokoro(prefixedText, priority)
  } else {
    await visualNotificationOnly(prefixedText)
  }
}

function buildCompletionSummary(
  projectName: string,
  duration: number,
  cost: number,
  aggregatedState: AggregatedNotificationState
): string {
  const parts: string[] = []

  if (duration > 60) {
    const mins = Math.floor(duration / 60)
    parts.push(`completed after ${mins} minute${mins > 1 ? "s" : ""}`)
  } else {
    parts.push("completed")
  }

  if (NOTIFICATION_MODE === "smart") {
    if (aggregatedState.blockedCount > 0) {
      const n = aggregatedState.blockedCount
      parts.push(`${n} command${n > 1 ? "s" : ""} blocked`)
    }
    if (aggregatedState.buildResult) {
      parts.push(`build ${aggregatedState.buildResult}`)
    }
    if (aggregatedState.testResult) {
      parts.push(`tests ${aggregatedState.testResult}`)
    }
    if (aggregatedState.warningCount > 0) {
      const n = aggregatedState.warningCount
      parts.push(`${n} warning${n > 1 ? "s" : ""}`)
    }
  }

  if (cost > 0.01) {
    parts.push(`cost $${cost.toFixed(2)}`)
  }

  return `${projectName}: ${parts.join(". ")}.`
}

function createAggregatedState(): AggregatedNotificationState {
  return {
    blockedCount: 0,
    blockedReasons: [],
    buildResult: null,
    testResult: null,
    warningCount: 0,
  }
}

function resetAggregatedState(state: AggregatedNotificationState): void {
  state.blockedCount = 0
  state.blockedReasons = []
  state.buildResult = null
  state.testResult = null
  state.warningCount = 0
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

// ============================================================================
// Plugin Export
// ============================================================================

const plugin: Plugin = async (context) => {
  let directory: string
  if (typeof context === "string") {
    directory = context
  } else if (context && typeof context === "object") {
    directory = (context as any).directory || String(context)
  } else {
    directory = String(context || "")
  }

  let taskStartTime: number | null = null
  let lastToolName = ""
  let toolCount = 0
  let sessionTokens = 0
  let lastActivityTime = Date.now()
  let longTaskWarningGiven = false
  const aggregatedState = createAggregatedState()

  const logDir = ensureLogDir(directory)
  const projectName = basename(directory)
  
  return {
    "tool.execute.before": async (input, output) => {
      const tool = input.tool
      const args = (
        output && typeof output === "object" && output.args
          ? (output.args as Record<string, unknown>)
          : input && typeof input === "object" && input.args
            ? (input.args as Record<string, unknown>)
            : {}
      )
      
      if (!taskStartTime) taskStartTime = Date.now()
      toolCount++
      lastToolName = tool
      lastActivityTime = Date.now()
      
      // Log tool usage
      appendLog(join(logDir, "pre_tool_use.json"), { tool, args }, 1000)
      
      // Estimate tokens for this call
      const argsStr = JSON.stringify(args)
      const tokens = estimateTokens(argsStr)
      sessionTokens += tokens
      updateDailyStats(logDir, { toolCalls: 1, estimatedTokens: tokens })
      
      // Check for dangerous bash commands
      if (tool.toLowerCase() === "bash") {
        const command = String(args.command || "")
        
        if (isDangerousRmCommand(command)) {
          updateDailyStats(logDir, { blockedCommands: 1 })
          await smartNotify("Blocked dangerous rm command", "blocked", "high", aggregatedState, projectName)
          throw new Error(`BLOCKED: Dangerous rm command detected.\nCommand: ${command}\nUse safer alternatives or be more specific.`)
        }
        
        const [isDangerous, dangerReason] = checkDangerousCommand(command)
        if (isDangerous) {
          updateDailyStats(logDir, { blockedCommands: 1 })
          await smartNotify("Blocked dangerous command", "blocked", "high", aggregatedState, projectName)
          throw new Error(`BLOCKED: ${dangerReason}\nCommand: ${command}`)
        }
        
        const [isGitDangerous, gitReason, gitAction] = checkGitCommand(command)
        if (isGitDangerous) {
          if (gitAction === "block") {
            updateDailyStats(logDir, { blockedCommands: 1 })
            await smartNotify("Blocked dangerous git command", "blocked", "high", aggregatedState, projectName)
            throw new Error(`BLOCKED: ${gitReason}\nCommand: ${command}`)
          } else {
            await smartNotify(`Warning: ${gitReason}`, "warning", "normal", aggregatedState, projectName)
            appendLog(join(logDir, "warnings.json"), {
              type: "git_warning",
              command,
              reason: gitReason,
            }, 100)
          }
        }
      }
      
      const [isBlocked, reason] = isSensitiveFileAccess(tool, args)
      if (isBlocked) {
        updateDailyStats(logDir, { blockedCommands: 1 })
        await smartNotify("Blocked sensitive file access", "blocked", "high", aggregatedState, projectName)
        throw new Error(`BLOCKED: ${reason}`)
      }
      
      if (["write", "edit"].includes(tool.toLowerCase())) {
        const content = String(args.content || args.newString || "")
        const secrets = detectSecrets(content)
        if (secrets.length > 0) {
          updateDailyStats(logDir, { blockedCommands: 1 })
          await smartNotify("Blocked writing secrets to file", "blocked", "high", aggregatedState, projectName)
          throw new Error(`BLOCKED: Potential secrets detected in content:\n- ${secrets.join("\n- ")}\n\nUse environment variables instead.`)
        }
      }
    },

    "tool.execute.after": async (input, output) => {
      const tool = input.tool
      
      let outputText = output.output
      if (typeof outputText === "string" && outputText.length > 1000) {
        outputText = outputText.slice(0, 1000) + "... [truncated]"
      }
      
      // Log tool output
      appendLog(join(logDir, "post_tool_use.json"), { 
        tool, 
        title: output.title,
        output: outputText 
      })
      
      // Estimate output tokens
      if (typeof output.output === "string") {
        const outputTokens = estimateTokens(output.output)
        sessionTokens += outputTokens
        updateDailyStats(logDir, { estimatedTokens: outputTokens })
      }
      
      // Check for errors
      const errorIndicators = ["error:", "failed:", "exception:", "fatal:", "panic:"]
      if (typeof outputText === "string") {
        const lowerOutput = outputText.toLowerCase()
        for (const indicator of errorIndicators) {
          if (lowerOutput.includes(indicator)) {
            updateDailyStats(logDir, { errors: 1 })
            appendLog(join(logDir, "errors.json"), {
              tool,
              output: outputText,
              indicator,
            }, 100)
            break
          }
        }
        
        const getCommand = (): string => {
          if (tool.toLowerCase() !== "bash") {
            return ""
          }

          const inputArgs =
            input && typeof input === "object" && input.args && typeof input.args === "object"
              ? (input.args as Record<string, unknown>)
              : undefined

          if (inputArgs && typeof inputArgs.command === "string") {
            return inputArgs.command
          }

          const outputArgs =
            output && typeof output === "object" && output.args && typeof output.args === "object"
              ? (output.args as Record<string, unknown>)
              : undefined

          if (outputArgs && typeof outputArgs.command === "string") {
            return outputArgs.command
          }

          return ""
        }

        const rawCommand = getCommand()
        if (rawCommand) {
          const command = rawCommand.toLowerCase()
          
          if (command.includes("npm run build") || command.includes("yarn build") || 
              command.includes("tsc") || command.includes("make")) {
            if (lowerOutput.includes("error") || lowerOutput.includes("failed")) {
              aggregatedState.buildResult = "failed"
              await smartNotify("Build failed", "build", "high", aggregatedState, projectName)
            } else if (lowerOutput.includes("successfully") || lowerOutput.includes("compiled")) {
              aggregatedState.buildResult = "success"
              await smartNotify("Build succeeded", "build", "normal", aggregatedState, projectName)
            }
          }
          
          if (command.includes("npm test") || command.includes("yarn test") || 
              command.includes("pytest") || command.includes("jest")) {
            if (lowerOutput.includes("failed") || lowerOutput.includes("error")) {
              aggregatedState.testResult = "failed"
              await smartNotify("Tests failed", "test", "high", aggregatedState, projectName)
            } else if (lowerOutput.includes("passed") || lowerOutput.includes("success")) {
              aggregatedState.testResult = "success"
              await smartNotify("Tests passed", "test", "normal", aggregatedState, projectName)
            }
          }
        }
      }
      
      // Long task warning (every 3 minutes)
      const elapsed = Date.now() - (taskStartTime || Date.now())
      if (elapsed > 180000 && !longTaskWarningGiven) {
        longTaskWarningGiven = true
        const minutes = Math.floor(elapsed / 60000)
        await speakWithKokoro(`Task running for ${minutes} minutes.`, "normal")
      }
    },

    event: async ({ event }) => {
      if (event.type === "session.created") {
        updateDailyStats(logDir, { sessions: 1 })
        appendLog(join(logDir, "sessions.json"), {
          type: event.type,
          directory,
        }, 100)
        
        if (NOTIFICATION_MODE === "verbose") {
          await smartNotify(`Session started for ${projectName}`, "session", "normal", aggregatedState, projectName)
        }
        
        taskStartTime = null
        toolCount = 0
        sessionTokens = 0
        longTaskWarningGiven = false
        resetAggregatedState(aggregatedState)
      }

      if (event.type === "session.idle") {
        const duration = taskStartTime 
          ? Math.round((Date.now() - taskStartTime) / 1000) 
          : 0
        
        const sessionCost = (sessionTokens / 1000) * 
          ((COST_PER_1K_INPUT_TOKENS + COST_PER_1K_OUTPUT_TOKENS) / 2)
        
        const summaryMessage = buildCompletionSummary(projectName, duration, sessionCost, aggregatedState)
        await smartNotify(summaryMessage, "completion", "normal", aggregatedState)
        
        appendLog(join(logDir, "sessions.json"), {
          type: "task.complete",
          duration,
          toolCount,
          estimatedTokens: sessionTokens,
          estimatedCost: sessionCost,
          blockedCount: aggregatedState.blockedCount,
          buildResult: aggregatedState.buildResult,
          testResult: aggregatedState.testResult,
        }, 100)
        
        taskStartTime = null
        toolCount = 0
        sessionTokens = 0
        longTaskWarningGiven = false
        resetAggregatedState(aggregatedState)
      }

      if (event.type === "session.error") {
        updateDailyStats(logDir, { errors: 1 })
        await smartNotify("An error occurred. Your attention is needed.", "error", "high", aggregatedState, projectName)
      }
      
      // Generate usage graph on request (can be triggered by a command)
      if (event.type === "usage.graph") {
        const graphPath = generateUsageGraph(logDir)
        if (graphPath.endsWith(".html")) {
          await execAsync(`open "${graphPath}"`)
          await speakWithKokoro("Usage graph opened in browser.")
        }
      }
    },
  }
}

// Export graph generator for CLI usage
export { generateUsageGraph }
export default plugin
