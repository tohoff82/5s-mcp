# UI-Agent Knowledge Base 📚

Ця база знань містить документацію про поточний стан системи, зміни та конфігурацію ui-agent екосистеми.

## 📁 Структура

- [`security/`](./security/) - Документація безпеки системи
- [`system/`](./system/) - Системні конфігурації та стан
- [`changes/`](./changes/) - Журнал змін та апгрейдів
- [`troubleshooting/`](./troubleshooting/) - Поради з вирішення проблем
- [`maintenance/`](./maintenance/) - Процедури обслуговування та 5S методологія

## ⚠️ КРИТИЧНЕ: Самореферентна Безпека

**УВАГА**: UI-Agent виконує обслуговування на сервері, де він сам працює. Перед виконанням БУДЬ-ЯКИХ операцій обслуговування обов'язково ознайомтеся з:

- [`maintenance/5s-methodology/CRITICAL-SELF-REFERENCE-SAFEGUARDS.md`](./maintenance/5s-methodology/CRITICAL-SELF-REFERENCE-SAFEGUARDS.md)
- [`maintenance/5s-methodology/SELF-REFERENCE-CHECKLIST.md`](./maintenance/5s-methodology/SELF-REFERENCE-CHECKLIST.md)

## 🤖 Agent Self-Documentation

Ця база знань є "пам'яттю" агента про себе та систему. Кожна важлива зміна повинна бути задокументована.

### Принципи Самообслуговування:
- **Безпека понад все** - завжди створювати backup
- **Самосвідомість** - розуміти власну архітектуру
- **Обережність** - краще перестрахуватися
- **Відповідальність** - за власну стабільність

## 📊 Поточний Стан (2026-01-12)

- **Сервер**: htz-legistrator (138.201.190.221)
- **ОС**: Ubuntu 24.04.3 LTS
- **Домен**: legis.uti.cx ✅ (Let's Encrypt SSL)
- **UI-Agent**: Всі сервіси активні
- **Безпека**: В процесі налаштування
- **5S Методологія**: Імплементовано з засобами самореферентного захисту

---
*Автоматично оновлюється агентом з дотриманням принципів самобезпеки*
---

## 🧠 Integration with Memory-MCP

This server is tracked by [memory-mcp](/opt/memory-mcp) ecosystem knowledge base.

### How Memory Knows About Us

```json
// /opt/memory-mcp/data/repos.json
{
  "name": "5s-mcp",
  "path": "/opt/5s-mcp",
  "tools": 5,
  "plannedExtensions": ["kaizen", "gemba", "poka-yoke", "muda"]
}
```

### Reporting Issues to Memory

If you find tension/problem related to 5S:
```
skill_memory action=register_tension 
  title="5S issue description"
  description="Details..."
  context="5s-mcp"
```

### Architecture Decision Records

5S-related decisions are tracked in memory:
- **D-001**: Skills як MCP Proxy pattern (adopted)
- See: `/opt/memory-mcp/data/decisions.json`


---

## 📋 Cross-Repository Sync

**Last sync:** 2026-01-21

Related repos:
- [ui-agent](/root/ui-agent) - Main orchestration
- [memory-mcp](/opt/memory-mcp) - Memory/context system
- [rabbitmq-mcp](/opt/rabbitmq-mcp) - Message queue tools
- [ubuntu-mcp](/opt/ubuntu-mcp) - System administration
- [5s-mcp](/opt/5s-mcp) - 5S methodology tools

**Recent changes affecting this repo:**
- 2026-01-21: memory-mcp v1.2.0 (predictive context)
- See: [memory-mcp CHANGELOG](/opt/memory-mcp/docs/CHANGELOG.md)
