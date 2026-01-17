/**
 * Seiri (整理) - Сортування/Відбір
 * 
 * Перший крок 5S: визначити необхідне і непотрібне,
 * видалити або відокремити непотрібне.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export function createSeiriTool() {
  return {
    name: 'seiri_sort_analyze',
    description: '整理 (Seiri) - Аналіз та сортування файлів/процесів сервера для визначення необхідного і непотрібного',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: ['files', 'processes', 'packages', 'logs', 'all'],
          description: 'Що аналізувати: файли, процеси, пакети, логи або все'
        },
        path: {
          type: 'string',
          description: 'Шлях для аналізу файлів (опціонально)',
          default: '/root'
        },
        criteria: {
          type: 'object',
          properties: {
            age_days: {
              type: 'number',
              description: 'Файли старше N днів вважати застарілими',
              default: 30
            },
            size_mb: {
              type: 'number', 
              description: 'Мінімальний розмір файлу в МБ для включення',
              default: 10
            },
            include_hidden: {
              type: 'boolean',
              description: 'Включати приховані файли',
              default: false
            }
          }
        }
      },
      required: ['target']
    },

    async execute(args) {
      const { target, path: targetPath = '/root', criteria = {} } = args;
      const {
        age_days = 30,
        size_mb = 10,
        include_hidden = false
      } = criteria;

      const results = {
        timestamp: new Date().toISOString(),
        target,
        analysis: {},
        recommendations: []
      };

      try {
        switch (target) {
          case 'files':
            results.analysis = await analyzeFiles(targetPath, { age_days, size_mb, include_hidden });
            break;
            
          case 'processes':
            results.analysis = await analyzeProcesses();
            break;
            
          case 'packages':
            results.analysis = await analyzePackages();
            break;
            
          case 'logs':
            results.analysis = await analyzeLogs();
            break;
            
          case 'all':
            results.analysis.files = await analyzeFiles(targetPath, { age_days, size_mb, include_hidden });
            results.analysis.processes = await analyzeProcesses();
            results.analysis.packages = await analyzePackages();
            results.analysis.logs = await analyzeLogs();
            break;
            
          default:
            throw new Error(`Unknown target: ${target}`);
        }

        // Генеруємо рекомендації
        results.recommendations = generateSeiriRecommendations(results.analysis);
        
        return results;

      } catch (error) {
        return {
          error: true,
          message: `Seiri analysis failed: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    }
  };
}

async function analyzeFiles(targetPath, options) {
  const { age_days, size_mb, include_hidden } = options;
  const cutoffDate = new Date(Date.now() - (age_days * 24 * 60 * 60 * 1000));
  
  try {
    // Базовий аналіз диску
    const { stdout: dfOutput } = await execAsync('df -h /root');
    
    // Пошук великих файлів
    const hiddenFlag = include_hidden ? '-a' : '';
    const { stdout: largeFiles } = await execAsync(
      `find "${targetPath}" ${hiddenFlag} -type f -size +${size_mb}M -exec ls -lh {} + 2>/dev/null || true`
    );

    // Старі файли
    const { stdout: oldFiles } = await execAsync(
      `find "${targetPath}" ${hiddenFlag} -type f -mtime +${age_days} -exec ls -lh {} + 2>/dev/null || true`
    );

    // Тимчасові файли
    const { stdout: tempFiles } = await execAsync(
      `find "${targetPath}" -name "*.tmp" -o -name "*.temp" -o -name "*~" -o -name "*.bak" 2>/dev/null || true`
    );

    return {
      disk_usage: dfOutput.trim(),
      large_files: {
        count: largeFiles.split('\n').filter(line => line.trim()).length,
        files: largeFiles.trim().split('\n').filter(line => line.trim()).slice(0, 20) // Топ 20
      },
      old_files: {
        count: oldFiles.split('\n').filter(line => line.trim()).length,
        files: oldFiles.trim().split('\n').filter(line => line.trim()).slice(0, 20) // Топ 20
      },
      temp_files: {
        count: tempFiles.split('\n').filter(line => line.trim()).length,
        files: tempFiles.trim().split('\n').filter(line => line.trim())
      },
      criteria_used: options
    };

  } catch (error) {
    throw new Error(`File analysis failed: ${error.message}`);
  }
}

async function analyzeProcesses() {
  try {
    // Поточні процеси
    const { stdout: processesOutput } = await execAsync('ps aux --sort=-%cpu | head -20');
    
    // Сервіси systemd
    const { stdout: servicesOutput } = await execAsync('systemctl list-units --type=service --state=running');
    
    // Мертві процеси
    const { stdout: zombieOutput } = await execAsync('ps aux | grep -E "(defunct|<zombie>)" | grep -v grep || echo "No zombie processes"');

    return {
      top_processes: processesOutput.trim(),
      active_services: servicesOutput.trim(),
      zombie_processes: zombieOutput.trim(),
      process_count: processesOutput.split('\n').length - 1
    };

  } catch (error) {
    throw new Error(`Process analysis failed: ${error.message}`);
  }
}

async function analyzePackages() {
  try {
    // Встановлені пакети
    const { stdout: installedOutput } = await execAsync('dpkg-query -l | wc -l');
    
    // Можливі оновлення
    const { stdout: updatesOutput } = await execAsync('apt list --upgradable 2>/dev/null | wc -l');
    
    // Orphaned пакети
    const { stdout: orphanedOutput } = await execAsync('deborphan 2>/dev/null || echo "deborphan not installed"');
    
    // Autoremovable пакети
    const { stdout: autoremoveOutput } = await execAsync('apt autoremove --dry-run 2>/dev/null || echo "No packages to autoremove"');

    return {
      total_packages: parseInt(installedOutput.trim()) - 1, // -1 для заголовку
      available_updates: parseInt(updatesOutput.trim()) - 1,
      orphaned_packages: orphanedOutput.trim(),
      autoremovable: autoremoveOutput.trim()
    };

  } catch (error) {
    throw new Error(`Package analysis failed: ${error.message}`);
  }
}

async function analyzeLogs() {
  try {
    // Розмір журналів systemd
    const { stdout: journalSize } = await execAsync('journalctl --disk-usage');
    
    // Старі логи
    const { stdout: oldLogs } = await execAsync('find /var/log -name "*.log*" -mtime +7 -exec ls -lh {} + 2>/dev/null || true');
    
    // Ротація логів
    const { stdout: logrotateStatus } = await execAsync('logrotate --debug /etc/logrotate.conf 2>&1 | head -20 || true');

    return {
      journal_disk_usage: journalSize.trim(),
      old_log_files: {
        count: oldLogs.split('\n').filter(line => line.trim()).length,
        files: oldLogs.trim().split('\n').filter(line => line.trim()).slice(0, 10)
      },
      logrotate_info: logrotateStatus.trim()
    };

  } catch (error) {
    throw new Error(`Log analysis failed: ${error.message}`);
  }
}

function generateSeiriRecommendations(analysis) {
  const recommendations = [];

  // Рекомендації на основі аналізу файлів
  if (analysis.files) {
    if (analysis.files.large_files.count > 5) {
      recommendations.push({
        category: 'files',
        priority: 'high',
        action: 'review_large_files',
        description: `Знайдено ${analysis.files.large_files.count} великих файлів. Перевірте їх необхідність.`
      });
    }

    if (analysis.files.temp_files.count > 0) {
      recommendations.push({
        category: 'files',
        priority: 'medium',
        action: 'remove_temp_files',
        description: `Видалити ${analysis.files.temp_files.count} тимчасових файлів для звільнення місця.`
      });
    }

    if (analysis.files.old_files.count > 10) {
      recommendations.push({
        category: 'files',
        priority: 'low',
        action: 'archive_old_files',
        description: `Архівувати або видалити ${analysis.files.old_files.count} старих файлів.`
      });
    }
  }

  // Рекомендації щодо пакетів
  if (analysis.packages) {
    if (analysis.packages.available_updates > 0) {
      recommendations.push({
        category: 'packages',
        priority: 'high',
        action: 'update_packages',
        description: `Доступно ${analysis.packages.available_updates} оновлень пакетів.`
      });
    }

    if (analysis.packages.autoremovable.includes('The following packages will be REMOVED')) {
      recommendations.push({
        category: 'packages',
        priority: 'medium',
        action: 'remove_unused_packages',
        description: 'Видалити невикористовувані пакети для звільнення місця.'
      });
    }
  }

  return recommendations;
}
