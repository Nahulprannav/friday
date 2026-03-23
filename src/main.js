// FRIDAY ADE — Electron Main Process v1.4
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const os = require('os');
let shellCwd = os.homedir();
const path   = require('path');
const fs     = require('fs').promises;
const fsSync = require('fs');

const ROOT = path.join(__dirname, '..');
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    frame: false, backgroundColor: '#0a0a12',
    ...(fsSync.existsSync(path.join(ROOT, 'assets/icon.png'))
      ? { icon: path.join(ROOT, 'assets/icon.png') } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadFile(path.join(ROOT, 'renderer/index.html'));
  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── File System ───────────────────────────────────────────────────────────────
ipcMain.handle('fs:read',   async (_, p) => { try { return { ok:true, data: await fs.readFile(p,'utf8') }; } catch(e) { return {ok:false,error:e.message}; } });
ipcMain.handle('fs:write',  async (_, p, c) => { try { await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p,c,'utf8'); return {ok:true}; } catch(e) { return {ok:false,error:e.message}; } });
ipcMain.handle('fs:delete', async (_, p) => { try { await fs.rm(p,{recursive:true,force:true}); return {ok:true}; } catch(e) { return {ok:false,error:e.message}; } });
ipcMain.handle('fs:list',   async (_, p) => { try { const e=await fs.readdir(p,{withFileTypes:true}); return {ok:true,data:e.map(x=>({name:x.name,isDir:x.isDirectory()}))}; } catch(e) { return {ok:false,error:e.message}; } });
ipcMain.handle('fs:mkdir',  async (_, p) => { try { await fs.mkdir(p,{recursive:true}); return {ok:true}; } catch(e) { return {ok:false,error:e.message}; } });
ipcMain.handle('fs:exists', async (_, p) => fsSync.existsSync(p));

// ── Dialog ────────────────────────────────────────────────────────────────────
ipcMain.handle('dialog:openFolder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory','createDirectory'] });
  return r.filePaths[0] || null;
});

// ── Ollama ────────────────────────────────────────────────────────────────────
// List models — try both /api/tags and /api/ps endpoints
ipcMain.handle('ollama:list', async () => {
  try {
    // Try /api/tags first
    const res  = await fetch('http://localhost:11434/api/tags');
    const data = await res.json();
    const models = data.models || [];

    // If empty, try /api/ps (running models)
    if (models.length === 0) {
      try {
        const ps  = await fetch('http://localhost:11434/api/ps');
        const psd = await ps.json();
        if (psd.models?.length > 0) return { ok: true, models: psd.models, source: 'ps' };
      } catch {}
    }

    return { ok: true, models, source: 'tags' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Check if Ollama is alive at all (just ping root)
ipcMain.handle('ollama:ping', async () => {
  try {
    const res = await fetch('http://localhost:11434/');
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Generate — send prompt to model
ipcMain.handle('ollama:generate', async (_, { model, prompt, system }) => {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, system, stream: false })
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Ollama ${res.status}: ${txt.slice(0,200)}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ── Settings ──────────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', async (_, key) => {
  const p = path.join(app.getPath('userData'), 'settings.json');
  try { return JSON.parse(await fs.readFile(p,'utf8'))[key] || null; } catch { return null; }
});
ipcMain.handle('settings:set', async (_, key, value) => {
  const p = path.join(app.getPath('userData'), 'settings.json');
  let s = {};
  try { s = JSON.parse(await fs.readFile(p,'utf8')); } catch {}
  s[key] = value;
  await fs.writeFile(p, JSON.stringify(s,null,2));
  return { ok: true };
});

// ── Shell / Real Terminal ────────────────────────────────────────────────────
ipcMain.handle('shell:cwd', async (_, newCwd) => {
  if (newCwd) shellCwd = newCwd;
  return shellCwd;
});

ipcMain.handle('shell:run', async (_, cmd) => {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'cmd.exe' : '/bin/sh';
    const flag  = isWin ? ['/c', cmd] : ['-c', cmd];
    try {
      const proc = spawn(shell, flag, { cwd: shellCwd, env: { ...process.env }, windowsHide: true });
      proc.stdout.on('data', d => mainWindow?.webContents.send('shell:output', { type: 'stdout', text: d.toString() }));
      proc.stderr.on('data', d => mainWindow?.webContents.send('shell:output', { type: 'stderr', text: d.toString() }));
      proc.on('close', code => { mainWindow?.webContents.send('shell:output', { type: 'exit', code }); resolve({ ok: true, code }); });
      proc.on('error', err => { mainWindow?.webContents.send('shell:output', { type: 'err', text: err.message }); resolve({ ok: false, error: err.message }); });
    } catch(e) { resolve({ ok: false, error: e.message }); }
  });
});

// ── Window ────────────────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.restore() : mainWindow.maximize());
ipcMain.on('window:close',    () => mainWindow?.close());
