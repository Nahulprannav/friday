@echo off
:: FRIDAY ADE — Windows Desktop Shortcut Creator
:: Creates a .lnk shortcut on Desktop and Start Menu

title FRIDAY ADE — Shortcut Creator

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set DESKTOP=%USERPROFILE%\Desktop
set STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs

echo.
echo  ============================================
echo    FRIDAY ADE — Creating Desktop Shortcut
echo  ============================================
echo.

:: Use PowerShell to create .lnk shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut('%DESKTOP%\FRIDAY ADE.lnk');" ^
  "$lnk.TargetPath = 'cmd.exe';" ^
  "$lnk.Arguments = '/c cd /d \"%PROJECT_DIR%\" && npm start';" ^
  "$lnk.WorkingDirectory = '%PROJECT_DIR%';" ^
  "$lnk.IconLocation = '%PROJECT_DIR%\assets\icon.ico';" ^
  "$lnk.Description = 'FRIDAY ADE - Autonomous Development Engine';" ^
  "$lnk.WindowStyle = 1;" ^
  "$lnk.Save();" ^
  "Write-Host '  OK  Desktop shortcut created'"

:: Also add to Start Menu
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut('%STARTMENU%\FRIDAY ADE.lnk');" ^
  "$lnk.TargetPath = 'cmd.exe';" ^
  "$lnk.Arguments = '/c cd /d \"%PROJECT_DIR%\" && npm start';" ^
  "$lnk.WorkingDirectory = '%PROJECT_DIR%';" ^
  "$lnk.IconLocation = '%PROJECT_DIR%\assets\icon.ico';" ^
  "$lnk.Description = 'FRIDAY ADE - Autonomous Development Engine';" ^
  "$lnk.WindowStyle = 1;" ^
  "$lnk.Save();" ^
  "Write-Host '  OK  Start Menu shortcut created'"

echo.
echo  FRIDAY ADE shortcut installed!
echo  Check your Desktop and Start Menu.
echo.
pause
