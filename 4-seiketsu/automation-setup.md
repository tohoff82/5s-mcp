# Seiketsu: Налаштування автоматизації

## Guided Reasoning Schema

### 1. ASSESS (Оцінити поточну автоматизацію)
```
router_shell({ command: "crontab -l" })
router_system({ action: "list", target: "timer" })
router_files({ action: "list", path: "/etc/systemd/system", options: { pattern: "*.timer" }})
router_shell({ command: "systemctl list-timers" })
```

**Питання для аналізу:**
- Які завдання виконуються автоматично?
- Чи достатньо автоматизації?
- Які ручні процеси можна автоматизувати?
- Чи працюють існуючі автоматичні завдання?

### 2. DESIGN (Спроектувати систему автоматизації)

#### 2.1 Категорії автоматичних завдань:

**DAILY** (Щоденно):
- Очищення temp файлів
- Перевірка стану сервісів
- Ротація логів
- Backup incremental

**WEEKLY** (Щотижня):  
- Повний 5S цикл
- Оновлення системи
- Defragmentation (якщо потрібно)
- Full backup

**MONTHLY** (Щомісяця):
- Глибока перевірка безпеки
- Архівування старих даних
- Перегенерація сертифікатів (якщо потрібно)
- System health report

### 3. IMPLEMENT (Реалізувати автоматизацію)

#### 3.1 Налаштування cron завдань
```bash
# Backup поточного crontab
crontab -l > /root/configs/crontab-backup-$(date +%Y-%m-%d).txt

# Створити новий crontab
cat > /tmp/5s-crontab << 'EOF'
# 5S System Automation

# Daily tasks (2 AM)
0 2 * * * /root/scripts/maintenance/daily-cleanup.sh >> /root/logs/daily-cleanup.log 2>&1

# Weekly tasks (Sunday 3 AM) 
0 3 * * 0 /root/scripts/maintenance/weekly-5s.sh >> /root/logs/weekly-5s.log 2>&1

# Health check (every 4 hours)
0 */4 * * * /root/scripts/monitoring/health-check.sh >> /root/logs/health-check.log 2>&1

# Log rotation (daily 1 AM)
0 1 * * * /usr/sbin/logrotate /etc/logrotate.conf >> /root/logs/logrotate.log 2>&1
EOF

# Встановити новий crontab
crontab /tmp/5s-crontab
```

#### 3.2 Створити скрипти автоматизації

**Daily Cleanup Script:**
```bash
cat > /root/scripts/maintenance/daily-cleanup.sh << 'EOF'
#!/bin/bash
# Daily 5S Maintenance Script

LOG_FILE="/root/logs/daily-cleanup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting daily cleanup..." >> $LOG_FILE

# Clean temp files
find /tmp -type f -mtime +1 -delete 2>/dev/null
find /root/temp -type f -mtime +1 -delete 2>/dev/null

# Clear cache
apt-get autoclean -y >/dev/null 2>&1

# Drop memory caches if memory usage > 85%
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 85 ]; then
    sync && echo 3 > /proc/sys/vm/drop_caches
    echo "[$DATE] Dropped caches due to high memory usage: ${MEMORY_USAGE}%" >> $LOG_FILE
fi

# Check disk usage and alert if > 90%
DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "[$DATE] WARNING: High disk usage: ${DISK_USAGE}%" >> $LOG_FILE
    # Можна додати відправлення alert'у
fi

echo "[$DATE] Daily cleanup completed" >> $LOG_FILE
EOF

chmod +x /root/scripts/maintenance/daily-cleanup.sh
```

**Health Check Script:**
```bash
cat > /root/scripts/monitoring/health-check.sh << 'EOF'
#!/bin/bash
# System Health Check Script

LOG_FILE="/root/logs/health-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Health check started" >> $LOG_FILE

# Check critical services
SERVICES=("ui-agent-claude" "ui-agent-telegram" "ui-agent-tools" "mongodb" "rabbitmq-server" "caddy")

for service in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet $service; then
        echo "[$DATE] ERROR: Service $service is not running" >> $LOG_FILE
        # Try to restart
        systemctl restart $service
        sleep 5
        if systemctl is-active --quiet $service; then
            echo "[$DATE] Service $service restarted successfully" >> $LOG_FILE
        else
            echo "[$DATE] CRITICAL: Failed to restart $service" >> $LOG_FILE
        fi
    fi
done

# Check system resources
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
MEMORY=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
DISK=$(df / | awk 'NR==2{print $5}' | sed 's/%//')

echo "[$DATE] System metrics: Load=$LOAD, Memory=${MEMORY}%, Disk=${DISK}%" >> $LOG_FILE

echo "[$DATE] Health check completed" >> $LOG_FILE
EOF

chmod +x /root/scripts/monitoring/health-check.sh
```

