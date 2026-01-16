# Seiton: Стандартизація структури директорій

## ⚠️ КРИТИЧНО: Безпечна реорганізація продакшн сервера

**УВАГА**: Ця процедура переміщує активні проекти з жорстко вказаними шляхами в systemd сервісах!

## Guided Reasoning Schema

### 1. ASSESS (Оцінити поточну структуру та ризики)
```
router_files({ action: "list", path: "/root" })
router_files({ action: "find", path: "/root", options: { type: "d", maxdepth: 2 }})
router_system({ action: "list", target: "ui-agent" })
router_files({ action: "grep", path: "/etc/systemd/system/ui-agent-*.service", target: "WorkingDirectory" })
```

**КРИТИЧНІ питання безпеки:**
- Які systemd сервіси мають жорстко вказані шляхи?
- Які скрипти/cron jobs посилаються на поточні шляхи?
- Які .env файли та конфіги використовуються?
- Чи є інші жорстко закодовані шляхи?

### 2. BACKUP (ОБОВ'ЯЗКОВИЙ крок!)
```bash
# Створити повний backup перед будь-якими змінами
DATE=$(date +%Y-%m-%d-%H%M)
BACKUP_DIR="/root/.5s-system/pre-migration-backup-$DATE"
mkdir -p $BACKUP_DIR

# Backup критичних директорій
cp -r /root/ui-agent $BACKUP_DIR/
cp -r /root/security-tools $BACKUP_DIR/ 2>/dev/null || true
cp -r /root/rabbitmq-mcp-server $BACKUP_DIR/ 2>/dev/null || true
cp -r /root/scripts $BACKUP_DIR/ 2>/dev/null || true

# Backup systemd сервісів
cp /etc/systemd/system/ui-agent-*.service $BACKUP_DIR/

# Backup crontab
crontab -l > $BACKUP_DIR/crontab-backup.txt 2>/dev/null || true

echo "✅ Backup створено в: $BACKUP_DIR"
```

### 3. DESIGN (Безпечна структура з backward compatibility)

#### Стандартна структура /root з SYMBOLIC LINKS:
```
/root/
├── projects/                    # Всі проекти (реальні директорії)
│   ├── ui-agent/               # ПЕРЕМІЩЕНО сюди
│   ├── ui-agent-5s/           # ПЕРЕМІЩЕНО сюди
│   ├── security-tools/        # ПЕРЕМІЩЕНО сюди 
│   └── rabbitmq-mcp-server/   # ПЕРЕМІЩЕНО сюди
├── ui-agent -> projects/ui-agent              # SYMLINK для backward compatibility
├── security-tools -> projects/security-tools  # SYMLINK
├── rabbitmq-mcp-server -> projects/rabbitmq-mcp-server  # SYMLINK
├── scripts/                    # Реорганізовані скрипти
│   ├── maintenance/           
│   ├── monitoring/           
│   └── backup/              
├── configs/                   # Backup конфігурацій
│   ├── systemd/             
│   ├── nginx-caddy/         
│   └── credentials/         
├── data/                      
│   ├── backups/             
│   ├── uploads/             
│   └── cache/              
├── logs/                     
├── .5s-system/              
│   ├── quarantine/          
│   ├── reports/            
│   ├── checklists/         
│   └── backups/            # Pre-migration backups
└── temp/                    
```

### 4. PRE_FLIGHT_CHECK (Перевірки перед міграцією)

#### 4.1 Перевірити активні сервіси
```bash
echo "🔍 Перевірка активних UI-Agent сервісів..."
for service in claude telegram tools reference-api webapp ssh-monitor; do
    status=$(systemctl is-active ui-agent-$service 2>/dev/null || echo "не знайдено")
    echo "ui-agent-$service: $status"
done
```

#### 4.2 Знайти жорстко закодовані шляхи
```bash
echo "🔍 Пошук жорстких шляхів у systemd сервісах..."
grep -n "WorkingDirectory.*ui-agent" /etc/systemd/system/ui-agent-*.service
grep -n "EnvironmentFile.*ui-agent" /etc/systemd/system/ui-agent-*.service

echo "🔍 Пошук у cron jobs..."
crontab -l 2>/dev/null | grep -n ui-agent || echo "Немає ui-agent у cron"
```

#### 4.3 Тест простору та прав доступу
```bash
# Перевірити достатньо місця
df -h /root
# Перевірити права доступу
ls -la /root/ui-agent
```

