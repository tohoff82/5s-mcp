import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { createInspectWorkspaceTool } from './tools/inspect-workspace.js';
import { createApplySafeActionsTool } from './tools/apply-safe-actions.js';
import { createExplainWorkflowTool } from './tools/explain-workflow.js';

export class SafeOpsMcpServer {
  constructor({ dependencies, contextProvider = async () => ({}) }) {
    if (!dependencies) throw new Error('SafeOps dependencies are required');
    this.contextProvider = contextProvider;
    this.server = new Server({ name: 'safeops-alexa-server', version: '0.1.0' }, { capabilities: { tools: {} } });
    this.tools = new Map();
    const resolvedDependencies = resolveDependencies(dependencies, this.server);
    this.registerTools(resolvedDependencies);
    this.setupHandlers();
  }

  registerTools(dependencies) {
    const tools = [
      createInspectWorkspaceTool(dependencies),
      createApplySafeActionsTool(dependencies),
      createExplainWorkflowTool(dependencies)
    ];
    for (const tool of tools) this.tools.set(tool.name, tool);
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: this.getToolDefinitions() }));
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => this.handleToolCall(request, extra));
    this.server.onerror = error => console.error('[SafeOps MCP Error]', error);
  }

  getToolDefinitions() {
    return [...this.tools.values()].map(tool => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations }));
  }

  async handleToolCall(request, extra = {}) {
    const tool = this.tools.get(request.params.name);
    if (!tool) throw new McpError(ErrorCode.MethodNotFound, `Unknown SafeOps tool: ${request.params.name}`);
    const runtimeContext = await this.contextProvider(request, extra);
    try {
      const result = await tool.execute(request.params.arguments || {}, runtimeContext);
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) {
      console.error(`[SafeOps MCP] Tool failed: ${tool.name}`, error);
      const message = tool.annotations?.destructiveHint ? 'SafeOps apply failed' : `SafeOps tool failed: ${error instanceof Error ? error.message : String(error)}`;
      throw new McpError(ErrorCode.InternalError, message);
    }
  }
}

function resolveDependencies(dependencies, server) {
  const resolved = { ...dependencies };
  if (!resolved.approvalProvider && typeof resolved.approvalProviderFactory === 'function') {
    resolved.approvalProvider = resolved.approvalProviderFactory(server);
  }
  delete resolved.approvalProviderFactory;
  return resolved;
}
