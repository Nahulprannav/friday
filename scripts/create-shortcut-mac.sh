#!/usr/bin/env bash
# FRIDAY ADE — macOS Desktop Shortcut Creator
# Creates an .app bundle launcher on the Desktop

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_BUNDLE="$HOME/Desktop/FRIDAY ADE.app"
ICON_SRC="$PROJECT_DIR/assets/icon.icns"

echo ""
echo "🦅 Creating FRIDAY ADE Desktop App..."

# Create .app bundle structure
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# Copy icon if it exists
if [ -f "$ICON_SRC" ]; then
  cp "$ICON_SRC" "$APP_BUNDLE/Contents/Resources/icon.icns"
fi

# Create Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>            <string>FRIDAY ADE</string>
  <key>CFBundleDisplayName</key>     <string>FRIDAY ADE</string>
  <key>CFBundleIdentifier</key>      <string>com.fridayade.ade</string>
  <key>CFBundleVersion</key>         <string>1.0.0</string>
  <key>CFBundlePackageType</key>     <string>APPL</string>
  <key>CFBundleExecutable</key>      <string>launch</string>
  <key>CFBundleIconFile</key>        <string>icon</string>
  <key>LSMinimumSystemVersion</key>  <string>10.13</string>
  <key>NSHighResolutionCapable</key> <true/>
</dict>
</plist>
PLIST

# Create launcher script
cat > "$APP_BUNDLE/Contents/MacOS/launch" << LAUNCHER
#!/bin/bash
cd "$PROJECT_DIR"
npm start
LAUNCHER
chmod +x "$APP_BUNDLE/Contents/MacOS/launch"

echo "  ✅  App created: $APP_BUNDLE"
echo ""
echo "  🦅 FRIDAY ADE is on your Desktop."
echo "  Double-click 'FRIDAY ADE' to launch."
echo ""
