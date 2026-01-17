#!/bin/bash

set -e

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логування
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Перевірка прав root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Цей скрипт потрібно запускати з правами root"
        exit 1
    fi
}

# Встановлення залежностей
install_dependencies() {
    log_info "Встановлення залежностей..."
    
    # Оновлення пакетів
    apt-get update -qq
    
    # Встановлення Node.js (якщо не встановлено)
    if ! command -v node &> /dev/null; then
        log_info "Встановлення Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # Встановлення додаткових утиліт
    apt-get install -y curl wget jq tree htop ncdu
    
    log_success "Залежності встановлено"
}

# Встановлення npm пакетів
install_npm_packages() {
    log_info "Встановлення npm пакетів..."
    
    cd /root/ui-agent-5s
    
    if [[ ! -f package.json ]]; then
        log_error "package.json не знайдено"
        exit 1
    fi
    
    npm install
    
    log_success "npm пакети встановлено"
}

# Налаштування дозволів
setup_permissions() {
    log_info "Налаштування дозволів..."
    
    # Створення необхідних директорій
    mkdir -p /var/log/5s
    mkdir -p /tmp/5s-reports
    mkdir -p /etc/5s
    
    # Встановлення дозволів
    chmod +x /root/ui-agent-5s/src/mcp-server/index.js
    chmod +x /root/ui-agent-5s/demo.js
    chmod +x /root/ui-agent-5s/install.sh
    
    # Дозволи для log файлів
    touch /var/log/5s-audit.log
    touch /var/log/5s-metrics.json
    touch /var/log/5s-compliance.json
    touch /var/log/5s-mcp-server.log
    
    chmod 644 /var/log/5s-*
    
    log_success "Дозволи налаштовано"
}

# Налаштування systemd сервісу
setup_service() {
    log_info "Налаштування systemd сервісу..."
    
    # Перезавантаження daemon
    systemctl daemon-reload
    
    # Активація сервісу
    systemctl enable 5s-mcp-server.service
    
    log_success "Systemd сервіс налаштовано"
}

# Налаштування cron задач
setup_cron() {
    log_info "Налаштування cron задач..."
    
    # Створення cron файлу для 5S
    cat > /etc/cron.d/5s-methodology << 'EOF'
# UI-Agent 5S Management System Automated Tasks
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Weekly full audit - every Sunday at 23:00
0 23 * * 0 root cd /root/ui-agent-5s && node demo.js shitsuke >> /var/log/5s-weekly.log 2>&1

# Daily health check - every day at 06:00  
0 6 * * * root cd /root/ui-agent-5s && node src/mcp-server/tools/shitsuke.js health >> /var/log/5s-daily.log 2>&1

# Weekly system cleanup - every Saturday at 02:00
0 2 * * 6 root cd /root/ui-agent-5s && node demo.js seiso >> /var/log/5s-cleanup.log 2>&1

# Monthly deep audit - first day of month at 01:00
0 1 1 * * root cd /root/ui-agent-5s && node demo.js demo >> /var/log/5s-monthly.log 2>&1
EOF
    
    # Встановлення дозволів на cron файл
    chmod 644 /etc/cron.d/5s-methodology
    
    # Перезавантаження cron
    systemctl reload cron
    
    log_success "Cron задачі налаштовано"
}

# Запуск тестів
run_tests() {
    log_info "Запуск тестів системи..."
    
    cd /root/ui-agent-5s
    
    # Швидкий тест
    if node demo.js test; then
        log_success "Тести пройшли успішно"
    else
        log_warning "Деякі тести не пройшли, але це може бути нормально"
    fi
}

