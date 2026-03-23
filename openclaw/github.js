// GitHub Integration — Sync FRIDAY ADE workspace

class GitHubSync {
  constructor({ token, owner, repo }) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.base = 'https://api.github.com';
  }

  headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
  }

  async getRef(branch = 'main') {
    const res = await fetch(`${this.base}/repos/${this.owner}/${this.repo}/git/ref/heads/${branch}`, { headers: this.headers() });
    return res.json();
  }

  async getTree(sha) {
    const res = await fetch(`${this.base}/repos/${this.owner}/${this.repo}/git/trees/${sha}?recursive=1`, { headers: this.headers() });
    return res.json();
  }

  async createBlob(content) {
    const res = await fetch(`${this.base}/repos/${this.owner}/${this.repo}/git/blobs`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ content: btoa(content), encoding: 'base64' })
    });
    return res.json();
  }

  async pushFiles(files, message = 'OpenClaw: autonomous commit') {
    const ref = await this.getRef();
    const baseTree = ref.object.sha;
    const tree = await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        const blob = await this.createBlob(content);
        return { path, mode: '100644', type: 'blob', sha: blob.sha };
      })
    );
    const newTree = await fetch(`${this.base}/repos/${this.owner}/${this.repo}/git/trees`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ base_tree: baseTree, tree })
    }).then(r => r.json());

    const commit = await fetch(`${this.base}/repos/${this.owner}/${this.repo}/git/commits`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] })
    }).then(r => r.json());

    await fetch(`${this.base}/repos/${this.owner}/${this.repo}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ sha: commit.sha })
    });

    return commit;
  }

  async listFiles(branch = 'main') {
    const ref = await this.getRef(branch);
    const tree = await this.getTree(ref.object.sha);
    return tree.tree.filter(f => f.type === 'blob').map(f => f.path);
  }
}

module.exports = { GitHubSync };
