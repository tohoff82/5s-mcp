#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FiveSChangelogManager from './changelog-manager.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * CLI для управління 5S Changelog System
 */
class FiveSChangelogCLI {
  constructor() {
    this.manager = new FiveSChangelogManager({
      baseDir: process.env.CHANGELOG_BASE_DIR || 'docs/changes/5s-procedures',
      mongodb: {
        uri: process.env.MONGODB_URI,
        database: process.env.MONGODB_DATABASE
      }
    });
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      await this.manager.initialize();

      switch (command) {
        case 'create':
          await this.createCommand(args.slice(1));
          break;
        case 'update':
          await this.updateCommand(args.slice(1));
          break;
        case 'search':
          await this.searchCommand(args.slice(1));
          break;
        case 'list':
          await this.listCommand(args.slice(1));
          break;
        case 'show':
          await this.showCommand(args.slice(1));
          break;
        case 'templates':
          await this.templatesCommand();
          break;
        case 'stats':
          await this.statsCommand(args.slice(1));
          break;
        case 'sync':
          await this.syncCommand();
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      await this.manager.close();
    }
  }

  async createCommand(args) {
    const options = this.parseArgs(args);
    
    let templateData = {};
    
    // Якщо вказано шаблон
    if (options.template) {
      const templatePath = path.join('docs/changes/5s-procedures/templates', `${options.template}-template.json`);
      try {
        const templateContent = await fs.readFile(templatePath, 'utf8');
        templateData = JSON.parse(templateContent);
      } catch (error) {
        console.error(`⚠️ Template not found: ${options.template}`);
      }
    }

    // Інтерактивне створення
    const data = await this.promptForData(templateData, options);
    
    const entry = await this.manager.createEntry(data);
    console.log(`✅ Created entry: ${entry.id}`);
    console.log(`📁 Files: ${this.manager.config.baseDir}/${entry.quarter.replace('-', '/')}/${entry.id}.*`);
  }

  async updateCommand(args) {
    const id = args[0];
    if (!id) {
      console.error('❌ Entry ID required');
      return;
    }

    const options = this.parseArgs(args.slice(1));
    
    // Завантажуємо існуючий entry для редагування
    const existingEntry = await this.manager.loadEntry(id);
    if (!existingEntry) {
      console.error(`❌ Entry not found: ${id}`);
      return;
    }

    console.log(`📝 Updating entry: ${id}`);
    const updates = await this.promptForData(existingEntry, options);
    
    const updatedEntry = await this.manager.updateEntry(id, updates);
    console.log(`✅ Updated entry: ${updatedEntry.id}`);
  }

  async searchCommand(args) {
    const options = this.parseArgs(args);
    
    const filters = {};
    if (options.type) filters.procedure_type = options.type;
    if (options.severity) filters.severity = options.severity;
    if (options.status) filters.status = options.status;
    if (options.executor) filters.executor = options.executor;
    if (options.quarter) filters.quarter = options.quarter;
    if (options.search) filters.search = options.search;
    if (options.tags) filters.tags = options.tags.split(',');

    const results = await this.manager.searchEntries(filters);
    
    if (results.length === 0) {
      console.log('📭 No entries found matching criteria');
      return;
    }

    console.log(`📋 Found ${results.length} entries:`);
    console.log('');
    
    for (const entry of results) {
      this.printEntrySummary(entry);
    }
  }

  async listCommand(args) {
    const options = this.parseArgs(args);
    const quarter = options.quarter || this.manager.currentQuarter;
    
    const results = await this.manager.searchEntries({ quarter });
    
    if (results.length === 0) {
      console.log(`📭 No entries found for quarter ${quarter}`);
      return;
    }

    console.log(`📋 Entries for ${quarter} (${results.length} total):`);
    console.log('');
    
    for (const entry of results) {
      this.printEntrySummary(entry);
    }
  }

