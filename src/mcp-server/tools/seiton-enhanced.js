/**
 * Enhanced Seiton (整頓) - Систематизація/Порядок
 * + Memory-Driven Intelligent Workspace Tree 🌸
 * 
 * Другий крок 5S: організація та впорядкування необхідних речей
 * так, щоб їх легко було знайти та використати.
 * 
 * Розширено Франком і Романом для вирішення проблеми T-003
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { IntelligentWorkspaceTree } from '../../utils/intelligent-workspace-tree.js';
import { MemoryHelper } from '../../utils/memory-helper.js';
import { journalctlStatus, systemdStatus } from '../../platform-capabilities.js';

const execAsync = promisify(exec);
const PRUNED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache'];

export function createSeitonTool(toolOrchestrator = null) {
  return {
    name: 'seiton_organize_system',
    description: '整頓 (Seiton) - Організація та впорядкування файлової системи, конфігурацій та процесів для легкого доступу. Включає розумний workspace_tree.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['analyze', 'organize', 'standardize', 'validate', 'workspace_tree'],
          description: 'Дія: аналіз, організація, стандартизація, валідація або розумний workspace tree'
        },
        scope: {
          type: 'string',
          enum: ['configs', 'logs', 'scripts', 'services', 'all'],
          description: 'Область застосування (для analyze/organize/standardize/validate)'
        },
        target_path: {
          type: 'string',
          description: 'Цільовий шлях для організації або workspace tree',
          default: '.'
        },
        dry_run: {
          type: 'boolean',
          description: 'Тільки показати що буде зроблено, не виконувати',
          default: true
        },
        // Додаткові параметри для workspace_tree
        max_depth: {
          type: 'number',
          description: 'Максимальна глибина для workspace tree (перекриває adaptive стратегію)',
          minimum: 1,
          maximum: 10
        },
        max_files: {
          type: 'number', 
          description: 'Максимальна кількість файлів для показу',
          minimum: 10,
          maximum: 1000
        }
      },
      required: ['action']
    },

    async execute(args) {
      const { action, scope, target_path = '.', dry_run = true, max_depth, max_files } = args;

      // 🌸 Новий workspace_tree action
      if (action === 'workspace_tree') {
        return await executeWorkspaceTree(target_path, { max_depth, max_files }, toolOrchestrator);
      }

      // Існуюча логіка для інших actions
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
            results.actions_taken = await organizeSystem(scope, target_path, true);
            results.plan_only = true;
            results.message = 'Production Seiton is inventory/index/config-registry only. Apply filesystem moves manually after review.';
            break;
            
          case 'standardize':
            results.actions_taken = await standardizeStructure(scope, target_path, true);
            results.plan_only = true;
            results.message = 'Production Seiton standardization returns a plan only; no filesystem changes are executed.';
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

/**
 * 🌸 Memory-Driven Intelligent Workspace Tree Execution
 */
async function executeWorkspaceTree(targetPath, userOptions, toolOrchestrator) {
  try {
    // Створюємо memory helper якщо є tool orchestrator
    const memoryHelper = toolOrchestrator ? new MemoryHelper(toolOrchestrator) : null;
    
    // Створюємо розумний workspace tree
    const workspaceTree = new IntelligentWorkspaceTree(memoryHelper);
    
    // Виконуємо з користувацькими параметрами
    const result = await workspaceTree.createTree(targetPath, userOptions);
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      action: 'workspace_tree',
      target_path: targetPath,
      tree: result.tree,
      metadata: result.metadata,
      message: '🌸 Memory-Driven Intelligent Workspace Tree completed successfully'
    };

  } catch (error) {
    return {
      success: false,
      error: true,
      message: `Workspace Tree failed: ${error.message}`,
      timestamp: new Date().toISOString(),
      action: 'workspace_tree',
      target_path: targetPath
    };
  }
}

// Решта функцій залишається незмінною з оригінального seiton.js
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
      `find ${shellQuote(targetPath)} ${findPruneExpression()} -type f \\( -name "*.conf" -o -name "*.cfg" -o -name "*.config" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" \\) 2>/dev/null | head -300 || true`
    );

    // Системні конфігурації
    const { stdout: systemConfigs } = await execAsync(
      'find /etc -maxdepth 2 -name "*.conf" 2>/dev/null | head -20 || true'
    );

    // Dotfiles
    const { stdout: dotfiles } = await execAsync(
      `find ${shellQuote(targetPath)} -maxdepth 2 ${findPruneExpression()} -name ".*" -type f 2>/dev/null | head -100 || true`
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
    const journalInfo = await journalctlStatus(['--list-boots']);

    return {
      log_directories: {
        count: logDirs.split('\n').filter(line => line.trim()).length,
        directories: logDirs.trim().split('\n').filter(line => line.trim())
      },
      log_files: {
        count: logFiles.split('\n').filter(line => line.trim()).length,
        files: logFiles.trim().split('\n').filter(line => line.trim())
      },
      journal_boots: journalInfo.status === 'ok' ? journalInfo.stdout.split('\n').filter(line => line.trim()).length : null,
      journal_status: journalInfo.status,
      journal_note: journalInfo.status === 'unsupported' ? journalInfo.reason : undefined
    };

  } catch (error) {
    throw new Error(`Log structure analysis failed: ${error.message}`);
  }
}

async function analyzeScriptStructure(targetPath) {
  try {
    // Скрипти
    const { stdout: scripts } = await execAsync(
      `find ${shellQuote(targetPath)} ${findPruneExpression()} -type f \\( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.pl" \\) 2>/dev/null | head -300 || true`
    );

    // Виконувані файли
    const { stdout: executables } = await execAsync(
      `find ${shellQuote(targetPath)} ${findPruneExpression()} -type f -executable 2>/dev/null | head -200 || true`
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
    const allServices = await systemdStatus(['list-unit-files', '--type=service', '--no-pager']);
    const { stdout: customServices } = await execAsync('find /etc/systemd/system -name "*.service" 2>/dev/null || true');
    
    // Активні сервіси
    const activeServices = await systemdStatus(['list-units', '--type=service', '--state=active', '--no-pager']);

    return {
      status: allServices.status === 'ok' || activeServices.status === 'ok' ? 'ok' : 'unsupported',
      note: allServices.status === 'unsupported' ? allServices.reason : undefined,
      total_services: allServices.status === 'ok' ? allServices.stdout.split('\n').filter(line => line.includes('.service')).length : null,
      custom_services: {
        count: customServices.split('\n').filter(line => line.trim()).length,
        files: customServices.trim().split('\n').filter(line => line.trim())
      },
      active_services: activeServices.status === 'ok' ? activeServices.stdout.split('\n').filter(line => line.includes('.service')).length : null
    };

  } catch (error) {
    throw new Error(`Service structure analysis failed: ${error.message}`);
  }
}

async function analyzeNamingConsistency(targetPath) {
  try {
    // Аналіз patterns найменувань
    const { stdout: fileList } = await execAsync(
      `find ${shellQuote(targetPath)} -maxdepth 3 ${findPruneExpression()} -type f -exec basename {} \\; 2>/dev/null | head -1000 || true`
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
    const consistency_score = total > 0 ? Math.max(...Object.values(patterns)) / total * 100 : 100;

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

function findPruneExpression() {
  return `\\( ${PRUNED_DIRS.map(dir => `-name ${shellQuote(dir)}`).join(' -o ')} \\) -prune -o`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
