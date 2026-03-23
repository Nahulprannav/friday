@echo off
echo 🦅 FRIDAY ADE Setup for Windows
echo ==================================
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)
echo ✅ Node.js found
where ollama >nul 2>&1
if %errorlevel% neq 0 (
  echo ⚠️  Ollama not found. Install from https://ollama.ai
) else (
  echo ✅ Ollama found
  echo 📥 Pulling models...
  ollama pull llama3.2
  ollama pull deepseek-r1
)
echo 📦 Installing dependencies...
npm install
echo.
echo ✅ Setup complete! Run: npm start
pause
