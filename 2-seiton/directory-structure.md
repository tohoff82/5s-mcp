# Seiton: Стандартизація структури директорій

## Guided Reasoning Schema

### 1. ASSESS (Оцінити поточну структуру)
```
router_files({ action: "list", path: "/root" })
router_files({ action: "find", path: "/root", options: { type: "d", maxdepth: 2 }})
router_files({ action: "list", path: "/opt" })
router_files({ action: "list", path: "/etc" })
```

**Аналітичні питання:**
- Де розташовані проекти?
- Де зберігаються конфіги?
- Чи є логіка в поточній структурі?
- Які директорії створені хаотично?

### 2. DESIGN (Спроектувати стандарт)

#### Стандартна структура /root:
```
/root/
├── projects/                    # Всі проекти разом
│   ├── ui-agent/               # Основний проект
│   ├── ui-agent-5s/           # Система 5S
│   ├── security-tools/        # Інструменти безпеки  
│   └── rabbitmq-mcp-server/   # MCP сервер
├── scripts/                    # Скрипти утиліти
│   ├── maintenance/           # Обслуговування
│   ├── monitoring/           # Моніторинг
│   └── backup/              # Бекапи
├── configs/                   # Локальні конфіги (backup)
│   ├── systemd/             # Сервіси
│   ├── nginx-caddy/         # Веб-сервер
│   └── credentials/         # Доступи (зашифровані)
├── data/                      # Дані
│   ├── backups/             # Бекапи
│   ├── uploads/             # Завантажені файли
│   └── cache/              # Кеш
├── logs/                     # Локальні логи проектів
├── .5s-system/              # Система 5S
│   ├── quarantine/          # Карантин файлів
│   ├── reports/            # Звіти 5S
│   └── checklists/         # Виконані чеклисти
└── temp/                    # Тимчасові файли (auto-clean)
```

### 3. MIGRATE (Міграція до стандарту)

#### 3.1 Створити структуру
```bash
mkdir -p /root/{projects,scripts/{maintenance,monitoring,backup},configs/{systemd,nginx-caddy,credentials},data/{backups,uploads,cache},logs,.5s-system/{quarantine,reports,checklists},temp}
```

#### 3.2 Перемістити існуючі проекти
```bash
# Переміщення проектів
cd /root
mv ui-agent projects/
mv ui-agent-5s projects/
mv security-tools projects/
mv rabbitmq-mcp-server projects/

# Створити symbolic links для зворотної сумісності
ln -sf projects/ui-agent ui-agent
ln -sf projects/security-tools security-tools
```

#### 3.3 Організувати скрипти
```bash
mv /root/scripts/* /root/scripts/maintenance/ 2>/dev/null || true
```

#### 3.4 Бекап конфігів
```bash
# Бекап важливих системних конфігів
cp /etc/systemd/system/ui-agent-* /root/configs/systemd/
cp -r /etc/caddy/ /root/configs/nginx-caddy/ 2>/dev/null || true
```

### 4. STANDARDIZE (Стандартизувати найменування)

#### 4.1 Конвенції найменування файлів:
```
YYYY-MM-DD-description.ext     # Файли з датою
service-name-config.conf       # Конфіги сервісів
backup-YYYY-MM-DD-HH.tar.gz   # Бекапи
log-service-YYYY-MM-DD.log    # Логи
script-purpose-v1.sh          # Скрипти
```

#### 4.2 Перейменування за потребою:
```bash
# Приклад стандартизації назв
cd /root/scripts/maintenance
for file in *.sh; do
    if [[ $file != script-* ]]; then
        mv "$file" "script-${file}"
    fi
done
```

### 5. OPTIMIZE (Оптимізувати доступ)

#### 5.1 Створити ярлики для швидкого доступу
```bash
# Додати в ~/.bashrc
echo "# 5S Quick Access Aliases" >> ~/.bashrc
echo "alias goto-projects='cd /root/projects'" >> ~/.bashrc  
echo "alias goto-configs='cd /root/configs'" >> ~/.bashrc
echo "alias goto-logs='cd /root/logs'" >> ~/.bashrc
echo "alias goto-scripts='cd /root/scripts'" >> ~/.bashrc
echo "alias 5s-status='cd /root/projects/ui-agent-5s && git status'" >> ~/.bashrc
source ~/.bashrc
```

#### 5.2 Налаштувати автоочищення temp
```bash
# Cron job для очищення temp папки
echo "0 2 * * * find /root/temp -type f -mtime +1 -delete" | crontab -
```

### 6. VERIFY (Перевірити організацію)
```
router_files({ action: "list", path: "/root" })
router_shell({ command: "tree /root -L 3" })  # Якщо tree встановлено
router_system({ action: "health" })  # Переконатись що сервіси працюють
```

### 7. DOCUMENT (Задокументувати стандарт)

Створити файл стандартів:
```bash
cat > /root/.5s-system/directory-standard.md << 'EOF'
# Directory Structure Standard

Last updated: $(date)

## /root Structure:
- projects/ - All development projects
- scripts/ - Utility scripts by category  
- configs/ - Configuration backups
- data/ - Application data and backups
- logs/ - Project-specific logs
- .5s-system/ - 5S maintenance system
- temp/ - Auto-cleaned temporary files

## Naming Conventions:
- Dates: YYYY-MM-DD format
- Services: service-name-purpose
- Scripts: script-purpose-version
- Backups: backup-YYYY-MM-DD-HH
EOF
```

## Критерії успіху
- [ ] Створено стандартну структуру директорій
- [ ] Всі проекти організовано логічно
- [ ] Створено aliases для швидкого доступу
- [ ] Налаштовано автоочищення temp
- [ ] Документовано стандарт організації
- [ ] Сервіси працюють після реорганізації
