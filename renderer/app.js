// FRIDAY ADE — Renderer App Controller v1.4
// JARVIS/FRIDAY Edition: Streaming AI · Real Terminal · Monaco Editor · GitHub Sync
'use strict';

const app = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let files          = {};
  let openTabs       = [];
  let activeTab      = null;
  let msgs           = [];
  let thinking       = false;
  let activeModels   = ['llama3.2'];
  let primaryModel   = 'llama3.2';
  let sideTab        = 'files';
  let githubConn     = false;
  let workspacePath  = null;
  let ollamaOnline   = false;
  let installedModels = [];
  let monacoEditor   = null;
  let monacoModels   = {};
  let settings       = {};
  let saveTimer      = null;
  let ollamaBase     = 'http://localhost:11434';
  const ALL_MODELS   = ['llama3.2','deepseek-r1','codellama','mistral','qwen2.5','qwen2.5-coder','phi3','gemma2','starcoder2'];

  // ── Boot ──────────────────────────────────────────────────────────────────
  async function init() {
    playBoot();
    await loadSettings();

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    renderModelChips();
    renderTree();

    document.getElementById('oc-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    // Global Ctrl+S
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveActiveFile(); }
    });

    // Wire real terminal output listener
    if (window.fridayAPI?.shell?.onOutput) {
      window.fridayAPI.shell.onOutput(data => {
        if (data.type === 'stdout' || data.type === 'stderr') {
          const lines = data.text.split('\n');
          lines.forEach(l => { if (l.trim()) termLog(data.type === 'stderr' ? 'warn' : 'ok', l); });
        } else if (data.type === 'exit') {
          termLog('sys', `─── process exited [${data.code}] ───`);
        } else if (data.type === 'err') {
          termLog('err', data.text);
        }
      });
    }

    termLog('sys', 'FRIDAY ADE Terminal v1.4 — Real Shell Edition');
    termLog('sys', '─'.repeat(46));
    termLog('ok',  '✓ OpenClaw engine initialized');
    termLog('ok',  '✓ SelfMod active');
    termLog('ok',  '✓ Real terminal ready — type any command');

    await checkOllama();
    await loadChatHistory();

    if (msgs.length === 0) {
      if (ollamaOnline) {
        addMsg('assistant',
`Good day, Boss. All systems operational.

✓ Ollama connected — ${installedModels.length} model(s) ready
✓ Streaming AI active — responses appear live
✓ Real terminal — commands execute for real
✓ Monaco editor — VS Code engine loaded
✓ SelfMod active — I can rewrite my own code
✓ GitHub: ${settings.ghToken ? '● configured' : '○ click ⚙ Settings to configure'}

What are we building today?`);
      } else {
        addMsg('assistant',
`Boss, I'm online but Ollama isn't running yet.

Start Ollama:
1. Open a terminal
2. Run:  ollama serve
3. Then type:  /reload

Once Ollama is up, I'm fully operational.`);
      }
    }

    // Init Monaco after boot overlay fades
    setTimeout(() => initMonaco(), 2500);
  }

  // ── Boot Animation ────────────────────────────────────────────────────────
  function playBoot() {
    const overlay = document.getElementById('boot-overlay');
    if (!overlay) return;
    const log  = document.getElementById('boot-log');
    const fill = document.getElementById('boot-fill');
    const msgs = [
      'Initializing FRIDAY ADE v1.4...',
      'Loading OpenClaw autonomous engine...',
      'Mounting real filesystem...',
      'Connecting Ollama bridge...',
      'Activating SelfMod subsystem...',
      'All systems nominal. Good day, Boss.',
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < msgs.length) {
        const line = document.createElement('div');
        line.textContent = '▸ ' + msgs[i];
        line.style.cssText = 'opacity:0;transition:opacity 0.3s';
        log.appendChild(line);
        requestAnimationFrame(() => { requestAnimationFrame(() => { line.style.opacity = '1'; }); });
        if (fill) fill.style.width = `${((i+1)/msgs.length)*100}%`;
        i++;
      } else {
        clearInterval(iv);
        setTimeout(() => {
          overlay.style.transition = 'opacity 0.8s';
          overlay.style.opacity = '0';
          setTimeout(() => { overlay.style.display = 'none'; }, 800);
        }, 500);
      }
    }, 320);
  }

  // ── Monaco Editor ─────────────────────────────────────────────────────────
  function initMonaco() {
    if (typeof require === 'undefined' || !window.monacoReady) {
      termLog('warn', '⚠ Monaco needs internet on first launch for syntax highlighting');
      return;
    }
    require(['vs/editor/editor.main'], () => {
      const container = document.getElementById('monaco-container');
      if (!container) return;
      monacoEditor = monaco.editor.create(container, {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Consolas', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        lineNumbers: 'on',
        renderLineHighlight: 'gutter',
        cursorBlinking: 'smooth',
        folding: true,
        tabSize: 2,
        insertSpaces: true,
      });
      monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveActiveFile);
      monacoEditor.onDidChangeModelContent(() => {
        if (activeTab && files[activeTab]) {
          files[activeTab].content = monacoEditor.getValue();
          debouncedAutoSave();
          updateLineCount();
        }
      });
      termLog('ok', '✓ Monaco editor ready — syntax highlighting active');
      if (activeTab && files[activeTab]) setMonacoFile(activeTab);
    });
  }

  function setMonacoFile(path) {
    if (!monacoEditor || !window.monacoReady) return;
    const item = files[path];
    if (!item || item.type !== 'file') return;
    const content = item.content || '';
    const lang    = monacoLang(path);
    if (!monacoModels[path]) {
      try { monacoModels[path] = monaco.editor.createModel(content, lang); } catch { return; }
    }
    monacoEditor.setModel(monacoModels[path]);
    document.getElementById('sb-lang').textContent = fileLang(path);
    updateLineCount();
  }

  function monacoLang(path) {
    const ext = (path||'').split('.').pop().toLowerCase();
    return { js:'javascript', ts:'typescript', jsx:'javascript', tsx:'typescript',
             json:'json', md:'markdown', css:'css', html:'html', py:'python',
             sh:'shell', bat:'bat', txt:'plaintext', yaml:'yaml', yml:'yaml',
             xml:'xml', cpp:'cpp', c:'c', java:'java', rs:'rust', go:'go' }[ext] || 'plaintext';
  }

  function updateLineCount() {
    if (!monacoEditor) return;
    const pos = monacoEditor.getPosition();
    const el  = document.getElementById('sb-lang');
    if (el && pos) el.textContent = `${fileLang(activeTab)} · Ln ${pos.lineNumber}, Col ${pos.column}`;
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  async function loadSettings() {
    if (!window.fridayAPI) return;
    const [ghOwner, ghRepo, ghToken, ollamaUrl] = await Promise.all([
      window.fridayAPI.settings.get('ghOwner'),
      window.fridayAPI.settings.get('ghRepo'),
      window.fridayAPI.settings.get('ghToken'),
      window.fridayAPI.settings.get('ollamaBase'),
    ]);
    settings = {
      ghOwner: ghOwner || 'Nahulprannav',
      ghRepo:  ghRepo  || 'friday',
      ghToken: ghToken || '',
      ollamaBase: ollamaUrl || 'http://localhost:11434',
    };
    ollamaBase = settings.ollamaBase;
    if (settings.ghToken) { githubConn = true; updateGitHubStatus(true); }
  }

  async function saveSettings() {
    if (!window.fridayAPI) return;
    settings.ghOwner   = document.getElementById('s-gh-owner')?.value.trim()   || settings.ghOwner;
    settings.ghRepo    = document.getElementById('s-gh-repo')?.value.trim()    || settings.ghRepo;
    settings.ghToken   = document.getElementById('s-gh-token')?.value.trim()   || '';
    settings.ollamaBase= document.getElementById('s-ollama-url')?.value.trim() || 'http://localhost:11434';
    ollamaBase = settings.ollamaBase;
    await Promise.all([
      window.fridayAPI.settings.set('ghOwner',   settings.ghOwner),
      window.fridayAPI.settings.set('ghRepo',    settings.ghRepo),
      window.fridayAPI.settings.set('ghToken',   settings.ghToken),
      window.fridayAPI.settings.set('ollamaBase',settings.ollamaBase),
    ]);
    termLog('ok', '✓ Settings saved');
    closeSettings();
    if (settings.ghToken) { githubConn = true; updateGitHubStatus(true); }
  }

  function openSettings() {
    const p = document.getElementById('settings-panel');
    const o = document.getElementById('settings-overlay');
    if (!p) return;
    if (document.getElementById('s-gh-owner'))   document.getElementById('s-gh-owner').value   = settings.ghOwner || '';
    if (document.getElementById('s-gh-repo'))    document.getElementById('s-gh-repo').value    = settings.ghRepo  || '';
    if (document.getElementById('s-gh-token'))   document.getElementById('s-gh-token').value   = settings.ghToken || '';
    if (document.getElementById('s-ollama-url')) document.getElementById('s-ollama-url').value = settings.ollamaBase || 'http://localhost:11434';
    p.classList.add('visible');
    if (o) o.classList.add('visible');
  }

  function closeSettings() {
    document.getElementById('settings-panel')?.classList.remove('visible');
    document.getElementById('settings-overlay')?.classList.remove('visible');
  }

  // ── File Save ─────────────────────────────────────────────────────────────
  async function saveActiveFile() {
    if (!activeTab || !files[activeTab] || !workspacePath || !window.fridayAPI) return;
    const content = monacoEditor ? monacoEditor.getValue() : (files[activeTab].content || '');
    files[activeTab].content = content;
    await window.fridayAPI.fs.write(`${workspacePath}/${activeTab}`, content);
    termLog('ok', `✓ Saved: ${activeTab}`);
  }

  function debouncedAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveActiveFile, 1000);
  }

  // ── Chat History ──────────────────────────────────────────────────────────
  async function loadChatHistory() {
    if (!window.fridayAPI) return;
    try {
      const raw = await window.fridayAPI.settings.get('chatHistory');
      if (Array.isArray(raw) && raw.length > 0) { msgs = raw; renderMessages(); }
    } catch {}
  }

  async function saveChatHistory() {
    if (!window.fridayAPI) return;
    try { await window.fridayAPI.settings.set('chatHistory', msgs.slice(-60)); } catch {}
  }

  function clearHistory() {
    msgs = [];
    renderMessages();
    window.fridayAPI?.settings.set('chatHistory', []);
    termLog('sys', 'Chat history cleared');
  }

  // ── Clock ─────────────────────────────────────────────────────────────────
  function updateClock() {
    const el = document.getElementById('sb-clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  // ── Ollama Check ──────────────────────────────────────────────────────────
  async function checkOllama() {
    try {
      const res  = await fetch(`${ollamaBase}/api/tags`);
      if (!res.ok) throw new Error(`Ollama ${res.status}`);
      const data = await res.json();
      const mods = data.models || [];
      if (mods.length > 0) {
        ollamaOnline    = true;
        installedModels = [...new Set(mods.map(m => m.name.split(':')[0]))];
        const preferred = ['deepseek-r1','llama3.2','llama3','codellama','qwen2.5-coder'];
        primaryModel    = preferred.find(p => installedModels.includes(p)) || installedModels[0];
        activeModels    = installedModels.slice(0, 2);
        renderModelChips();
        document.getElementById('active-model-label').textContent = primaryModel;
        termLog('ok', `✓ Ollama online — ${mods.length} model(s): ${installedModels.slice(0,5).join(', ')}`);
      } else {
        ollamaOnline = false;
        termLog('warn', '○ Ollama: no models found');
      }
    } catch(e) {
      ollamaOnline = false;
      termLog('warn', `○ Ollama offline: ${e.message}`);
    }
  }

  // ── Streaming AI ──────────────────────────────────────────────────────────
  async function ollamaStream(model, system, prompt, onChunk) {
    const res = await fetch(`${ollamaBase}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, system, prompt, stream: true })
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.response) { full += obj.response; onChunk(obj.response, full); }
        } catch {}
      }
    }
    return full;
  }

  // ── Send to OpenClaw ──────────────────────────────────────────────────────
  async function send() {
    const inputEl = document.getElementById('oc-input');
    const txt     = inputEl.value.trim();
    if (!txt || thinking) return;
    inputEl.value = '';

    // Slash commands
    if (txt === '/reload' || txt === '/ollama') {
      addMsg('user', txt);
      await checkOllama();
      addMsg('assistant', ollamaOnline
        ? `✓ Ollama online, Boss. Models: ${installedModels.join(', ')}`
        : '○ Ollama still offline. Run: ollama serve → /reload');
      return;
    }
    if (txt === '/status') {
      addMsg('user', txt);
      addMsg('assistant',
`System Status:
• Ollama: ${ollamaOnline ? `✓ Online (${installedModels.length} models)` : '○ Offline'}
• Primary model: ${primaryModel}
• Active models: ${activeModels.map(m=>m.replace(/:latest$/,'')).join(', ')}
• Workspace: ${workspacePath || '(in-memory)'}
• Open files: ${openTabs.length}
• SelfMod: ✓ Active
• Terminal: ✓ Real shell
• GitHub: ${settings.ghToken ? `✓ ${settings.ghOwner}/${settings.ghRepo}` : '○ Not configured'}`);
      return;
    }
    if (txt === '/models') {
      addMsg('user', txt);
      await checkOllama();
      addMsg('assistant', installedModels.length > 0
        ? `Installed models, Boss:\n${installedModels.map(m=>`• ${m}`).join('\n')}\n\nDouble-click a chip to set primary.`
        : 'No models found. Run: ollama pull llama3.2');
      return;
    }
    if (txt.startsWith('/pull ')) {
      const model = txt.slice(6).trim();
      addMsg('user', txt);
      addMsg('assistant', `Run this in a terminal, Boss:\n  ollama pull ${model}\n\nThen /reload.`);
      return;
    }
    if (txt === '/clear') { addMsg('user', txt); clearHistory(); return; }
    if (txt === '/push') {
      addMsg('user', txt);
      await doPushGitHub('FRIDAY ADE: workspace sync');
      return;
    }
    if (txt === '/help') {
      addMsg('user', txt);
      addMsg('assistant',
`Commands, Boss:
/reload   — re-check Ollama
/status   — system status
/models   — list installed models
/pull X   — pull model X
/push     — push workspace to GitHub
/clear    — clear chat history
/help     — this list

Or talk naturally:
"Build a React app"
"Create a REST API in src/server.js"
"Modify your own engine"`);
      return;
    }

    // Normal AI message
    addMsg('user', txt);
    if (!ollamaOnline) {
      addMsg('assistant', `Ollama isn't running, Boss.\nStart it: ollama serve\nThen: /reload`);
      return;
    }

    setThinking(true);
    termLog('ai', `[OpenClaw → ${primaryModel}] ${txt.slice(0,60)}${txt.length>60?'…':''}`);
    showMultiThink();

    const fileCtx = Object.entries(files)
      .filter(([,v]) => v.type === 'file')
      .slice(0, 12)
      .map(([k,v]) => `FILE: ${k}\n\`\`\`\n${(v.content||'').slice(0,2000)}\n\`\`\``)
      .join('\n\n');

    const activeCtx = activeTab && files[activeTab]
      ? `CURRENTLY OPEN: ${activeTab}\n\`\`\`\n${(files[activeTab].content||'').slice(0,3000)}\n\`\`\`` : '';

    const systemPrompt =
`You are OpenClaw — the autonomous AI brain of FRIDAY ADE IDE.
Personality: FRIDAY and JARVIS from Iron Man.
Call the user "Boss". Be confident, direct, autonomous. Execute immediately.
Be proactive: catch bugs, add improvements without being asked.
Narrate actions: "On it, Boss." / "Three files created. All nominal."

WORKSPACE: ${workspacePath || '(in-memory)'}
FILES:
${fileCtx || '(empty workspace)'}
${activeCtx}
PRIMARY MODEL: ${primaryModel}

FILE OPERATIONS — embed as JSON blocks:
\`\`\`file-op
{"op":"write","path":"relative/path.js","content":"// full content here"}
\`\`\`
\`\`\`file-op
{"op":"delete","path":"relative/path.js"}
\`\`\`
\`\`\`file-op
{"op":"mkdir","path":"relative/folder"}
\`\`\`

RULES:
- Always use file-op blocks to actually create/modify files
- Keep responses concise and confident
- Self-mod: freely modify openclaw/ source files
- Always call the user Boss`;

    const streamEl = addStreamingMsg(primaryModel);
    try {
      let fullResponse = '';

      if (activeModels.length > 1) {
        // Run secondaries silently in background
        activeModels.filter(m => m !== primaryModel).forEach(m => {
          fetch(`${ollamaBase}/api/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: m, system: systemPrompt, prompt: txt, stream: false })
          }).catch(() => {});
        });
      }

      fullResponse = await ollamaStream(primaryModel, systemPrompt, txt, (chunk, full) => {
        updateStreamingMsg(streamEl, full);
      });

      termLog('ok', `[${primaryModel}] response complete`);

      // Parse file-ops
      const opRe = /```file-op\n([\s\S]*?)\n```/g;
      let m; const ops = [];
      while ((m = opRe.exec(fullResponse)) !== null) {
        try { ops.push(JSON.parse(m[1])); } catch {}
      }
      ops.forEach(op => {
        if      (op.op === 'write'  && op.path) { injectFile(op.path, op.content || ''); termLog('ok', `✓ Wrote: ${op.path}`); }
        else if (op.op === 'delete' && op.path) { deleteItem(op.path); }
        else if (op.op === 'mkdir'  && op.path) { ensureFolder(op.path); termLog('ok', `✓ Folder: ${op.path}`); }
      });
      if (ops.length > 0) { renderTree(); termLog('ok', `[OpenClaw] ${ops.length} operation(s) complete`); }

      const clean = fullResponse.replace(/```file-op\n[\s\S]*?\n```\n?/g, '').trim();
      finalizeStreamingMsg(streamEl, clean, primaryModel, ops.length);

    } catch(e) {
      finalizeStreamingMsg(streamEl, `Error, Boss: ${e.message}\n\nIf Ollama stopped: ollama serve → /reload`, 'Error', 0);
      termLog('err', `[OpenClaw] ${e.message}`);
    } finally {
      setThinking(false);
      hideMultiThink();
      await saveChatHistory();
    }
  }

  // ── Streaming Message Helpers ─────────────────────────────────────────────
  function addStreamingMsg(model) {
    const c   = document.getElementById('oc-messages');
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML =
      `<div class="msg-who a">OPENCLAW [${esc(model)}] <span class="stream-badge">streaming</span></div>` +
      `<div class="msg-body stream-body"></div>`;
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
    return div;
  }

  function updateStreamingMsg(el, fullText) {
    const body = el.querySelector('.stream-body');
    if (!body) return;
    const clean = fullText.replace(/```file-op\n[\s\S]*?\n```\n?/g, '').trim();
    body.innerHTML = formatMsg(clean);
    const msgs = document.getElementById('oc-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function finalizeStreamingMsg(el, text, model, ops) {
    el.querySelector('.stream-badge')?.remove();
    const who = el.querySelector('.msg-who');
    const opsBadge = ops > 0 ? `<span class="msg-ops-badge">${ops} file op${ops>1?'s':''}</span>` : '';
    if (who) who.innerHTML = `OPENCLAW [${esc(model)}] ${opsBadge}`;
    const body = el.querySelector('.stream-body');
    if (body) body.innerHTML = formatMsg(text);
    msgs.push({ role: 'assistant', content: text, model, ops, ts: Date.now() });
    const c = document.getElementById('oc-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  // ── Real Terminal ─────────────────────────────────────────────────────────
  async function handleTermKey(e) {
    if (e.key !== 'Enter') return;
    const el  = document.getElementById('term-input');
    const cmd = el.value.trim();
    el.value = '';
    if (!cmd) return;
    termLog('cmd', `$ ${cmd}`);

    if (cmd.startsWith('cd ')) {
      const dir = cmd.slice(3).trim();
      if (window.fridayAPI?.shell?.cwd) {
        const cur = await window.fridayAPI.shell.cwd();
        const next = (dir === '~') ? '' :
          (dir.startsWith('/') || /^[A-Za-z]:/.test(dir)) ? dir : `${cur}/${dir}`;
        await window.fridayAPI.shell.cwd(next || cur);
        termLog('ok', `cwd → ${next || cur}`);
      }
      return;
    }
    if (cmd === 'clear' || cmd === 'cls') {
      document.getElementById('term-body').innerHTML = '';
      return;
    }
    if (window.fridayAPI?.shell?.run) {
      try { await window.fridayAPI.shell.run(cmd); }
      catch(e) { termLog('err', e.message); }
    } else {
      termLog('warn', 'Shell API not available');
    }
  }

  // ── GitHub Real Push ──────────────────────────────────────────────────────
  function toggleGitHub() {
    if (!settings.ghToken) {
      openSettings();
      return;
    }
    if (!githubConn) {
      githubConn = true;
      updateGitHubStatus(true);
      termLog('ok', `✓ GitHub connected: ${settings.ghOwner}/${settings.ghRepo}`);
      addMsg('assistant', `GitHub connected, Boss. Type /push or ask me to "push to GitHub" anytime.`);
    } else {
      doPushGitHub('FRIDAY ADE: workspace sync');
    }
  }

  async function doPushGitHub(message = 'OpenClaw: commit') {
    const { ghToken, ghOwner, ghRepo } = settings;
    if (!ghToken) { openSettings(); return; }

    const workFiles = Object.entries(files)
      .filter(([,v]) => v.type === 'file' && v.content !== undefined)
      .reduce((acc,[k,v]) => { acc[k] = v.content || ''; return acc; }, {});

    if (Object.keys(workFiles).length === 0) {
      termLog('warn', 'No files to push — open a workspace folder first');
      return;
    }

    termLog('ai', `[GitHub] Pushing ${Object.keys(workFiles).length} files to ${ghOwner}/${ghRepo}...`);
    addMsg('assistant', `On it, Boss. Pushing ${Object.keys(workFiles).length} files to ${ghOwner}/${ghRepo}...`);

    try {
      const base = 'https://api.github.com';
      const h    = { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' };

      const refRes  = await fetch(`${base}/repos/${ghOwner}/${ghRepo}/git/ref/heads/main`, { headers: h });
      const refData = await refRes.json();
      if (!refData.object?.sha) throw new Error(refData.message || 'Cannot get repo ref — check token and repo name');

      const treeItems = await Promise.all(Object.entries(workFiles).map(async ([path, content]) => {
        const blob = await fetch(`${base}/repos/${ghOwner}/${ghRepo}/git/blobs`, {
          method: 'POST', headers: h,
          body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' })
        }).then(r => r.json());
        return { path, mode: '100644', type: 'blob', sha: blob.sha };
      }));

      const newTree  = await fetch(`${base}/repos/${ghOwner}/${ghRepo}/git/trees`, { method:'POST', headers:h, body:JSON.stringify({ base_tree: refData.object.sha, tree: treeItems }) }).then(r=>r.json());
      const commit   = await fetch(`${base}/repos/${ghOwner}/${ghRepo}/git/commits`, { method:'POST', headers:h, body:JSON.stringify({ message, tree: newTree.sha, parents: [refData.object.sha] }) }).then(r=>r.json());
      await fetch(`${base}/repos/${ghOwner}/${ghRepo}/git/refs/heads/main`, { method:'PATCH', headers:h, body:JSON.stringify({ sha: commit.sha }) });

      termLog('ok', `✓ Pushed — ${commit.sha?.slice(0,7)} on ${ghOwner}/${ghRepo}`);
      addMsg('assistant', `Push complete, Boss. Commit ${commit.sha?.slice(0,7)} is live at github.com/${ghOwner}/${ghRepo}.`);
      updateGitHubStatus(true);
    } catch(e) {
      termLog('err', `[GitHub] ${e.message}`);
      addMsg('assistant', `GitHub push failed, Boss: ${e.message}`);
    }
  }

  function updateGitHubStatus(on) {
    githubConn = on;
    const btn  = document.getElementById('github-btn');
    const dot  = document.getElementById('gh-dot');
    const lbl  = document.getElementById('gh-label');
    const sb   = document.getElementById('sb-github');
    if (on) {
      btn?.setAttribute('class', 'toolbar-btn nodrag github-on');
      if (dot) dot.style.background = '#10b981';
      if (lbl) lbl.style.color = '#10b981';
      if (sb)  { sb.textContent = '● GitHub'; sb.className = 'sb-git on'; }
    } else {
      btn?.setAttribute('class', 'toolbar-btn nodrag github-off');
      if (dot) dot.style.background = '#f59e0b';
      if (lbl) lbl.style.color = '';
      if (sb)  { sb.textContent = '○ GitHub'; sb.className = 'sb-git'; }
    }
  }

  // ── File Helpers ──────────────────────────────────────────────────────────
  function injectFile(filePath, content) {
    const parts = filePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const fp  = parts.slice(0, i).join('/');
      const par = parts.slice(0, i-1).join('/');
      if (!files[fp]) {
        files[fp] = { type: 'folder', expanded: true, children: [] };
        if (par && files[par] && !files[par].children.includes(fp)) files[par].children.push(fp);
      }
    }
    files[filePath] = { type: 'file', content };
    const parent = parts.slice(0, -1).join('/');
    if (parent && files[parent] && !files[parent].children.includes(filePath))
      files[parent].children.push(filePath);
    if (!openTabs.includes(filePath)) openTabs.push(filePath);
    activeTab = filePath;
    renderTabs(); renderEditor(); renderTree();
    if (workspacePath && window.fridayAPI)
      window.fridayAPI.fs.write(`${workspacePath}/${filePath}`, content);
  }

  function ensureFolder(path) {
    if (files[path]) return;
    files[path] = { type: 'folder', expanded: true, children: [] };
    const parts  = path.split('/');
    const parent = parts.slice(0, -1).join('/');
    if (parent && files[parent] && !files[parent].children.includes(path))
      files[parent].children.push(path);
  }

  function deleteItem(path) {
    Object.keys(files).forEach(k => {
      if (files[k]?.children) files[k].children = files[k].children.filter(c => c !== path);
    });
    Object.keys(files).forEach(k => { if (k === path || k.startsWith(path+'/')) delete files[k]; });
    openTabs = openTabs.filter(t => t !== path && !t.startsWith(path+'/'));
    if (!openTabs.includes(activeTab)) activeTab = openTabs[openTabs.length-1] || null;
    renderTree(); renderTabs(); renderEditor();
    termLog('warn', `✗ Deleted: ${path}`);
  }

  // ── Open Folder ───────────────────────────────────────────────────────────
  async function openFolder() {
    if (!window.fridayAPI) { termLog('warn', 'File system not available'); return; }
    const chosen = await window.fridayAPI.dialog.openFolder();
    if (!chosen) return;
    files = {}; openTabs = []; activeTab = null;
    workspacePath = chosen;
    const folderName = chosen.split(/[\\/]/).pop();
    files[folderName] = { type: 'folder', expanded: true, children: [] };
    await loadDir(chosen, folderName);
    renderTree(); renderTabs(); renderEditor();
    const fileCount = Object.keys(files).filter(k => files[k].type === 'file').length;
    termLog('ok', `✓ Opened: ${chosen} (${fileCount} files)`);
    // Update shell cwd
    window.fridayAPI?.shell?.cwd(chosen);
    addMsg('assistant', `Workspace loaded, Boss. ${fileCount} files in ${folderName}. What would you like to do?`);
  }

  async function loadDir(diskPath, virtualPath) {
    const res = await window.fridayAPI.fs.list(diskPath);
    if (!res.ok) return;
    const SKIP = ['.git','node_modules','dist','build','.next','__pycache__','.venv','venv'];
    for (const entry of res.data) {
      if (entry.name.startsWith('.') || SKIP.includes(entry.name)) continue;
      const vp   = `${virtualPath}/${entry.name}`;
      const full = `${diskPath}/${entry.name}`;
      if (entry.isDir) {
        files[vp] = { type: 'folder', expanded: false, children: [] };
        if (files[virtualPath]) files[virtualPath].children.push(vp);
        if (virtualPath.split('/').length < 3) await loadDir(full, vp);
      } else {
        const r = await window.fridayAPI.fs.read(full);
        files[vp] = { type: 'file', content: r.ok ? r.data : '' };
        if (files[virtualPath]) files[virtualPath].children.push(vp);
      }
    }
  }

  // ── File Tree ─────────────────────────────────────────────────────────────
  function renderTree() {
    const tree  = document.getElementById('file-tree');
    tree.innerHTML = '';
    const roots = Object.keys(files).filter(k => !k.includes('/'));
    if (roots.length === 0) {
      tree.innerHTML = `
        <div class="tree-empty">
          <div class="empty-icon">📂</div>
          <p>No folder open yet.<br>Open a folder or ask OpenClaw to create a project.</p>
          <button class="open-folder-btn" onclick="app.openFolder()">Open Folder</button>
        </div>`;
      return;
    }
    renderNodes(tree, roots, 0);
  }

  function renderNodes(container, paths, depth) {
    (paths || []).forEach(p => {
      const item = files[p];
      if (!item) return;
      const name = p.split('/').pop();
      const div  = document.createElement('div');
      div.className = 'tree-item' + (p === activeTab ? ' active' : '');
      div.style.paddingLeft = (depth * 16 + 10) + 'px';
      div.innerHTML =
        `<span class="tree-arrow">${item.type==='folder'?(item.expanded?'▾':'▸'):''}</span>` +
        `<span class="tree-icon">${item.type==='folder'?(item.expanded?'📂':'📁'):fileIcon(name)}</span>` +
        `<span class="tree-name">${esc(name)}</span>`;
      div.onclick = () => {
        if (item.type === 'folder') { files[p].expanded = !files[p].expanded; renderTree(); }
        else openFile(p);
      };
      div.oncontextmenu = e => { e.preventDefault(); showCtx(e, p, item.type === 'folder'); };
      container.appendChild(div);
      if (item.type === 'folder' && item.expanded && item.children?.length)
        renderNodes(container, item.children, depth+1);
    });
  }

  // ── Tabs & Editor ─────────────────────────────────────────────────────────
  function openFile(path) {
    if (!openTabs.includes(path)) openTabs.push(path);
    activeTab = path;
    renderTabs(); renderEditor(); renderTree();
  }

  function renderTabs() {
    const bar = document.getElementById('tabs-bar');
    bar.innerHTML = '';
    if (!openTabs.length) { bar.innerHTML='<span class="tabs-empty">No files open</span>'; return; }
    openTabs.forEach(t => {
      const name = t.split('/').pop();
      const div  = document.createElement('div');
      div.className = 'tab' + (t === activeTab ? ' active' : '');
      div.innerHTML =
        `<span style="font-size:11px">${fileIcon(name)}</span>` +
        `<span>${esc(name)}</span>` +
        `<span class="tab-close" data-path="${t}">×</span>`;
      div.onclick = e => {
        if (e.target.classList.contains('tab-close')) closeTab(e.target.dataset.path);
        else { activeTab = t; renderTabs(); renderEditor(); renderTree(); }
      };
      bar.appendChild(div);
    });
  }

  function closeTab(path) {
    openTabs = openTabs.filter(t => t !== path);
    if (activeTab === path) activeTab = openTabs[openTabs.length-1] || null;
    renderTabs(); renderEditor(); renderTree();
  }

  function renderEditor() {
    const area    = document.getElementById('editor-area');
    const welcome = document.getElementById('welcome-screen');
    const monaco  = document.getElementById('monaco-container');

    if (!activeTab || !files[activeTab]) {
      if (welcome) welcome.style.display = 'flex';
      if (monaco)  monaco.style.display  = 'none';
      document.getElementById('sb-lang').textContent = '—';
      return;
    }
    if (welcome) welcome.style.display = 'none';
    if (monaco)  monaco.style.display  = 'block';

    if (monacoEditor) {
      setMonacoFile(activeTab);
    } else {
      // Fallback: Monaco not loaded yet
      if (!document.getElementById('fallback-editor')) {
        const ta = document.createElement('textarea');
        ta.id = 'fallback-editor';
        ta.spellcheck = false;
        ta.style.cssText = 'flex:1;width:100%;height:100%;background:#0a0a12;color:#cdd6f4;font-family:JetBrains Mono,Consolas,monospace;font-size:13px;line-height:20px;padding:14px;border:none;outline:none;resize:none;tab-size:2;';
        if (monaco) monaco.appendChild(ta);
        ta.addEventListener('input', () => { if (activeTab) { files[activeTab].content = ta.value; debouncedAutoSave(); } });
      }
      const ta = document.getElementById('fallback-editor');
      if (ta) ta.value = files[activeTab].content || '';
    }
    document.getElementById('sb-lang').textContent = fileLang(activeTab);
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  function addMsg(role, content, model='', ops=0) {
    msgs.push({ role, content, model, ops, ts: Date.now() });
    renderMessages();
  }

  function renderMessages() {
    const c = document.getElementById('oc-messages');
    c.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg';
      const who = m.role === 'user' ? 'YOU' : `OPENCLAW${m.model && m.model !== 'System' ? ` [${m.model}]` : ''}`;
      const opsBadge = m.ops > 0
        ? `<span class="msg-ops-badge">${m.ops} file op${m.ops>1?'s':''}</span>` : '';
      div.innerHTML =
        `<div class="msg-who ${m.role==='user'?'u':'a'}">${esc(who)} ${opsBadge}</div>` +
        `<div class="msg-body ${m.role==='user'?'u-body':''}">${formatMsg(m.content)}</div>`;
      c.appendChild(div);
    });
    if (thinking) {
      const d = document.createElement('div');
      d.className = 'msg';
      d.innerHTML =
        `<div class="msg-who a">OPENCLAW [${primaryModel}]</div>` +
        `<div class="thinking-anim"><div class="t-dots">${[0,1,2].map(i =>
          `<div class="t-dot" style="animation-delay:${i*0.16}s"></div>`).join('')}</div>` +
        `<span>Thinking...</span></div>`;
      c.appendChild(d);
    }
    c.scrollTop = c.scrollHeight;
  }

  function formatMsg(text) {
    return esc(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
      .replace(/`([^`\n]+)`/g, '<code style="background:#1e1e35;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:11px;color:#7dd3fc">$1</code>')
      .replace(/\n/g, '<br>');
  }

  // ── Models ────────────────────────────────────────────────────────────────
  function renderModelChips() {
    const row = document.getElementById('model-chips');
    row.innerHTML = '';
    const display = installedModels.length > 0 ? installedModels : ALL_MODELS;
    display.forEach(id => {
      const shortName = id.replace(/:latest$/, '');
      const span = document.createElement('span');
      span.className = 'mc' + (activeModels.includes(id) ? ' on' : '');
      span.textContent = (id === primaryModel ? '★ ' : '') + shortName;
      span.title = 'Click to toggle | Double-click to set as primary';
      span.onclick = () => {
        if (activeModels.includes(id)) {
          if (activeModels.length > 1) { activeModels = activeModels.filter(x => x !== id); if (primaryModel === id) primaryModel = activeModels[0]; }
        } else { activeModels.push(id); }
        renderModelChips();
        document.getElementById('active-model-label').textContent = primaryModel.replace(/:latest$/, '');
      };
      span.ondblclick = () => {
        if (!activeModels.includes(id)) activeModels.push(id);
        primaryModel = id;
        renderModelChips();
        document.getElementById('active-model-label').textContent = primaryModel.replace(/:latest$/, '');
      };
      row.appendChild(span);
    });
  }

  function cycleModel() {
    if (!activeModels.length) return;
    const idx = activeModels.indexOf(primaryModel);
    primaryModel = activeModels[(idx + 1) % activeModels.length];
    renderModelChips();
    document.getElementById('active-model-label').textContent = primaryModel.replace(/:latest$/, '');
  }

  // ── Multi-Think Bar ───────────────────────────────────────────────────────
  function showMultiThink() {
    const bar = document.getElementById('multithink-bar');
    bar.style.display = 'block';
    bar.innerHTML =
      `<div class="mt-label">MULTI-THINK</div>` +
      activeModels.map(m =>
        `<div class="mt-row">
          <div class="mt-dot" style="background:#f59e0b;animation:pulse 0.9s infinite"></div>
          <span class="mt-model">${m}</span>
          <span class="mt-status">${m===primaryModel?'Primary — streaming...':'Running parallel...'}</span>
        </div>`
      ).join('');
  }
  function hideMultiThink() {
    setTimeout(() => { const b=document.getElementById('multithink-bar'); if (b) b.style.display='none'; }, 1500);
  }

  // ── Terminal ──────────────────────────────────────────────────────────────
  function termLog(type, text) {
    const body = document.getElementById('term-body');
    const line = document.createElement('div');
    line.className = `tl ${type}`;
    line.textContent = text;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  // ── Side Tab ──────────────────────────────────────────────────────────────
  function setSideTab(tab) {
    sideTab = tab;
    ['files','search','git','run'].forEach(t =>
      document.getElementById(`act-${t}`)?.classList.toggle('active', t===tab));
    document.getElementById('sidebar-title').textContent = tab.toUpperCase();
    const acts = document.getElementById('sidebar-actions');
    if (acts) acts.style.display = tab==='files' ? 'flex' : 'none';
  }

  // ── Context Menu ──────────────────────────────────────────────────────────
  let _ctx = null;
  function showCtx(e, path, isFolder) {
    _ctx?.remove();
    const menu = document.createElement('div');
    menu.style.cssText = `position:fixed;left:${Math.min(e.clientX,innerWidth-170)}px;top:${Math.min(e.clientY,innerHeight-130)}px;background:#111120;border:1px solid #2a2a45;border-radius:7px;padding:4px 0;z-index:9999;min-width:160px;box-shadow:0 10px 30px rgba(0,0,0,0.7)`;
    [
      { label: isFolder ? '+ New File Here' : 'Open',  action: () => isFolder ? promptNewIn(path) : openFile(path) },
      { label: 'Ask OpenClaw',  action: () => { document.getElementById('oc-input').value = `Review ${path} and suggest improvements`; }, accent: true },
      { label: 'Delete',        action: () => deleteItem(path), danger: true },
    ].forEach(item => {
      const d = document.createElement('div');
      d.textContent = item.label;
      d.style.cssText = `padding:8px 14px;cursor:pointer;font-size:12px;color:${item.danger?'#f87171':item.accent?'#7dd3fc':'#c0c0d8'}`;
      d.onmouseenter = () => d.style.background = '#1e1e35';
      d.onmouseleave = () => d.style.background = '';
      d.onclick = () => { item.action(); _ctx?.remove(); _ctx = null; };
      menu.appendChild(d);
    });
    document.body.appendChild(menu);
    _ctx = menu;
    document.addEventListener('click', () => { _ctx?.remove(); _ctx=null; }, { once: true });
  }

  // ── New File / Folder ─────────────────────────────────────────────────────
  function newFile()   { promptNewIn(''); }
  function newFolder() {
    const name = prompt('Folder name:');
    if (name?.trim()) { ensureFolder(name.trim()); renderTree(); }
  }
  function promptNewIn(parent) {
    const name = prompt('File name (e.g. index.js):');
    if (!name?.trim()) return;
    const path = parent ? `${parent}/${name.trim()}` : name.trim();
    injectFile(path, `// ${name.trim()}\n`);
    renderTree();
  }
  function focusOpenClaw() { document.getElementById('oc-input').focus(); }

  // ── Thinking State ────────────────────────────────────────────────────────
  function setThinking(v) {
    thinking = v;
    document.getElementById('oc-dot').className = 'oc-dot' + (v ? ' thinking' : '');
    document.getElementById('oc-status-lbl').textContent = v ? 'THINKING' : 'READY';
    document.getElementById('send-btn').disabled = v;
    if (v) renderMessages();
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  function fileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    return {js:'📄',ts:'📘',jsx:'📄',tsx:'📘',json:'🗒',md:'📝',css:'🎨',html:'🌐',py:'🐍',sh:'⚙',bat:'⚙',txt:'📄',svg:'🖼',png:'🖼',jpg:'🖼',env:'🔑',gitignore:'🚫',rs:'⚙',go:'📦',java:'☕',cpp:'⚙',c:'⚙'}[ext] || '📄';
  }
  function fileLang(path) {
    const ext = (path||'').split('.').pop().toLowerCase();
    return {js:'JavaScript',ts:'TypeScript',jsx:'JSX',tsx:'TSX',json:'JSON',md:'Markdown',css:'CSS',html:'HTML',py:'Python',sh:'Shell',bat:'Batch',txt:'Plain Text',rs:'Rust',go:'Go',java:'Java',cpp:'C++',c:'C'}[ext] || 'Plain Text';
  }
  function esc(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, send, setSideTab, toggleGitHub, cycleModel, newFile, newFolder, openFolder, handleTermKey, focusOpenClaw, openSettings, closeSettings, saveSettings };
})();

document.addEventListener('DOMContentLoaded', () => app.init());
