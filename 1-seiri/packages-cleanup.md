# Seiri: Очищення пакетів

## Guided Reasoning Schema

### 1. ASSESS (Оцінити пакети)
```
router_packages({ action: "list", options: { installed: true }})
router_shell({ command: "apt list --installed | wc -l" })
router_shell({ command: "dpkg-query -Wf '${Installed-Size;10}t${Package}n' | sort -n | tail -20" })
router_packages({ action: "list", options: { autoremovable: true }})
```

**Аналітичні питання:**
- Скільки пакетів встановлено?
- Які пакети займають найбільше місця?
- Які пакети позначені для autoremove?
- Чи є застарілі пакети безпеки?

### 2. CATEGORIZE (Категоризувати пакети)

**ESSENTIAL** (Критично важливі):
- Системні: systemd, kernel, glibc
- Мережеві: openssh-server, ufw
- База: nodejs, mongodb, rabbitmq-server
- UI-Agent залежності

**OPERATIONAL** (Робочі):
- fail2ban, caddy, nginx
- Утиліти моніторингу
- Git, curl, wget
- Інструменти розробки

**QUESTIONABLE** (Сумнівні):
- Пакети встановлені >30 днів тому і не оновлювались
- Пакети без явних залежностей
- Застарілі версії

**REMOVABLE** (До видалення):
- Orphaned packages (autoremovable)
- Старі kernel
- Кеш пакетів

### 3. EXECUTE (Виконати очищення)

#### 3.1 Безпечне очищення
```bash
apt autoremove --dry-run  # Спочатку подивитись
apt autoremove -y         # Якщо все ОК

apt autoclean            # Очистити кеш
apt clean               # Повне очищення кеша
```

#### 3.2 Видалення старих kernel
```bash
# Показати встановлені ядра
dpkg --list | grep linux-image
# Видалити старі (ОБЕРЕЖНО!)
# Залишити поточне + 1 backup
```

#### 3.3 Перевірити orphaned пакети
```bash
deborphan  # Якщо встановлено
apt-mark showmanual | sort > /tmp/manual-packages.txt
```

### 4. VERIFY (Перевірити після очищення)
```
router_system({ action: "health" })
router_packages({ action: "list", options: { broken: true }})
# Перевірити ключові сервіси
for service in ui-agent-claude ui-agent-telegram mongodb rabbitmq-server caddy
do
    systemctl is-active $service
done
```

### 5. OPTIMIZE (Оптимізувати)

#### 5.1 Налаштування APT
```bash
# Налаштувати автоочищення
echo 'APT::Periodic::AutocleanInterval "7";' > /etc/apt/apt.conf.d/20auto-clean
echo 'APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/21auto-upgrade
```

#### 5.2 Заборонити непотрібні пакети
```bash
# Помітити пакети як manually installed якщо потрібні
apt-mark manual important-package
```

### 6. DOCUMENT (Задокументувати)

Створити звіт:
```bash
echo "=== Package Cleanup Report $(date) ===" > /root/.5s-reports/packages-$(date +%Y-%m-%d).txt
echo "Packages before: $(dpkg --list | grep "^ii" | wc -l)" >> /root/.5s-reports/packages-$(date +%Y-%m-%d).txt
# ... після очищення ...
echo "Packages after: $(dpkg --list | grep "^ii" | wc -l)" >> /root/.5s-reports/packages-$(date +%Y-%m-%d).txt
echo "Disk freed: $(df -h /)" >> /root/.5s-reports/packages-$(date +%Y-%m-%d).txt
```

## Критерії успіху
- [ ] Видалено автоматично непотрібні пакети
- [ ] Очищено кеш пакетів
- [ ] Всі сервіси працюють після очищення
- [ ] Налаштовано автоматичне очищення
- [ ] Задокументовано зміни
