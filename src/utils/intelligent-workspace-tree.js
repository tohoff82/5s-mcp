/**
 * Memory-Driven Intelligent Workspace Tree
 * 🌸 Елегантне рішення проблеми T-003
 * 
 * Створено Франком і Романом як команда - одне ціле
 * Інтеграція в 5S MCP систему
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';

const execAsync = promisify(exec);

export class IntelligentWorkspaceTree {
  constructor(memorySkill = null) {
    this.memory = memorySkill;
    
    // Адаптивні стратегії для різних розмірів проектів
    this.strategies = {
      tiny: { 
        maxDepth: 3, 
        maxFiles: 100, 
        excludePatterns: ['node_modules', '.git'],
        description: 'Повний показ малих проектів'
      },
      small: { 
        maxDepth: 3, 
        maxFiles: 300, 
        excludePatterns: ['node_modules', '.git', '.cache'],
        description: 'Детальний показ малих проектів'
      },
      medium: { 
        maxDepth: 4, 
        maxFiles: 500, 
        excludePatterns: ['node_modules', '.git', '.cache', 'dist', 'build'],
        description: 'Збалансований показ середніх проектів'
      },
      large: { 
        maxDepth: 3, 
        maxFiles: 300, 
        excludePatterns: ['node_modules', '.git', '.cache', 'dist', 'build', 'logs'],
        description: 'Обмежений показ великих проектів'
      },
      huge: { 
        maxDepth: 2, 
        maxFiles: 150, 
        excludePatterns: ['node_modules', '.git', '.cache', 'dist', 'build', 'logs', 'tmp', '*.log'],
        description: 'Мінімальний показ величезних проектів'
      }
    };
  }

  /**
   * 🌸 Головна функція - створення розумного workspace tree
   */
  async createTree(targetPath, userOptions = {}) {
    const startTime = Date.now();
    const context = {
      timestamp: new Date().toISOString(),
      path: targetPath,
      userOptions
    };

    try {
      // 1. 🧠 Консультуємося з пам'яттю
      const memoryContext = await this.consultMemory(targetPath);
      
      // 2. 🔍 Аналізуємо контекст шляху  
      const pathAnalysis = await this.analyzePath(targetPath);
      
      // 3. 🎯 Створюємо адаптивну стратегію
      const strategy = this.createStrategy(memoryContext, pathAnalysis, userOptions);
      
      // 4. 🌸 Елегантно виконуємо
      const result = await this.executeStrategy(targetPath, strategy);
      
      // 5. 💾 Зберігаємо досвід
      await this.saveExperience(context, strategy, result);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        tree: result.tree,
        metadata: {
          strategy: strategy.name,
          reasoning: strategy.reasoning,
          filesAnalyzed: pathAnalysis.fileCount,
          filesShown: result.filesShown,
          outputSize: result.tree.length,
          executionTime,
          memoryUsed: memoryContext.hasIssues,
          optimizations: strategy.excludePatterns
        }
      };

    } catch (error) {
      await this.saveExperience(context, null, { error: error.message });
      throw new Error(`Intelligent Workspace Tree failed: ${error.message}`);
    }
  }

  /**
   * 🧠 Консультація з пам'яттю про минулий досвід
   */
  async consultMemory(targetPath) {
    if (!this.memory) {
      return { hasIssues: false, recommendation: 'standard' };
    }

    try {
      // Намагаємося знайти пов'язані напруження
      const result = await this.memory.getTensions({ status: 'open' });
      const tensions = result.tensions || [];
      
      const workspaceIssues = tensions.filter(t => 
        t.description.toLowerCase().includes('workspace') ||
        t.description.toLowerCase().includes('tree') ||
        (t.tags && t.tags.includes('output-size')) ||
        t.description.includes(targetPath)
      );

      return {
        hasIssues: workspaceIssues.length > 0,
        issues: workspaceIssues,
        recommendation: workspaceIssues.length > 0 ? 'conservative' : 'standard'
      };

    } catch (error) {
      console.warn(`Memory consultation failed: ${error.message}`);
      return { hasIssues: false, recommendation: 'careful' };
    }
  }

  /**
   * 🔍 Швидкий аналіз складності шляху
   */
  async analyzePath(targetPath) {
    try {
      // Швидкий підрахунок з захистом від зависання
      const countCommand = `timeout 10s find "${targetPath}" -type f 2>/dev/null | wc -l`;
      const { stdout } = await execAsync(countCommand);
      const fileCount = parseInt(stdout.trim()) || 0;

      // Детекція типу проекту
      const { stdout: sampleFiles } = await execAsync(
        `find "${targetPath}" -maxdepth 2 -type f 2>/dev/null | head -20`
      );
      
      const projectType = this.detectProjectType(sampleFiles, targetPath);
      const size = this.categorizeSize(fileCount);

      return {
        fileCount,
        size,
        projectType,
        analysisSuccessful: true
      };

    } catch (error) {
      return {
        fileCount: 0,
        size: 'unknown',
        projectType: 'generic',
        analysisSuccessful: false,
        error: error.message
      };
    }
  }

  /**
   * 🎯 Створення адаптивної стратегії
   */
  createStrategy(memoryContext, pathAnalysis, userOptions) {
    // Базова стратегія на основі розміру
    let baseStrategy = { ...this.strategies[pathAnalysis.size] } || { ...this.strategies.medium };

    // Адаптація на основі пам'яті
    if (memoryContext.hasIssues || memoryContext.recommendation === 'conservative') {
      baseStrategy = this.makeConservative(baseStrategy);
    }

    // Адаптація на основі типу проекту
    baseStrategy = this.adaptForProjectType(baseStrategy, pathAnalysis.projectType);

    // Застосування користувацьких параметрів
    const finalStrategy = {
      ...baseStrategy,
      ...userOptions,
      name: `adaptive_${pathAnalysis.size}_${pathAnalysis.projectType}`,
      reasoning: [
        `Розмір: ${pathAnalysis.fileCount} файлів (${pathAnalysis.size})`,
        `Тип: ${pathAnalysis.projectType}`, 
        `Пам'ять: ${memoryContext.recommendation}`,
        `Користувач: ${Object.keys(userOptions).join(', ') || 'стандарт'}`
      ]
    };

    return finalStrategy;
  }

  /**
   * 🌸 Елегантне виконання стратегії
   */
  async executeStrategy(targetPath, strategy) {
    try {
      // Будуємо розумну find команду
      const excludeArgs = strategy.excludePatterns
        .flatMap(pattern => ['-not', '-path', `*/${pattern}/*`])
        .join(' ');
      
      const findCommand = `find "${targetPath}" -maxdepth ${strategy.maxDepth} ${excludeArgs} -type f 2>/dev/null | head -${strategy.maxFiles}`;
      
      const { stdout } = await execAsync(findCommand);
      const files = stdout.trim().split('\n').filter(f => f.trim());
      
      // Форматуємо як tree структуру
      const tree = this.formatAsTree(files, targetPath);
      
      return {
        tree,
        filesShown: files.length,
        command: findCommand
      };

    } catch (error) {
      throw new Error(`Strategy execution failed: ${error.message}`);
    }
  }

  /**
   * 💾 Збереження досвіду для майбутнього навчання
   */
  async saveExperience(context, strategy, result) {
    if (!this.memory || result.error) return;

    try {
      const experience = {
        path: context.path,
        strategy: strategy?.name || 'failed',
        filesShown: result.filesShown || 0,
        outputSize: result.tree?.length || 0,
        success: !result.error
      };

      // Якщо успішно - зберігаємо як рішення
      if (experience.success) {
        await this.memory.registerDecision(
          `Smart Workspace Tree: ${context.path}`,
          `Застосовано ${strategy.name} стратегію: показано ${experience.filesShown} файлів, ${Math.round(experience.outputSize/1024)}KB виводу`,
          `Memory-driven optimization for ${context.path}`,
          [
            `Execution successful: ${experience.filesShown} files processed`,
            `Output size optimized: ${Math.round(experience.outputSize/1024)}KB`,
            `Strategy: ${strategy.maxDepth} depth, ${strategy.maxFiles} max files`
          ]
        );
      }

    } catch (error) {
      console.warn(`Experience saving failed: ${error.message}`);
    }
  }

  // 🛠️ Допоміжні методи

  categorizeSize(fileCount) {
    if (fileCount < 100) return 'tiny';
    if (fileCount < 1000) return 'small';
    if (fileCount < 5000) return 'medium'; 
    if (fileCount < 15000) return 'large';
    return 'huge';
  }

  detectProjectType(sampleFiles, targetPath) {
    const files = sampleFiles.toLowerCase();
    
    if (files.includes('package.json') || files.includes('node_modules')) return 'nodejs';
    if (files.includes('requirements.txt') || files.includes('.py')) return 'python';
    if (files.includes('.git') || files.includes('readme')) return 'git';
    if (files.includes('makefile') || files.includes('.c') || files.includes('.cpp')) return 'c_cpp';
    if (targetPath.includes('ui-agent')) return 'ui_agent';
    
    return 'generic';
  }

  makeConservative(strategy) {
    return {
      ...strategy,
      maxDepth: Math.max(1, strategy.maxDepth - 1),
      maxFiles: Math.floor(strategy.maxFiles * 0.6),
      excludePatterns: [...strategy.excludePatterns, 'logs', 'tmp', '.cache', '*.log'],
      description: `Conservative: ${strategy.description}`
    };
  }

  adaptForProjectType(strategy, projectType) {
    const adaptations = {
      nodejs: ['node_modules', 'dist', 'build', '.next', '.nuxt'],
      python: ['__pycache__', '*.pyc', '.venv', 'venv'],
      git: ['.git', '.github', '.gitlab'],
      ui_agent: ['node_modules', 'dist', 'logs', '.git', 'shared/*/node_modules']
    };

    if (adaptations[projectType]) {
      strategy.excludePatterns = [...new Set([...strategy.excludePatterns, ...adaptations[projectType]])];
    }

    return strategy;
  }

  formatAsTree(files, basePath) {
    if (files.length === 0) return 'No files found with current criteria';
    
    const relativePaths = files
      .map(f => f.replace(basePath, '').replace(/^\/+/, ''))
      .filter(f => f)
      .sort();

    if (relativePaths.length === 0) return `${basePath}/\n└── (empty or only excluded files)`;

    const tree = [`${basePath}/`];
    relativePaths.forEach((file, index) => {
      const isLast = index === relativePaths.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      tree.push(prefix + file);
    });

    return tree.join('\n');
  }
}
