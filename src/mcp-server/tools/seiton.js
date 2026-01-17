/**
 * Seiton (整頓) - Систематизація/Порядок
 * 
 * Другий крок 5S: організація та впорядкування необхідних речей
 * так, щоб їх легко було знайти та використати.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export function createSeitonTool() {
  return {
    name: 'seiton_organize_system',
    description: '整頓 (Seiton) - Організація та впорядкування файлової системи, конфігурацій та процесів для легкого доступу',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['analyze', 'organize', 'standardize', 'validate'],
          description: 'Дія: аналіз, організація, стандартизація або валідація структури'
        },
        scope: {
          type: 'string',
          enum: ['configs', 'logs', 'scripts', 'services', 'all'],
          description: 'Область застосування'
        },
        target_path: {
          type: 'string',
          description: 'Цільовий шлях для організації',
          default: '/root'
        },
        dry_run: {
          type: 'boolean',
          description: 'Тільки показати що буде зроблено, не виконувати',
          default: true
        }
      },
      required: ['action', 'scope']
    },

    async execute(args) {
      const { action, scope, target_path = '/root', dry_run = true } = args;

      const results = {
        timestamp: new Date().toISOString(),
        action,
        scope,
        target_path,
        dry_run,
        analysis: {},
        actions_taken: [],
        recommendations: []
      };

      try {
        switch (action) {
          case 'analyze':
            results.analysis = await analyzeSeitonState(scope, target_path);
            break;
            
          case 'organize':
            results.actions_taken = await organizeSystem(scope, target_path, dry_run);
            break;
            
          case 'standardize':
            results.actions_taken = await standardizeStructure(scope, target_path, dry_run);
            break;
            
          case 'validate':
            results.analysis = await validateOrganization(scope, target_path);
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        // Генеруємо рекомендації
        results.recommendations = generateSeitonRecommendations(results);
        
        return results;

      } catch (error) {
        return {
          error: true,
          message: `Seiton operation failed: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    }
  };
}

async function analyzeSeitonState(scope, targetPath) {
  const analysis = {
    file_structure: {},
    naming_consistency: {},
    organization_score: 0
  };

  try {
    switch (scope) {
      case 'configs':
        analysis.file_structure = await analyzeConfigStructure(targetPath);
        break;
        
      case 'logs':
        analysis.file_structure = await analyzeLogStructure();
        break;
        
      case 'scripts':
        analysis.file_structure = await analyzeScriptStructure(targetPath);
        break;
        
      case 'services':
        analysis.file_structure = await analyzeServiceStructure();
        break;
        
      case 'all':
        analysis.file_structure.configs = await analyzeConfigStructure(targetPath);
        analysis.file_structure.logs = await analyzeLogStructure();
        analysis.file_structure.scripts = await analyzeScriptStructure(targetPath);
        analysis.file_structure.services = await analyzeServiceStructure();
        break;
    }

    // Аналіз консистентності найменувань
    analysis.naming_consistency = await analyzeNamingConsistency(targetPath);
    
    // Розрахунок балу організації
    analysis.organization_score = calculateOrganizationScore(analysis.file_structure);

    return analysis;

  } catch (error) {
    throw new Error(`Seiton analysis failed: ${error.message}`);
  }
}

async function analyzeConfigStructure(targetPath) {
  try {
    // Конфігураційні файли
    const { stdout: configFiles } = await execAsync(
      `find "${targetPath}" -name "*.conf" -o -name "*.cfg" -o -name "*.config" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" 2>/dev/null || true`
    );

    // Системні конфігурації
    const { stdout: systemConfigs } = await execAsync(
      'find /etc -maxdepth 2 -name "*.conf" 2>/dev/null | head -20 || true'
    );

    // Dotfiles
    const { stdout: dotfiles } = await execAsync(
      `find "${targetPath}" -maxdepth 2 -name ".*" -type f 2>/dev/null || true`
    );

    return {
      user_configs: {
        count: configFiles.split('\n').filter(line => line.trim()).length,
        files: configFiles.trim().split('\n').filter(line => line.trim())
      },
      system_configs: {
        count: systemConfigs.split('\n').filter(line => line.trim()).length,
        files: systemConfigs.trim().split('\n').filter(line => line.trim())
      },
      dotfiles: {
        count: dotfiles.split('\n').filter(line => line.trim()).length,
        files: dotfiles.trim().split('\n').filter(line => line.trim())
      }
    };

  } catch (error) {
    throw new Error(`Config structure analysis failed: ${error.message}`);
  }
}

async function analyzeLogStructure() {
  try {
    // Структура логів
    const { stdout: logDirs } = await execAsync('find /var/log -type d 2>/dev/null || true');
    const { stdout: logFiles } = await execAsync('find /var/log -name "*.log" 2>/dev/null | head -30 || true');
    
    // Журнали systemd
    const { stdout: journalInfo } = await execAsync('journalctl --list-boots | wc -l');

    return {
      log_directories: {
        count: logDirs.split('\n').filter(line => line.trim()).length,
        directories: logDirs.trim().split('\n').filter(line => line.trim())
      },
      log_files: {
        count: logFiles.split('\n').filter(line => line.trim()).length,
        files: logFiles.trim().split('\n').filter(line => line.trim())
      },
      journal_boots: parseInt(journalInfo.trim())
    };

  } catch (error) {
    throw new Error(`Log structure analysis failed: ${error.message}`);
  }
}

async function analyzeScriptStructure(targetPath) {
  try {
    // Скрипти
    const { stdout: scripts } = await execAsync(
      `find "${targetPath}" -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.pl" 2>/dev/null || true`
    );

    // Виконувані файли
    const { stdout: executables } = await execAsync(
      `find "${targetPath}" -type f -executable 2>/dev/null || true`
    );

    return {
      scripts: {
        count: scripts.split('\n').filter(line => line.trim()).length,
        files: scripts.trim().split('\n').filter(line => line.trim())
      },
      executables: {
        count: executables.split('\n').filter(line => line.trim()).length,
        files: executables.trim().split('\n').filter(line => line.trim()).slice(0, 20)
      }
    };

  } catch (error) {
    throw new Error(`Script structure analysis failed: ${error.message}`);
  }
}

async function analyzeServiceStructure() {
  try {
    // Сервіси systemd
    const { stdout: allServices } = await execAsync('systemctl list-unit-files --type=service');
    const { stdout: customServices } = await execAsync('find /etc/systemd/system -name "*.service" 2>/dev/null || true');
    
    // Активні сервіси
    const { stdout: activeServices } = await execAsync('systemctl list-units --type=service --state=active');

    return {
      total_services: allServices.split('\n').filter(line => line.includes('.service')).length,
      custom_services: {
        count: customServices.split('\n').filter(line => line.trim()).length,
        files: customServices.trim().split('\n').filter(line => line.trim())
      },
      active_services: activeServices.split('\n').filter(line => line.includes('.service')).length
    };

  } catch (error) {
    throw new Error(`Service structure analysis failed: ${error.message}`);
  }
}

async function analyzeNamingConsistency(targetPath) {
  try {
    // Аналіз patterns найменувань
    const { stdout: fileList } = await execAsync(
      `find "${targetPath}" -maxdepth 3 -type f -exec basename {} \\; 2>/dev/null || true`
    );

    const files = fileList.trim().split('\n').filter(line => line.trim());
    
    const patterns = {
      kebab_case: files.filter(f => /^[a-z0-9\-_.]+$/.test(f)).length,
      snake_case: files.filter(f => /^[a-z0-9_]+\.[a-z0-9]+$/.test(f)).length,
      camelCase: files.filter(f => /^[a-z][a-zA-Z0-9]*\.[a-z0-9]+$/.test(f)).length,
      mixed_case: files.filter(f => /[A-Z]/.test(f)).length,
      with_spaces: files.filter(f => / /.test(f)).length
    };

    const total = files.length;
    const consistency_score = Math.max(...Object.values(patterns)) / total * 100;

    return {
      total_files_analyzed: total,
      naming_patterns: patterns,
      consistency_score: Math.round(consistency_score),
      recommendations: generateNamingRecommendations(patterns, total)
    };

  } catch (error) {
    throw new Error(`Naming consistency analysis failed: ${error.message}`);
  }
}

async function organizeSystem(scope, targetPath, dryRun) {
  const actions = [];

  try {
    // Базовий план організації залежно від scope
    const organizationPlan = await createOrganizationPlan(scope, targetPath);
    
    for (const action of organizationPlan) {
      if (dryRun) {
        actions.push({
          type: 'planned',
          action: action.type,
          description: action.description,
          command: action.command || 'N/A'
        });
      } else {
        // Виконуємо реальні дії
        try {
          if (action.command) {
            await execAsync(action.command);
          }
          actions.push({
            type: 'executed',
            action: action.type,
            description: action.description,
            success: true
          });
        } catch (error) {
          actions.push({
            type: 'failed',
            action: action.type,
            description: action.description,
            error: error.message
          });
        }
      }
    }

    return actions;

  } catch (error) {
    throw new Error(`System organization failed: ${error.message}`);
  }
}

async function createOrganizationPlan(scope, targetPath) {
  const plan = [];

  switch (scope) {
    case 'configs':
      plan.push({
        type: 'create_directory',
        description: 'Створити директорію для конфігурацій',
        command: `mkdir -p "${targetPath}/.config"`
      });
      plan.push({
        type: 'organize_dotfiles',
        description: 'Організувати dotfiles в .config',
        command: `find "${targetPath}" -maxdepth 1 -name ".*rc" -exec mv {} "${targetPath}/.config/" \\; 2>/dev/null || true`
      });
      break;

    case 'scripts':
      plan.push({
        type: 'create_directory',
        description: 'Створити директорію для скриптів',
        command: `mkdir -p "${targetPath}/scripts"`
      });
      plan.push({
        type: 'set_permissions',
        description: 'Встановити правильні дозволи для скриптів',
        command: `find "${targetPath}/scripts" -name "*.sh" -exec chmod +x {} \\; 2>/dev/null || true`
      });
      break;

    case 'logs':
      plan.push({
        type: 'create_directory',
        description: 'Створити директорію для логів користувача',
        command: `mkdir -p "${targetPath}/logs"`
      });
      break;
  }

  return plan;
}

function calculateOrganizationScore(fileStructure) {
  let score = 0;
  let totalChecks = 0;

  // Перевірки для різних аспектів
  const checks = [
    // Структура директорій
    () => {
      totalChecks++;
      return Object.keys(fileStructure).length > 0 ? 20 : 0;
    },
    // Наявність організованих конфігурацій
    () => {
      totalChecks++;
      const configs = fileStructure.configs || fileStructure;
      return configs.user_configs?.count > 0 ? 20 : 0;
    },
    // Організація скриптів
    () => {
      totalChecks++;
      const scripts = fileStructure.scripts || fileStructure;
      return scripts.scripts?.count > 0 ? 15 : 0;
    },
    // Структура логів
    () => {
      totalChecks++;
      const logs = fileStructure.logs || fileStructure;
      return logs.log_directories?.count > 5 ? 15 : 0;
    },
    // Сервіси
    () => {
      totalChecks++;
      const services = fileStructure.services || fileStructure;
      return services.custom_services?.count > 0 ? 30 : 0;
    }
  ];

  checks.forEach(check => {
    score += check();
  });

  return Math.round(score / totalChecks * 100);
}

function generateNamingRecommendations(patterns, total) {
  const recommendations = [];

  if (patterns.with_spaces > 0) {
    recommendations.push({
      priority: 'high',
      issue: 'spaces_in_names',
      message: `${patterns.with_spaces} файлів містять пробіли в назвах. Рекомендується використовувати дефіси або підкреслення.`
    });
  }

  const consistencyRatio = Math.max(...Object.values(patterns)) / total;
  if (consistencyRatio < 0.7) {
    recommendations.push({
      priority: 'medium',
      issue: 'inconsistent_naming',
      message: 'Непослідовне найменування файлів. Рекомендується вибрати один стиль і дотримуватися його.'
    });
  }

  return recommendations;
}

function generateSeitonRecommendations(results) {
  const recommendations = [];

  if (results.analysis.organization_score < 70) {
    recommendations.push({
      category: 'organization',
      priority: 'high',
      action: 'improve_structure',
      description: `Низький бал організації (${results.analysis.organization_score}%). Потрібна реструктуризація.`
    });
  }

  if (results.analysis.naming_consistency?.consistency_score < 60) {
    recommendations.push({
      category: 'naming',
      priority: 'medium',
      action: 'standardize_naming',
      description: 'Непослідовне найменування файлів потребує стандартизації.'
    });
  }

  return recommendations;
}

async function standardizeStructure(scope, targetPath, dryRun) {
  // Імплементація стандартизації структури
  return await organizeSystem(scope, targetPath, dryRun);
}

async function validateOrganization(scope, targetPath) {
  // Валідація поточного стану організації
  return await analyzeSeitonState(scope, targetPath);
}
