const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  checkOverspend: () => ipcRenderer.invoke('check-overspend'),
  close: () => ipcRenderer.send('close'),
  minimize: () => ipcRenderer.send('minimize')
});
