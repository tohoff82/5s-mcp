#!/usr/bin/env node

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { memorySnapshot, systemdStatus } from '../../platform-capabilities.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Shitsuke (躾) - Дисципліна/Дотримання
 * 
 * Цей модуль забезпечує:
 * 1. Щотижневий аудит виконання всіх 5S процедур
 * 2. Моніторинг дотримання стандартів
 * 3. Відстеження показників ефективності
 * 4. Систему звітності та аналітики
 * 5. Механізми безперервного покращення
 */

export class ShitsukeManager {
  constructor(options = {}) {
    this.auditLogPath = options.auditLogPath || process.env.FIVE_S_AUDIT_LOG || '/tmp/5s-audit.log';
    this.metricsPath = options.metricsPath || process.env.FIVE_S_METRICS_PATH || '/tmp/5s-metrics.json';
    this.compliancePath = options.compliancePath || process.env.FIVE_S_COMPLIANCE_PATH || '/tmp/5s-compliance.json';
    this.reportsPath = options.reportsPath || process.env.FIVE_S_REPORTS_DIR || '/tmp/5s-reports';
    this.scheduleTasksPath = options.scheduleTasksPath || '/etc/cron.d/5s-methodology';
  }

  /**
   * Проведення щотижневого аудиту 5S
   */
  async conductWeeklyAudit() {
    const timestamp = new Date().toISOString();
    const auditId = crypto.randomUUID();
    
    const auditResults = {
      id: auditId,
      timestamp,
      seiri: await this.auditSeiri(),
      seiton: await this.auditSeiton(),
      seiso: await this.auditSeiso(),
      seiketsu: await this.auditSeiketsu(),
      overallScore: 0,
      recommendations: [],
      nextAuditDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Підрахунок загального балу
    const scores = [auditResults.seiri.score, auditResults.seiton.score, 
                   auditResults.seiso.score, auditResults.seiketsu.score];
    auditResults.overallScore = Math.round(scores.reduce((a, b) => a + b) / scores.length);

    // Генерація рекомендацій
    auditResults.recommendations = this.generateRecommendations(auditResults);

    // Збереження результатів
    await this.saveAuditResults(auditResults);
    
    // Логування аудиту
    await this.logAuditEvent(`WEEKLY_AUDIT_COMPLETED: Score ${auditResults.overallScore}/100`);

    return auditResults;
  }

  /**
   * Аудит модуля Seiri (сортування)
   */
  async auditSeiri() {
    const results = {
      module: 'Seiri (整理)',
      score: 0,
      checks: [],
      issues: []
    };

    // Перевірка наявності непотрібних файлів
    try {
      const { stdout: tempFiles } = await execAsync('find /tmp -type f -mtime +7 | wc -l');
      const tempCount = parseInt(tempFiles.trim());
      
      results.checks.push({
        name: 'Старі тимчасові файли',
        status: tempCount < 50 ? 'PASS' : 'FAIL',
        value: tempCount,
        threshold: 50
      });
      
      if (tempCount >= 50) {
        results.issues.push(`Знайдено ${tempCount} старих тимчасових файлів`);
      }
    } catch (error) {
      results.checks.push({
        name: 'Старі тимчасові файли', 
        status: 'ERROR',
        error: error.message
      });
    }

    // Перевірка логів старше 30 днів
    try {
      const { stdout: oldLogs } = await execAsync('find /var/log -name "*.log*" -mtime +30 | wc -l');
      const oldLogsCount = parseInt(oldLogs.trim());
      
      results.checks.push({
        name: 'Старі лог-файли',
        status: oldLogsCount < 20 ? 'PASS' : 'FAIL', 
        value: oldLogsCount,
        threshold: 20
      });
      
      if (oldLogsCount >= 20) {
        results.issues.push(`Знайдено ${oldLogsCount} старих лог-файлів`);
      }
    } catch (error) {
      results.checks.push({
        name: 'Старі лог-файли',
        status: 'ERROR', 
        error: error.message
      });
    }

    // Підрахунок загального балу
    const passedChecks = results.checks.filter(c => c.status === 'PASS').length;
    const totalChecks = results.checks.length;
    results.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    return results;
  }

  /**
   * Аудит модуля Seiton (систематизація)
   */
  async auditSeiton() {
    const results = {
      module: 'Seiton (整頓)',
      score: 0,
      checks: [],
      issues: []
    };

    // Перевірка структури директорій
    const criticalDirs = ['/etc', '/var/log', '/opt', '/home'];
    
    for (const dir of criticalDirs) {
      try {
        await fs.access(dir);
        results.checks.push({
          name: `Структура ${dir}`,
          status: 'PASS',
          message: 'Директорія існує та доступна'
        });
      } catch (error) {
        results.checks.push({
          name: `Структура ${dir}`,
          status: 'FAIL',
          error: error.message
        });
        results.issues.push(`Проблема з директорією ${dir}: ${error.message}`);
      }
    }

    // Перевірка наявності стандартних конфігурацій
    const configFiles = ['/etc/fstab', '/etc/hosts', '/etc/passwd'];
    
    for (const file of configFiles) {
      try {
        await fs.access(file);
        results.checks.push({
          name: `Конфігурація ${file}`,
          status: 'PASS'
        });
      } catch (error) {
        results.checks.push({
          name: `Конфігурація ${file}`,
          status: 'FAIL',
          error: error.message
        });
        results.issues.push(`Відсутній файл конфігурації: ${file}`);
      }
    }

    // Підрахунок балу
    const passedChecks = results.checks.filter(c => c.status === 'PASS').length;
    const totalChecks = results.checks.length;
    results.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    return results;
  }

  /**
   * Аудит модуля Seiso (прибирання)
   */
  async auditSeiso() {
    const results = {
      module: 'Seiso (清掃)',
      score: 0, 
      checks: [],
      issues: []
    };

    // Перевірка використання дискового простору
    try {
      const { stdout: diskUsage } = await execAsync("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
      const usagePercent = parseInt(diskUsage.trim());
      
      results.checks.push({
        name: 'Використання дискового простору',
        status: usagePercent < 80 ? 'PASS' : 'FAIL',
        value: `${usagePercent}%`,
        threshold: '80%'
      });
      
      if (usagePercent >= 80) {
        results.issues.push(`Високе використання диску: ${usagePercent}%`);
      }
    } catch (error) {
      results.checks.push({
        name: 'Використання дискового простору',
        status: 'ERROR',
        error: error.message
      });
    }

    // Перевірка розміру логів
    try {
      const { stdout: logSize } = await execAsync('du -sh /var/log 2>/dev/null | cut -f1');
      results.checks.push({
        name: 'Розмір логів',
        status: 'INFO',
        value: logSize.trim()
      });
    } catch (error) {
      results.checks.push({
        name: 'Розмір логів',
        status: 'ERROR',
        error: error.message
      });
    }

    // Перевірка доступної оперативної пам'яті
    try {
      const memory = await memorySnapshot();
      const memUsage = parseMemoryPercent(memory);
      
      results.checks.push({
        name: 'Використання RAM',
        status: memUsage == null ? 'UNSUPPORTED' : memUsage < 85 ? 'PASS' : 'FAIL',
        value: memUsage == null ? memory.status : `${memUsage.toFixed(1)}%`,
        threshold: '85%',
        note: memUsage == null ? memory.note || memory.reason : undefined
      });
      
      if (memUsage != null && memUsage >= 85) {
        results.issues.push(`Високе використання RAM: ${memUsage.toFixed(1)}%`);
      }
    } catch (error) {
      results.checks.push({
        name: 'Використання RAM',
        status: 'ERROR', 
        error: error.message
      });
    }

    // Підрахунок балу
    const passedChecks = results.checks.filter(c => c.status === 'PASS').length;
    const totalChecks = results.checks.filter(c => c.status !== 'INFO').length;
    results.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    return results;
  }

  /**
   * Аудит модуля Seiketsu (стандартизація)
   */
  async auditSeiketsu() {
    const results = {
      module: 'Seiketsu (清潔)',
      score: 0,
      checks: [],
      issues: []
    };

    // Перевірка активних сервісів
    try {
      const services = await systemdStatus(['list-units', '--type=service', '--state=active', '--no-pager']);
      const activeServices = services.status === 'ok'
        ? services.stdout.split('\n').filter(line => line.includes('.service')).length
        : null;
      
      results.checks.push({
        name: 'Активні сервіси',
        status: services.status === 'unsupported' ? 'UNSUPPORTED' : 'INFO',
        value: activeServices,
        message: 'Кількість активних системних сервісів',
        note: services.status === 'unsupported' ? services.reason : undefined
      });
    } catch (error) {
      results.checks.push({
        name: 'Активні сервіси',
        status: 'ERROR',
        error: error.message
      });
    }

    // Перевірка оновлень безпеки
    try {
      const { stdout: updates } = await execAsync('apt list --upgradable 2>/dev/null | grep -c security || echo 0');
      const securityUpdates = parseInt(updates.trim());
      
      results.checks.push({
        name: 'Оновлення безпеки',
        status: securityUpdates === 0 ? 'PASS' : 'WARN',
        value: securityUpdates,
        message: securityUpdates > 0 ? 'Доступні оновлення безпеки' : 'Оновлення безпеки відсутні'
      });
      
      if (securityUpdates > 0) {
        results.issues.push(`Доступно ${securityUpdates} оновлень безпеки`);
      }
    } catch (error) {
      results.checks.push({
        name: 'Оновлення безпеки',
        status: 'ERROR',
        error: error.message
      });
    }

    // Перевірка cron задач
    try {
      const { stdout: cronJobs } = await execAsync('crontab -l 2>/dev/null | grep -v "^#" | wc -l || echo 0');
      const jobsCount = parseInt(cronJobs.trim());
      
      results.checks.push({
        name: 'Cron задачі',
        status: 'INFO',
        value: jobsCount,
        message: 'Кількість активних cron задач'
      });
    } catch (error) {
      results.checks.push({
        name: 'Cron задачі',
        status: 'ERROR',
        error: error.message
      });
    }

    // Підрахунок балу (більше інформаційний модуль)
    const passedChecks = results.checks.filter(c => c.status === 'PASS').length;
    const totalChecks = results.checks.filter(c => ['PASS', 'FAIL', 'WARN'].includes(c.status)).length;
    results.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 85; // Базовий бал

    return results;
  }

  /**
   * Генерація рекомендацій на основі результатів аудиту
   */
  generateRecommendations(auditResults) {
    const recommendations = [];
    
    // Аналізуємо кожен модуль
    [auditResults.seiri, auditResults.seiton, auditResults.seiso, auditResults.seiketsu].forEach(module => {
      if (module.issues && module.issues.length > 0) {
        module.issues.forEach(issue => {
          if (issue.includes('тимчасових файлів')) {
            recommendations.push({
              priority: 'HIGH',
              module: module.module,
              action: 'Створити staged Seiso план для старих тимчасових файлів',
              command: 'seiso_clean_system action=plan targets=["temp"] preserve_days=7'
            });
          }
          
          if (issue.includes('лог-файлів')) {
            recommendations.push({
              priority: 'MEDIUM',
              module: module.module, 
              action: 'Архівувати або видалити старі логи',
              command: 'seiso_clean_system action=plan targets=["logs"] preserve_days=30'
            });
          }
          
          if (issue.includes('використання диску')) {
            recommendations.push({
              priority: 'HIGH',
              module: module.module,
              action: 'Негайно звільнити дисковий простір',
              command: 'seiso_clean_system action=plan targets=["all"] preserve_days=7'
            });
          }
          
          if (issue.includes('використання RAM')) {
            recommendations.push({
              priority: 'HIGH', 
              module: module.module,
              action: 'Перевірити процеси що використовують багато пам\'яті',
              command: 'ps aux --sort=-%mem | head -10'
            });
          }
        });
      }
    });

    // Додаємо загальні рекомендації на основі балу
    if (auditResults.overallScore < 70) {
      recommendations.push({
        priority: 'CRITICAL',
        module: 'Overall',
        action: 'Негайно покращити загальний стан системи',
        command: 'Запустити повний цикл 5S процедур'
      });
    } else if (auditResults.overallScore < 85) {
      recommendations.push({
        priority: 'MEDIUM',
        module: 'Overall', 
        action: 'Покращити окремі аспекти системи',
        command: 'Фокус на модулях з найнижчими балами'
      });
    }

    return recommendations;
  }

  /**
   * Збереження результатів аудиту
   */
  async saveAuditResults(results) {
    try {
      // Створюємо директорію звітів якщо її немає
      await fs.mkdir(this.reportsPath, { recursive: true });
      
      const reportFile = path.join(this.reportsPath, `audit-${results.id}.json`);
      await fs.writeFile(reportFile, JSON.stringify(results, null, 2));
      
      // Зберігаємо в загальному файлі метрик
      await this.updateMetricsHistory(results);
      
    } catch (error) {
      console.error('Failed to save audit results:', error);
      throw error;
    }
  }

  /**
   * Оновлення історії метрик
   */
  async updateMetricsHistory(auditResults) {
    try {
      let history = { audits: [] };
      
      // Завантажуємо існуючу історію
      try {
        const existingData = await fs.readFile(this.metricsPath, 'utf-8');
        history = JSON.parse(existingData);
      } catch (error) {
        // Файл не існує, створюємо новий
      }
      
      // Додаємо новий аудит
      history.audits.push({
        id: auditResults.id,
        timestamp: auditResults.timestamp,
        overallScore: auditResults.overallScore,
        scores: {
          seiri: auditResults.seiri.score,
          seiton: auditResults.seiton.score,
          seiso: auditResults.seiso.score,
          seiketsu: auditResults.seiketsu.score
        },
        issuesCount: auditResults.seiri.issues.length + 
                    auditResults.seiton.issues.length +
                    auditResults.seiso.issues.length + 
                    auditResults.seiketsu.issues.length,
        recommendationsCount: auditResults.recommendations.length
      });
      
      // Зберігаємо тільки останні 52 аудити (рік щотижневих аудитів)
      if (history.audits.length > 52) {
        history.audits = history.audits.slice(-52);
      }
      
      await fs.mkdir(path.dirname(this.metricsPath), { recursive: true });
      await fs.writeFile(this.metricsPath, JSON.stringify(history, null, 2));
      
    } catch (error) {
      console.error('Failed to update metrics history:', error);
    }
  }

  /**
   * Логування подій аудиту
   */
  async logAuditEvent(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\\n`;
    
    try {
      await fs.appendFile(this.auditLogPath, logEntry);
    } catch (error) {
      const fallbackPath = path.join('/tmp', '5s-audit.log');
      try {
        await fs.appendFile(fallbackPath, logEntry);
      } catch {
        // Health checks must not fail because audit logging is unavailable.
      }
    }
  }

  /**
   * Отримання статистики ефективності
   */
  async getPerformanceMetrics() {
    try {
      const data = await fs.readFile(this.metricsPath, 'utf-8');
      const history = JSON.parse(data);
      
      if (!history.audits || history.audits.length === 0) {
        return {
          message: 'Недостатньо даних для аналізу',
          auditsCount: 0
        };
      }
      
      const audits = history.audits;
      const latest = audits[audits.length - 1];
      const previous = audits.length > 1 ? audits[audits.length - 2] : null;
      
      // Розрахунки трендів
      const trend = previous ? {
        overall: latest.overallScore - previous.overallScore,
        seiri: latest.scores.seiri - previous.scores.seiri,
        seiton: latest.scores.seiton - previous.scores.seiton,
        seiso: latest.scores.seiso - previous.scores.seiso,
        seiketsu: latest.scores.seiketsu - previous.scores.seiketsu
      } : null;
      
      // Середні показники за останні 4 тижні
      const recentAudits = audits.slice(-4);
      const averages = {
        overall: Math.round(recentAudits.reduce((sum, audit) => sum + audit.overallScore, 0) / recentAudits.length),
        seiri: Math.round(recentAudits.reduce((sum, audit) => sum + audit.scores.seiri, 0) / recentAudits.length),
        seiton: Math.round(recentAudits.reduce((sum, audit) => sum + audit.scores.seiton, 0) / recentAudits.length),
        seiso: Math.round(recentAudits.reduce((sum, audit) => sum + audit.scores.seiso, 0) / recentAudits.length),
        seiketsu: Math.round(recentAudits.reduce((sum, audit) => sum + audit.scores.seiketsu, 0) / recentAudits.length)
      };
      
      return {
        current: latest,
        trend,
        averages,
        totalAudits: audits.length,
        period: `${audits.length} тижнів`,
        improvement: trend ? trend.overall >= 0 : null
      };
      
    } catch (error) {
      return {
        message: 'Недостатньо даних для аналізу',
        detail: error.message,
        auditsCount: 0
      };
    }
  }

  /**
   * Налаштування автоматизованих задач для дисципліни
   */
  async setupScheduledTasks() {
    const projectDir = this.projectDir || path.resolve(__dirname, '../../..');
    const nodeBin = process.execPath || 'node';
    const cronContent = `# 5S Methodology Automated Tasks
# Managed by legacy 5s-shitsuke schedule action. Prefer 5s_cron_manager for full control.
# Weekly audit every Sunday at 23:00
0 23 * * 0 root cd ${shellQuote(projectDir)} && ${shellQuote(nodeBin)} src/mcp-server/tools/shitsuke.js audit >> /var/log/5s-audit.log 2>&1

# Daily quick health check at 06:00
0 6 * * * root cd ${shellQuote(projectDir)} && ${shellQuote(nodeBin)} src/mcp-server/tools/shitsuke.js health >> /var/log/5s-daily.log 2>&1
`;

    return {
      success: true,
      deprecated: true,
      message: 'Legacy schedule action is read-only. Use 5s_cron_manager action=install to write cron files.',
      cron_path: this.scheduleTasksPath,
      rendered: cronContent,
      project_dir: projectDir,
      node_bin: nodeBin
    };
  }

  /**
   * Швидка перевірка здоров'я системи
   */
  async quickHealthCheck() {
    const checks = {
      timestamp: new Date().toISOString(),
      disk: await this.checkDiskHealth(),
      memory: await this.checkMemoryHealth(),
      services: await this.checkCriticalServices(),
      overall: 'UNKNOWN'
    };
    
    // Визначаємо загальний статус
    const statuses = [checks.disk.status, checks.memory.status, checks.services.status];
    if (statuses.includes('CRITICAL')) {
      checks.overall = 'CRITICAL';
    } else if (statuses.includes('WARNING')) {
      checks.overall = 'WARNING';
    } else if (statuses.includes('UNSUPPORTED')) {
      checks.overall = 'DEGRADED';
    } else if (statuses.every(s => s === 'HEALTHY')) {
      checks.overall = 'HEALTHY';
    }
    
    // Логуємо результат
    await this.logAuditEvent(`HEALTH_CHECK: ${checks.overall}`);
    
    return checks;
  }

  async checkDiskHealth() {
    try {
      const { stdout } = await execAsync("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
      const usage = parseInt(stdout.trim());
      
      return {
        usage: `${usage}%`,
        status: usage > 90 ? 'CRITICAL' : usage > 80 ? 'WARNING' : 'HEALTHY'
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  async checkMemoryHealth() {
    try {
      const memory = await memorySnapshot();
      const usage = parseMemoryPercent(memory);
      if (usage == null) {
        return {
          usage: null,
          status: 'UNSUPPORTED',
          source: memory.source,
          note: memory.note || memory.reason
        };
      }
      
      return {
        usage: `${usage.toFixed(1)}%`,
        status: usage > 95 ? 'CRITICAL' : usage > 85 ? 'WARNING' : 'HEALTHY'
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  async checkCriticalServices() {
    const services = ['ssh', 'systemd-resolved', 'cron'];
    const results = [];
    
    for (const service of services) {
      const serviceStatus = await systemdStatus(['is-active', service]);
      if (serviceStatus.status === 'unsupported') {
        results.push({
          name: service,
          status: 'UNSUPPORTED',
          note: serviceStatus.reason
        });
      } else if (serviceStatus.status === 'error') {
        results.push({
          name: service,
          status: 'STOPPED',
          error: serviceStatus.stderr || serviceStatus.error
        });
      } else {
        results.push({
          name: service,
          status: serviceStatus.stdout.trim() === 'active' ? 'RUNNING' : 'STOPPED'
        });
      }
    }
    
    const unsupportedServices = results.filter(s => s.status === 'UNSUPPORTED');
    const failedServices = results.filter(s => !['RUNNING', 'UNSUPPORTED'].includes(s.status));
    
    return {
      services: results,
      status: failedServices.length === 0
        ? unsupportedServices.length > 0 ? 'UNSUPPORTED' : 'HEALTHY'
        : failedServices.length < services.length ? 'WARNING' : 'CRITICAL',
      failedCount: failedServices.length
    };
  }
}

/**
 * Створення інструменту Shitsuke для MCP сервера
 */
export function createShitsukeTool(options = {}) {
  const manager = options.manager || new ShitsukeManager(options);
  
  return {
    name: '5s-shitsuke',
    description: 'Shitsuke (躾) - Дисципліна і дотримання стандартів 5S. Проводить аудити, моніторинг та забезпечує безперервне покращення системи.',
    
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['audit', 'metrics', 'health', 'schedule', 'report'],
          description: 'Дія для виконання'
        },
        options: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              description: 'Period для звіту (weekly, monthly)'
            },
            project_dir: {
              type: 'string',
              description: 'Project directory for legacy schedule action'
            }
          }
        }
      },
      required: ['action']
    },
    
    async execute(args) {
      const { action, options = {} } = args;
      
      switch (action) {
        case 'audit':
          return await manager.conductWeeklyAudit();
          
        case 'metrics':
          return await manager.getPerformanceMetrics();
          
        case 'health':
          return await manager.quickHealthCheck();
          
        case 'schedule':
          if (options.project_dir) {
            manager.projectDir = options.project_dir;
          }
          return await manager.setupScheduledTasks();
          
        case 'report':
          const metrics = await manager.getPerformanceMetrics();
          const health = await manager.quickHealthCheck();
          
          return {
            summary: {
              timestamp: new Date().toISOString(),
              overallHealth: health.overall,
              lastAuditScore: metrics.current ? metrics.current.overallScore : 'N/A',
              trend: metrics.trend ? 
                (metrics.trend.overall > 0 ? 'IMPROVING' : 
                 metrics.trend.overall < 0 ? 'DECLINING' : 'STABLE') : 'N/A',
              totalAudits: metrics.totalAudits
            },
            details: {
              performance: metrics,
              health: health
            }
          };
          
        default:
          throw new Error(`Невідома дія: ${action}`);
      }
    }
  };
}

// Якщо файл запущений напряму
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new ShitsukeManager();
  const action = process.argv[2] || 'health';
  
  if (action === 'audit') {
    manager.conductWeeklyAudit().then(console.log).catch(console.error);
  } else if (action === 'health') {
    manager.quickHealthCheck().then(console.log).catch(console.error);
  } else if (action === 'metrics') {
    manager.getPerformanceMetrics().then(console.log).catch(console.error);
  }
}

function parseMemoryPercent(memory) {
  if (!memory || memory.status !== 'ok' || !memory.raw) return null;
  const memLine = memory.raw.split('\n').find(line => line.trim().startsWith('Mem:'));
  if (!memLine) return null;
  const parts = memLine.trim().split(/\s+/);
  const total = Number(parts[1]) || 0;
  const used = Number(parts[2]) || 0;
  if (total <= 0) return null;
  return Math.round((used / total) * 1000) / 10;
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
