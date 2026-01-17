#!/usr/bin/env node

/**
 * Демонстраційний скрипт UI-Agent 5S Management System
 * 
 * Цей скрипт демонструє всі можливості системи 5S:
 * - Seiri (整理) - Сортування та видалення непотрібного
 * - Seiton (整頓) - Систематизація та організація
 * - Seiso (清掃) - Очищення та підтримка чистоти
 * - Seiketsu (清潔) - Стандартизація процедур
 * - Shitsuke (躾) - Дисципліна та дотримання
 */

import { createSeiriTool } from './src/mcp-server/tools/seiri.js';
import { createSeitonTool } from './src/mcp-server/tools/seiton.js';
import { createSeisoTool } from './src/mcp-server/tools/seiso.js';
import { createSeiketsuTool } from './src/mcp-server/tools/seiketsu.js';
import { createShitsukeTool } from './src/mcp-server/tools/shitsuke.js';
import { promises as fs } from 'fs';

class FiveSDemo {
  constructor() {
    this.tools = {
      seiri: createSeiriTool(),
      seiton: createSeitonTool(), 
      seiso: createSeisoTool(),
      seiketsu: createSeiketsuTool(),
      shitsuke: createShitsukeTool()
    };
    
    this.logFile = '/tmp/5s-demo.log';
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\\n`;
    console.log(`🗂️  ${message}`);
    await fs.appendFile(this.logFile, logEntry).catch(() => {});
  }

  async demonstrateSeiri() {
    await this.log('=== ДЕМОНСТРАЦІЯ SEIRI (整理) - СОРТУВАННЯ ===');
    
    try {
      // Аналіз непотрібних файлів
      await this.log('Виконуємо аналіз непотрібних файлів...');
      const analysis = await this.tools.seiri.execute({ 
        action: 'analyze'
      });
      
      await this.log(`Знайдено категорій файлів для очищення: ${Object.keys(analysis).length}`);
      
      // Безпечне очищення тимчасових файлів
      await this.log('Виконуємо безпечне очищення тимчасових файлів...');
      const cleanup = await this.tools.seiri.execute({
        action: 'cleanup',
        options: { category: 'temp', dryRun: false }
      });
      
      await this.log(`Очищення завершено. Звільнено: ${cleanup.summary?.freed || 'N/A'}`);
      
    } catch (error) {
      await this.log(`❌ Помилка в Seiri: ${error.message}`);
    }
  }

  async demonstrateSeiton() {
    await this.log('=== ДЕМОНСТРАЦІЯ SEITON (整頓) - СИСТЕМАТИЗАЦІЯ ===');
    
    try {
      // Організація структури директорій
      await this.log('Виконуємо організацію структури директорій...');
      const organize = await this.tools.seiton.execute({
        action: 'organize',
        target: '/tmp'
      });
      
      await this.log(`Організовано директорій: ${organize.organized?.length || 0}`);
      
      // Створення індексу файлів
      await this.log('Створюємо індекс важливих файлів...');
      const index = await this.tools.seiton.execute({
        action: 'index',
        target: '/etc'
      });
      
      await this.log(`Проіндексовано файлів: ${index.indexed?.length || 0}`);
      
    } catch (error) {
      await this.log(`❌ Помилка в Seiton: ${error.message}`);
    }
  }

  async demonstrateSeiso() {
    await this.log('=== ДЕМОНСТРАЦІЯ SEISO (清掃) - ОЧИЩЕННЯ ===');
    
    try {
      // Аналіз використання дискового простору
      await this.log('Аналізуємо використання дискового простору...');
      const analysis = await this.tools.seiso.execute({
        action: 'analyze'
      });
      
      await this.log(`Загальне використання диску: ${analysis.disk?.usage || 'N/A'}`);
      
      // Очищення системи
      await this.log('Виконуємо очищення системи...');
      const cleanup = await this.tools.seiso.execute({
        action: 'cleanup',
        options: { level: 'standard' }
      });
      
      await this.log(`Очищення завершено. Виконано операцій: ${cleanup.operations?.length || 0}`);
      
    } catch (error) {
      await this.log(`❌ Помилка в Seiso: ${error.message}`);
    }
  }

  async demonstrateSeiketsu() {
    await this.log('=== ДЕМОНСТРАЦІЯ SEIKETSU (清潔) - СТАНДАРТИЗАЦІЯ ===');
    
    try {
      // Створення стандартних процедур
      await this.log('Створюємо стандартні процедури...');
      const standards = await this.tools.seiketsu.execute({
        action: 'create-standards'
      });
      
      await this.log(`Створено стандартів: ${standards.created?.length || 0}`);
      
      // Перевірка відповідності стандартам
      await this.log('Перевіряємо відповідність стандартам...');
      const compliance = await this.tools.seiketsu.execute({
        action: 'check-compliance'
      });
      
      await this.log(`Загальна відповідність: ${compliance.overall?.score || 'N/A'}%`);
      
    } catch (error) {
      await this.log(`❌ Помилка в Seiketsu: ${error.message}`);
    }
  }

  async demonstrateShitsuke() {
    await this.log('=== ДЕМОНСТРАЦІЯ SHITSUKE (躾) - ДИСЦИПЛІНА ===');
    
    try {
      // Швидка перевірка здоров'я
      await this.log('Виконуємо швидку перевірку здоров\'я системи...');
      const health = await this.tools.shitsuke.execute({
        action: 'health'
      });
      
      await this.log(`Загальний стан системи: ${health.overall}`);
      
      // Перевірка метрик ефективності
      await this.log('Отримуємо метрики ефективності...');
      const metrics = await this.tools.shitsuke.execute({
        action: 'metrics'
      });
      
      await this.log(`Кількість проведених аудитів: ${metrics.totalAudits || 0}`);
      
      // Повний аудит системи (демонстрація)
      await this.log('Проводимо повний аудит 5S системи...');
      const audit = await this.tools.shitsuke.execute({
        action: 'audit'
      });
      
      await this.log(`Результат аудиту: ${audit.overallScore}/100 балів`);
      await this.log(`Рекомендацій для покращення: ${audit.recommendations?.length || 0}`);
      
    } catch (error) {
      await this.log(`❌ Помилка в Shitsuke: ${error.message}`);
    }
  }

  async runFullDemo() {
    await this.log('🚀 ЗАПУСК ПОВНОЇ ДЕМОНСТРАЦІЇ UI-AGENT 5S MANAGEMENT SYSTEM');
    await this.log('===================================================================');
    
    const startTime = Date.now();
    
    try {
      // Виконуємо демонстрацію кожного модуля
      await this.demonstrateSeiri();
      await this.log('');
      
      await this.demonstrateSeiton();
      await this.log('');
      
      await this.demonstrateSeiso();
      await this.log('');
      
      await this.demonstrateSeiketsu();
      await this.log('');
      
      await this.demonstrateShitsuke();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      await this.log('');
      await this.log('✅ ДЕМОНСТРАЦІЯ ЗАВЕРШЕНА УСПІШНО');
      await this.log(`⏱️  Час виконання: ${duration} секунд`);
      await this.log(`📋 Детальний лог збережено в: ${this.logFile}`);
      
    } catch (error) {
      await this.log(`❌ КРИТИЧНА ПОМИЛКА: ${error.message}`);
      throw error;
    }
  }

  async runQuickTest() {
    await this.log('🔍 ШВИДКИЙ ТЕСТ 5S СИСТЕМИ');
    await this.log('============================');
    
    try {
      // Тест кожного інструменту
      for (const [name, tool] of Object.entries(this.tools)) {
        try {
          await this.log(`Тестуємо ${name.toUpperCase()}...`);
          
          // Простий тест виконання
          if (name === 'seiri') {
            await tool.execute({ action: 'analyze' });
          } else if (name === 'seiton') {
            await tool.execute({ action: 'scan', target: '/tmp' });
          } else if (name === 'seiso') {
            await tool.execute({ action: 'analyze' });
          } else if (name === 'seiketsu') {
            await tool.execute({ action: 'check-compliance' });
          } else if (name === 'shitsuke') {
            await tool.execute({ action: 'health' });
          }
          
          await this.log(`✅ ${name.toUpperCase()} - OK`);
          
        } catch (error) {
          await this.log(`❌ ${name.toUpperCase()} - FAILED: ${error.message}`);
        }
      }
      
      await this.log('');
      await this.log('🎯 ШВИДКИЙ ТЕСТ ЗАВЕРШЕНО');
      
    } catch (error) {
      await this.log(`❌ ПОМИЛКА ТЕСТУВАННЯ: ${error.message}`);
    }
  }

  // Отримання довідки
  getHelp() {
    return `
🗂️  UI-Agent 5S Management System - Демонстрація

Використання:
  node demo.js [команда]

Команди:
  demo     - Повна демонстрація всіх модулів 5S (за замовчуванням)
  test     - Швидкий тест функціональності
  help     - Показати цю довідку
  
  seiri    - Демонстрація модуля Сортування
  seiton   - Демонстрація модуля Систематизації
  seiso    - Демонстрація модуля Очищення
  seiketsu - Демонстрація модуля Стандартизації
  shitsuke - Демонстрація модуля Дисципліни

Приклади:
  node demo.js              # Повна демонстрація
  node demo.js test         # Швидкий тест
  node demo.js seiri        # Тільки модуль сортування
  
Лог файл: ${this.logFile}
`;
  }
}

// Головна функція
async function main() {
  const demo = new FiveSDemo();
  const command = process.argv[2] || 'demo';
  
  try {
    switch (command) {
      case 'demo':
        await demo.runFullDemo();
        break;
        
      case 'test':
        await demo.runQuickTest();
        break;
        
      case 'seiri':
        await demo.demonstrateSeiri();
        break;
        
      case 'seiton':
        await demo.demonstrateSeiton();
        break;
        
      case 'seiso':
        await demo.demonstrateSeiso();
        break;
        
      case 'seiketsu':
        await demo.demonstrateSeiketsu();
        break;
        
      case 'shitsuke':
        await demo.demonstrateShitsuke();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        console.log(demo.getHelp());
        break;
        
      default:
        console.log(`❌ Невідома команда: ${command}`);
        console.log(demo.getHelp());
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Помилка виконання: ${error.message}`);
    process.exit(1);
  }
}

// Запуск тільки якщо файл виконується напряму
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FiveSDemo };
