// GitSync — GitHub Integration for FRIDAY ADE
// Uses @octokit/rest for all GitHub operations

class GitSync {
  constructor({ token, owner, repo } = {}) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.connected = false;
    this.branch = 'main';
  }

  async connect(token) {
    this.token = token;
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'FRIDAY-ADE/1.0' }
      });
      const user = await res.json();
      if (user.login) {
        this.connected = true;
        this.user = user;
        return { ok: true, user };
      }
      return { ok: false, error: 'Invalid token' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async listRepos() {
    const res = await fetch('https://api.github.com/user/repos?per_page=50', {
      headers: { Authorization: `Bearer ${this.token}`, 'User-Agent': 'FRIDAY-ADE/1.0' }
    });
    return res.json();
  }

  async createRepo(name, description = 'FRIDAY ADE Project', isPrivate = false) {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'User-Agent': 'FRIDAY-ADE/1.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description, private: isPrivate, auto_init: true })
    });
    return res.json();
  }

  async getFile(path) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}`, 'User-Agent': 'FRIDAY-ADE/1.0' }
    });
    return res.json();
  }

  async commitFile(path, content, message) {
    const existing = await this.getFile(path).catch(() => null);
    const sha = existing?.sha;
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'User-Agent': 'FRIDAY-ADE/1.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || `[OpenClaw] Update ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: this.branch,
        ...(sha ? { sha } : {})
      })
    });
    return res.json();
  }

  disconnect() {
    this.connected = false;
    this.token = null;
    this.user = null;
  }
}

if (typeof module !== 'undefined') module.exports = { GitSync };