#### 3.3 Налаштування systemd timers (альтернатива cron)
```bash
# Створити systemd timer для щотижневого 5S
cat > /etc/systemd/system/5s-weekly.service << 'EOF'
[Unit]
Description=Weekly 5S Maintenance
After=network.target

[Service]
Type=oneshot
ExecStart=/root/scripts/maintenance/weekly-5s.sh
User=root
EOF

cat > /etc/systemd/system/5s-weekly.timer << 'EOF'
[Unit]  
Description=Run 5S maintenance weekly
Requires=5s-weekly.service

[Timer]
OnCalendar=Sun *-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Активувати timer
systemctl daemon-reload
systemctl enable 5s-weekly.timer
systemctl start 5s-weekly.timer
```

### 4. STANDARDIZE (Стандартизувати процедури)

#### 4.1 Створити шаблони скриптів
```bash
mkdir -p /root/scripts/templates

cat > /root/scripts/templates/maintenance-script-template.sh << 'EOF'
#!/bin/bash
# Template for maintenance scripts
# Usage: Copy this template and modify for specific task

SCRIPT_NAME="$(basename $0)"
LOG_FILE="/root/logs/${SCRIPT_NAME%.*}.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Logging function
log() {
    echo "[$DATE] $1" >> $LOG_FILE
    echo "[$DATE] $1"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Main script starts here
log "Starting $SCRIPT_NAME"

# Add your maintenance tasks here

log "$SCRIPT_NAME completed successfully"
EOF
```

### 5. MONITOR (Налаштувати моніторинг автоматизації)

#### 5.1 Перевірка виконання cron jobs
```bash
cat > /root/scripts/monitoring/cron-monitor.sh << 'EOF'
#!/bin/bash
# Monitor cron job execution

LOG_DIR="/root/logs"
REPORT_FILE="/root/.5s-system/reports/cron-status-$(date +%Y-%m-%d).md"

echo "# Cron Jobs Status Report - $(date)" > $REPORT_FILE
echo "" >> $REPORT_FILE

# Check if daily cleanup ran
if [ -f "$LOG_DIR/daily-cleanup.log" ]; then
    LAST_CLEANUP=$(tail -1 $LOG_DIR/daily-cleanup.log | grep -o '\[.*\]' | tr -d '[]')
    echo "- Daily cleanup last ran: $LAST_CLEANUP" >> $REPORT_FILE
else
    echo "- Daily cleanup: NOT FOUND" >> $REPORT_FILE
fi

# Check health checks
if [ -f "$LOG_DIR/health-check.log" ]; then
    LAST_HEALTH=$(tail -1 $LOG_DIR/health-check.log | grep -o '\[.*\]' | tr -d '[]')  
    echo "- Health check last ran: $LAST_HEALTH" >> $REPORT_FILE
else
    echo "- Health check: NOT FOUND" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
EOF

chmod +x /root/scripts/monitoring/cron-monitor.sh
```

### 6. VERIFY (Перевірити автоматизацію)
```
router_shell({ command: "crontab -l" })
router_shell({ command: "systemctl list-timers" })
router_files({ action: "list", path: "/root/scripts/maintenance" })
router_files({ action: "list", path: "/root/logs" })
```

### 7. TEST (Протестувати автоматизацію)
```bash
# Тестовий запуск скриптів
/root/scripts/maintenance/daily-cleanup.sh
/root/scripts/monitoring/health-check.sh

# Перевірити логи
tail -10 /root/logs/daily-cleanup.log
tail -10 /root/logs/health-check.log
```

## Критерії успіху
- [ ] Налаштовано cron jobs для автоматичних завдань
- [ ] Створено скрипти для щоденного та щотижневого обслуговування
- [ ] Працює автоматичний моніторинг здоров'я системи
- [ ] Налаштовано логування всіх автоматичних процесів
- [ ] Протестовано виконання всіх автоматичних завдань
