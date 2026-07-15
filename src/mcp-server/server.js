#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { createRegisteredTools } from './tool-registry.js';
import { PACKAGE_VERSION } from '../version.js';

class FiveSMcpServer {
  constructor() {
    this.server = new Server(
      {
        name: '5s-methodology-server',
        version: PACKAGE_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new Map();
    this.toolOrchestrator = null; // Буде ініціалізовано пізніше з tools-executor
    this.setupEventHandlers();
    this.registerTools();
  }

  // 🧠 Додаємо можливість інжектити toolOrchestrator для memory integration
  setToolOrchestrator(toolOrchestrator) {
    this.toolOrchestrator = toolOrchestrator;
    // Перереєструємо tools з orchestrator
    this.registerTools();
  }

  setupEventHandlers() {
    // Обробка запитів на список інструментів
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        })),
      };
    });

    // Обробка виконання інструментів
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!this.tools.has(name)) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        const tool = this.tools.get(name);
        const result = await tool.execute(args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });

    // Обробка помилок
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };
  }

  registerTools() {
    // Очищуємо поточні tools для перереєстрації
    this.tools.clear();
    
    // Реєструємо всі 5С інструменти
    const tools = createRegisteredTools({ toolOrchestrator: this.toolOrchestrator });

    tools.forEach(tool => {
      this.tools.set(tool.name, tool);
      const memoryIndicator = tool.name === 'seiton_organize_system' ? ' 🌸 (with Memory-Driven Workspace Tree)' : '';
      console.error(`[5S MCP] Registered tool: ${tool.name}${memoryIndicator}`);
    });

    console.error(`[5S MCP] Total tools registered: ${this.tools.size}`);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[5S MCP Server] Started and ready for connections');
    console.error('🌸 Enhanced with Memory-Driven Intelligent Workspace Tree');
  }
}

// Запускаємо сервер
if (import.meta.url === `file://${process.argv[1]}`) {
  const mcpServer = new FiveSMcpServer();
  mcpServer.start().catch((error) => {
    console.error('[5S MCP] Failed to start server:', error);
    process.exit(1);
  });
}

export { FiveSMcpServer };