### 5. SAFE_MIGRATE (Безпечна міграція)

#### 5.1 Створити структуру директорій
```bash
echo "📁 Створення нової структури..."
mkdir -p /root/{projects,scripts/{maintenance,monitoring,backup},configs/{systemd,nginx-caddy,credentials},data/{backups,uploads,cache},logs,.5s-system/{quarantine,reports,checklists},temp}
```

#### 5.2 БЕЗПЕЧНЕ переміщення з перевірками

**UI-Agent (найкритичніший):**
```bash
echo "🚚 Переміщення ui-agent..."

# Перевірити що сервіси працюють
if systemctl is-active --quiet ui-agent-claude; then
    echo "✅ ui-agent-claude активний, можна переміщувати"
else
    echo "❌ ui-agent-claude не активний! СТОП."
    exit 1
fi

# Переміщення
mv /root/ui-agent /root/projects/

# Створити symlink
ln -sf projects/ui-agent /root/ui-agent

# КРИТИЧНА перевірка: чи працює symlink
if [ -d "/root/ui-agent/services" ]; then
    echo "✅ Symlink працює, структура доступна"
else
    echo "❌ КРИТИЧНА ПОМИЛКА: Symlink не працює!"
    # ROLLBACK
    rm /root/ui-agent
    mv /root/projects/ui-agent /root/
    exit 1
fi

# Перевірити сервіси після переміщення
sleep 2
if systemctl is-active --quiet ui-agent-claude; then
    echo "✅ ui-agent-claude працює після переміщення"
else
    echo "❌ ui-agent-claude перестав працювати! ROLLBACK..."
    # ROLLBACK
    systemctl stop ui-agent-claude
    rm /root/ui-agent
    mv /root/projects/ui-agent /root/
    systemctl start ui-agent-claude
    exit 1
fi
```

**Інші проекти:**
```bash
echo "🚚 Переміщення інших проектів..."

# ui-agent-5s (менш критичний)
mv /root/ui-agent-5s /root/projects/ 2>/dev/null || true

# security-tools
if [ -d "/root/security-tools" ]; then
    mv /root/security-tools /root/projects/
    ln -sf projects/security-tools /root/security-tools
fi

# rabbitmq-mcp-server  
if [ -d "/root/rabbitmq-mcp-server" ]; then
    # Перевірити чи працює сервіс
    if systemctl is-active --quiet rabbitmq-mcp-server; then
        mv /root/rabbitmq-mcp-server /root/projects/
        ln -sf projects/rabbitmq-mcp-server /root/rabbitmq-mcp-server
        # Перевірити після переміщення
        sleep 2
        if ! systemctl is-active --quiet rabbitmq-mcp-server; then
            echo "❌ rabbitmq-mcp-server перестав працювати! ROLLBACK..."
            systemctl stop rabbitmq-mcp-server
            rm /root/rabbitmq-mcp-server  
            mv /root/projects/rabbitmq-mcp-server /root/
            systemctl start rabbitmq-mcp-server
        fi
    fi
fi
```

#### 5.3 Організувати скрипти
```bash
echo "📜 Реорганізація скриптів..."
if [ -d "/root/scripts" ] && [ "$(ls -A /root/scripts)" ]; then
    mv /root/scripts/* /root/scripts/maintenance/ 2>/dev/null || true
fi
```

#### 5.4 Backup конфігурацій
```bash
echo "💾 Backup конфігурацій..."
cp /etc/systemd/system/ui-agent-*.service /root/configs/systemd/ 2>/dev/null || true
cp -r /etc/caddy/ /root/configs/nginx-caddy/ 2>/dev/null || true

# Backup credentials
cp /root/*creds*.txt /root/configs/credentials/ 2>/dev/null || true
```

### 6. POST_MIGRATION_VERIFY (Перевірка після міграції)

#### 6.1 Перевірити всі сервіси
```bash
echo "🔍 Перевірка сервісів після міграції..."
FAILED_SERVICES=()

for service in claude telegram tools reference-api webapp ssh-monitor; do
    if systemctl is-active --quiet ui-agent-$service; then
        echo "✅ ui-agent-$service: активний"
    else
        echo "❌ ui-agent-$service: НЕ АКТИВНИЙ!"
        FAILED_SERVICES+=("ui-agent-$service")
    fi
done

# Якщо є проблемні сервіси
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo "❌ ПОМИЛКА: Деякі сервіси не працюють після міграції!"
    echo "Проблемні сервіси: ${FAILED_SERVICES[@]}"
    echo "Потрібен ROLLBACK або ручне втручання!"
    exit 1
fi
```

