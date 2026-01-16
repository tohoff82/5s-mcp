# 5S Procedures Changelog System

Система для відслідковування змін згідно з методологією 5S (японська система організації робочого місця).

## 🏗️ Структура системи

```
docs/changes/5s-procedures/
├── README.md                 # Документація
├── 2025/                     # Рік
│   ├── Q1/                   # Квартал
│   │   ├── 20250115-190245-EX1.json  # JSON запис
│   │   ├── 20250115-190245-EX1.md    # Markdown версія
│   │   └── ...
│   └── Q2/
├── schemas/                  # Схеми валідації
│   ├── mongodb-schema.js     # MongoDB схема
│   └── json-schema.json      # JSON Schema
├── templates/                # Шаблони для різних типів
│   ├── seiri-template.json   # Сортування
│   ├── seiton-template.json  # Систематизація 
│   ├── seiso-template.json   # Прибирання
│   ├── seiketsu-template.json # Стандартизація
│   └── shitsuke-template.json # Самодисципліна
└── scripts/                  # Допоміжні скрипти
```

## 📋 5S Методологія

### 🔍 1. Seiri (整理) - Сортування
- **Мета**: Видалення непотрібних речей
- **У IT**: Видалення застарілого коду, непотрібних файлів, невикористовуваних сервісів
- **Приклади**: Очищення старих логів, видалення unused dependencies

### 📊 2. Seiton (整頓) - Систематизація
- **Мета**: Організація необхідних речей
- **У IT**: Структурування коду, організація файлів, стандартизація конфігурацій
- **Приклади**: Реорганізація директорій, стандартизація naming conventions

### 🧹 3. Seiso (清掃) - Прибирання
- **Мета**: Підтримання чистоти
- **У IT**: Регулярне обслуговування системи, оновлення, патчі
- **Приклади**: Очищення кешу, оновлення пакетів, дефрагментація

### 📐 4. Seiketsu (清潔) - Стандартизація
- **Мета**: Створення стандартів для підтримання порядку
- **У IT**: Документування процедур, створення automation scripts
- **Приклади**: CI/CD pipelines, monitoring alerts, backup procedures

### 🎯 5. Shitsuke (躾) - Самодисципліна
- **Мета**: Формування звичок дотримання стандартів
- **У IT**: Code reviews, regular audits, training
- **Приклади**: Automated testing, security scans, performance monitoring

## 💾 Структура даних

### Основні поля

```json
{
  "id": "YYYYMMDD-HHMMSS-XXX",        // Унікальний ID
  "timestamp": "2025-01-15T19:02:45Z", // ISO дата
  "quarter": "2025-Q1",               // Квартал
  "procedure": {
    "type": "seiri|seiton|seiso|seiketsu|shitsuke",
    "name": "Назва процедури",
    "description": "Опис",
    "category": "system|security|performance|maintenance"
  },
  "changes": {
    "type": "add|update|remove|optimize|fix",
    "what": "Що змінено",
    "why": "Чому змінено", 
    "how": "Як змінено"
  },
  "impact": {
    "scope": "local|service|system|global",
    "severity": "low|medium|high|critical",
    "affected_components": [],
    "performance_metrics": {
      "cpu_impact": -5,      // % зміна (-100 to +100)
      "memory_impact": -10,
      "disk_impact": -15,
      "network_impact": 0
    }
  },
  "technical": {
    "files_modified": [],
    "commands_executed": [],
    "services_affected": []
  },
  "human_resources": {
    "executor": "admin",
    "time_invested": 30,     // хвилини
    "skill_level_required": "basic|intermediate|advanced|expert"
  },
  "status": {
    "current": "completed",
    "completion_percentage": 100,
    "maintenance_frequency": "weekly"
  },
  "tags": ["cleanup", "maintenance", "seiso"]
}
```

## 🔧 Використання

### CLI інструмент

```bash
# Створити новий запис з шаблону
node src/changelog/cli.js create --template seiso --quick

# Пошук записів
node src/changelog/cli.js search --type seiri --severity high

# Перегляд всіх записів за квартал
node src/changelog/cli.js list --quarter 2025-Q1

# Детальний перегляд запису
node src/changelog/cli.js show 20250115-190245-EX1

# Статистика
node src/changelog/cli.js stats --quarter 2025-Q1

# Синхронізація з MongoDB
node src/changelog/cli.js sync
```

