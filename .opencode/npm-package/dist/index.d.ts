interface PluginContext {
    directory: string;
    $: (cmd: string) => Promise<{
        stdout: string;
        stderr: string;
    }>;
    client: unknown;
}
interface ToolInput {
    tool: string;
    [key: string]: unknown;
}
interface ToolOutput {
    args: Record<string, unknown>;
    output?: string;
    title?: string;
    [key: string]: unknown;
}
interface SessionEvent {
    type: string;
    [key: string]: unknown;
}
type Hooks = {
    "tool.execute.before"?: (input: ToolInput, output: ToolOutput) => Promise<void>;
    "tool.execute.after"?: (input: ToolInput, output: ToolOutput) => Promise<void>;
    event?: (params: {
        event: SessionEvent;
    }) => Promise<void>;
};
type Plugin = (context: PluginContext) => Promise<Hooks>;
declare function generateUsageGraph(logDir: string): string;
declare const plugin: Plugin;
export { generateUsageGraph };
export default plugin;
//# sourceMappingURL=index.d.ts.map