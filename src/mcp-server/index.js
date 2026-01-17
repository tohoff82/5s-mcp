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

console.log('🚀 Starting 5S Methodology MCP Server...');
console.log('📋 Based on Hiroyuki Hirano methodology');
console.log('🎯 Target server: htz-legistrator (138.201.190.221)');
console.log('');

const server = new FiveSMcpServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down 5S MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down 5S MCP Server...');
  process.exit(0);
});

// Запускаємо сервер
server.start().catch((error) => {
  console.error('❌ Failed to start 5S MCP Server:', error);
  process.exit(1);
});
