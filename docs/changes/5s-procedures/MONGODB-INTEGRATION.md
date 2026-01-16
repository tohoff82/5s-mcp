# 📊 MongoDB Integration для 5S Changelog

## Обґрунтування Гібридного Підходу

### 🤔 Чому гібрид (Files + MongoDB)?

**Файли як "Single Source of Truth":**
- Git версіонування
- Легко читати людям
- Не залежить від БД
- Backup автоматично з кодом

**MongoDB для Аналітики:**
- Швидкі агрегації та запити
- Фільтрування по датах/типах
- Dashboard метрики
- Тренд аналіз

## 🗃️ MongoDB Schema

### Collection: `s5_procedures`
```javascript
{
  _id: ObjectId("..."),
  procedure_id: "5s_20260116_001",           // Унікальний ID
  timestamp: ISODate("2026-01-16T18:45:00Z"), 
  quarter: "2026-Q1",                        // Для партиціонування
  week_of_year: 3,                           // Тижневі тренди
  
  // Основна інформація
  type: "framework_establishment",            // weekly_5s, emergency_cleanup, etc
  phase: "sort",                             // sort, set_in_order, shine, standardize, sustain
  agent: "claude-sonnet-3.5",
  user_initiated: true,
  status: "completed",                       // planning, in_progress, completed, failed
  
  // Метрики продуктивності
  metrics: {
    duration_minutes: 120,
    space_freed_mb: 0,
    files_affected: 4,
    errors_count: 0,
    warnings_count: 0,
    backup_size_mb: 0
  },
  
  // Категоризація для аналізу
  categories: ["documentation", "safety", "framework"],
  tags: ["critical", "self-reference", "foundation"],
  
  // Результати
  success_rate: 1.0,                         // 0.0 - 1.0
  safety_score: 1.0,                         // Дотримання safety протоколів
  impact_level: "high",                      // low, medium, high, critical
  
  // Зв'язки
  related_procedures: [],                    // ID пов'язаних процедур
  follows_up: null,                          // ID попередньої процедури
  
  // Технічні деталі
  safety_framework_version: "1.0.0",
  backup_created: null,
  file_path: "2026-Q1/procedures/5s_20260116_001.json",
  
  // Timestamps
  created_at: ISODate("2026-01-16T18:45:00Z"),
  updated_at: ISODate("2026-01-16T18:45:00Z")
}
```

### Collection: `s5_analytics` (щоденні агрегати)
```javascript
{
  _id: ObjectId("..."),
  date: ISODate("2026-01-16"),
  quarter: "2026-Q1",
  
  // Денна статистика
  procedures_count: 1,
  total_duration_minutes: 120,
  total_space_freed_mb: 0,
  success_rate: 1.0,
  
  // По фазах
  phases: {
    sort: { count: 1, duration: 120, success_rate: 1.0 },
    set_in_order: { count: 0, duration: 0, success_rate: 0 },
    shine: { count: 0, duration: 0, success_rate: 0 },
    standardize: { count: 0, duration: 0, success_rate: 0 },
    sustain: { count: 0, duration: 0, success_rate: 0 }
  },
  
  // Проблемні зони
  top_issues: [],
  warnings_count: 0,
  errors_count: 0
}
```

## 🔄 Синхронізація Files ↔ MongoDB

### Workflow:
1. **Створення процедури** → запис у JSON файл
2. **Post-processing** → парсинг JSON → запис у MongoDB
3. **Ротація кварталів** → архівація файлів + очищення старих записів MongoDB

### Sync Script Concept:
```javascript
// Псевдокод для sync процесу
async function syncFileToMongoDB(jsonFilePath) {
  const data = JSON.parse(fs.readFileSync(jsonFilePath));
  
  // Трансформація файлового формату у MongoDB формат
  const mongoDoc = transformToMongoFormat(data);
  
  // Upsert в MongoDB
  await db.s5_procedures.replaceOne(
    { procedure_id: mongoDoc.procedure_id },
    mongoDoc,
    { upsert: true }
  );
  
  // Оновлення денної аналітики
  await updateDailyAnalytics(mongoDoc);
}
```

## 📊 Приклади Корисних Запитів

### 1. Ефективність по фазах 5S:
```javascript
db.s5_procedures.aggregate([
  { $match: { quarter: "2026-Q1" } },
  { $group: {
    _id: "$phase",
    avg_duration: { $avg: "$metrics.duration_minutes" },
    success_rate: { $avg: "$success_rate" },
    total_procedures: { $sum: 1 }
  }}
]);
```

### 2. Тижневі тренди:
```javascript
db.s5_procedures.aggregate([
  { $match: { quarter: "2026-Q1" } },
  { $group: {
    _id: "$week_of_year",
    total_space_freed: { $sum: "$metrics.space_freed_mb" },
    procedures_count: { $sum: 1 },
    avg_duration: { $avg: "$metrics.duration_minutes" }
  }},
  { $sort: { _id: 1 } }
]);
```

### 3. Проблемні зони:
```javascript
db.s5_procedures.find({
  quarter: "2026-Q1",
  $or: [
    { "metrics.errors_count": { $gt: 0 } },
    { success_rate: { $lt: 1.0 } },
    { "metrics.warnings_count": { $gt: 3 } }
  ]
});
```

## 🎯 Retention Policy

### MongoDB:
- **Поточний квартал**: Повні дані
- **Попередні 2 квартали**: Повні дані  
- **Старші кварталі**: Тільки агрегована статистика
- **1 рік+**: Видалення з можливістю відновлення з файлів

### Files:
- **Поточний квартал**: Активні файли
- **Попередні 2 квартали**: Архівні файли
- **1 рік+**: Backup у `/backup/5s-history/`

## 🔧 Implementation Plan

### Phase 1: Файлова система (готово)
- ✅ JSON структура
- ✅ Markdown звіти  
- ✅ Квартальна ротація

### Phase 2: MongoDB інтеграція
- [ ] Створити sync скрипт
- [ ] Налаштувати індекси
- [ ] Тестові запити
- [ ] Валідація даних

### Phase 3: Analytics Dashboard
- [ ] Aggregation queries
- [ ] Візуалізація трендів
- [ ] Автоматичні алерти
- [ ] Performance monitoring

---
**Підсумок**: Гібридний підхід дає найкраще з обох світів - надійність файлів + потужність MongoDB аналітики.