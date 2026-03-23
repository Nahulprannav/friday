#!/bin/bash
# FRIDAY ADE — Setup Script
echo "🦅 FRIDAY ADE Setup"
echo "===================="

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js: $(node -v)"

# Check Ollama
if ! command -v ollama &> /dev/null; then
  echo "⚠️  Ollama not found. Install from https://ollama.ai"
  echo "   After install, run: ollama pull llama3.2"
else
  echo "✅ Ollama: $(ollama --version)"
  echo "📥 Pulling required models..."
  ollama pull llama3.2
  ollama pull deepseek-r1
fi

# Install npm dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete! Run: npm start"
