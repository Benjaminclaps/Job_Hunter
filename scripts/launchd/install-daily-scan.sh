#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_DIR="${JOB_HUNTER_DATA_DIR:-$HOME/Documents/JobHunter/data}"
LABEL="com.benjaminclaps.job-hunter.daily-scan"
AGENT_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$AGENT_DIR/$LABEL.plist"
UID_NUMBER="$(id -u)"

if command -v fnm >/dev/null 2>&1; then
  NODE_BIN="$(fnm exec --using=default which node)"
else
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "No encontré Node.js ejecutable. Instálalo o activa fnm y vuelve a intentarlo." >&2
  exit 1
fi

ENVIRONMENT_XML=""
xml_escape() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

for VARIABLE in JOB_HUNTER_DATA_DIR JOB_HUNTER_DB_PATH JOB_HUNTER_DOCUMENTS_DIR; do
  VALUE="${!VARIABLE:-}"
  if [[ -n "$VALUE" ]]; then
    ESCAPED_VALUE="$(xml_escape "$VALUE")"
    ENVIRONMENT_XML+="<key>$VARIABLE</key><string>$ESCAPED_VALUE</string>"
  fi
done

ENVIRONMENT_BLOCK=""
if [[ -n "$ENVIRONMENT_XML" ]]; then
  ENVIRONMENT_BLOCK="<key>EnvironmentVariables</key><dict>$ENVIRONMENT_XML</dict>"
fi

mkdir -p -m 700 "$DATA_DIR/logs" "$AGENT_DIR"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>--import</string>
    <string>tsx</string>
    <string>src/cli/index.ts</string>
    <string>scan</string>
    <string>--query</string>
    <string>intern</string>
    <string>--json</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REPO_ROOT</string>
  $ENVIRONMENT_BLOCK
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>RunAtLoad</key>
  <false/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>$DATA_DIR/logs/daily-scan.log</string>
  <key>StandardErrorPath</key>
  <string>$DATA_DIR/logs/daily-scan-error.log</string>
</dict>
</plist>
PLIST

plutil -lint "$PLIST_PATH"
launchctl bootout "gui/$UID_NUMBER" "$PLIST_PATH" 2>/dev/null || true
launchctl bootstrap "gui/$UID_NUMBER" "$PLIST_PATH"

echo "Revisión diaria de ATS instalada para las 09:00 hora local."
echo "Registros: $DATA_DIR/logs/daily-scan.log"
echo "Desinstala con: scripts/launchd/uninstall-daily-scan.sh"
