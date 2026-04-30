# 5S MCP Server

[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-≥18.0.0-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**5S Methodology MCP Server** — реалізація Lean-методології 5S для управління серверами через Model Context Protocol (MCP).

## 🎯 Що таке 5S?

5S — це японська методологія організації робочого місця, розроблена Toyota. Кожна "S" представляє крок:

| Крок | Японською | Переклад | Опис |
|------|-----------|----------|------|
| **1S** | 整理 (Seiri) | Сортування | Визначити необхідне та непотрібне |
| **2S** | 整頓 (Seiton) | Систематизація | Організувати все за логічною системою |
| **3S** | 清掃 (Seiso) | Чистота | Очистити та підтримувати чистоту |
| **4S** | 清潔 (Seiketsu) | Стандартизація | Створити стандарти та процедури |
| **5S** | 躾 (Shitsuke) | Дисципліна | Підтримувати та вдосконалювати систему |

## ✨ Можливості

- 🔍 **Seiri (Sort)** — аналіз файлів, процесів, пакетів та логів
- 📁 **Seiton (Set in Order)** — організація конфігурацій, логів, скриптів
- 🧹 **Seiso (Shine)** — очищення кешу, логів, тимчасових файлів
- 📋 **Seiketsu (Standardize)** — перевірка стандартів безпеки та продуктивності
- ✅ **Shitsuke (Sustain)** — щотижневі аудити та автоматизація
- 🛡️ **Safety Policy** — agent-managed deny/allow правила для production cleanup
- 🕒 **Cron Manager** — керування cron без hardcoded server path
- 🌐 **Remote Clean** — dry-run-first прибирання після роботи агента на remote серверах

## 📦 Встановлення

### Як standalone сервер

```bash
git clone https://github.com/tohoff82/5s-mcp.git
cd 5s-mcp
npm install
npm start
```

### Як залежність

```bash
npm install github:tohoff82/5s-mcp
```

## ⚙️ Конфігурація

### Claude Desktop

Додайте до `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "5s": {
      "command": "node",
      "args": ["/path/to/5s-mcp/src/mcp-server/index.js"]
    }
  }
}
```

### VS Code (Copilot)

Додайте до `.vscode/mcp.json`:

```json
{
  "servers": {
    "5s": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/5s-mcp/src/mcp-server/index.js"]
    }
  }
}
```

## 🛠️ API Reference

### `seiri_sort_analyze`

Аналіз та сортування для визначення необхідного і непотрібного.

```json
{
  "target": "files|processes|packages|logs|all",
  "path": "/root",
  "criteria": {
    "age_days": 30,
    "size_mb": 10,
    "include_hidden": false
  }
}
```

### `seiton_organize_system`

Організація та систематизація компонентів системи.

```json
{
  "target": "configs|logs|scripts|services|all",
  "action": "analyze|organize",
  "options": {
    "create_links": true,
    "backup_first": true
  }
}
```

### `seiso_clean_system`

Очищення системи від непотрібних файлів.

```json
{
  "target": "cache|logs|temp|packages|journal|all",
  "action": "analyze|clean",
  "options": {
    "older_than_days": 7,
    "dry_run": true,
    "keep_last_n": 5
  }
}
```

### `seiketsu_standardize_procedures`

Перевірка відповідності стандартам.

```json
{
  "category": "security|performance|backup|all",
  "action": "check|report",
  "options": {
    "fix_issues": false,
    "severity_threshold": "warning"
  }
}
```

### `5s-shitsuke`

Аудит дотримання 5S та автоматизація.

```json
{
  "action": "weekly_audit|metrics|health_check|automation_status",
  "options": {
    "include_recommendations": true,
    "compare_with_previous": true
  }
}
```

### `5s_safety_policy`

Керування production deny/allow правилами та перевірка операцій перед виконанням.

```json
{
  "action": "list|add_rule|remove_rule|evaluate|reset",
  "kind": "deny|allow|all",
  "operation": {
    "command": "manifest-remove /tmp/agent-run",
    "paths": ["/tmp/agent-run"],
    "destructive": true,
    "approved": false
  }
}
```

### `5s_cron_manager`

Керування cron jobs без прив'язки до конкретного сервера.

```json
{
  "action": "render|install|read|remove|validate",
  "project_dir": "/opt/5s-mcp",
  "cron_path": "/etc/cron.d/5s-methodology",
  "dry_run": true
}
```

### `5s_remote_clean`

Remote cleanup mode: агент передає host, evidence своєї сесії, отримує план і тільки після approval може застосувати cleanup.

```json
{
  "action": "analyze|plan|cleanup",
  "host": "example.org",
  "user": "root",
  "paths_visited": ["/tmp/agent-run-123"],
  "commands_executed": ["cd /tmp/agent-run-123 && npm test"],
  "dry_run": true
}
```

## 📊 Приклад виводу

```json
{
  "timestamp": "2026-01-17T12:00:00Z",
  "target": "all",
  "analysis": {
    "files": {
      "total_scanned": 1250,
      "large_files": 12,
      "old_files": 45,
      "potential_cleanup_mb": 850
    },
    "processes": {
      "total": 89,
      "zombie": 0,
      "high_memory": 3
    }
  },
  "recommendations": [
    "Remove 45 files older than 30 days",
    "Clear 850MB of large log files"
  ]
}
```

## 🏗️ Архітектура

```
5s-mcp/
├── src/
│   └── mcp-server/
│       ├── index.js          # Entry point
│       ├── server.js         # MCP Server implementation
│       └── tools/
│           ├── seiri.js      # 整理 - Sort/Identify
│           ├── seiton.js     # 整頓 - Set in Order
│           ├── seiso.js      # 清掃 - Shine/Clean
│           ├── seiketsu.js   # 清潔 - Standardize
│           └── shitsuke.js   # 躾 - Sustain
├── config/                   # Configuration files
├── docs/                     # Documentation
└── 1-5-shitsuke/            # Methodology procedures
```

## 🔒 Безпека

- Всі деструктивні операції мають `dry_run` режим за замовчуванням
- Автоматичне створення бекапів перед змінами
- Обмеження на критичні системні шляхи
- Логування всіх операцій

## 📚 Документація

- [Architecture](docs/README.md)
- [5S Methodology Guide](docs/maintenance/5s-methodology/README.md)
- [Production Hardening](docs/PRODUCTION-HARDENING.md)
- [Security Procedures](docs/security/current-state.md)

## 🤝 Contributing

1. Fork репозиторій
2. Створіть feature branch (`git checkout -b feature/amazing-feature`)
3. Commit зміни (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Відкрийте Pull Request

## 📄 Ліцензія

MIT License - див. [LICENSE](LICENSE)

## 🙏 Подяки

- [Hiroyuki Hirano](https://en.wikipedia.org/wiki/5S_(methodology)) — автор методології 5S
- [Model Context Protocol](https://modelcontextprotocol.io) — стандарт MCP
- [Anthropic](https://anthropic.com) — MCP SDK

---

**Made with 整理整頓清掃清潔躾 by [tohoff82](https://github.com/tohoff82)**

## 🏗️ Deployment Architecture

This server is part of the **UI-Agent MCP ecosystem** deployed on `138.201.190.221`.

### Directory Structure

```
/opt/                          # Standalone MCP Servers (production)
├── 5s-mcp/                    # 5S Methodology (Lean/Kaizen)
├── memory-mcp/                # System Memory & Self-awareness
├── rabbitmq-mcp/              # RabbitMQ Management
└── ubuntu-mcp/                # Linux System Tools (308 tools)

/root/
└── ui-agent/                  # Main Application
    ├── services/              # Microservices
    │   ├── telegram-gateway/  # Telegram bot interface
    │   ├── claude-service/    # AI orchestration
    │   ├── tools-executor/    # Tool execution engine
    │   └── claude-router-mcp/ # Meta-tool routing
    └── packages/              # Skills (MCP proxies)
        ├── skills-5s/         # → /opt/5s-mcp
        ├── skills-memory/     # → /opt/memory-mcp
        ├── skills-rabbitmq/   # → /opt/rabbitmq-mcp
        └── skills-rebuild/    # Local build tools
```

### Integration Flow

```
Telegram User
    ↓
ui-agent/services/telegram-gateway
    ↓ RabbitMQ
ui-agent/services/claude-service
    ↓ skill_* meta-tools
ui-agent/services/tools-executor
    ↓ MCP Protocol
/opt/*-mcp servers
```

### Related Repositories

| Repository | Location | GitHub |
|------------|----------|--------|
| ui-agent | /root/ui-agent | github.com/tohoff82/ui-agent |
| 5s-mcp | /opt/5s-mcp | github.com/tohoff82/5s-mcp |
| memory-mcp | /opt/memory-mcp | github.com/tohoff82/memory-mcp |
| rabbitmq-mcp | /opt/rabbitmq-mcp | github.com/tohoff82/rabbitMQ-mcp |
| ubuntu-mcp | /opt/ubuntu-mcp | github.com/tohoff82/ubuntu-mcp |
