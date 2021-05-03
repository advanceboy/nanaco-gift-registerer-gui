const { contextBridge, ipcRenderer } = require('electron');;

contextBridge.exposeInMainWorld('myAPI', {
  // Renderer to Main
  startRegister: async (id, action) => await ipcRenderer.invoke('startRegister', id, action),

  // Main to Renderer
  on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(event, ...args))
});