### Програмний інтерфейс

```javascript
const FiveSChangelogManager = require('./src/changelog/changelog-manager');

const manager = new FiveSChangelogManager({
  baseDir: 'docs/changes/5s-procedures',
  mongodb: {
    uri: 'mongodb://localhost:27017',
    database: 'ui_agent_changelog'
  },
  autoSync: true
});

await manager.initialize();

// Створити новий запис
const entry = await manager.createEntry({
  procedure: {
    type: 'seiso',
    name: 'Очищення логів',
    category: 'maintenance'
  },
  changes: {
    type: 'optimize',
    what: 'Видалені старі логи',
    why: 'Звільнення місця'
  },
  impact: {
    scope: 'system',
    severity: 'medium'
  },
  human_resources: {
    executor: 'admin'
  }
});

// Пошук записів
const results = await manager.searchEntries({
  procedure_type: 'seiri',
  severity: 'high',
  quarter: '2025-Q1'
});
```

## 🔌 MongoDB Integration

### Налаштування підключення

```javascript
// В конфігурації або .env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=ui_agent_changelog
CHANGELOG_AUTO_SYNC=true
```

### Колекції

1. **fiveS_changelog** - Основні записи
2. **fiveS_changelog_archive** - Архів (старше 3 кварталів)
3. **fiveS_templates** - Шаблони процедур
4. **fiveS_metrics** - Агреговані метрики

### Індекси

- `{ timestamp: -1, procedure.type: 1 }` - Хронологічний пошук
- `{ quarter: 1, impact.severity: 1 }` - Квартальна статистика
- `{ id: 1 }` - Унікальний constraint
- Text index на `procedure.name`, `changes.what`, `changes.why`

## 📊 Звіти та аналітика

### Доступні метрики

- Кількість записів за типом процедури
- Розподіл за критичністю (severity)
- Загальний час, витрачений на зміни
- Заощаджений час (estimated_time_saved)
- Вплив на вартість (cost_impact)
- Найактивніші виконавці

### Приклад запиту статистики

```javascript
const stats = await manager.mongoConnector.getStatistics('2025-Q1');
console.log(`Total entries: ${stats.total_entries}`);
console.log(`Time saved: ${stats.total_time_saved} min/day`);
console.log(`Cost impact: $${stats.total_cost_impact}/month`);
```

## 🔄 Життєвий цикл запису

1. **Створення** - Новий запис на основі шаблону
2. **Виконання** - Оновлення статусу та milestone'ів
3. **Завершення** - Финальна валідація та metrics
4. **Архівування** - Переміщення в archive колекцію (через 3 квартали)

## 🛡️ Безпека та резервування

### Автоматичне резервування

```bash
# Щоденне резервування (cron)
0 2 * * * /path/to/backup-changelog.sh
```

### Відновлення з архіву

```javascript
// Відновлення записи з архіву
await manager.mongoConnector.restoreFromArchive('20240115-*');
```

## 🚀 Розширення системи

### Додавання нових типів процедур

1. Створити шаблон у `templates/`
2. Додати enum значення в `schemas/`
3. Оновити валідацію в `changelog-manager.js`

### Інтеграції

- **Slack/Discord** - Автоматичні повідомлення про критичні зміни
- **Git** - Автоматичні коміти changelog файлів
- **Monitoring** - Інтеграція з системами моніторингу

## ❓ FAQ

**Q: Чому використовується гібридний підхід (файли + MongoDB)?**
A: Файли забезпечують version control та читабельність, MongoDB - потужну аналітику та пошук.

**Q: Як часто архівувати записи?**
A: За замовчуванням записи архівуються через 3 квартали для збереження актуальності.

**Q: Що робити якщо MongoDB недоступна?**
A: Система працює в режимі "файли тільки", автосинхронізація вимикається.

**Q: Як забезпечити унікальність ID?**
A: ID генерується з timestamp + random suffix, колізії практично неможливі.

## 📚 Додаткові ресурси

- [5S Methodology Overview](https://en.wikipedia.org/wiki/5S_(methodology))
- [JSON Schema Documentation](https://json-schema.org/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

**Версія документації:** 1.0  
**Останнє оновлення:** 15 січня 2025
