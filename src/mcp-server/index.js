#!/usr/bin/env node

/**
 * 5S Methodology MCP Server
 * 
 * Надає доступ до 5С методології через Model Context Protocol:
 * - 整理 (Seiri) - Сортування/Відбір 
 * - 整頓 (Seiton) - Систематизація/Порядок
 * - 清掃 (Seiso) - Прибирання/Чистота  
 * - 清潔 (Seiketsu) - Стандартизація
 * - 躾 (Shitsuke) - Самодисципліна/Дотримання
 */

import { FiveSMcpServer } from './server.js';

console.error('Starting 5S Methodology MCP Server...');
console.error('Based on Hiroyuki Hirano methodology');

const server = new FiveSMcpServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('\nShutting down 5S MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\nShutting down 5S MCP Server...');
  process.exit(0);
});

// Запускаємо сервер
server.start().catch((error) => {
  console.error('Failed to start 5S MCP Server:', error);
  process.exit(1);
});
