/**
 * Seiri (整理) - Сортування/Відбір
 * 
 * Перший крок 5S: визначити необхідне і непотрібне,
 * видалити або відокремити непотрібне.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { SafetyPolicyManager } from '../../safety-policy.js';
import { journalctlStatus, systemdStatus } from '../../platform-capabilities.js';

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
          default: '.'
        },
        criteria: {
          type: 'object',
          properties: {
            age_days: {
              type: 'integer',
              description: 'Файли старше N днів вважати застарілими',
              default: 30,
              minimum: 0,
              maximum: 36500
            },
            size_mb: {
              type: 'integer',
              description: 'Мінімальний розмір файлу в МБ для включення',
              default: 10,
              minimum: 0,
              maximum: 1000000
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
      const { target, path: targetPath = '.', criteria = {} } = args;
      const {
        age_days = 30,
        size_mb = 10,
        include_hidden = false
      } = criteria;
      const normalizedCriteria = {
        age_days: boundedInteger(age_days, 'criteria.age_days', 0, 36_500),
        size_mb: boundedInteger(size_mb, 'criteria.size_mb', 0, 1_000_000),
        include_hidden: include_hidden === true
      };

      const results = {
        timestamp: new Date().toISOString(),
        target,
        analysis: {},
        recommendations: []
      };

      try {
        switch (target) {
          case 'files':
            results.analysis = await analyzeFiles(targetPath, normalizedCriteria);
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
            results.analysis.files = await analyzeFiles(targetPath, normalizedCriteria);
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
  
  try {
    // Базовий аналіз диску
    const { stdout: dfOutput } = await execAsync(`df -h ${shellQuote(targetPath)} 2>/dev/null || df -h /`);
    
    const largeFiles = await collectFindFiles(targetPath, `-type f -size +${size_mb}M`, include_hidden);
    const oldFiles = await collectFindFiles(targetPath, `-type f -mtime +${age_days}`, include_hidden);
    const tempFiles = await collectFindFiles(targetPath, `\\( -name "*.tmp" -o -name "*.temp" -o -name "*~" -o -name "*.bak" \\) -type f`, include_hidden);
    const classification = await classifySeiriFiles([...largeFiles, ...oldFiles, ...tempFiles], { age_days, size_mb });

    return {
      disk_usage: dfOutput.trim(),
      large_files: {
        count: largeFiles.length,
        files: largeFiles.slice(0, 20)
      },
      old_files: {
        count: oldFiles.length,
        files: oldFiles.slice(0, 20)
      },
      temp_files: {
        count: tempFiles.length,
        files: tempFiles
      },
      classification,
      criteria_used: options
    };

  } catch (error) {
    throw new Error(`File analysis failed: ${error.message}`);
  }
}

async function collectFindFiles(targetPath, predicate, includeHidden) {
  const hiddenFilter = includeHidden ? '' : ' ! -path "*/.*"';
  const command = `find ${shellQuote(targetPath)} ${hiddenFilter} ${predicate} -printf "%p\\t%s\\t%T@\\t%u\\t%g\\t%i\\n" 2>/dev/null | head -200 || true`;
  const { stdout } = await execAsync(command);
  return stdout
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [filePath, size, mtime, owner, group, inode] = line.split('\t');
      return {
        path: filePath,
        size_bytes: Number(size) || 0,
        mtime_epoch: Number(mtime) || null,
        owner,
        group,
        inode
      };
    });
}

function boundedInteger(value, label, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return number;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

async function classifySeiriFiles(files, criteria) {
  const policy = new SafetyPolicyManager();
  const unique = new Map();
  for (const file of files) unique.set(file.path, file);

  const buckets = {
    necessary: [],
    conditional: [],
    delete_candidate: [],
    forbidden: []
  };

  for (const file of unique.values()) {
    const verdict = await policy.evaluateOperation({
      command: `manifest-remove ${file.path}`,
      paths: [file.path],
      destructive: true
    });

    const enriched = {
      ...file,
      policy_risk: verdict.risk,
      policy_reasons: verdict.reasons
    };

    if (!verdict.allowed || verdict.risk === 'critical') {
      buckets.forbidden.push({ ...enriched, classification_reason: 'Blocked by safety policy' });
    } else if (isServiceOrSourceArtifact(file.path)) {
      buckets.conditional.push({ ...enriched, classification_reason: 'Looks service/code related; requires owner review' });
    } else if (isTempLike(file.path) || isOldEnough(file.mtime_epoch, criteria.age_days)) {
      buckets.delete_candidate.push({ ...enriched, classification_reason: 'Temp/old artifact allowed by policy, still requires Seiso plan' });
    } else {
      buckets.necessary.push({ ...enriched, classification_reason: 'No cleanup signal beyond size/scan match' });
    }
  }

  return {
    counts: Object.fromEntries(Object.entries(buckets).map(([key, value]) => [key, value.length])),
    buckets
  };
}

function isTempLike(filePath) {
  return /\.(tmp|temp|bak)$|~$/.test(filePath);
}

function isOldEnough(mtimeEpoch, ageDays) {
  if (!mtimeEpoch) return false;
  return Date.now() / 1000 - mtimeEpoch > ageDays * 24 * 60 * 60;
}

function isServiceOrSourceArtifact(filePath) {
  return /\/(src|services|packages|node_modules|\.git|systemd|nginx|ssh)\//.test(filePath)
    || /\.(js|ts|py|sh|service|conf|env|key|pem)$/.test(filePath);
}

async function analyzeProcesses() {
  try {
    // Поточні процеси
    const { stdout: processesOutput } = await execAsync('{ ps aux --sort=-%cpu 2>/dev/null || ps aux; } | head -20');
    
    // Сервіси systemd
    const services = await systemdStatus(['list-units', '--type=service', '--state=running', '--no-pager']);
    
    // Мертві процеси
    const { stdout: zombieOutput } = await execAsync('ps aux | grep -E "(defunct|<zombie>)" | grep -v grep || echo "No zombie processes"');

    return {
      top_processes: processesOutput.trim(),
      active_services: services.status === 'ok' ? services.stdout.trim() : null,
      active_services_status: services.status,
      active_services_note: services.status === 'unsupported' ? services.reason : undefined,
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
    const journalSize = await journalctlStatus(['--disk-usage']);
    
    // Старі логи
    const { stdout: oldLogs } = await execAsync('find /var/log -name "*.log*" -mtime +7 -exec ls -lh {} + 2>/dev/null || true');
    
    // Ротація логів
    const { stdout: logrotateStatus } = await execAsync('logrotate --debug /etc/logrotate.conf 2>&1 | head -20 || true');

    return {
      journal_disk_usage: journalSize.status === 'ok' ? journalSize.stdout.trim() : null,
      journal_status: journalSize.status,
      journal_note: journalSize.status === 'unsupported' ? journalSize.reason : undefined,
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
