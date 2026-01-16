# 📝 Формат 5S Changelog

## Структура Зберігання

### Актуальність: **3 місяці (квартал)**
- Достатньо для аналізу трендів
- Не перевантажує систему історією
- Дозволяє бачити сезонні патерни

### Директорії:
```
docs/changes/5s-procedures/
├── 2026-Q1/                    # Архів кварталу
│   ├── procedures/             # JSON записи процедур
│   ├── reports/               # Markdown звіти
│   └── analytics/             # Аналітичні дані
├── 2026-Q2/                   # Наступний квартал
└── current -> 2026-Q1/        # Символьне посилання на поточний
```

## 🗂️ Формати Файлів

### 1. JSON Запис Процедури
```json
{
  "id": "5s_20260116_001",
  "timestamp": "2026-01-16T18:45:00Z",
  "type": "weekly_5s",
  "phase": "sort", // sort, set_in_order, shine, standardize, sustain
  "duration_minutes": 45,
  "agent": "claude-sonnet-3.5",
  "user_initiated": true,
  "backup_created": "ui-agent-backup-20260116-1845.tar.gz",
  "actions": [
    {
      "category": "log_cleanup",
      "description": "Removed logs older than 30 days",
      "files_affected": 23,
      "space_freed_mb": 150,
      "safety_check": "dry_run_completed"
    }
  ],
  "results": {
    "success": true,
    "errors": [],
    "warnings": ["Large nginx log files detected"],
    "improvements": {
      "disk_space_freed_mb": 150,
      "files_organized": 23,
      "standards_updated": 2
    }
  },
  "next_recommended": {
    "date": "2026-01-23",
    "focus": "set_in_order"
  }
}
```

### 2. Markdown Звіт
```markdown
# 5S Weekly Report - 2026-01-16

## 📊 Summary
- **Phase**: Sort (整理)
- **Duration**: 45 minutes
- **Status**: ✅ Success
- **Space Freed**: 150 MB

## 🎯 Actions Performed
- [x] Log cleanup (30+ days old)
- [x] Temp files removal
- [x] Package cache cleanup

## ⚠️ Warnings
- Large nginx log files detected
- Consider log rotation optimization

## 📈 Improvements
- Freed 150 MB disk space
- Organized 23 files
- Updated 2 standards

## 🔄 Next Steps
- Focus on "Set in Order" phase next week
- Consider nginx log rotation setup
```

### 3. MongoDB Collection Schema
```javascript
db.s5_procedures.insertOne({
  _id: ObjectId(),
  procedure_id: "5s_20260116_001",
  timestamp: ISODate("2026-01-16T18:45:00Z"),
  quarter: "2026-Q1",
  week: 3,
  phase: "sort",
  metrics: {
    duration_minutes: 45,
    space_freed_mb: 150,
    files_affected: 23,
    errors_count: 0,
    warnings_count: 1
  },
  tags: ["log_cleanup", "temp_files", "success"],
  agent_version: "claude-sonnet-3.5"
});
```

## 🔄 Процедура Ротації

### Автоматична ротація кварталів:
1. На початку нового кварталу
2. Архівування попереднього кварталу
3. Створення нової директорії
4. Оновлення символьного посилання `current`
5. Видалення кварталів старших за 1 рік

### Backup старих даних:
- Архівація у `/backup/5s-history/`
- Збереження ключової статистики
- Експорт у CSV для аналізу

## 📊 Аналітичні Можливості

### Запити які можна робити:
- Ефективність по фазах 5S
- Тренди звільнення дискового простору
- Частота помилок по типам операцій
- Продуктивність різних агентів
- Сезонні патерни в обслуговуванні

### Dashboard метрики:
- Середній час виконання процедур
- Відсоток успішних операцій
- Загальний об'єм звільненого простору
- TOP проблемних зон

---
**Мета**: Забезпечити повну трейсабільність та постійне покращення 5S процедур