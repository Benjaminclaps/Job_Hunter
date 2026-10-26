#!/bin/bash
set -euo pipefail

LABEL="com.benjaminclaps.job-hunter.daily-scan"
AGENT_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$AGENT_DIR/$LABEL.plist"
UID_NUMBER="$(id -u)"

launchctl bootout "gui/$UID_NUMBER" "$PLIST_PATH" 2>/dev/null || true
rm -f "$PLIST_PATH"
echo "Revisión diaria de ATS desinstalada. Los registros locales se conservaron."