  async showCommand(args) {
    const id = args[0];
    if (!id) {
      console.error('❌ Entry ID required');
      return;
    }

    const entry = await this.manager.loadEntry(id);
    if (!entry) {
      console.error(`❌ Entry not found: ${id}`);
      return;
    }

    this.printEntryDetails(entry);
  }

  async templatesCommand() {
    const templatesDir = 'docs/changes/5s-procedures/templates';
    
    try {
      const files = await fs.readdir(templatesDir);
      const templates = files
        .filter(file => file.endsWith('-template.json'))
        .map(file => file.replace('-template.json', ''));

      console.log('📋 Available templates:');
      console.log('');
      
      for (const template of templates) {
        const templatePath = path.join(templatesDir, `${template}-template.json`);
        const content = JSON.parse(await fs.readFile(templatePath, 'utf8'));
        
        console.log(`🔖 ${template}`);
        console.log(`   ${content.procedure.description}`);
        console.log(`   Category: ${content.procedure.category}`);
        console.log('');
      }
    } catch (error) {
      console.error('❌ Failed to list templates:', error.message);
    }
  }

  async statsCommand(args) {
    const options = this.parseArgs(args);
    const quarter = options.quarter;
    
    if (this.manager.config.autoSync && this.manager.mongoConnector.isConnected) {
      const stats = await this.manager.mongoConnector.getStatistics(quarter);
      this.printStatistics(stats, quarter);
    } else {
      console.log('📊 Statistics require MongoDB connection');
      console.log('Enable autoSync in configuration or connect manually');
    }
  }

  async syncCommand() {
    if (!this.manager.config.autoSync) {
      console.log('🔄 AutoSync is disabled. Enabling for this sync...');
      await this.manager.mongoConnector.connect();
    }

    console.log('🔄 Syncing file system with MongoDB...');
    
    // Синхронізуємо всі JSON файли з файлової системи
    const baseDir = this.manager.config.baseDir;
    const syncCount = await this.syncDirectory(baseDir);
    
    console.log(`✅ Synchronized ${syncCount} entries`);
  }

