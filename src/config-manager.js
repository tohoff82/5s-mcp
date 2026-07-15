#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Менеджер конфігурації для UI-Agent 5S Management System
 * 
 * Забезпечує централізоване управління конфігураціями всіх модулів 5S
 */
export class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config');
    this.defaultConfigs = {
      seiri: {
        categories: {
          temp: {
            paths: ['/tmp', '/var/tmp'],
            maxAge: 7, // днів
            exclude: ['*.sock', '*.pid']
          },
          logs: {
            paths: ['/var/log'],
            maxAge: 30,
            maxSize: '100M',
            exclude: ['audit.log', 'auth.log']
          },
          cache: {
            paths: ['/var/cache', '~/.cache'],
            maxAge: 14,
            exclude: ['package-cache']
          }
        },
        safety: {
          dryRun: true,
          backupBeforeDelete: true,
          confirmDeletion: true
        }
      },
      
      seiton: {
        organization: {
          standardDirs: [
            '/etc', '/var', '/opt', '/home', 
            '/usr/local', '/srv', '/media'
          ],
          indexPaths: [
            '/etc', '/opt', '/usr/local/etc'
          ],
          archivePath: '/archive',
          tempPath: '/tmp/seiton-work'
        },
        rules: {
          categorizeByType: true,
          categorizeByDate: true, 
          createIndex: true,
          maintainStructure: true
        }
      },
      
      seiso: {
        cleanup: {
          levels: {
            light: {
              targets: ['temp', 'cache'],
              aggressiveness: 'low'
            },
            standard: {
              targets: ['temp', 'cache', 'logs'],
              aggressiveness: 'medium'
            },
            deep: {
              targets: ['temp', 'cache', 'logs', 'old-packages'],
              aggressiveness: 'high'
            }
          }
        },
        monitoring: {
          diskThreshold: 80, // відсотків
          memoryThreshold: 85,
          loadThreshold: 2.0,
          alertEmail: null
        }
      },
      
      seiketsu: {
        standards: {
          filePermissions: {
            configs: '644',
            executables: '755', 
            logs: '644',
            secrets: '600'
          },
          directoryStructure: {
            enforceStandard: true,
            createMissing: true,
            reportDeviations: true
          },
          namingConventions: {
            enforceKebabCase: false,
            allowUnderscore: true,
            maxLength: 255
          }
        },
        compliance: {
          checkInterval: 24, // годин
          reportFormat: 'json',
          autoFix: false
        }
      },
      
      shitsuke: {
        audit: {
          schedule: '0 23 * * 0', // щонеділі о 23:00
          retention: 52, // тижнів
          reportEmail: null,
          autoRemediation: false
        },
        metrics: {
          trackTrends: true,
          alertThreshold: 70, // бал нижче якого тригериться alert
          historicalDepth: 12 // місяців
        },
        enforcement: {
          strictMode: false,
          autoCorrect: false,
          escalationRules: []
        }
      }
    };
  }

  /**
   * Ініціалізація конфігураційних файлів
   */
  async initialize() {
    try {
      // Створюємо директорію конфігурацій
      await fs.mkdir(this.configPath, { recursive: true });
      
      // Створюємо файли конфігурацій для кожного модуля
      for (const [module, config] of Object.entries(this.defaultConfigs)) {
        const configFile = path.join(this.configPath, `${module}.json`);
        
        // Перевіряємо чи існує файл
        try {
          await fs.access(configFile);
          console.log(`Config for ${module} already exists`);
        } catch {
          // Файл не існує, створюємо
          await fs.writeFile(configFile, JSON.stringify(config, null, 2));
          console.log(`Created config for ${module}`);
        }
      }
      
      // Створюємо головний конфігураційний файл
      const mainConfig = {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        debug: process.env.DEBUG === 'true',
        modules: Object.keys(this.defaultConfigs),
        paths: {
          logs: '/var/log/5s',
          reports: '/tmp/5s-reports',
          backup: '/backup/5s',
          temp: '/tmp/5s-work'
        },
        scheduling: {
          enabled: true,
          timezone: 'UTC',
          concurrentJobs: 2
        }
      };
      
      const mainConfigFile = path.join(this.configPath, 'main.json');
      try {
        await fs.access(mainConfigFile);
      } catch {
        await fs.writeFile(mainConfigFile, JSON.stringify(mainConfig, null, 2));
        console.log('Created main configuration file');
      }
      
      return {
        success: true,
        message: 'Configuration initialized successfully',
        configPath: this.configPath
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Завантаження конфігурації модуля
   */
  async loadConfig(moduleName) {
    this.assertKnownModule(moduleName);
    try {
      const configFile = path.join(this.configPath, `${moduleName}.json`);
      const configData = await fs.readFile(configFile, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn(`Failed to load config for ${moduleName}, using defaults`);
      return this.defaultConfigs[moduleName] || {};
    }
  }

  /**
   * Збереження конфігурації модуля
   */
  async saveConfig(moduleName, config) {
    this.assertKnownModule(moduleName);
    try {
      const configFile = path.join(this.configPath, `${moduleName}.json`);
      
      // Створюємо backup існуючої конфігурації
      try {
        const backupFile = `${configFile}.backup.${Date.now()}`;
        await fs.copyFile(configFile, backupFile);
      } catch {
        // Backup не критичний
      }
      
      await fs.writeFile(configFile, JSON.stringify(config, null, 2));
      
      return {
        success: true,
        message: `Configuration for ${moduleName} saved successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Валідація конфігурації
   */
  validateConfig(moduleName, config) {
    this.assertKnownModule(moduleName);
    const errors = [];
    const warnings = [];
    
    // Базова валідація структури
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be a valid object');
      return { valid: false, errors, warnings };
    }
    
    // Специфічна валідація для кожного модуля
    switch (moduleName) {
      case 'seiri':
        if (!config.categories) {
          errors.push('Missing categories configuration');
        }
        if (!config.safety) {
          warnings.push('Safety configuration recommended');
        }
        break;
        
      case 'seiton':
        if (!config.organization || !config.organization.standardDirs) {
          errors.push('Missing standard directories configuration');
        }
        break;
        
      case 'seiso':
        if (!config.cleanup || !config.cleanup.levels) {
          errors.push('Missing cleanup levels configuration');
        }
        break;
        
      case 'seiketsu':
        if (!config.standards) {
          errors.push('Missing standards configuration');
        }
        break;
        
      case 'shitsuke':
        if (!config.audit) {
          errors.push('Missing audit configuration');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Отримання всіх конфігурацій
   */
  async getAllConfigs() {
    const configs = {};
    
    for (const moduleName of Object.keys(this.defaultConfigs)) {
      configs[moduleName] = await this.loadConfig(moduleName);
    }
    
    return configs;
  }

  /**
   * Перевірка цілісності конфігурацій
   */
  async checkIntegrity() {
    const results = {
      valid: true,
      modules: {},
      errors: [],
      warnings: []
    };
    
    for (const moduleName of Object.keys(this.defaultConfigs)) {
      try {
        const config = await this.loadConfig(moduleName);
        const validation = this.validateConfig(moduleName, config);
        
        results.modules[moduleName] = validation;
        
        if (!validation.valid) {
          results.valid = false;
          results.errors.push(...validation.errors.map(e => `${moduleName}: ${e}`));
        }
        
        results.warnings.push(...validation.warnings.map(w => `${moduleName}: ${w}`));
        
      } catch (error) {
        results.valid = false;
        results.errors.push(`${moduleName}: Failed to load configuration - ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Експорт конфігурацій
   */
  async exportConfigs(outputPath) {
    try {
      const configs = await this.getAllConfigs();
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        configs
      };
      
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      
      return {
        success: true,
        message: `Configurations exported to ${outputPath}`,
        modules: Object.keys(configs).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Імпорт конфігурацій
   */
  async importConfigs(inputPath) {
    try {
      const importData = JSON.parse(await fs.readFile(inputPath, 'utf-8'));
      
      if (!importData.configs) {
        throw new Error('Invalid import file format');
      }
      
      const results = {
        success: true,
        imported: 0,
        errors: []
      };
      
      for (const [moduleName, config] of Object.entries(importData.configs)) {
        try {
          const validation = this.validateConfig(moduleName, config);
          
          if (validation.valid) {
            const saved = await this.saveConfig(moduleName, config);
            if (saved.success) {
              results.imported++;
            } else {
              results.errors.push(`${moduleName}: ${saved.error}`);
            }
          } else {
            results.errors.push(`${moduleName}: ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          results.errors.push(`${moduleName}: ${error.message}`);
        }
      }
      
      if (results.errors.length > 0) {
        results.success = results.imported > 0;
      }
      
      return results;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  assertKnownModule(moduleName) {
    const knownModules = new Set([...Object.keys(this.defaultConfigs), 'main']);
    if (typeof moduleName !== 'string' || !knownModules.has(moduleName)) {
      throw new Error(`Unknown config module: ${moduleName}`);
    }
  }

  /**
   * Отримання допомоги
   */
  getHelp() {
    return `
🔧 UI-Agent 5S Configuration Manager

Команди:
  init                    - Ініціалізувати конфігураційні файли
  validate [module]       - Валідувати конфігурацію модуля (або всіх)
  export <file>          - Експортувати конфігурації
  import <file>          - Імпортувати конфігурації
  show [module]          - Показати конфігурацію модуля (або всіх)
  integrity              - Перевірити цілісність всіх конфігурацій

Приклади:
  node src/config-manager.js init
  node src/config-manager.js validate seiri
  node src/config-manager.js export /tmp/5s-config-backup.json
  node src/config-manager.js show shitsuke

Модулі: ${Object.keys(this.defaultConfigs).join(', ')}
`;
  }
}

// CLI інтерфейс
async function main() {
  const configManager = new ConfigManager();
  const command = process.argv[2];
  const arg = process.argv[3];
  
  try {
    switch (command) {
      case 'init':
        const initResult = await configManager.initialize();
        console.log(JSON.stringify(initResult, null, 2));
        break;
        
      case 'validate':
        if (arg) {
          const config = await configManager.loadConfig(arg);
          const validation = configManager.validateConfig(arg, config);
          console.log(JSON.stringify(validation, null, 2));
        } else {
          const integrity = await configManager.checkIntegrity();
          console.log(JSON.stringify(integrity, null, 2));
        }
        break;
        
      case 'export':
        if (!arg) {
          console.error('Error: Output file path required');
          process.exit(1);
        }
        const exportResult = await configManager.exportConfigs(arg);
        console.log(JSON.stringify(exportResult, null, 2));
        break;
        
      case 'import':
        if (!arg) {
          console.error('Error: Input file path required');
          process.exit(1);
        }
        const importResult = await configManager.importConfigs(arg);
        console.log(JSON.stringify(importResult, null, 2));
        break;
        
      case 'show':
        if (arg) {
          const config = await configManager.loadConfig(arg);
          console.log(JSON.stringify(config, null, 2));
        } else {
          const allConfigs = await configManager.getAllConfigs();
          console.log(JSON.stringify(allConfigs, null, 2));
        }
        break;
        
      case 'integrity':
        const integrity = await configManager.checkIntegrity();
        console.log(JSON.stringify(integrity, null, 2));
        break;
        
      case 'help':
      case '--help':
      case '-h':
        console.log(configManager.getHelp());
        break;
        
      default:
        console.log(configManager.getHelp());
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Запуск тільки якщо файл виконується напряму
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
