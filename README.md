# 🦅 FRIDAY ADE
## Autonomous Development Engine — Codename: ANTIGRAVITY

FRIDAY ADE is a next-generation IDE powered by **OpenClaw AI** — an autonomous  
multi-model development engine built on Ollama.

---

## Prerequisites

| Requirement | Version | Link |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Ollama | Latest | https://ollama.ai |
| Git | Any | https://git-scm.com |

## Quick Start

```bash
# 1. Install Ollama and pull models
ollama pull llama3.2
ollama pull deepseek-r1
ollama pull codellama

# 2. Install dependencies
npm install

# 3. Launch FRIDAY ADE
npm start
```

## Build Installer

```bash
# Windows (.exe installer)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage)
npm run build:linux
```

Built installers appear in the `dist/` folder.

---

## Core Systems

| System | Status | Description |
|---|---|---|
| OpenClaw Engine | ✅ | Multi-model autonomous AI |
| FileSystem | ✅ | Full CRUD — create/read/write/delete |
| SelfMod | ✅ | OpenClaw modifies its own code |
| Multi-Think | ✅ | Parallel reasoning across models |
| GitHub Sync | ✅ | Store/version workspace on GitHub |
| Terminal | ✅ | Integrated shell |
| Ollama Bridge | ✅ | Local LLM via Ollama |

## OpenClaw Commands (examples)

In the OpenClaw panel, type natural language:

- `"Create a REST API with Express in src/server.js"`
- `"Add error handling to all files in src/"`
- `"Modify your own engine to add logging"`
- `"Push everything to GitHub with message 'initial commit'"`
- `"Delete the test folder and recreate it with proper structure"`

## Self-Modification

OpenClaw can rewrite its own source files in `openclaw/`. This is the  
**ANTIGRAVITY** capability — the system has no ceiling.

## Environment Variables

Create a `.env` file:
```
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
OLLAMA_BASE=http://localhost:11434
```

---

*FRIDAY ADE — v1.0.0 — Built for autonomous development*
