# Shitsuke: Щотижневий аудит виконання 5S

## Guided Reasoning Schema

### 1. PREPARE (Підготуватися до аудиту)
```
DATE=$(date +%Y-%m-%d)
AUDIT_REPORT="/root/.5s-system/reports/weekly-audit-$DATE.md"
PREVIOUS_AUDIT=$(ls -t /root/.5s-system/reports/weekly-audit-*.md 2>/dev/null | head -2 | tail -1)
```

**Pre-audit checklist:**
- Чи виконувався щотижневий 5S цикл?
- Чи працюють автоматичні процеси?
- Які проблеми виникали за тиждень?

### 2. AUDIT_1S (Аудит Seiri - Сортування)

#### 2.1 Перевірити файлову систему
```
router_monitor({ action: "disk" })
router_files({ action: "find", path: "/root", options: { size: "+50M", type: "f" }})
router_files({ action: "list", path: "/root/.5s-system/quarantine" })
```

**Питання аудиту:**
- Чи з'явились нові великі файли?
- Чи використовується карантинна папка?
- Чи видалено непотрібні файли з карантину?
- Чи зменшилось використання диску?

**Оцінка (1-5):**
- 5: Диск <70%, карантин порожній, файли організовані
- 3: Диск <80%, карантин використовується правильно  
- 1: Диск >90%, карантин переповнений

#### 2.2 Перевірити пакети
```
router_packages({ action: "list", options: { autoremovable: true }})
router_shell({ command: "apt list --installed | wc -l" })
```

### 3. AUDIT_2S (Аудит Seiton - Систематизація)

#### 3.1 Перевірити структуру директорій
```
router_files({ action: "list", path: "/root" })
router_shell({ command: "ls -la /root/projects/" })
```

**Питання аудиту:**
- Чи дотримується стандартна структура?
- Чи всі проекти в /root/projects/?
- Чи працюють aliases для швидкого доступу?
- Чи консистентні назви файлів?

**Оцінка (1-5):**
- 5: Повна відповідність стандарту
- 3: Незначні відхилення від стандарту
- 1: Хаотична структура

### 4. AUDIT_3S (Аудит Seiso - Прибирання)

#### 4.1 Перевірити системні ресурси
```
router_monitor({ action: "memory" })
router_monitor({ action: "load" })
router_system({ action: "ps" })
```

**Питання аудиту:**
- Чи виконується щоденне очищення?
- Чи немає zombie процесів?
- Чи оптимальне використання RAM?
- Чи ротуються логи правильно?

**Оцінка (1-5):**
- 5: RAM <70%, логи <1GB, немає zombie
- 3: RAM <85%, логи <2GB, мало zombie
- 1: RAM >90%, логи >5GB, багато zombie

### 5. AUDIT_4S (Аудит Seiketsu - Стандартизація)

#### 5.1 Перевірити автоматизацію
```
router_shell({ command: "crontab -l" })
router_shell({ command: "systemctl list-timers" })
router_files({ action: "list", path: "/root/logs" })
```

**Питання аудиту:**
- Чи працюють cron jobs?
- Чи створюються логи автоматичних процесів?
- Чи актуальні скрипти автоматизації?
- Чи відповідають процедури документації?

**Оцінка (1-5):**
- 5: Всі автоматичні процеси працюють, логи ведуться
- 3: Більшість процесів працює, є незначні збої
- 1: Автоматизація не працює, логи відсутні

### 6. AUDIT_5S (Аудит Shitsuke - Дисципліна)

#### 6.1 Перевірити дотримання процедур
```
router_files({ action: "list", path: "/root/.5s-system/checklists" })
router_files({ action: "list", path: "/root/.5s-system/reports" })
```

**Питання аудиту:**
- Чи виконується щотижневий 5S?
- Чи ведуться звіти про виконання?
- Чи покращуються показники з часом?
- Чи впроваджуються покращення?

**Оцінка (1-5):**
- 5: 5S виконується регулярно, є покращення
- 3: 5S виконується з затримками
- 1: 5S не виконується систематично

### 7. ANALYZE (Проаналізувати тренди)

