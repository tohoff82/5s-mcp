#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Імпорт 5С інструментів
import { createSeiriTool } from './tools/seiri.js';
import { createSeitonTool } from './tools/seiton.js';
import { createSeisoTool } from './tools/seiso.js';
import { createSeiketsuTool } from './tools/seiketsu.js';
import { createShitsukeTool } from './tools/shitsuke.js';

class FiveSMcpServer {
  constructor() {
    this.server = new Server(
      {
        name: '5s-methodology-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new Map();
    this.setupEventHandlers();
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
    // Реєструємо всі 5С інструменти
    const tools = [
      createSeiriTool(),      // 整理 - Сортування
      createSeitonTool(),     // 整頓 - Систематизація  
      createSeisoTool(),      // 清掃 - Прибирання
      createSeiketsuTool(),   // 清潔 - Стандартизація
      createShitsukeTool(),   // 躾 - Дотримання
    ];

    tools.forEach(tool => {
      this.tools.set(tool.name, tool);
      console.log(`[5S MCP] Registered tool: ${tool.name}`);
    });

    console.log(`[5S MCP] Total tools registered: ${this.tools.size}`);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[5S MCP Server] Started and ready for connections');
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
