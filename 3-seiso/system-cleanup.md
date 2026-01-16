# Seiso: Очищення системи

## Guided Reasoning Schema

### 1. ASSESS (Оцінити стан системи)
```
router_monitor({ action: "disk" })
router_monitor({ action: "memory" })  
router_monitor({ action: "cpu" })
router_monitor({ action: "load" })
router_system({ action: "ps" })
```

**Перевірити індикатори "забрудження":**
- Використання диску >80%
- Використання RAM >90%
- Load average >2.0 (на 1-core системі)
- Процеси-зомбі
- Застарілі temp файли

### 2. CLEAN_FILESYSTEM (Очистити файлову систему)

#### 2.1 Системні temp файли
```bash
# Очистити системні temp
find /tmp -type f -mtime +1 -delete
find /var/tmp -type f -mtime +7 -delete

# Очистити user temp  
find /root/temp -type f -mtime +1 -delete 2>/dev/null || true

# Очистити crash dumps
find /var/crash -type f -mtime +7 -delete 2>/dev/null || true
```

#### 2.2 Cache directories
```bash
# APT cache
apt-get autoclean

# Журнали systemd (залишити 7 днів)
journalctl --vacuum-time=7d

# Thumbnail cache
rm -rf /root/.cache/thumbnails/* 2>/dev/null || true
```

#### 2.3 Orphaned files cleanup
```bash
# Видалити порожні директорії
find /root -type d -empty -not -path "/root/.5s-system/*" -delete 2>/dev/null || true

# Broken symbolic links
find /root -type l ! -exec test -e {} \; -delete 2>/dev/null || true
```

### 3. CLEAN_PROCESSES (Очистити процеси)

#### 3.1 Перевірити завислі процеси
```
router_system({ action: "ps", options: { format: "full" }})
router_shell({ command: "ps aux | awk '$8 ~ /Z/ { print $2 }'" })  # Zombie processes
```

#### 3.2 Restart застарілих сервісів (якщо потрібно)
```bash
# Перевірити uptime сервісів
systemctl list-units --type=service --state=running | grep ui-agent

# Restart якщо uptime > 7 днів (опціонально)
for service in ui-agent-claude ui-agent-telegram ui-agent-tools; do
    uptime_seconds=$(systemctl show $service --property=ActiveEnterTimestampMonotonic --value)
    # Логіка перевірки uptime і restart за потребою
done
```

### 4. CLEAN_MEMORY (Очистити пам'ять)

#### 4.1 Drop caches (безпечно)
```bash
# Синхронізувати диски
sync

# Очистити page cache, dentries and inodes
echo 3 > /proc/sys/vm/drop_caches

# Перевірити результат
free -h
```

#### 4.2 Swap management
```bash
# Якщо swap використовується і не критично:
# swapoff -a && swapon -a  # ОБЕРЕЖНО!
```

### 5. CLEAN_NETWORK (Очистити мережу)

#### 5.1 Перевірити мережеві з'єднання
```
router_network({ action: "connections" })
router_shell({ command: "ss -tuln | grep LISTEN" })
```

#### 5.2 Flush стареющие з'єднання
```bash
# Flush DNS cache (якщо systemd-resolved)
systemctl flush-dns systemd-resolved 2>/dev/null || true

# Очистити ARP cache
ip neigh flush all 2>/dev/null || true
```

### 6. CLEAN_LOGS (Очистити логи) 

#### 6.1 Ротація великих логів
```bash
# Знайти великі log файли (>100MB)
find /var/log -name "*.log" -size +100M -exec ls -lh {} \;

# Truncate дуже великі логи (ОБЕРЕЖНО!)
# tail -1000 /var/log/huge.log > /var/log/huge.log.tmp
# mv /var/log/huge.log.tmp /var/log/huge.log
```

#### 6.2 Архівування старих логів
```bash
# Архівувати логи старші 14 днів
find /var/log -name "*.log" -mtime +14 -exec gzip {} \;
```

### 7. VERIFY (Перевірити результати)
```
router_monitor({ action: "disk" })
router_monitor({ action: "memory" })
router_system({ action: "health" })
```

**Перевірити покращення:**
- Скільки простору звільнено
- Зменшилось навантаження на RAM
- Всі сервіси працюють
- Немає error'ів в логах

### 8. DOCUMENT (Задокументувати)

```bash
# Створити звіт про очищення
report_file="/root/.5s-system/reports/cleanup-$(date +%Y-%m-%d).md"
cat > "$report_file" << EOF
# System Cleanup Report - $(date)

## Before Cleanup:
- Disk usage: $(df -h / | awk 'NR==2{print $5}')
- Memory usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')

## Actions Performed:
- Cleaned temp files
- Cleared caches  
- Rotated logs
- Dropped memory caches

## After Cleanup:
- Disk usage: $(df -h / | awk 'NR==2{print $5}')
- Memory usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')

## Issues Found:
(List any issues discovered during cleanup)
EOF
```

## Критерії успіху
- [ ] Очищено temp файли та кеші
- [ ] Звільнено мінімум 200MB диску
- [ ] Зменшено використання RAM на 5%+
- [ ] Всі сервіси працюють після очищення  
- [ ] Немає zombie процесів
- [ ] Створено звіт про очищення
