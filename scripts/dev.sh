#!/usr/bin/env bash
set -euo pipefail
# Lightweight local dev runner (no Docker) for WSL / restricted environments.
# - Runs kuard backend with NEXT_DEV=1 so it proxies to Next.js dev server.
# - Starts the Next.js dev server (bun) in the background if not already running.
# - Optionally starts an embedded NATS process with JetStream storage under .dev/nats if you have a nats-server binary.
#
# Usage: scripts/dev.sh [--with-nats]
# Visit: http://localhost:8080

WITH_NATS=0
for a in "$@"; do
  case "$a" in
    --with-nats) WITH_NATS=1 ;;
  esac
  shift || true
done

mkdir -p .dev
LOG_DIR=.dev/logs
mkdir -p "$LOG_DIR"

if [ $WITH_NATS -eq 1 ]; then
  if command -v nats-server >/dev/null 2>&1; then
    if ! pgrep -f "nats-server" >/dev/null 2>&1; then
      echo "-> starting local nats-server (JetStream)"
      mkdir -p .dev/nats
      nats-server -js -sd .dev/nats > "$LOG_DIR/nats.log" 2>&1 &
      sleep 1
    else
      echo "-> nats-server already running"
    fi
    export NATS_URL="nats://127.0.0.1:4222"
  else
    echo "WARN: nats-server not found in PATH; skipping NATS (will fallback to memory)" >&2
  fi
fi

# Start frontend dev server if not running
if ! lsof -i:8081 >/dev/null 2>&1; then
  echo "-> starting frontend dev server (bun dev)"
  (cd web && bun install && bun run dev > ../$LOG_DIR/web.log 2>&1 &)
  # give it a moment to compile
  sleep 2
else
  echo "-> frontend dev server already on :8081"
fi

export NEXT_DEV=1
echo "-> starting kuard backend"
go run ./cmd/kuard --debug