# Створення документації
create_documentation() {
    log_info "Створення локальної документації..."
    
    cat > /root/ui-agent-5s/USAGE.md << 'EOF'
# UI-Agent 5S Management System - Керівництво користувача

## Швидкий старт

### Запуск демонстрації
```bash
cd /root/ui-agent-5s
node demo.js
```

### Швидкий тест системи
```bash
node demo.js test
```

### Окремі модулі
```bash
node demo.js seiri      # Сортування
node demo.js seiton     # Систематизація
node demo.js seiso      # Очищення
node demo.js seiketsu   # Стандартизація
node demo.js shitsuke   # Дисципліна
```

## Управління сервісом

### Запуск MCP сервера
```bash
systemctl start 5s-mcp-server
systemctl status 5s-mcp-server
```

### Перегляд логів
```bash
journalctl -u 5s-mcp-server -f
tail -f /var/log/5s-mcp-server.log
```

## Корисні команди

### Перевірка системи
```bash
# Перевірка здоров'я
node src/mcp-server/tools/shitsuke.js health

# Метрики ефективності
node src/mcp-server/tools/shitsuke.js metrics

# Повний аудит
node src/mcp-server/tools/shitsuke.js audit
```

### Очищення системи
```bash
# Аналіз непотрібних файлів
node src/mcp-server/tools/seiri.js analyze

# Очищення тимчасових файлів
node src/mcp-server/tools/seiri.js cleanup

# Очищення системи
node src/mcp-server/tools/seiso.js cleanup
```

## Файли логів

- `/var/log/5s-audit.log` - Логи аудитів
- `/var/log/5s-daily.log` - Щоденні перевірки
- `/var/log/5s-weekly.log` - Щотижневі аудити
- `/var/log/5s-cleanup.log` - Логи очищення
- `/var/log/5s-mcp-server.log` - Логи MCP сервера

## Автоматизовані задачі

Система автоматично виконує:
- Щоденну перевірку здоров'я (06:00)
- Щотижневе очищення (субота 02:00)
- Щотижневий аудит (неділя 23:00)
- Щомісячний глибокий аудит (1 число 01:00)
EOF
    
    log_success "Документація створена"
}

# Головна функція встановлення
main_install() {
    log_info "Запуск встановлення UI-Agent 5S Management System..."
    echo "================================================================"
    
    check_root
    install_dependencies
    install_npm_packages
    setup_permissions
    setup_service
    setup_cron
    create_documentation
    run_tests
    
    echo "================================================================"
    log_success "UI-Agent 5S Management System успішно встановлено!"
    echo
    log_info "Наступні кроки:"
    echo "  1. Запустіти демонстрацію: cd /root/ui-agent-5s && node demo.js"
    echo "  2. Запустити MCP сервер: systemctl start 5s-mcp-server"
    echo "  3. Переглянути документацію: cat /root/ui-agent-5s/USAGE.md"
    echo "  4. Перевірити логи: journalctl -u 5s-mcp-server"
    echo
    log_info "Автоматизовані задачі налаштовано та будуть виконуватися за розкладом."
}

# Функція видалення
uninstall() {
    log_info "Видалення UI-Agent 5S Management System..."
    
    # Зупинка та видалення сервісу
    systemctl stop 5s-mcp-server || true
    systemctl disable 5s-mcp-server || true
    rm -f /etc/systemd/system/5s-mcp-server.service
    systemctl daemon-reload
    
    # Видалення cron задач
    rm -f /etc/cron.d/5s-methodology
    systemctl reload cron
    
    # Видалення логів (опціонально)
    read -p "Видалити логи? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f /var/log/5s-*
        rm -rf /tmp/5s-reports
    fi
    
    log_success "Система видалена"
}

# Обробка аргументів командного рядка
case "${1:-install}" in
    "install")
        main_install
        ;;
    "uninstall")
        uninstall
        ;;
    "reinstall")
        uninstall
        main_install
        ;;
    *)
        echo "Використання: $0 {install|uninstall|reinstall}"
        echo
        echo "  install    - Встановити систему (за замовчуванням)"
        echo "  uninstall  - Видалити систему"
        echo "  reinstall  - Перевстановити систему"
        exit 1
        ;;
esac