  async syncDirectory(dir) {
    let count = 0;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          count += await this.syncDirectory(fullPath);
        } else if (entry.name.endsWith('.json') && !entry.name.includes('template')) {
          try {
            await this.manager.mongoConnector.syncWithFileSystem(fullPath);
            count++;
          } catch (error) {
            console.error(`⚠️ Failed to sync ${fullPath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      // Директорія не існує або недоступна
    }
    
    return count;
  }

  parseArgs(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      const value = args[i + 1];
      
      if (key?.startsWith('--')) {
        options[key.substring(2)] = value || true;
      }
    }
    
    return options;
  }

  async promptForData(templateData = {}, options = {}) {
    // Для простоти, повертаємо templateData або мінімальні дані
    // У повній реалізації тут був би інтерактивний промпт
    
    if (options.quick) {
      return {
        procedure: {
          type: options.type || 'seiso',
          name: options.name || 'Quick entry',
          category: options.category || 'system'
        },
        changes: {
          type: 'update',
          what: options.what || 'System update',
          why: options.why || 'Maintenance'
        },
        impact: {
          scope: 'local',
          severity: 'low'
        },
        human_resources: {
          executor: options.executor || 'cli-user'
        },
        status: {
          current: 'completed'
        }
      };
    }
    
    return templateData;
  }

  printEntrySummary(entry) {
    const date = new Date(entry.timestamp).toLocaleDateString('uk-UA');
    const type = entry.procedure.type.toUpperCase();
    const severity = entry.impact.severity;
    const status = entry.status.current;
    
    console.log(`🔹 ${entry.id}`);
    console.log(`   ${entry.procedure.name}`);
    console.log(`   ${date} | ${type} | ${severity} | ${status}`);
    console.log('');
  }

  printEntryDetails(entry) {
    console.log(`📄 Entry Details: ${entry.id}`);
    console.log('='.repeat(50));
    console.log(`Timestamp: ${new Date(entry.timestamp).toLocaleString('uk-UA')}`);
    console.log(`Quarter: ${entry.quarter}`);
    console.log(`Type: ${entry.procedure.type} (${this.translateProcedureType(entry.procedure.type)})`);
    console.log(`Name: ${entry.procedure.name}`);
    console.log(`Category: ${entry.procedure.category}`);
    console.log('');
    console.log('📝 Changes:');
    console.log(`  What: ${entry.changes.what}`);
    console.log(`  Why: ${entry.changes.why}`);
    if (entry.changes.how) console.log(`  How: ${entry.changes.how}`);
    console.log('');
    console.log('📊 Impact:');
    console.log(`  Scope: ${entry.impact.scope}`);
    console.log(`  Severity: ${entry.impact.severity}`);
    if (entry.impact.affected_components?.length) {
      console.log(`  Components: ${entry.impact.affected_components.join(', ')}`);
    }
    console.log('');
    console.log('👤 Resources:');
    console.log(`  Executor: ${entry.human_resources.executor}`);
    if (entry.human_resources.time_invested) {
      console.log(`  Time: ${entry.human_resources.time_invested} min`);
    }
    console.log('');
    console.log('🎯 Status:');
    console.log(`  Current: ${entry.status.current} (${entry.status.completion_percentage}%)`);
    console.log(`  Maintenance: ${entry.status.maintenance_frequency}`);
    
    if (entry.tags?.length) {
      console.log('');
      console.log('🏷️ Tags:', entry.tags.join(', '));
    }
  }

  printStatistics(stats, quarter) {
    console.log(`📊 Statistics ${quarter ? `for ${quarter}` : '(all time)'}:`);
    console.log('='.repeat(40));
    console.log(`Total entries: ${stats.total_entries || 0}`);
    
    if (stats.avg_time_invested) {
      console.log(`Average time invested: ${Math.round(stats.avg_time_invested)} min`);
    }
    
    if (stats.total_time_saved) {
      console.log(`Total time saved: ${stats.total_time_saved} min/day`);
    }
    
    if (stats.total_cost_impact) {
      console.log(`Total cost impact: $${stats.total_cost_impact}/month`);
    }
  }

  translateProcedureType(type) {
    const translations = {
      seiri: 'Сортування',
      seiton: 'Систематизація',
      seiso: 'Прибирання',
      seiketsu: 'Стандартизація',
      shitsuke: 'Самодисципліна'
    };
    return translations[type] || type;
  }

  showHelp() {
    console.log(`
🔧 5S Changelog CLI

Usage: node cli.js <command> [options]

Commands:
  create [--template TYPE] [--quick]   Create new changelog entry
  update <id> [options]               Update existing entry
  search [--type TYPE] [--severity X] Search entries
  list [--quarter YYYY-QX]           List entries for quarter
  show <id>                          Show entry details
  templates                          List available templates
  stats [--quarter YYYY-QX]          Show statistics
  sync                               Sync filesystem with MongoDB
  help                               Show this help

Templates:
  seiri    - Sorting/removal procedures
  seiton   - Organization procedures  
  seiso    - Cleaning procedures
  seiketsu - Standardization procedures
  shitsuke - Self-discipline procedures

Examples:
  node cli.js create --template seiso --quick
  node cli.js search --type seiri --severity high
  node cli.js list --quarter 2025-Q1
  node cli.js show 20250109-142030-ABC
  node cli.js stats --quarter 2025-Q1

Environment Variables:
  CHANGELOG_BASE_DIR     Base directory for changelog files
  MONGODB_URI           MongoDB connection string
  MONGODB_DATABASE      MongoDB database name
`);
  }
}

// Запуск CLI якщо файл виконується безпосередньо
if (process.argv[1] === __filename) {
  const cli = new FiveSChangelogCLI();
  cli.run();
}

export { FiveSChangelogCLI };
export default FiveSChangelogCLI;