#### 7.1 Порівняти з попереднім тижнем
```bash
if [ -f "$PREVIOUS_AUDIT" ]; then
    echo "## Comparison with Previous Week" >> $AUDIT_REPORT
    echo "" >> $AUDIT_REPORT
    
    # Витягнути показники з попереднього звіту
    PREV_DISK=$(grep "Disk usage:" $PREVIOUS_AUDIT | head -1)
    PREV_RAM=$(grep "RAM usage:" $PREVIOUS_AUDIT | head -1)
    
    echo "Previous: $PREV_DISK" >> $AUDIT_REPORT  
    echo "Current: Disk usage: $(df -h / | awk 'NR==2{print $5}')" >> $AUDIT_REPORT
    echo "" >> $AUDIT_REPORT
fi
```

#### 7.2 Обчислити загальний рейтинг
```bash
# Загальна оцінка = середнє арифметичне всіх 5S
TOTAL_SCORE=$(( (SEIRI_SCORE + SEITON_SCORE + SEISO_SCORE + SEIKETSU_SCORE + SHITSUKE_SCORE) ))
AVERAGE_SCORE=$(echo "scale=1; $TOTAL_SCORE / 5" | bc)

echo "## Overall 5S Score: $AVERAGE_SCORE/5.0" >> $AUDIT_REPORT
```

### 8. PLAN_IMPROVEMENTS (Спланувати покращення)

#### 8.1 Визначити найслабші місця
```bash
echo "## Areas for Improvement" >> $AUDIT_REPORT

if [ $SEIRI_SCORE -lt 4 ]; then
    echo "- **Seiri (Sorting)**: Focus on file cleanup and storage optimization" >> $AUDIT_REPORT
fi

if [ $SEITON_SCORE -lt 4 ]; then
    echo "- **Seiton (Organization)**: Improve directory structure and naming" >> $AUDIT_REPORT
fi
# ... інші перевірки ...
```

#### 8.2 Створити план дій на наступний тиждень
```bash
echo "## Action Plan for Next Week" >> $AUDIT_REPORT
echo "" >> $AUDIT_REPORT
echo "1. [ ] Address lowest scoring area first" >> $AUDIT_REPORT
echo "2. [ ] Update automation scripts if needed" >> $AUDIT_REPORT
echo "3. [ ] Monitor key metrics daily" >> $AUDIT_REPORT
echo "4. [ ] Review and update 5S procedures" >> $AUDIT_REPORT
```

### 9. DOCUMENT (Задокументувати результати)

#### 9.1 Створити повний звіт
```bash
cat > $AUDIT_REPORT << EOF
# Weekly 5S Audit Report - $DATE

## Executive Summary
- Overall Score: $AVERAGE_SCORE/5.0
- Status: $(if [ $(echo "$AVERAGE_SCORE >= 4" | bc) -eq 1 ]; then echo "GOOD"; elif [ $(echo "$AVERAGE_SCORE >= 3" | bc) -eq 1 ]; then echo "FAIR"; else echo "NEEDS IMPROVEMENT"; fi)

## Detailed Scores
- 1S (Seiri - Sorting): $SEIRI_SCORE/5
- 2S (Seiton - Organization): $SEITON_SCORE/5  
- 3S (Seiso - Cleaning): $SEISO_SCORE/5
- 4S (Seiketsu - Standardization): $SEIKETSU_SCORE/5
- 5S (Shitsuke - Discipline): $SHITSUKE_SCORE/5

## System Metrics
- Disk usage: $(df -h / | awk 'NR==2{print $5}')
- RAM usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
- System load: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')
- Services status: $(systemctl is-active ui-agent-claude ui-agent-telegram ui-agent-tools mongodb rabbitmq-server caddy | tr '\n' ', ' | sed 's/,$//')

$(cat improvement_plans.tmp 2>/dev/null || echo "")

## Next Review Date
$(date -d '+7 days' '+%Y-%m-%d')

---
Generated by 5S Weekly Audit System
EOF
```

### 10. COMMIT (Зафіксувати прогрес)

#### 10.1 Оновити метрики в Git
```bash
cd /root/projects/ui-agent-5s

# Додати звіт до Git
git add .
git commit -m "Weekly 5S audit report - $DATE (Score: $AVERAGE_SCORE/5.0)"

# Створити tag для важливих мілстоунів
if [ $(echo "$AVERAGE_SCORE >= 4.5" | bc) -eq 1 ]; then
    git tag "excellent-5s-$DATE"
fi
```

## Критерії успіху щотижневого аудиту
- [ ] Проведено аудит всіх 5S
- [ ] Присвоєно оцінки кожній S (1-5)
- [ ] Порівняно з попереднім тижнем  
- [ ] Визначено області для покращення
- [ ] Створено план дій на наступний тиждень
- [ ] Результати задокументовано та збережено в Git
