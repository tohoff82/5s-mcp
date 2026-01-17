/**
 * Seiso (清掃) - Прибирання/Чистота
 * 
 * Третій крок 5S: очищення робочого місця від непотрібних елементів,
 * підтримка чистоти та порядку в системі.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export function createSeisoTool() {
  return {
    name: 'seiso_clean_system',
    description: '清掃 (Seiso) - Очищення системи від сміття, тимчасових файлів, кешів та оптимізація продуктивності',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['analyze', 'clean', 'deep_clean', 'optimize'],
          description: 'Дія: аналіз забруднення, звичайне прибирання, глибоке прибирання або оптимізація'
        },
        targets: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['cache', 'logs', 'temp', 'packages', 'journal', 'trash', 'all']
          },
          description: 'Що очищати: кеш, логи, тимчасові файли, пакети, журнал, кошик або все'
        },
        aggressive_level: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'Рівень агресивності очищення (1=безпечно, 5=агресивно)',
          default: 2
        },
        dry_run: {
          type: 'boolean',
          description: 'Тільки показати що буде очищено, не виконувати',
          default: true
        },
        preserve_days: {
          type: 'number',
          description: 'Зберегти файли молодше N днів',
          default: 7
        }
      },
      required: ['action', 'targets']
    },

    async execute(args) {
      const { 
        action, 
        targets, 
        aggressive_level = 2, 
        dry_run = true, 
        preserve_days = 7 
      } = args;

      const results = {
        timestamp: new Date().toISOString(),
        action,
        targets,
        aggressive_level,
        dry_run,
        preserve_days,
        analysis: {},
        cleaned_items: [],
        space_freed: 0,
        warnings: [],
        recommendations: []
      };

      try {
        switch (action) {
          case 'analyze':
            results.analysis = await analyzeSeisoTargets(targets);
            break;
            
          case 'clean':
            results.cleaned_items = await performCleaning(targets, aggressive_level, preserve_days, dry_run);
            break;
            
          case 'deep_clean':
            results.cleaned_items = await performDeepCleaning(targets, preserve_days, dry_run);
            break;
            
          case 'optimize':
            results.cleaned_items = await optimizeSystem(targets, dry_run);
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        // Розрахунок звільненого місця
        if (results.cleaned_items.length > 0) {
          results.space_freed = calculateSpaceFreed(results.cleaned_items);
        }

        // Генеруємо рекомендації та попередження
        results.recommendations = generateSeisoRecommendations(results);
        results.warnings = generateSeisoWarnings(aggressive_level, targets);
        
        return results;

      } catch (error) {
        return {
          error: true,
          message: `Seiso operation failed: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    }
  };
}

async function analyzeSeisoTargets(targets) {
  const analysis = {};

  for (const target of targets) {
    try {
      switch (target) {
        case 'cache':
          analysis.cache = await analyzeCacheUsage();
          break;
          
        case 'logs':
          analysis.logs = await analyzeLogUsage();
          break;
          
        case 'temp':
          analysis.temp = await analyzeTempFiles();
          break;
          
        case 'packages':
          analysis.packages = await analyzePackageCache();
          break;
          
        case 'journal':
          analysis.journal = await analyzeJournalUsage();
          break;
          
        case 'trash':
          analysis.trash = await analyzeTrashUsage();
          break;
          
        case 'all':
          analysis.cache = await analyzeCacheUsage();
          analysis.logs = await analyzeLogUsage();
          analysis.temp = await analyzeTempFiles();
          analysis.packages = await analyzePackageCache();
          analysis.journal = await analyzeJournalUsage();
          analysis.trash = await analyzeTrashUsage();
          break;
      }
    } catch (error) {
      analysis[target] = { error: error.message };
    }
  }

  return analysis;
}

async function analyzeCacheUsage() {
  try {
    const caches = [];

    // npm cache
    try {
      const { stdout: npmCache } = await execAsync('npm cache verify 2>/dev/null || echo "npm not available"');
      if (!npmCache.includes('not available')) {
        const { stdout: npmCacheSize } = await execAsync('du -sh ~/.npm 2>/dev/null || echo "0"');
        caches.push({
          type: 'npm',
          location: '~/.npm',
          size: npmCacheSize.trim().split('\t')[0] || '0'
        });
      }
    } catch (e) {}

    // apt cache
    try {
      const { stdout: aptCacheSize } = await execAsync('du -sh /var/cache/apt 2>/dev/null || echo "0"');
      caches.push({
        type: 'apt',
        location: '/var/cache/apt',
        size: aptCacheSize.trim().split('\t')[0] || '0'
      });
    } catch (e) {}

    // pip cache
    try {
      const { stdout: pipCacheSize } = await execAsync('du -sh ~/.cache/pip 2>/dev/null || echo "0"');
      if (!pipCacheSize.includes('No such file')) {
        caches.push({
          type: 'pip',
          location: '~/.cache/pip',
          size: pipCacheSize.trim().split('\t')[0] || '0'
        });
      }
    } catch (e) {}

    return {
      total_caches: caches.length,
      caches: caches,
      estimated_savings: caches.reduce((sum, cache) => {
        const size = cache.size.replace(/[^\d.]/g, '');
        return sum + (parseFloat(size) || 0);
      }, 0)
    };

  } catch (error) {
    throw new Error(`Cache analysis failed: ${error.message}`);
  }
}

async function analyzeLogUsage() {
  try {
    // Системні логи
    const { stdout: varLogSize } = await execAsync('du -sh /var/log 2>/dev/null || echo "0"');
    
    // Старі логи
    const { stdout: oldLogs } = await execAsync('find /var/log -name "*.log.*" -o -name "*.log.gz" | wc -l');
    
    // Великі лог-файли
    const { stdout: largeLogs } = await execAsync('find /var/log -name "*.log" -size +10M -exec ls -lh {} + 2>/dev/null || true');

    return {
      total_size: varLogSize.trim().split('\t')[0],
      old_rotated_logs: parseInt(oldLogs.trim()),
      large_logs: {
        count: largeLogs.split('\n').filter(line => line.trim()).length,
        files: largeLogs.trim().split('\n').filter(line => line.trim()).slice(0, 10)
      },
      cleanup_potential: 'medium'
    };

  } catch (error) {
    throw new Error(`Log analysis failed: ${error.message}`);
  }
}

async function analyzeTempFiles() {
  try {
    // Тимчасові файли в /tmp
    const { stdout: tmpSize } = await execAsync('du -sh /tmp 2>/dev/null || echo "0"');
    const { stdout: tmpFiles } = await execAsync('find /tmp -type f | wc -l');
    
    // Тимчасові файли користувача
    const { stdout: userTempFiles } = await execAsync('find /root -name "*.tmp" -o -name "*.temp" -o -name "*~" 2>/dev/null | wc -l');
    
    // Core dumps
    const { stdout: coreFiles } = await execAsync('find /root -name "core.*" -o -name "core" -type f 2>/dev/null || true');

    return {
      tmp_directory: {
        size: tmpSize.trim().split('\t')[0],
        file_count: parseInt(tmpFiles.trim())
      },
      user_temp_files: parseInt(userTempFiles.trim()),
      core_files: {
        count: coreFiles.split('\n').filter(line => line.trim()).length,
        files: coreFiles.trim().split('\n').filter(line => line.trim())
      },
      cleanup_potential: 'high'
    };

  } catch (error) {
    throw new Error(`Temp files analysis failed: ${error.message}`);
  }
}

async function analyzePackageCache() {
  try {
    // apt cache
    const { stdout: aptCacheSize } = await execAsync('du -sh /var/cache/apt/archives 2>/dev/null || echo "0"');
    const { stdout: aptCacheCount } = await execAsync('ls /var/cache/apt/archives/*.deb 2>/dev/null | wc -l || echo "0"');
    
    // dpkg cache
    const { stdout: dpkgStatus } = await execAsync('dpkg --audit 2>/dev/null || echo "No issues"');

    return {
      apt_cache: {
        size: aptCacheSize.trim().split('\t')[0],
        package_count: parseInt(aptCacheCount.trim())
      },
      dpkg_issues: dpkgStatus.trim() !== 'No issues',
      cleanup_potential: 'medium'
    };

  } catch (error) {
    throw new Error(`Package cache analysis failed: ${error.message}`);
  }
}

async function analyzeJournalUsage() {
  try {
    const { stdout: journalSize } = await execAsync('journalctl --disk-usage 2>/dev/null || echo "0"');
    const { stdout: oldestEntry } = await execAsync('journalctl --list-boots | tail -1 || echo "No boots"');

    return {
      current_usage: journalSize.trim(),
      oldest_boot: oldestEntry.trim(),
      cleanup_potential: 'high',
      recommended_retention: '30 days'
    };

  } catch (error) {
    throw new Error(`Journal analysis failed: ${error.message}`);
  }
}

async function analyzeTrashUsage() {
  try {
    // Системний trash (якщо є)
    const trashLocations = ['/root/.local/share/Trash', '/root/.trash'];
    const trashInfo = [];

    for (const location of trashLocations) {
      try {
        const { stdout: size } = await execAsync(`du -sh "${location}" 2>/dev/null || echo "0"`);
        const { stdout: files } = await execAsync(`find "${location}" -type f 2>/dev/null | wc -l || echo "0"`);
        
        if (size !== '0') {
          trashInfo.push({
            location,
            size: size.trim().split('\t')[0],
            file_count: parseInt(files.trim())
          });
        }
      } catch (e) {}
    }

    return {
      trash_locations: trashInfo,
      total_locations: trashInfo.length,
      cleanup_potential: trashInfo.length > 0 ? 'medium' : 'low'
    };

  } catch (error) {
    throw new Error(`Trash analysis failed: ${error.message}`);
  }
}

async function performCleaning(targets, aggressiveLevel, preserveDays, dryRun) {
  const cleanedItems = [];

  for (const target of targets) {
    try {
      const items = await cleanTarget(target, aggressiveLevel, preserveDays, dryRun);
      cleanedItems.push(...items);
    } catch (error) {
      cleanedItems.push({
        target,
        error: error.message,
        success: false
      });
    }
  }

  return cleanedItems;
}

async function cleanTarget(target, aggressiveLevel, preserveDays, dryRun) {
  const items = [];

  switch (target) {
    case 'cache':
      items.push(...await cleanCache(aggressiveLevel, dryRun));
      break;
      
    case 'logs':
      items.push(...await cleanLogs(preserveDays, dryRun));
      break;
      
    case 'temp':
      items.push(...await cleanTempFiles(preserveDays, dryRun));
      break;
      
    case 'packages':
      items.push(...await cleanPackages(aggressiveLevel, dryRun));
      break;
      
    case 'journal':
      items.push(...await cleanJournal(preserveDays, dryRun));
      break;
      
    case 'trash':
      items.push(...await cleanTrash(dryRun));
      break;
  }

  return items;
}

async function cleanCache(aggressiveLevel, dryRun) {
  const items = [];

  // apt cache
  const aptCleanCommand = aggressiveLevel >= 3 ? 'apt autoclean && apt autoremove' : 'apt clean';
  items.push({
    type: 'apt_cache',
    command: aptCleanCommand,
    description: 'Очищення apt кешу',
    executed: !dryRun
  });

  if (!dryRun && aggressiveLevel >= 2) {
    try {
      await execAsync(aptCleanCommand);
    } catch (error) {
      items[items.length - 1].error = error.message;
    }
  }

  // npm cache
  if (aggressiveLevel >= 2) {
    items.push({
      type: 'npm_cache',
      command: 'npm cache clean --force',
      description: 'Очищення npm кешу',
      executed: !dryRun
    });

    if (!dryRun) {
      try {
        await execAsync('npm cache clean --force 2>/dev/null || true');
      } catch (error) {
        items[items.length - 1].error = error.message;
      }
    }
  }

  return items;
}

async function cleanLogs(preserveDays, dryRun) {
  const items = [];

  // Ротація старих логів
  items.push({
    type: 'old_logs',
    command: `find /var/log -name "*.log.*" -mtime +${preserveDays} -delete`,
    description: `Видалення логів старше ${preserveDays} днів`,
    executed: !dryRun
  });

  if (!dryRun) {
    try {
      await execAsync(`find /var/log -name "*.log.*" -mtime +${preserveDays} -delete 2>/dev/null || true`);
    } catch (error) {
      items[items.length - 1].error = error.message;
    }
  }

  return items;
}

async function cleanTempFiles(preserveDays, dryRun) {
  const items = [];

  // /tmp cleanup
  items.push({
    type: 'tmp_files',
    command: `find /tmp -type f -mtime +${preserveDays} -delete`,
    description: `Очищення /tmp від файлів старше ${preserveDays} днів`,
    executed: !dryRun
  });

  // User temp files
  items.push({
    type: 'user_temp',
    command: `find /root -name "*.tmp" -o -name "*.temp" -o -name "*~" -mtime +1 -delete`,
    description: 'Видалення тимчасових файлів користувача',
    executed: !dryRun
  });

  if (!dryRun) {
    try {
      await execAsync(`find /tmp -type f -mtime +${preserveDays} -delete 2>/dev/null || true`);
      await execAsync(`find /root -name "*.tmp" -o -name "*.temp" -o -name "*~" -mtime +1 -delete 2>/dev/null || true`);
    } catch (error) {
      items.forEach(item => item.error = error.message);
    }
  }

  return items;
}

async function cleanPackages(aggressiveLevel, dryRun) {
  const items = [];

  items.push({
    type: 'autoremove',
    command: 'apt autoremove --purge',
    description: 'Видалення непотрібних пакетів',
    executed: !dryRun
  });

  if (!dryRun) {
    try {
      await execAsync('apt autoremove --purge -y');
    } catch (error) {
      items[items.length - 1].error = error.message;
    }
  }

  return items;
}

async function cleanJournal(preserveDays, dryRun) {
  const items = [];

  items.push({
    type: 'journal',
    command: `journalctl --vacuum-time=${preserveDays}d`,
    description: `Очищення журналу старше ${preserveDays} днів`,
    executed: !dryRun
  });

  if (!dryRun) {
    try {
      await execAsync(`journalctl --vacuum-time=${preserveDays}d`);
    } catch (error) {
      items[items.length - 1].error = error.message;
    }
  }

  return items;
}

async function cleanTrash(dryRun) {
  const items = [];
  const trashLocations = ['/root/.local/share/Trash', '/root/.trash'];

  for (const location of trashLocations) {
    items.push({
      type: 'trash',
      command: `rm -rf "${location}"/*`,
      description: `Очищення ${location}`,
      executed: !dryRun
    });

    if (!dryRun) {
      try {
        await execAsync(`rm -rf "${location}"/* 2>/dev/null || true`);
      } catch (error) {
        items[items.length - 1].error = error.message;
      }
    }
  }

  return items;
}

async function performDeepCleaning(targets, preserveDays, dryRun) {
  // Глибоке очищення з агресивним рівнем 4
  return await performCleaning(targets, 4, preserveDays, dryRun);
}

async function optimizeSystem(targets, dryRun) {
  const items = [];

  // Дефрагментація (для ext4 не потрібна, але можна оптимізувати)
  items.push({
    type: 'system_optimization',
    command: 'sync && echo 3 > /proc/sys/vm/drop_caches',
    description: 'Очищення кешів ядра',
    executed: !dryRun
  });

  if (!dryRun) {
    try {
      await execAsync('sync');
      await execAsync('echo 3 > /proc/sys/vm/drop_caches');
    } catch (error) {
      items[items.length - 1].error = error.message;
    }
  }

  return items;
}

function calculateSpaceFreed(cleanedItems) {
  // Примітивний розрахунок на основі типових розмірів
  let totalMB = 0;

  cleanedItems.forEach(item => {
    if (item.success !== false) {
      switch (item.type) {
        case 'apt_cache': totalMB += 100; break;
        case 'npm_cache': totalMB += 50; break;
        case 'old_logs': totalMB += 20; break;
        case 'tmp_files': totalMB += 30; break;
        case 'journal': totalMB += 200; break;
        case 'trash': totalMB += 10; break;
        default: totalMB += 5;
      }
    }
  });

  return totalMB;
}

function generateSeisoRecommendations(results) {
  const recommendations = [];

  if (results.space_freed > 500) {
    recommendations.push({
      category: 'success',
      priority: 'info',
      message: `Відмінно! Звільнено ${results.space_freed} MB дискового простору.`
    });
  }

  if (results.cleaned_items.some(item => item.error)) {
    recommendations.push({
      category: 'cleanup',
      priority: 'medium',
      message: 'Деякі операції очищення не вдалися. Перевірте дозволи та доступність файлів.'
    });
  }

  return recommendations;
}

function generateSeisoWarnings(aggressiveLevel, targets) {
  const warnings = [];

  if (aggressiveLevel >= 4) {
    warnings.push({
      level: 'high',
      message: 'Високий рівень агресивності може видалити важливі файли. Переконайтеся в наявності backup.'
    });
  }

  if (targets.includes('all')) {
    warnings.push({
      level: 'medium',
      message: 'Очищення всіх категорій може тривати довго та вплинути на продуктивність.'
    });
  }

  return warnings;
}
