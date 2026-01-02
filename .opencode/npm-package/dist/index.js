import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
// ============================================================================
// Configuration
// ============================================================================
const KOKORO_URL = process.env.KOKORO_URL || "http://localhost:8880";
const KOKORO_VOICE = process.env.KOKORO_VOICE || "bf_emma";
const VOICE_ENABLED = process.env.OPENCODE_VOICE !== "off";
// Cost estimation (approximate, based on Claude 3.5 Sonnet pricing)
const COST_PER_1K_INPUT_TOKENS = 0.003;
const COST_PER_1K_OUTPUT_TOKENS = 0.015;
// ============================================================================
// Security Patterns
// ============================================================================
// Dangerous rm patterns
const DANGEROUS_RM_PATTERNS = [
    /\brm\s+.*-[a-z]*r[a-z]*f/i,
    /\brm\s+.*-[a-z]*f[a-z]*r/i,
    /\brm\s+--recursive\s+--force/i,
    /\brm\s+--force\s+--recursive/i,
];
const DANGEROUS_PATHS = [/\/\s*$/, /\/\*/, /~/, /\$HOME/, /\.\./, /^\*/];
// Sensitive file patterns
const SENSITIVE_FILE_PATTERNS = [
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
];
// Dangerous command patterns (new)
const DANGEROUS_COMMAND_PATTERNS = [
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
];
// Git safety patterns
const GIT_DANGEROUS_PATTERNS = [
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
];
// Secret detection patterns (for code writes)
const SECRET_PATTERNS = [
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
];
// ============================================================================
// Helper Functions
// ============================================================================
function isDangerousRmCommand(command) {
    const normalized = command.toLowerCase().replace(/\s+/g, " ");
    for (const pattern of DANGEROUS_RM_PATTERNS) {
        if (pattern.test(normalized))
            return true;
    }
    if (/\brm\s+.*-[a-z]*r/i.test(normalized)) {
        for (const path of DANGEROUS_PATHS) {
            if (path.test(normalized))
                return true;
        }
    }
    return false;
}
function checkDangerousCommand(command) {
    for (const [pattern, reason] of DANGEROUS_COMMAND_PATTERNS) {
        if (pattern.test(command)) {
            return [true, reason];
        }
    }
    return [false, ""];
}
function checkGitCommand(command) {
    for (const [pattern, reason, action] of GIT_DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
            return [true, reason, action];
        }
    }
    return [false, "", "warn"];
}
function isSensitiveFileAccess(tool, args) {
    let filePath = "";
    if (["read", "edit", "write"].includes(tool.toLowerCase())) {
        filePath = String(args.filePath || args.file_path || "");
    }
    else if (tool.toLowerCase() === "bash") {
        filePath = String(args.command || "");
    }
    for (const [pattern, reason] of SENSITIVE_FILE_PATTERNS) {
        if (pattern.test(filePath)) {
            return [true, reason];
        }
    }
    return [false, ""];
}
function detectSecrets(content) {
    const detected = [];
    for (const [pattern, reason] of SECRET_PATTERNS) {
        if (pattern.test(content)) {
            detected.push(reason);
        }
    }
    return detected;
}
function estimateTokens(text) {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
}
// ============================================================================
// Logging Functions
// ============================================================================
function ensureLogDir(directory) {
    // Aggressively coerce to string and validate
    let dirStr = "";
    try {
        if (typeof directory === "string") {
            dirStr = directory;
        }
        else if (directory && typeof directory === "object" && directory.directory) {
            dirStr = String(directory.directory);
        }
        else if (directory) {
            dirStr = String(directory);
        }
    }
    catch {
        dirStr = "";
    }
    // Smart fallback: try current working directory first, then home directory
    let baseDir = dirStr;
    if (!baseDir || baseDir === "/" || baseDir === "." || baseDir === "[object Object]" || !existsSync(baseDir)) {
        // Try to use current working directory (project-specific logs)
        const cwd = process.cwd();
        if (cwd && cwd !== "/" && existsSync(cwd)) {
            baseDir = cwd;
        }
        else {
            // Last resort: user's home directory
            baseDir = join(homedir(), ".opencode");
        }
    }
    const logDir = join(baseDir, ".opencode", "logs");
    if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
    }
    return logDir;
}
function appendLog(logPath, entry, maxEntries = 500) {
    try {
        let logData = [];
        if (existsSync(logPath)) {
            const content = readFileSync(logPath, "utf-8");
            logData = JSON.parse(content);
        }
        logData.push({ ...entry, timestamp: new Date().toISOString() });
        if (logData.length > maxEntries) {
            logData = logData.slice(-maxEntries);
        }
        writeFileSync(logPath, JSON.stringify(logData, null, 2));
    }
    catch {
        // Logging failures must not break tool execution
    }
}
function updateDailyStats(logDir, updates) {
    const today = new Date().toISOString().split("T")[0];
    const statsPath = join(logDir, "daily_stats.json");
    try {
        let allStats = {};
        if (existsSync(statsPath)) {
            allStats = JSON.parse(readFileSync(statsPath, "utf-8"));
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
            };
        }
        // Update stats
        if (updates.sessions)
            allStats[today].sessions += updates.sessions;
        if (updates.toolCalls)
            allStats[today].toolCalls += updates.toolCalls;
        if (updates.blockedCommands)
            allStats[today].blockedCommands += updates.blockedCommands;
        if (updates.errors)
            allStats[today].errors += updates.errors;
        if (updates.estimatedTokens) {
            allStats[today].estimatedTokens += updates.estimatedTokens;
            // Estimate cost (assuming 50% input, 50% output)
            const inputTokens = updates.estimatedTokens * 0.5;
            const outputTokens = updates.estimatedTokens * 0.5;
            allStats[today].estimatedCost +=
                (inputTokens / 1000) * COST_PER_1K_INPUT_TOKENS +
                    (outputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS;
        }
        // Keep only last 90 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        for (const date of Object.keys(allStats)) {
            if (date < cutoffStr)
                delete allStats[date];
        }
        writeFileSync(statsPath, JSON.stringify(allStats, null, 2));
    }
    catch {
        // Stats failures must not break execution
    }
}
function generateUsageGraph(logDir) {
    // Ensure logDir is a string
    let logDirStr = "";
    try {
        if (typeof logDir === "string") {
            logDirStr = logDir;
        }
        else if (logDir && typeof logDir === "object" && logDir.directory) {
            logDirStr = String(logDir.directory);
        }
        else if (logDir) {
            logDirStr = String(logDir);
        }
    }
    catch {
        logDirStr = "";
    }
    if (!logDirStr || logDirStr === "[object Object]") {
        return "Invalid log directory provided.";
    }
    const statsPath = join(logDirStr, "daily_stats.json");
    const graphPath = join(logDirStr, "usage_graph.html");
    try {
        if (!existsSync(statsPath)) {
            return "No usage data available yet.";
        }
        const allStats = JSON.parse(readFileSync(statsPath, "utf-8"));
        const dates = Object.keys(allStats).sort();
        const last30Days = dates.slice(-30);
        const labels = last30Days.map(d => d.slice(5)); // MM-DD format
        const toolCalls = last30Days.map(d => allStats[d].toolCalls);
        const costs = last30Days.map(d => Number(allStats[d].estimatedCost.toFixed(4)));
        const blocked = last30Days.map(d => allStats[d].blockedCommands);
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
</html>`;
        writeFileSync(graphPath, html);
        return graphPath;
    }
    catch (e) {
        return `Error generating graph: ${e}`;
    }
}
// ============================================================================
// Voice/Notification Functions
// ============================================================================
async function speakWithKokoro(text, priority = "normal") {
    if (!VOICE_ENABLED)
        return;
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
        });
        if (!response.ok) {
            throw new Error(`Kokoro API error: ${response.status}`);
        }
        const audioBuffer = await response.arrayBuffer();
        const tempFile = `/tmp/opencode_voice_${Date.now()}.mp3`;
        writeFileSync(tempFile, Buffer.from(audioBuffer));
        await execAsync(`afplay "${tempFile}" && rm "${tempFile}"`);
    }
    catch {
        try {
            await execAsync(`osascript -e 'display notification "${text}" with title "OpenCode"'`);
        }
        catch {
            // Notifications optional
        }
    }
}
async function notifyWithSound(message, useVoice = true) {
    if (useVoice && VOICE_ENABLED) {
        await speakWithKokoro(message);
    }
    else {
        try {
            await execAsync(`osascript -e 'display notification "${message}" with title "OpenCode"'`);
            await execAsync("afplay /System/Library/Sounds/Glass.aiff");
        }
        catch {
            // Notifications optional
        }
    }
}
// ============================================================================
// Plugin Export
// ============================================================================
const plugin = async (context) => {
    // Defensive: extract directory from context, handling various input formats
    let directory;
    if (typeof context === "string") {
        directory = context;
    }
    else if (context && typeof context === "object") {
        directory = context.directory || String(context);
    }
    else {
        directory = String(context || "");
    }
    let taskStartTime = null;
    let lastToolName = "";
    let toolCount = 0;
    let sessionTokens = 0;
    let lastActivityTime = Date.now();
    let longTaskWarningGiven = false;
    const logDir = ensureLogDir(directory);
    return {
        "tool.execute.before": async (input, output) => {
            const tool = input.tool;
            const args = output.args;
            if (!taskStartTime)
                taskStartTime = Date.now();
            toolCount++;
            lastToolName = tool;
            lastActivityTime = Date.now();
            // Log tool usage
            appendLog(join(logDir, "pre_tool_use.json"), { tool, args }, 1000);
            // Estimate tokens for this call
            const argsStr = JSON.stringify(args);
            const tokens = estimateTokens(argsStr);
            sessionTokens += tokens;
            updateDailyStats(logDir, { toolCalls: 1, estimatedTokens: tokens });
            // Check for dangerous bash commands
            if (tool.toLowerCase() === "bash") {
                const command = String(args.command || "");
                // Check rm commands
                if (isDangerousRmCommand(command)) {
                    updateDailyStats(logDir, { blockedCommands: 1 });
                    await speakWithKokoro("Blocked a dangerous remove command.", "high");
                    throw new Error(`BLOCKED: Dangerous rm command detected.\nCommand: ${command}\nUse safer alternatives or be more specific.`);
                }
                // Check other dangerous commands
                const [isDangerous, dangerReason] = checkDangerousCommand(command);
                if (isDangerous) {
                    updateDailyStats(logDir, { blockedCommands: 1 });
                    await speakWithKokoro("Blocked a dangerous command.", "high");
                    throw new Error(`BLOCKED: ${dangerReason}\nCommand: ${command}`);
                }
                // Check git commands
                const [isGitDangerous, gitReason, gitAction] = checkGitCommand(command);
                if (isGitDangerous) {
                    if (gitAction === "block") {
                        updateDailyStats(logDir, { blockedCommands: 1 });
                        await speakWithKokoro("Blocked a dangerous git command.", "high");
                        throw new Error(`BLOCKED: ${gitReason}\nCommand: ${command}`);
                    }
                    else {
                        // Warn but allow
                        await speakWithKokoro(`Warning: ${gitReason}`, "normal");
                        appendLog(join(logDir, "warnings.json"), {
                            type: "git_warning",
                            command,
                            reason: gitReason,
                        }, 100);
                    }
                }
            }
            // Check for sensitive file access
            const [isBlocked, reason] = isSensitiveFileAccess(tool, args);
            if (isBlocked) {
                updateDailyStats(logDir, { blockedCommands: 1 });
                await speakWithKokoro("Access to sensitive file blocked.", "high");
                throw new Error(`BLOCKED: ${reason}`);
            }
            // Check for secrets in write operations
            if (["write", "edit"].includes(tool.toLowerCase())) {
                const content = String(args.content || args.newString || "");
                const secrets = detectSecrets(content);
                if (secrets.length > 0) {
                    updateDailyStats(logDir, { blockedCommands: 1 });
                    await speakWithKokoro("Blocked writing secrets to file.", "high");
                    throw new Error(`BLOCKED: Potential secrets detected in content:\n- ${secrets.join("\n- ")}\n\nUse environment variables instead.`);
                }
            }
        },
        "tool.execute.after": async (input, output) => {
            const tool = input.tool;
            let outputText = output.output;
            if (typeof outputText === "string" && outputText.length > 1000) {
                outputText = outputText.slice(0, 1000) + "... [truncated]";
            }
            // Log tool output
            appendLog(join(logDir, "post_tool_use.json"), {
                tool,
                title: output.title,
                output: outputText
            });
            // Estimate output tokens
            if (typeof output.output === "string") {
                const outputTokens = estimateTokens(output.output);
                sessionTokens += outputTokens;
                updateDailyStats(logDir, { estimatedTokens: outputTokens });
            }
            // Check for errors
            const errorIndicators = ["error:", "failed:", "exception:", "fatal:", "panic:"];
            if (typeof outputText === "string") {
                const lowerOutput = outputText.toLowerCase();
                for (const indicator of errorIndicators) {
                    if (lowerOutput.includes(indicator)) {
                        updateDailyStats(logDir, { errors: 1 });
                        appendLog(join(logDir, "errors.json"), {
                            tool,
                            output: outputText,
                            indicator,
                        }, 100);
                        break;
                    }
                }
                // Announce build/test results
                if (tool.toLowerCase() === "bash") {
                    const command = String(output.args.command || "").toLowerCase();
                    // Build results
                    if (command.includes("npm run build") || command.includes("yarn build") ||
                        command.includes("tsc") || command.includes("make")) {
                        if (lowerOutput.includes("error") || lowerOutput.includes("failed")) {
                            await speakWithKokoro("Build failed. Check the errors.", "high");
                        }
                        else if (lowerOutput.includes("successfully") || lowerOutput.includes("compiled")) {
                            await speakWithKokoro("Build completed successfully.", "normal");
                        }
                    }
                    // Test results
                    if (command.includes("npm test") || command.includes("yarn test") ||
                        command.includes("pytest") || command.includes("jest")) {
                        if (lowerOutput.includes("failed") || lowerOutput.includes("error")) {
                            await speakWithKokoro("Tests failed.", "high");
                        }
                        else if (lowerOutput.includes("passed") || lowerOutput.includes("success")) {
                            await speakWithKokoro("All tests passed.", "normal");
                        }
                    }
                }
            }
            // Long task warning (every 3 minutes)
            const elapsed = Date.now() - (taskStartTime || Date.now());
            if (elapsed > 180000 && !longTaskWarningGiven) {
                longTaskWarningGiven = true;
                const minutes = Math.floor(elapsed / 60000);
                await speakWithKokoro(`Task running for ${minutes} minutes.`, "normal");
            }
        },
        event: async ({ event }) => {
            const projectName = basename(directory);
            if (event.type === "session.created") {
                updateDailyStats(logDir, { sessions: 1 });
                appendLog(join(logDir, "sessions.json"), {
                    type: event.type,
                    directory,
                }, 100);
                await speakWithKokoro(`OpenCode session started for ${projectName}.`);
                // Reset counters
                taskStartTime = null;
                toolCount = 0;
                sessionTokens = 0;
                longTaskWarningGiven = false;
            }
            if (event.type === "session.idle") {
                const duration = taskStartTime
                    ? Math.round((Date.now() - taskStartTime) / 1000)
                    : 0;
                // Calculate session cost
                const sessionCost = (sessionTokens / 1000) *
                    ((COST_PER_1K_INPUT_TOKENS + COST_PER_1K_OUTPUT_TOKENS) / 2);
                let message = `Task complete.`;
                if (duration > 60) {
                    const minutes = Math.floor(duration / 60);
                    message = `Task complete after ${minutes} minute${minutes > 1 ? 's' : ''}.`;
                }
                if (sessionCost > 0.01) {
                    message += ` Estimated cost: ${sessionCost.toFixed(2)} dollars.`;
                }
                await notifyWithSound(message, true);
                appendLog(join(logDir, "sessions.json"), {
                    type: "task.complete",
                    duration,
                    toolCount,
                    estimatedTokens: sessionTokens,
                    estimatedCost: sessionCost,
                }, 100);
                taskStartTime = null;
                toolCount = 0;
                sessionTokens = 0;
                longTaskWarningGiven = false;
            }
            if (event.type === "session.error") {
                updateDailyStats(logDir, { errors: 1 });
                await speakWithKokoro("An error occurred. Your attention is needed.", "high");
            }
            // Generate usage graph on request (can be triggered by a command)
            if (event.type === "usage.graph") {
                const graphPath = generateUsageGraph(logDir);
                if (graphPath.endsWith(".html")) {
                    await execAsync(`open "${graphPath}"`);
                    await speakWithKokoro("Usage graph opened in browser.");
                }
            }
        },
    };
};
// Export graph generator for CLI usage
export { generateUsageGraph };
export default plugin;
//# sourceMappingURL=index.js.map