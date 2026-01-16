/**
 * MongoDB Schema для 5S Procedures Changelog
 * Колекція: fiveS_changelog
 */

// Основна схема документа в MongoDB
const fiveSChangelogSchema = {
  // Унікальний ідентифікатор запису
  _id: ObjectId,
  
  // Метадані запису
  id: String,                    // Унікальний ID у форматі YYYYMMDD-HHMMSS-XXX
  timestamp: Date,              // ISO дата створення
  quarter: String,              // Квартал у форматі "2025-Q1"
  version: String,              // Версія схеми для міграцій
  
  // 5S Процедура
  procedure: {
    type: String,              // Тип процедури: "seiri", "seiton", "seiso", "seiketsu", "shitsuke"
    name: String,              // Назва процедури
    description: String,       // Опис процедури
    category: String           // Категорія: "system", "security", "performance", "maintenance"
  },
  
  // Зміни
  changes: {
    type: String,              // Тип зміни: "add", "update", "remove", "optimize", "fix"
    what: String,              // Що змінено (короткий опис)
    why: String,               // Чому змінено (обґрунтування)
    how: String,               // Як змінено (технічні деталі)
    before: String,            // Стан до змін (опціонально)
    after: String              // Стан після змін (опціонально)
  },
  
  // Вплив та результати
  impact: {
    scope: String,             // Масштаб впливу: "local", "service", "system", "global"
    severity: String,          // Критичність: "low", "medium", "high", "critical"
    affected_components: [String], // Список компонентів, що зазнали впливу
    performance_metrics: {     // Метрики продуктивності
      cpu_impact: Number,      // % зміни CPU (-100 to +100)
      memory_impact: Number,   // % зміни пам'яті
      disk_impact: Number,     // % зміни дискового простору
      network_impact: Number   // % зміни мережевого трафіку
    },
    estimated_time_saved: Number, // Час заощаджений в хвилинах/день
    estimated_cost_impact: Number // Вплив на вартість $/місяць
  },
  
  // Технічні деталі
  technical: {
    files_modified: [String],  // Список змінених файлів
    commands_executed: [String], // Виконані команди
    services_affected: [String], // Сервіси, що потребували перезапуску
    backup_location: String,   // Локація резервних копій
    rollback_procedure: String, // Процедура відкату
    validation_steps: [String] // Кроки валідації
  },
  
  // Людські ресурси
  human_resources: {
    executor: String,          // Хто виконував
    reviewer: String,          // Хто перевіряв
    approver: String,          // Хто затверджував
    time_invested: Number,     // Витрачений час в хвилинах
    skill_level_required: String // Необхідний рівень навичок: "basic", "intermediate", "advanced", "expert"
  },
  
  // Статус та відстеження
  status: {
    current: String,           // Поточний статус: "planned", "in_progress", "completed", "failed", "rolled_back"
    completion_percentage: Number, // % виконання (0-100)
    milestones: [{
      name: String,
      status: String,          // "pending", "completed", "failed"
      timestamp: Date,
      notes: String
    }],
    next_review_date: Date,    // Дата наступного огляду
    maintenance_frequency: String // Частота обслуговування: "daily", "weekly", "monthly", "quarterly"
  },
  
  // Теги та категоризація
  tags: [String],              // Теги для пошуку та групування
  
  // Індекси для оптимізації запитів
  indexes: {
    compound: [
      { "timestamp": -1, "procedure.type": 1 },
      { "quarter": 1, "impact.severity": 1 },
      { "technical.services_affected": 1, "status.current": 1 }
    ],
    text: ["procedure.name", "changes.what", "changes.why"],
    sparse: ["technical.files_modified", "tags"]
  }
};

module.exports = {
  fiveSChangelogSchema,
  collections: {
    main: "fiveS_changelog",
    archive: "fiveS_changelog_archive",
    templates: "fiveS_templates",
    metrics: "fiveS_metrics"
  }
};
