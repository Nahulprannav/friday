// OpenClaw SelfMod — Self-Modification Subsystem v1.1
class SelfMod {
  constructor(claw) {
    this.claw = claw;
    this.history = [];
    this.snapshots = new Map();
    this.CORE_FILES = ['openclaw/engine.js','openclaw/models.js','openclaw/selfmod.js'];
  }

  async snapshot() {
    const snap = {};
    for (const f of this.CORE_FILES) {
      const r = await this.claw.readFile(f);
      if (r.ok) snap[f] = r.data;
    }
    const id = `snap_${Date.now()}`;
    this.snapshots.set(id, snap);
    return id;
  }

  async restore(snapId) {
    const snap = this.snapshots.get(snapId);
    if (!snap) throw new Error(`Snapshot ${snapId} not found`);
    for (const [file, content] of Object.entries(snap)) {
      await this.claw.writeFile(file, content);
    }
    return { ok: true, restored: Object.keys(snap) };
  }

  async apply(instruction) {
    const snapId = await this.snapshot();
    try {
      const result = await this.claw.modifySelf(instruction);
      this.history.push({ ts: Date.now(), instruction, snapId, status: 'success' });
      return result;
    } catch (err) {
      await this.restore(snapId);
      this.history.push({ ts: Date.now(), instruction, snapId, status: 'reverted', error: err.message });
      throw err;
    }
  }

  getHistory() { return this.history; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { SelfMod };
