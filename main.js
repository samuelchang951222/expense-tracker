const { app, BrowserWindow, Notification, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(app.getPath('userData'), 'data.json');

let mainWindow;
let data = { budget: null, expenses: [] };

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      data = JSON.parse(raw);
      if (!data.expenses) data.expenses = [];
    }
  } catch (e) {
    console.error('Failed to load data:', e);
    data = { budget: null, expenses: [] };
  }
}

function saveData() {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

function checkOverspend() {
  if (!data.budget || !data.expenses.length) return null;

  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];
  const weekStart = getWeekStart(now);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let periodExpenses;
  let periodLabel;
  let budgetAmount;

  if (data.budget.type === 'daily') {
    periodExpenses = data.expenses.filter(e => e.date === todayKey);
    periodLabel = 'today';
    budgetAmount = data.budget.amount;
  } else if (data.budget.type === 'weekly') {
    periodExpenses = data.expenses.filter(e => e.date >= weekStart);
    periodLabel = 'this week';
    budgetAmount = data.budget.amount;
  } else {
    periodExpenses = data.expenses.filter(e => e.date.startsWith(monthStart));
    periodLabel = 'this month';
    budgetAmount = data.budget.amount;
  }

  const total = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budgetAmount - total;

  if (remaining < 0) {
    return {
      overspent: true,
      total,
      budget: budgetAmount,
      overBy: Math.abs(remaining),
      periodLabel
    };
  }
  return null;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

ipcMain.handle('load-data', () => {
  loadData();
  return data;
});

ipcMain.handle('save-data', (_, newData) => {
  data = newData;
  saveData();

  const overspend = checkOverspend();
  if (overspend && overspend.overspent) {
    try {
      new Notification({
        title: '⚠️ Overspend Alert!',
        body: `You've gone $${overspend.overBy.toFixed(2)} over your ${overspend.periodLabel} budget of $${overspend.budget.toFixed(2)}. Total: $${overspend.total.toFixed(2)}.`,
        urgency: 'critical'
      }).show();
    } catch (e) {
      console.log('Overspend alert:', overspend);
    }
  }

  return { success: true, overspend };
});

ipcMain.handle('check-overspend', () => {
  return checkOverspend();
});

ipcMain.on('minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close', () => {
  if (mainWindow) mainWindow.close();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 760,
    minWidth: 380,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    backgroundColor: '#0f1729'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
