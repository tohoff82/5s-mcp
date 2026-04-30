import { promises as fs } from 'fs';
import path from 'path';
import { FiveSChangelogMongo } from './mongodb-connector.js';

/**
 * 5S Changelog Manager
 * Головний клас для управління changelog системою
 */
export class FiveSChangelogManager {
  constructor(config = {}) {
    this.config = {
      baseDir: config.baseDir || 'docs/changes/5s-procedures',
      mongodb: config.mongodb || {},
      autoSync: config.autoSync !== false, // За замовчуванням true
      retentionQuarters: config.retentionQuarters || 3
    };
    
    this.mongoConnector = new FiveSChangelogMongo(this.config.mongodb);
    this.currentQuarter = this.getCurrentQuarter();
  }

  /**
   * Ініціалізація системи
   */
  async initialize() {
    try {
      // Створюємо необхідні директорії
      await this.createDirectoryStructure();
      
      // Підключаємося до MongoDB якщо увімкнено autoSync
      if (this.config.autoSync) {
        await this.mongoConnector.connect();
      }
      
      console.log('✅ 5S Changelog System initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize changelog system:', error.message);
      throw error;
    }
  }

  /**
   * Створення нового запису changelog
   */
  async createEntry(data) {
    try {
      // Генеруємо унікальний ID
      const id = this.generateId();
      
      // Створюємо повний об'єкт entry
      const entry = this.buildEntry(id, data);
      
      // Валідуємо entry
      await this.validateEntry(entry);
      
      // Зберігаємо у файлову систему
      await this.saveToFileSystem(entry);
      
      // Синхронізуємо з MongoDB
      if (this.config.autoSync) {
        await this.mongoConnector.saveEntry(entry);
      }
      
      console.log(`✅ Created changelog entry: ${id}`);
      return entry;
    } catch (error) {
      console.error('❌ Failed to create changelog entry:', error.message);
      throw error;
    }
  }

  /**
   * Оновлення існуючого запису
   */
  async updateEntry(id, updates) {
    try {
      // Завантажуємо існуючий entry
      const existingEntry = await this.loadEntry(id);
      if (!existingEntry) {
        throw new Error(`Entry not found: ${id}`);
      }
      
      // Мерджимо зміни
      const updatedEntry = { ...existingEntry, ...updates };
      updatedEntry.id = id; // Зберігаємо оригінальний ID
      updatedEntry._updated = new Date().toISOString();
      
      // Зберігаємо оновлений entry
      await this.saveToFileSystem(updatedEntry);
      
      // Синхронізуємо з MongoDB
      if (this.config.autoSync) {
        await this.mongoConnector.updateEntry(id, updatedEntry);
      }
      
      console.log(`✅ Updated changelog entry: ${id}`);
      return updatedEntry;
    } catch (error) {
      console.error('❌ Failed to update changelog entry:', error.message);
      throw error;
    }
  }

