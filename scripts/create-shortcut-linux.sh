#!/usr/bin/env bash
# FRIDAY ADE — Linux Desktop Shortcut Creator
# Creates .desktop entry + icon in /usr/share/applications and ~/Desktop

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="FRIDAY ADE"
EXEC_PATH="$PROJECT_DIR/node_modules/.bin/electron $PROJECT_DIR/main.js"
ICON_PATH="$PROJECT_DIR/assets/icon.png"
DESKTOP_FILE="$HOME/Desktop/friday-ade.desktop"
APPS_FILE="$HOME/.local/share/applications/friday-ade.desktop"

echo ""
echo "🦅 Creating FRIDAY ADE Desktop Shortcut..."

# Create .desktop file content
DESKTOP_CONTENT="[Desktop Entry]
Version=1.0
Type=Application
Name=FRIDAY ADE
GenericName=Autonomous Development Engine
Comment=FRIDAY ADE — Powered by OpenClaw AI — Codename ANTIGRAVITY
Exec=bash -c 'cd $PROJECT_DIR && npm start'
Icon=$ICON_PATH
Terminal=false
Categories=Development;IDE;
Keywords=IDE;AI;Code;OpenClaw;FRIDAY;
StartupWMClass=friday-ade
StartupNotify=true"

# Write to ~/.local/share/applications (app menu)
mkdir -p "$HOME/.local/share/applications"
echo "$DESKTOP_CONTENT" > "$APPS_FILE"
chmod +x "$APPS_FILE"
echo "  ✅  Added to Applications menu: $APPS_FILE"

# Write to Desktop
if [ -d "$HOME/Desktop" ]; then
  echo "$DESKTOP_CONTENT" > "$DESKTOP_FILE"
  chmod +x "$DESKTOP_FILE"
  # Trust it (GNOME)
  gio set "$DESKTOP_FILE" metadata::trusted true 2>/dev/null || true
  echo "  ✅  Desktop shortcut created: $DESKTOP_FILE"
else
  echo "  ⚠   No Desktop folder found. Skipping desktop icon."
fi

# Refresh icon cache
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
gtk-update-icon-cache 2>/dev/null || true

echo ""
echo "  🦅 FRIDAY ADE shortcut installed."
echo "  Look for it in your Applications menu or on your Desktop."
echo ""
