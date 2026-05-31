# 💸 Daily Expense Tracker

A beautiful, lightweight desktop app to **track your daily expenses** and **stay on budget**. Built with [Electron](https://www.electronjs.org/).

![screenshot](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![version](https://img.shields.io/badge/version-1.0.0-green)

---

## ✨ Features

- **💰 Set any budget** — Daily, Weekly, or Monthly
- **📊 Visual progress ring** — See how much you've spent at a glance
- **🚨 Overspend alerts** — Desktop notification when you go over budget
- **📝 Quick-add expenses** — Amount, category & description in seconds
- **📋 Categorized transactions** — Food, Transport, Shopping, Bills & more
- **📅 Switch views** — Toggle between Daily / Weekly / Monthly summaries
- **🔒 100% private** — All data stays on your machine, no accounts needed

---

## 🚀 Download & Install

### Windows
Download `ExpenseTracker-Setup-1.0.0.exe` from the [Releases](https://github.com/samuelchang951222/expense-tracker/releases) page and run it.

### macOS
Download `ExpenseTracker-1.0.0.dmg` from the [Releases](https://github.com/samuelchang951222/expense-tracker/releases) page, open it, and drag the app to your Applications folder.

### Linux
Download `ExpenseTracker-1.0.0.AppImage`, make it executable (`chmod +x`) and run it.

---

## 🛠️ Build from Source

```bash
# Clone the repo
git clone https://github.com/samuelchang951222/expense-tracker.git
cd expense-tracker

# Install dependencies
npm install

# Run in dev mode
npm start

# Build for distribution
npm run build:win      # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux
npm run build:all      # All platforms
```

---

## 🎯 How to Use

1. **Set your budget** — Click the ⚙️ gear icon, choose Daily / Weekly / Monthly, enter your amount, and save
2. **Add expenses** — Type the amount, pick a category, optionally add a description, and hit the ➕ button
3. **Track at a glance** — The ring fills up as you spend. Green = safe, Orange = close, Red = over budget!
4. **Switch views** — Tap Daily / Weekly / Monthly tabs to see different periods
5. **Delete mistakes** — Hover any transaction and click 🗑️

---

## 📁 Data Storage

All your data is stored locally in your user data directory:
- **Windows**: `%APPDATA%/Expense Tracker/data.json`
- **macOS**: `~/Library/Application Support/Expense Tracker/data.json`
- **Linux**: `~/.config/Expense Tracker/data.json`

---

## 📄 License

MIT
