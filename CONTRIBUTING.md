# Contributing to 5S MCP Server

Дякуємо за інтерес до вдосконалення 5S MCP Server! 🙏

## 🚀 Як почати

1. **Fork** репозиторій
2. **Clone** ваш fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/5s-mcp.git
   cd 5s-mcp
   ```
3. **Install** залежності:
   ```bash
   npm install
   ```
4. **Create** feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Типи контрибуцій

### 🐛 Bug Reports

Відкрийте Issue з:
- Описом проблеми
- Кроками для відтворення
- Очікуваною та фактичною поведінкою
- Версіями (Node.js, OS)

### ✨ Feature Requests

Відкрийте Issue з:
- Описом функціоналу
- Use case
- Можливою імплементацією

### 🔧 Pull Requests

1. Переконайтесь, що код відповідає стилю проекту
2. Додайте тести якщо це нова функціональність
3. Оновіть документацію
4. Опишіть зміни в PR description

## 🏗️ Структура проекту

```
src/mcp-server/
├── index.js        # Entry point
├── server.js       # MCP Server
└── tools/
    ├── seiri.js    # 1S - Sort
    ├── seiton.js   # 2S - Set in Order
    ├── seiso.js    # 3S - Shine
    ├── seiketsu.js # 4S - Standardize
    └── shitsuke.js # 5S - Sustain
```

## 📋 Coding Guidelines

- ES Modules (`import`/`export`)
- Async/await для асинхронного коду
- JSDoc коментарі для функцій
- Descriptive variable names
- Error handling з try/catch

## 🧪 Testing

```bash
npm test
```

## 📖 Документація

При додаванні нових інструментів:
1. Додайте JSDoc до функцій
2. Оновіть README.md (API Reference)
3. Додайте приклади використання

## 💬 Питання?

Відкрийте Issue або Discussion.

---

**Дякуємо за ваш внесок! 整理整頓清掃清潔躾**