  /**
   * Завантаження запису за ID
   */
  async loadEntry(id) {
    try {
      const filePath = await this.findEntryFile(id);
      if (!filePath) {
        return null;
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to load entry ${id}:`, error.message);
      return null;
    }
  }

  /**
   * Пошук записів
   */
  async searchEntries(filters = {}) {
    try {
      let results = [];
      
      // Якщо MongoDB увімкнено, використовуємо його
      if (this.config.autoSync && this.mongoConnector.isConnected) {
        results = await this.mongoConnector.searchEntries(filters);
      } else {
        // Інакше шукаємо у файловій системі
        results = await this.searchInFileSystem(filters);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Failed to search entries:', error.message);
      throw error;
    }
  }

  /**
   * Генерація унікального ID
   */
  generateId() {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');  // HHMMSS
    const randomPart = Math.random().toString(36).substr(2, 3).toUpperCase(); // XXX
    
    return `${datePart}-${timePart}-${randomPart}`;
  }

  /**
   * Отримання поточного кварталу
   */
  getCurrentQuarter() {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${year}-Q${quarter}`;
  }

  /**
   * Побудова повного об'єкта entry
   */
  buildEntry(id, data) {
    const now = new Date();
    
    return {
      id: id,
      timestamp: now.toISOString(),
      quarter: this.currentQuarter,
      version: '1.0',
      _created: now.toISOString(),
      _updated: now.toISOString(),
      
      // Обов'язкові поля з валідацією
      procedure: {
        type: data.procedure?.type || 'seiso',
        name: data.procedure?.name || '',
        description: data.procedure?.description || '',
        category: data.procedure?.category || 'system'
      },
      
      changes: {
        type: data.changes?.type || 'update',
        what: data.changes?.what || '',
        why: data.changes?.why || '',
        how: data.changes?.how || '',
        before: data.changes?.before || '',
        after: data.changes?.after || ''
      },
      
      impact: {
        scope: data.impact?.scope || 'local',
        severity: data.impact?.severity || 'low',
        affected_components: data.impact?.affected_components || [],
        performance_metrics: data.impact?.performance_metrics || {},
        estimated_time_saved: data.impact?.estimated_time_saved || 0,
        estimated_cost_impact: data.impact?.estimated_cost_impact || 0
      },
      
      technical: {
        files_modified: data.technical?.files_modified || [],
        commands_executed: data.technical?.commands_executed || [],
        services_affected: data.technical?.services_affected || [],
        backup_location: data.technical?.backup_location || '',
        rollback_procedure: data.technical?.rollback_procedure || '',
        validation_steps: data.technical?.validation_steps || []
      },
      
      human_resources: {
        executor: data.human_resources?.executor || 'system',
        reviewer: data.human_resources?.reviewer || '',
        approver: data.human_resources?.approver || '',
        time_invested: data.human_resources?.time_invested || 0,
        skill_level_required: data.human_resources?.skill_level_required || 'basic'
      },
      
      status: {
        current: data.status?.current || 'completed',
        completion_percentage: data.status?.completion_percentage || 100,
        milestones: data.status?.milestones || [],
        next_review_date: data.status?.next_review_date || null,
        maintenance_frequency: data.status?.maintenance_frequency || 'monthly'
      },
      
      tags: data.tags || []
    };
  }

  /**
   * Валідація entry
   */
  async validateEntry(entry) {
    // Базова валідація обов'язкових полів
    const required = [
      'procedure.type', 'procedure.name',
      'changes.what', 'changes.why',
      'impact.scope', 'impact.severity',
      'human_resources.executor', 'status.current'
    ];
    
    for (const field of required) {
      const value = this.getNestedValue(entry, field);
      if (!value) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Валідація enum значень
    const enums = {
      'procedure.type': ['seiri', 'seiton', 'seiso', 'seiketsu', 'shitsuke'],
      'changes.type': ['add', 'update', 'remove', 'optimize', 'fix', 'refactor'],
      'impact.scope': ['local', 'service', 'system', 'global'],
      'impact.severity': ['low', 'medium', 'high', 'critical']
    };
    
    for (const [field, validValues] of Object.entries(enums)) {
      const value = this.getNestedValue(entry, field);
      if (value && !validValues.includes(value)) {
        throw new Error(`Invalid value for ${field}: ${value}. Valid values: ${validValues.join(', ')}`);
      }
    }
    
    return true;
  }

  /**
   * Збереження у файлову систему
   */
  async saveToFileSystem(entry) {
    const quarter = entry.quarter;
    const [year, q] = quarter.split('-');
    
    // Створюємо директорію кварталу якщо не існує
    const quarterDir = path.join(this.config.baseDir, year, q);
    await fs.mkdir(quarterDir, { recursive: true });
    
    // JSON файл
    const jsonPath = path.join(quarterDir, `${entry.id}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(entry, null, 2), 'utf8');
    
    // Markdown файл для читабельності
    const mdPath = path.join(quarterDir, `${entry.id}.md`);
    const markdown = this.generateMarkdown(entry);
    await fs.writeFile(mdPath, markdown, 'utf8');
    
    console.log(`💾 Saved entry to: ${jsonPath}`);
  }

  /**
   * Генерація Markdown представлення
   */
  generateMarkdown(entry) {
    return `# ${entry.procedure.name}

**ID:** ${entry.id}  
**Дата:** ${new Date(entry.timestamp).toLocaleDateString('uk-UA')}  
**Квартал:** ${entry.quarter}  
**Тип процедури:** ${this.translateProcedureType(entry.procedure.type)}  
**Категорія:** ${entry.procedure.category}

## Опис процедури
${entry.procedure.description || 'Опис відсутній'}

## Зміни

### Що змінено
${entry.changes.what}

### Чому змінено
${entry.changes.why}

### Як змінено
${entry.changes.how || 'Технічні деталі не вказані'}

${entry.changes.before ? `### До змін\n${entry.changes.before}\n` : ''}
${entry.changes.after ? `### Після змін\n${entry.changes.after}\n` : ''}

## Вплив

**Масштаб:** ${entry.impact.scope}  
**Критичність:** ${entry.impact.severity}  
${entry.impact.affected_components?.length ? `**Компоненти:** ${entry.impact.affected_components.join(', ')}` : ''}
${entry.impact.estimated_time_saved ? `**Заощаджений час:** ${entry.impact.estimated_time_saved} хв/день` : ''}
${entry.impact.estimated_cost_impact ? `**Вплив на вартість:** $${entry.impact.estimated_cost_impact}/місяць` : ''}

## Технічні деталі

${entry.technical.files_modified?.length ? `**Змінені файли:**\n${entry.technical.files_modified.map(f => `- ${f}`).join('\n')}\n` : ''}
${entry.technical.commands_executed?.length ? `**Виконані команди:**\n\`\`\`bash\n${entry.technical.commands_executed.join('\n')}\n\`\`\`\n` : ''}
${entry.technical.services_affected?.length ? `**Сервіси:** ${entry.technical.services_affected.join(', ')}` : ''}

## Людські ресурси

**Виконавець:** ${entry.human_resources.executor}  
${entry.human_resources.reviewer ? `**Перевіряючий:** ${entry.human_resources.reviewer}` : ''}
${entry.human_resources.approver ? `**Затверджувач:** ${entry.human_resources.approver}` : ''}
${entry.human_resources.time_invested ? `**Витрачений час:** ${entry.human_resources.time_invested} хв` : ''}
**Необхідний рівень навичок:** ${entry.human_resources.skill_level_required}

## Статус

**Поточний статус:** ${entry.status.current}  
**Відсоток виконання:** ${entry.status.completion_percentage}%  
${entry.status.next_review_date ? `**Наступний огляд:** ${entry.status.next_review_date}` : ''}
**Частота обслуговування:** ${entry.status.maintenance_frequency}

${entry.tags?.length ? `## Теги\n${entry.tags.map(tag => `\`${tag}\``).join(' ')}` : ''}

---
*Створено: ${new Date(entry._created).toLocaleString('uk-UA')}*  
*Оновлено: ${new Date(entry._updated).toLocaleString('uk-UA')}*
`;
  }

  /**
   * Переклад типів процедур 5S
   */
  translateProcedureType(type) {
    const translations = {
      seiri: 'Сортування (整理)',
      seiton: 'Систематизація (整頓)',
      seiso: 'Прибирання (清掃)',
      seiketsu: 'Стандартизація (清潔)',
      shitsuke: 'Самодисципліна (躾)'
    };
    return translations[type] || type;
  }

  /**
   * Створення структури директорій
   */
  async createDirectoryStructure() {
    const dirs = [
      this.config.baseDir,
      path.join(this.config.baseDir, 'schemas'),
      path.join(this.config.baseDir, 'templates'),
      path.join(this.config.baseDir, this.currentQuarter.replace('-', '/'))
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Пошук у файловій системі
   */
  async searchInFileSystem(filters = {}) {
    const results = [];
    const files = await this.findJsonEntries(this.config.baseDir);
    for (const file of files) {
      try {
        const entry = JSON.parse(await fs.readFile(file, 'utf8'));
        if (this.entryMatchesFilters(entry, filters)) {
          results.push(entry);
        }
      } catch {
        // Ignore malformed historical files; validation catches new writes.
      }
    }
    return results;
  }

  /**
   * Пошук файлу запису за ID
   */
  async findEntryFile(id) {
    // Спробуємо знайти файл у поточному кварталі спочатку
    const currentQuarterPath = path.join(
      this.config.baseDir,
      this.currentQuarter.replace('-Q', '/Q'),
      `${id}.json`
    );
    
    try {
      await fs.access(currentQuarterPath);
      return currentQuarterPath;
    } catch {
      const matches = await this.findJsonEntries(this.config.baseDir);
      return matches.find(file => path.basename(file) === `${id}.json`) || null;
    }
  }

  async findJsonEntries(root) {
    const results = [];
    let entries = [];
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        results.push(...await this.findJsonEntries(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('template')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  entryMatchesFilters(entry, filters) {
    const mapping = {
      procedure_type: entry.procedure?.type,
      type: entry.procedure?.type,
      severity: entry.impact?.severity,
      status: entry.status?.current,
      executor: entry.human_resources?.executor,
      quarter: entry.quarter
    };

    return Object.entries(filters || {}).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true;
      return String(mapping[key] ?? this.getNestedValue(entry, key) ?? '') === String(value);
    });
  }

  /**
   * Отримання значення з nested object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Закриття з'єднань
   */
  async close() {
    if (this.mongoConnector) {
      await this.mongoConnector.disconnect();
    }
  }
}

export default FiveSChangelogManager;
