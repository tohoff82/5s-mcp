/**
 * Seiketsu (清潔) - Стандартизація/Підтримка стандартів
 * 
 * Четвертий крок 5S: створення стандартів для підтримки
 * порядку та забезпечення того, щоб перші три S були постійними.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { SafetyPolicyManager } from '../../safety-policy.js';
import { memorySnapshot, systemdStatus } from '../../platform-capabilities.js';

const execAsync = promisify(exec);

export function createSeiketsuTool() {
  return {
    name: 'seiketsu_standardize_procedures',
    description: '清潔 (Seiketsu) - Створення та перевірка стандартів для підтримки порядку в системі',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['audit', 'create_standards', 'validate_compliance', 'generate_checklist', 'monitor_drift', 'generate_policy'],
          description: 'Дія: аудит стандартів, створення стандартів, валідація відповідності, генерація чеклиста, моніторинг відхилень'
        },
        domain: {
          type: 'string',
          enum: ['security', 'performance', 'maintenance', 'backup', 'monitoring', 'all'],
          description: 'Домен стандартизації'
        },
        standard_level: {
          type: 'string',
          enum: ['basic', 'advanced', 'enterprise'],
          description: 'Рівень стандартів',
          default: 'basic'
        },
        generate_automation: {
          type: 'boolean',
          description: 'Генерувати скрипти автоматизації для стандартів',
          default: false
        }
      },
      required: ['action', 'domain']
    },

    async execute(args) {
      const { action, domain, standard_level = 'basic', generate_automation = false } = args;

      const results = {
        timestamp: new Date().toISOString(),
        action,
        domain,
        standard_level,
        standards: {},
        compliance_status: {},
        checklist: [],
        automation_scripts: [],
        recommendations: []
      };

      try {
        switch (action) {
          case 'audit':
            results.standards = await auditCurrentStandards(domain);
            break;
            
          case 'create_standards':
            results.standards = await createStandardsProcedures(domain, standard_level);
            if (generate_automation) {
              results.automation_scripts = await generateAutomationScripts(domain, results.standards);
            }
            break;
            
          case 'validate_compliance':
            results.compliance_status = await validateCompliance(domain, standard_level);
            break;
            
          case 'generate_checklist':
            results.checklist = await generateMaintenanceChecklist(domain, standard_level);
            break;
            
          case 'monitor_drift':
            results.compliance_status = await monitorStandardsDrift(domain);
            break;

          case 'generate_policy':
            results.standards = await generateFormalPolicy(domain, standard_level);
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        // Генеруємо рекомендації
        results.recommendations = generateSeiketsuRecommendations(results);
        
        return results;

      } catch (error) {
        return {
          error: true,
          message: `Seiketsu operation failed: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    }
  };
}

async function generateFormalPolicy(domain, standardLevel) {
  const safety = await new SafetyPolicyManager().listRules('all');
  return {
    domain,
    standard_level: standardLevel,
    retention_policy: {
      temp_files_days: 7,
      rotated_logs_days: 30,
      audit_history_weeks: 52,
      changelog_retention_quarters: 3
    },
    cleanup_policy: {
      required_flow: ['observe', 'plan', 'evaluate', 'stage', 'apply', 'verify', 'record'],
      direct_delete_commands_allowed: false,
      manifest_required: true,
      file_usage_checks: ['lsof', 'fuser', 'symlink_check', 'pid_sock_lock_skip']
    },
    backup_policy: {
      backup_before_apply: true,
      backup_root: '/backup/5s',
      dry_run_artifact_required: true,
      rollback_reference_required: true
    },
    service_criticality_policy: {
      protected_services: safety.protected_services,
      post_apply_checks: ['systemctl is-active', 'disk_before_after', 'memory_before_after']
    },
    approval_matrix: {
      P0_SAFE: 'no approval for observe/read-only',
      P1_LOW: 'approval recommended for destructive cache cleanup',
      P2_MEDIUM: 'approval required',
      P3_HIGH: 'explicit approved=true and staged backup required',
      P4_FORBIDDEN: 'blocked by policy; policy change required'
    },
    rollback_sla: {
      high_risk_restore_target_minutes: 15,
      backup_verification_required: true
    },
    active_safety_policy: safety
  };
}

async function auditCurrentStandards(domain) {
  const standards = {};

  try {
    switch (domain) {
      case 'security':
        standards.security = await auditSecurityStandards();
        break;
        
      case 'performance':
        standards.performance = await auditPerformanceStandards();
        break;
        
      case 'maintenance':
        standards.maintenance = await auditMaintenanceStandards();
        break;
        
      case 'backup':
        standards.backup = await auditBackupStandards();
        break;
        
      case 'monitoring':
        standards.monitoring = await auditMonitoringStandards();
        break;
        
      case 'all':
        standards.security = await auditSecurityStandards();
        standards.performance = await auditPerformanceStandards();
        standards.maintenance = await auditMaintenanceStandards();
        standards.backup = await auditBackupStandards();
        standards.monitoring = await auditMonitoringStandards();
        break;
    }

    return standards;

  } catch (error) {
    throw new Error(`Standards audit failed: ${error.message}`);
  }
}

async function auditSecurityStandards() {
  try {
    const security = {
      firewall: {},
      ssh: {},
      users: {},
      permissions: {},
      updates: {}
    };

    // UFW статус
    const { stdout: ufwStatus } = await execAsync('ufw status verbose 2>/dev/null || echo "ufw not available"');
    security.firewall = {
      status: ufwStatus.includes('Status: active') ? 'compliant' : 'non_compliant',
      details: ufwStatus.trim()
    };

    // SSH конфігурація
    try {
      const { stdout: sshConfig } = await execAsync('grep -E "^(PermitRootLogin|PasswordAuthentication|Port)" /etc/ssh/sshd_config 2>/dev/null || true');
      security.ssh = {
        status: sshConfig.includes('PermitRootLogin no') ? 'compliant' : 'needs_review',
        config: sshConfig.trim()
      };
    } catch (e) {
      security.ssh = { status: 'unknown', error: e.message };
    }

    // fail2ban
    const fail2banStatus = await systemdStatus(['is-active', 'fail2ban']);
    security.fail2ban = {
      status: fail2banStatus.status === 'unsupported' ? 'unsupported' : fail2banStatus.stdout.trim() === 'active' ? 'compliant' : 'non_compliant',
      service_status: fail2banStatus.status === 'ok' ? fail2banStatus.stdout.trim() : fail2banStatus.status,
      note: fail2banStatus.status === 'unsupported' ? fail2banStatus.reason : undefined
    };

    // Автоматичні оновлення
    const unattendedUpgrades = await systemdStatus(['is-enabled', 'unattended-upgrades']);
    security.updates = {
      status: unattendedUpgrades.status === 'unsupported' ? 'unsupported' : unattendedUpgrades.stdout.trim() === 'enabled' ? 'compliant' : 'non_compliant',
      auto_updates: unattendedUpgrades.status === 'ok' ? unattendedUpgrades.stdout.trim() : unattendedUpgrades.status,
      note: unattendedUpgrades.status === 'unsupported' ? unattendedUpgrades.reason : undefined
    };

    return security;

  } catch (error) {
    throw new Error(`Security audit failed: ${error.message}`);
  }
}

async function auditPerformanceStandards() {
  try {
    const performance = {
      resources: {},
      services: {},
      optimization: {}
    };

    // Використання ресурсів
    const memInfo = await memorySnapshot();
    const { stdout: diskInfo } = await execAsync('df -h /');
    const { stdout: loadAvg } = await execAsync('uptime');

    performance.resources = {
      memory: memInfo.raw,
      memory_status: memInfo.status,
      memory_note: memInfo.note || memInfo.reason,
      disk: diskInfo.trim(),
      load: loadAvg.trim(),
      status: 'needs_analysis'
    };

    // Сервіси
    const servicesList = await systemdStatus(['list-units', '--type=service', '--state=running', '--no-pager']);
    const runningCount = servicesList.status === 'ok' ? servicesList.stdout.split('\n').filter(line => line.includes('.service')).length : null;
    performance.services = {
      running_count: runningCount,
      status: servicesList.status === 'unsupported' ? 'unsupported' : runningCount > 50 ? 'review_needed' : 'compliant',
      note: servicesList.status === 'unsupported' ? servicesList.reason : undefined
    };

    // Swappiness
    const { stdout: swappiness } = await execAsync('cat /proc/sys/vm/swappiness 2>/dev/null || echo "unknown"');
    performance.optimization = {
      swappiness: swappiness.trim(),
      status: swappiness.trim() === '10' ? 'compliant' : 'can_optimize'
    };

    return performance;

  } catch (error) {
    throw new Error(`Performance audit failed: ${error.message}`);
  }
}

async function auditMaintenanceStandards() {
  try {
    const maintenance = {
      updates: {},
      cleaning: {},
      monitoring: {}
    };

    // Останнє оновлення
    const { stdout: lastUpdate } = await execAsync('stat -c %Y /var/cache/apt/pkgcache.bin 2>/dev/null || echo "0"');
    const daysSinceUpdate = Math.floor((Date.now() / 1000 - parseInt(lastUpdate)) / (24 * 3600));
    
    maintenance.updates = {
      days_since_last: daysSinceUpdate,
      status: daysSinceUpdate <= 7 ? 'compliant' : 'overdue'
    };

    // Logrotate
    const logrotateStatus = await systemdStatus(['is-active', 'logrotate.timer']);
    maintenance.cleaning = {
      logrotate_active: logrotateStatus.status === 'ok' ? logrotateStatus.stdout.trim() === 'active' : null,
      status: logrotateStatus.status === 'unsupported' ? 'unsupported' : logrotateStatus.stdout.trim() === 'active' ? 'compliant' : 'non_compliant',
      note: logrotateStatus.status === 'unsupported' ? logrotateStatus.reason : undefined
    };

    return maintenance;

  } catch (error) {
    throw new Error(`Maintenance audit failed: ${error.message}`);
  }
}

async function auditBackupStandards() {
  try {
    const backup = {
      strategy: {},
      automation: {},
      verification: {}
    };

    // Пошук скриптів backup
    const { stdout: backupScripts } = await execAsync('find /root -name "*backup*" -type f 2>/dev/null || true');
    const { stdout: cronJobs } = await execAsync('crontab -l 2>/dev/null | grep -i backup || echo "No backup jobs"');

    backup.strategy = {
      scripts_found: backupScripts.split('\n').filter(line => line.trim()).length,
      cron_jobs: cronJobs.trim(),
      status: backupScripts.trim() ? 'partial' : 'missing'
    };

    return backup;

  } catch (error) {
    throw new Error(`Backup audit failed: ${error.message}`);
  }
}

async function auditMonitoringStandards() {
  try {
    const monitoring = {
      system_monitoring: {},
      log_monitoring: {},
      alerting: {}
    };

    // Системні метрики
    const systemdJournal = await systemdStatus(['is-active', 'systemd-journald']);
    
    monitoring.system_monitoring = {
      journal_active: systemdJournal.status === 'ok' ? systemdJournal.stdout.trim() === 'active' : null,
      status: systemdJournal.status === 'unsupported' ? 'unsupported' : systemdJournal.stdout.trim() === 'active' ? 'basic' : 'insufficient',
      note: systemdJournal.status === 'unsupported' ? systemdJournal.reason : undefined
    };

    return monitoring;

  } catch (error) {
    throw new Error(`Monitoring audit failed: ${error.message}`);
  }
}

async function createStandardsProcedures(domain, standardLevel) {
  const procedures = {};

  try {
    switch (domain) {
      case 'security':
        procedures.security = createSecurityStandards(standardLevel);
        break;
        
      case 'performance':
        procedures.performance = createPerformanceStandards(standardLevel);
        break;
        
      case 'maintenance':
        procedures.maintenance = createMaintenanceStandards(standardLevel);
        break;
        
      case 'backup':
        procedures.backup = createBackupStandards(standardLevel);
        break;
        
      case 'monitoring':
        procedures.monitoring = createMonitoringStandards(standardLevel);
        break;
        
      case 'all':
        procedures.security = createSecurityStandards(standardLevel);
        procedures.performance = createPerformanceStandards(standardLevel);
        procedures.maintenance = createMaintenanceStandards(standardLevel);
        procedures.backup = createBackupStandards(standardLevel);
        procedures.monitoring = createMonitoringStandards(standardLevel);
        break;
    }

    return procedures;

  } catch (error) {
    throw new Error(`Standards creation failed: ${error.message}`);
  }
}

function createSecurityStandards(level) {
  const standards = {
    basic: {
      firewall: {
        requirement: 'UFW enabled with default deny policy',
        check_command: 'ufw status',
        implementation: 'ufw --force enable && ufw default deny'
      },
      ssh: {
        requirement: 'SSH hardened (no root login, key auth only)',
        check_command: 'grep "PermitRootLogin\\|PasswordAuthentication" /etc/ssh/sshd_config',
        implementation: 'Configure /etc/ssh/sshd_config appropriately'
      },
      updates: {
        requirement: 'Automatic security updates enabled',
        check_command: 'systemctl is-enabled unattended-upgrades',
        implementation: 'apt install unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades'
      }
    },
    advanced: {
      fail2ban: {
        requirement: 'fail2ban active with custom rules',
        check_command: 'systemctl is-active fail2ban',
        implementation: 'apt install fail2ban && systemctl enable fail2ban'
      },
      audit: {
        requirement: 'System audit logging enabled',
        check_command: 'systemctl is-active auditd',
        implementation: 'apt install auditd && systemctl enable auditd'
      }
    },
    enterprise: {
      selinux: {
        requirement: 'AppArmor/SELinux enabled',
        check_command: 'aa-status || sestatus',
        implementation: 'Configure mandatory access control'
      }
    }
  };

  return standards[level] || standards.basic;
}

function createPerformanceStandards(level) {
  const standards = {
    basic: {
      swappiness: {
        requirement: 'vm.swappiness = 10',
        check_command: 'cat /proc/sys/vm/swappiness',
        implementation: 'echo "vm.swappiness=10" >> /etc/sysctl.conf'
      },
      services: {
        requirement: 'Minimal services running (<30)',
        check_command: 'systemctl list-units --type=service --state=running --no-pager | wc -l',
        implementation: 'Disable unnecessary services'
      }
    },
    advanced: {
      limits: {
        requirement: 'Resource limits configured',
        check_command: 'cat /etc/security/limits.conf',
        implementation: 'Configure /etc/security/limits.conf'
      }
    }
  };

  return standards[level] || standards.basic;
}

function createMaintenanceStandards(level) {
  const standards = {
    basic: {
      updates: {
        requirement: 'Weekly system updates',
        frequency: 'weekly',
        implementation: 'crontab job for apt update && apt upgrade'
      },
      cleaning: {
        requirement: 'Monthly system cleanup',
        frequency: 'monthly',
        implementation: '5S Seiso procedures automated'
      }
    },
    advanced: {
      monitoring: {
        requirement: 'Daily health checks',
        frequency: 'daily',
        implementation: 'Automated system health monitoring'
      }
    }
  };

  return standards[level] || standards.basic;
}

function createBackupStandards(level) {
  const standards = {
    basic: {
      configs: {
        requirement: 'Weekly config backup',
        frequency: 'weekly',
        implementation: 'Backup /etc and user configs'
      }
    },
    advanced: {
      full_system: {
        requirement: 'Daily incremental, weekly full backup',
        frequency: 'daily/weekly',
        implementation: 'rsync or tar-based backup solution'
      }
    }
  };

  return standards[level] || standards.basic;
}

function createMonitoringStandards(level) {
  const standards = {
    basic: {
      logs: {
        requirement: 'Centralized logging with rotation',
        implementation: 'journald + logrotate configuration'
      }
    },
    advanced: {
      metrics: {
        requirement: 'System metrics collection',
        implementation: 'collectd or similar metrics collection'
      }
    }
  };

  return standards[level] || standards.basic;
}

async function validateCompliance(domain, standardLevel) {
  const compliance = {};
  
  const standards = await createStandardsProcedures(domain, standardLevel);
  
  for (const [category, categoryStandards] of Object.entries(standards)) {
    compliance[category] = {};
    
    for (const [standard, config] of Object.entries(categoryStandards)) {
      try {
        if (config.check_command) {
          const { stdout } = await execAsync(config.check_command);
          compliance[category][standard] = {
            requirement: config.requirement,
            actual: stdout.trim(),
            compliant: evaluateCompliance(standard, stdout.trim(), config)
          };
        } else {
          compliance[category][standard] = {
            requirement: config.requirement,
            status: 'manual_check_required'
          };
        }
      } catch (error) {
        compliance[category][standard] = {
          requirement: config.requirement,
          error: error.message,
          compliant: false
        };
      }
    }
  }

  return compliance;
}

function evaluateCompliance(standard, actual, config) {
  // Спрощена логіка перевірки відповідності
  switch (standard) {
    case 'firewall':
      return actual.includes('Status: active');
    case 'swappiness':
      return actual === '10';
    case 'updates':
      return actual === 'enabled';
    default:
      return actual.length > 0; // Базова перевірка
  }
}

async function generateMaintenanceChecklist(domain, standardLevel) {
  const checklist = [];
  const standards = await createStandardsProcedures(domain, standardLevel);

  for (const [category, categoryStandards] of Object.entries(standards)) {
    checklist.push({
      category: category.toUpperCase(),
      items: Object.entries(categoryStandards).map(([name, config]) => ({
        task: config.requirement,
        frequency: config.frequency || 'as_needed',
        check_command: config.check_command || 'manual',
        automated: !!config.check_command
      }))
    });
  }

  return checklist;
}

async function monitorStandardsDrift(domain) {
  // Простий моніторинг відхилень від стандартів
  const currentState = await auditCurrentStandards(domain);
  const baselineStandards = await createStandardsProcedures(domain, 'basic');
  
  const drift = {};
  
  // Порівняння поточного стану з базовими стандартами
  for (const [category, standards] of Object.entries(baselineStandards)) {
    if (currentState[category]) {
      drift[category] = {
        compliant_items: 0,
        non_compliant_items: 0,
        items: {}
      };
      
      for (const [item, config] of Object.entries(standards)) {
        const isCompliant = evaluateCompliance(item, 
          currentState[category][item]?.details || '', config);
        
        drift[category].items[item] = {
          compliant: isCompliant,
          requirement: config.requirement
        };
        
        if (isCompliant) {
          drift[category].compliant_items++;
        } else {
          drift[category].non_compliant_items++;
        }
      }
    }
  }

  return drift;
}

async function generateAutomationScripts(domain, standards) {
  const scripts = [];

  for (const [category, categoryStandards] of Object.entries(standards)) {
    const scriptContent = generateScriptForCategory(category, categoryStandards);
    
    scripts.push({
      category,
      filename: `${category}_compliance.sh`,
      content: scriptContent,
      description: `Automation script for ${category} standards compliance`
    });
  }

  return scripts;
}

function generateScriptForCategory(category, standards) {
  let script = `#!/bin/bash\n# ${category.toUpperCase()} Compliance Script\n# Generated by Seiketsu tool\n\n`;
  
  script += `echo "Checking ${category} compliance..."\n\n`;
  
  for (const [name, config] of Object.entries(standards)) {
    if (config.check_command) {
      script += `echo "Checking ${name}..."\n`;
      script += `if ${config.check_command} >/dev/null 2>&1; then\n`;
      script += `  echo "✓ ${name} is compliant"\n`;
      script += `else\n`;
      script += `  echo "✗ ${name} needs attention"\n`;
      if (config.implementation && !config.implementation.includes('Configure')) {
        script += `  echo "Running: ${config.implementation}"\n`;
        script += `  ${config.implementation}\n`;
      }
      script += `fi\n\n`;
    }
  }
  
  script += `echo "${category} compliance check completed"\n`;
  
  return script;
}

function generateSeiketsuRecommendations(results) {
  const recommendations = [];

  // Аналіз compliance статусу
  if (results.compliance_status) {
    for (const [category, status] of Object.entries(results.compliance_status)) {
      if (typeof status === 'object' && status.non_compliant_items > 0) {
        recommendations.push({
          category: 'compliance',
          priority: 'high',
          message: `${category}: ${status.non_compliant_items} елементів не відповідають стандартам`,
          action: 'implement_missing_standards'
        });
      }
    }
  }

  // Рекомендації щодо автоматизації
  if (results.automation_scripts.length > 0) {
    recommendations.push({
      category: 'automation',
      priority: 'medium',
      message: `Створено ${results.automation_scripts.length} скриптів автоматизації для підтримки стандартів`,
      action: 'deploy_automation'
    });
  }

  // Рекомендації щодо моніторингу
  if (results.action === 'monitor_drift') {
    recommendations.push({
      category: 'monitoring',
      priority: 'medium',
      message: 'Регулярно перевіряйте відхилення від стандартів для підтримки compliance',
      action: 'schedule_monitoring'
    });
  }

  return recommendations;
}
