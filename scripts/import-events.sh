#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <api_key> <json_file> [api_base_url]" >&2
  echo "Example: $0 evt_abc123 TestData/saas-demo.json http://localhost:8080" >&2
  exit 1
fi

API_KEY="$1"
JSON_FILE="$2"
API_BASE_URL="${3:-http://localhost:8080}"
API_BASE_URL="${API_BASE_URL%/}"

if [[ ! -f "$JSON_FILE" ]]; then
  echo "Error: JSON file not found: $JSON_FILE" >&2
  exit 1
fi

TOTAL=$(node -e "const fs=require('fs');const p=process.argv[1];const d=JSON.parse(fs.readFileSync(p,'utf8'));const t=Array.isArray(d.events)?d.events.length:0;process.stdout.write(String(t));" "$JSON_FILE")
if [[ "$TOTAL" -eq 0 ]]; then
  echo "Error: No events found at .events[] in $JSON_FILE" >&2
  exit 1
fi

echo "Importing $TOTAL events from $JSON_FILE to $API_BASE_URL/api/events"

success=0
failed=0

while IFS= read -r event; do
  http_code=$(curl -sS -o /tmp/events-import-response.json -w "%{http_code}" \
    -X POST "$API_BASE_URL/api/events" \
    -H "content-type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "$event")

  if [[ "$http_code" == "201" ]]; then
    success=$((success + 1))
    printf '.'
  else
    failed=$((failed + 1))
    echo
    echo "Failed request (HTTP $http_code):"
    cat /tmp/events-import-response.json
    echo
  fi
done < <(
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    const events = Array.isArray(data.events) ? data.events : [];
    for (const e of events) {
      const tagsObj = e.tags && typeof e.tags === "object" && !Array.isArray(e.tags) ? e.tags : {};
      const tags = Object.entries(tagsObj).map(([k, v]) => `${k}:${String(v)}`);
      const minutesAgo = Number(e.minutes_ago || 0);
      const eventTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
      const out = {
        channel: e.channel,
        title: e.title,
        description: e.description,
        emoji: e.icon,
        tags,
        eventTime
      };
      process.stdout.write(JSON.stringify(out) + "\n");
    }
  ' "$JSON_FILE"
)

echo

echo "Done. Success: $success, Failed: $failed"

if [[ "$failed" -gt 0 ]]; then
  exit 1
fi