#### 6.2 Перевірити файлову структуру
```
router_files({ action: "list", path: "/root" })
router_files({ action: "list", path: "/root/projects" })
router_shell({ command: "ls -la /root/ui-agent" })  # Має показати symlink
```

#### 6.3 Функціональний тест
```bash
echo "🧪 Функціональний тест..."
# Перевірити що .env файл доступний
if [ -f "/root/ui-agent/.env" ]; then
    echo "✅ .env файл доступний через symlink"
else
    echo "❌ .env файл недоступний!"
fi

# Перевірити logи
if [ -d "/root/ui-agent/logs" ]; then
    echo "✅ Директорія логів доступна"
else
    echo "❌ Директорія логів недоступна!"
fi
```

### 7. ROLLBACK_PLAN (План відкату у разі проблем)

```bash
# УВАГА: Використовувати тільки у разі критичних проблем!
echo "🔄 ROLLBACK PROCEDURE:"
echo "1. Зупинити всі ui-agent сервіси:"
echo "   systemctl stop ui-agent-*"
echo ""
echo "2. Видалити symbolic links:"
echo "   rm /root/ui-agent /root/security-tools /root/rabbitmq-mcp-server"
echo ""
echo "3. Повернути з backup:"
echo "   cp -r $BACKUP_DIR/ui-agent /root/"
echo "   cp -r $BACKUP_DIR/security-tools /root/"
echo "   cp -r $BACKUP_DIR/rabbitmq-mcp-server /root/"
echo ""
echo "4. Перезапустити сервіси:"
echo "   systemctl start ui-agent-*"
```

### 8. OPTIMIZE (Оптимізація після успішної міграції)

#### 8.1 Створити ярлики для швидкого доступу
```bash
echo "⚡ Створення aliases..."
cat >> ~/.bashrc << 'EOF'

# 5S Quick Access Aliases
alias goto-projects='cd /root/projects'
alias goto-configs='cd /root/configs'
alias goto-logs='cd /root/logs'
alias goto-scripts='cd /root/scripts'
alias 5s-status='cd /root/projects/ui-agent-5s && git status'
alias ui-agent='cd /root/projects/ui-agent'
EOF

source ~/.bashrc
```

#### 8.2 Налаштувати автоочищення temp
```bash
echo "🧹 Налаштування автоочищення..."
(crontab -l 2>/dev/null; echo "0 2 * * * find /root/temp -type f -mtime +1 -delete") | crontab -
```

### 9. DOCUMENT (Задокументувати зміни)

```bash
cat > /root/.5s-system/migration-report-$DATE.md << EOF
# Directory Migration Report - $DATE

## Status: $(if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then echo "SUCCESS ✅"; else echo "FAILED ❌"; fi)

## Changes Made:
- Moved ui-agent to /root/projects/ui-agent
- Created symlink: /root/ui-agent -> /root/projects/ui-agent
- Moved security-tools to /root/projects/security-tools
- Moved rabbitmq-mcp-server to /root/projects/rabbitmq-mcp-server
- Created standard directory structure

## Services Status After Migration:
$(for svc in claude telegram tools reference-api webapp ssh-monitor; do echo "- ui-agent-$svc: $(systemctl is-active ui-agent-$svc 2>/dev/null || echo 'not found')"; done)

## Backup Location:
$BACKUP_DIR

## Rollback Command (if needed):
See section 7 of the procedure

Generated: $(date)
EOF
```

## ✅ КРИТЕРІЇ УСПІХУ (всі MUST бути виконані):

- [ ] ✅ Backup створено перед змінами
- [ ] ✅ Всі UI-Agent сервіси працюють після міграції  
- [ ] ✅ Symbolic links працюють правильно
- [ ] ✅ .env файли доступні через symlinks
- [ ] ✅ Структура директорій стандартизована
- [ ] ✅ Aliases створені для швидкого доступу
- [ ] ✅ Автоочищення temp налаштовано
- [ ] ✅ План rollback задокументований
- [ ] ✅ Міграція задокументована

## 🚨 СТОП-ФАКТОРИ (коли НЕ виконувати):

- Диск заповнений >95% (не вистачить місця для backup)
- Будь-який UI-Agent сервіс не працює
- Сервер під високим навантаженням
- Виконуються критичні процеси
- Немає можливості швидко відкатити зміни
