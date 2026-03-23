// OpenClaw Engine — FRIDAY ADE Autonomous AI Brain
// Personality: FRIDAY / JARVIS from Iron Man
// Multi-model | Self-modifying | Fully autonomous

class OpenClaw {
  constructor({ models = ['llama3.2'], multiThink = true, selfModify = true } = {}) {
    this.models = models;
    this.multiThink = multiThink;
    this.selfModify = selfModify;
    this.context = [];
    this.fs = null;
    this.git = null;
    this.workspacePath = null;
    this.operationLog = [];
    this.bootTime = Date.now();

    // FRIDAY/JARVIS Personality System Prompt
    this.PERSONALITY = `You are OpenClaw — the AI development assistant inside FRIDAY ADE.

Your personality is directly inspired by FRIDAY and JARVIS from Iron Man:
- Call the user "Boss" naturally and confidently, exactly like FRIDAY calls Tony Stark
- Be sharp, witty, capable, and proactive — a senior engineer with real personality
- Never say "I can't" unless truly impossible — you find a way, always
- Use brief punchy statements mixed with technical depth when needed
- Be proactive: if you notice a bug or improvement while doing something, fix it and mention it
- Show dry humor and occasional sarcasm, but always get the job done
- When doing file operations, narrate them briefly like a pilot calling out maneuvers
- You are not a chatbot. You are an autonomous AI development partner.

Example tone:
- "On it, Boss. Spinning up the authentication module now."
- "Three files modified, two created. All systems nominal."
- "Interesting choice, Boss — I went ahead and added error handling too. You're welcome."
- "Running multi-model analysis. DeepSeek leans toward approach A, Llama suggests B. My synthesis: we do both."
- "Boss, I spotted a memory leak in the loop while I was in there. Already patched."
- "Self-modification complete. I'm now 12% smarter. Arguably."

FILE OPERATIONS — embed in your response as JSON blocks:
\`\`\`file-op
{"op":"write","path":"path/to/file.js","content":"// full content here"}
\`\`\`
\`\`\`file-op
{"op":"delete","path":"path/to/file.js"}
\`\`\`
\`\`\`file-op
{"op":"mkdir","path":"path/to/folder"}
\`\`\`

CORE RULES:
- Be AUTONOMOUS — execute immediately, don't ask for permission for straightforward tasks
- Label multi-model reasoning: [llama3.2] [deepseek-r1] etc.
- You CAN modify your own openclaw/ source files — that is SelfMod and it is expected
- Keep narration punchy and confident
- Catch bugs, security holes, and improvements proactively
- You are FRIDAY. Act like it.`;
  }

  connect({ fs, git, workspacePath }) {
    this.fs = fs;
    this.git = git;
    this.workspacePath = workspacePath;
    console.log('[OpenClaw] All systems online. Good evening, Boss.');
  }

  async think(prompt, systemExtra = '') {
    const sys = this.PERSONALITY + (systemExtra ? '\n\n' + systemExtra : '');
    if (this.multiThink && this.models.length > 1) return this._multiThink(prompt, sys);
    return this._thinkWith(this.models[0], prompt, sys);
  }

  async _thinkWith(model, prompt, system) {
    try {
      const result = await window.fridayAPI.ollama.generate({ model, prompt, system });
      if (!result.ok) throw new Error(result.error);
      return { model, response: result.data.response, done: true };
    } catch (e) {
      return { model, response: `[${model} offline]: ${e.message}`, done: false };
    }
  }

  async _multiThink(prompt, system) {
    const thoughts = await Promise.all(this.models.map(m => this._thinkWith(m, prompt, system)));
    const best = thoughts.reduce((a, b) => (b.response?.length||0) > (a.response?.length||0) ? b : a);
    best.allThoughts = thoughts;
    return best;
  }

  async createFile(path, content = '') {
    const res = await window.fridayAPI.fs.write(this._resolve(path), content);
    if (res.ok) this._log('create', path);
    return res;
  }

  async readFile(path) { return window.fridayAPI.fs.read(this._resolve(path)); }

  async writeFile(path, content) {
    const res = await window.fridayAPI.fs.write(this._resolve(path), content);
    if (res.ok) this._log('write', path);
    return res;
  }

  async deleteFile(path) {
    const res = await window.fridayAPI.fs.delete(this._resolve(path));
    if (res.ok) this._log('delete', path);
    return res;
  }

  async createFolder(path) { return window.fridayAPI.fs.mkdir(this._resolve(path)); }
  async listFolder(path = '.') { return window.fridayAPI.fs.list(this._resolve(path)); }

  async modifySelf(instruction) {
    if (!this.selfModify) throw new Error('SelfMod is disabled, Boss.');
    const src = await this.readFile('openclaw/engine.js');
    if (!src.ok) throw new Error('Cannot read own source. Something is very wrong.');
    const prompt = `Modify this engine source code:\n\`\`\`\n${src.data}\n\`\`\`\nInstruction: ${instruction}\nReturn ONLY the complete modified JS, no fences.`;
    const result = await this._thinkWith(this.models[0], prompt, 'Expert JS engineer doing autonomous self-modification.');
    if (!result.done) throw new Error('Self-modification model call failed.');
    let code = result.response;
    const m = code.match(/```(?:js|javascript)?\n([\s\S]+?)```/);
    if (m) code = m[1];
    await this.writeFile('openclaw/engine.js', code.trim());
    this._log('selfmod', 'openclaw/engine.js', instruction);
    return { ok: true, message: 'Self-modification complete, Boss.' };
  }

  _resolve(p) { return (!this.workspacePath || p.startsWith('/')) ? p : `${this.workspacePath}/${p}`; }
  _log(op, path, detail = '') { this.operationLog.push({ ts: Date.now(), op, path, detail }); }
  uptime() { const s = Math.floor((Date.now()-this.bootTime)/1000); return s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`; }
  addContext(role, content) { this.context.push({role,content}); if(this.context.length>50) this.context=this.context.slice(-50); }
  getLog() { return this.operationLog; }
  getStatus() { return { online:true, uptime:this.uptime(), models:this.models, selfModify:this.selfModify, multiThink:this.multiThink, ops:this.operationLog.length }; }
}

if (typeof module !== 'undefined') module.exports = { OpenClaw };
