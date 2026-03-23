// FRIDAY ADE — Preload v1.4
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('fridayAPI', {
  fs: {
    read:   (p)    => ipcRenderer.invoke('fs:read', p),
    write:  (p, c) => ipcRenderer.invoke('fs:write', p, c),
    delete: (p)    => ipcRenderer.invoke('fs:delete', p),
    list:   (p)    => ipcRenderer.invoke('fs:list', p),
    mkdir:  (p)    => ipcRenderer.invoke('fs:mkdir', p),
    exists: (p)    => ipcRenderer.invoke('fs:exists', p),
  },
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  },
  ollama: {
    ping:     ()     => ipcRenderer.invoke('ollama:ping'),
    list:     ()     => ipcRenderer.invoke('ollama:list'),
    generate: (opts) => ipcRenderer.invoke('ollama:generate', opts),
  },
  shell: {
    run:       (cmd)  => ipcRenderer.invoke('shell:run', cmd),
    cwd:       (path) => ipcRenderer.invoke('shell:cwd', path),
    onOutput:  (cb)   => ipcRenderer.on('shell:output', (_, d) => cb(d)),
    offOutput: ()     => ipcRenderer.removeAllListeners('shell:output'),
  },
  settings: {
    get: (k)    => ipcRenderer.invoke('settings:get', k),
    set: (k, v) => ipcRenderer.invoke('settings:set', k, v),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close:    () => ipcRenderer.send('window:close'),
  }
});

