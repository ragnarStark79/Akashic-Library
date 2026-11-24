#!/usr/bin/env bash

# ==============================================================================
# Akashic Library — Unified Dev Server (Django + Vite React)
# Starts both Backend and Frontend concurrently with a single command.
# Pressing Ctrl+C gracefully terminates both processes.
# ==============================================================================

set -e

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect paths
if [ -d "$SCRIPT_DIR/Akashic_Library" ]; then
  ROOT_DIR="$SCRIPT_DIR"
  BACKEND_DIR="$SCRIPT_DIR/Akashic_Library"
  FRONTEND_DIR="$SCRIPT_DIR/Akashic_Library/frontend"
else
  ROOT_DIR="$(dirname "$SCRIPT_DIR")"
  BACKEND_DIR="$SCRIPT_DIR"
  FRONTEND_DIR="$SCRIPT_DIR/frontend"
fi

# Locate Python
if [ -n "$VIRTUAL_ENV" ] && [ -x "$VIRTUAL_ENV/bin/python" ]; then
  PYTHON_BIN="$VIRTUAL_ENV/bin/python"
elif [ -x "$BACKEND_DIR/venv/bin/python" ]; then
  PYTHON_BIN="$BACKEND_DIR/venv/bin/python"
elif [ -x "$ROOT_DIR/venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
else
  PYTHON_BIN="python"
fi

echo ""
echo "=========================================================="
echo "   ✨ AKASHIC LIBRARY — UNIFIED DEV ENVIRONMENT ✨       "
echo "=========================================================="
echo "  • Backend Directory:  $BACKEND_DIR"
echo "  • Frontend Directory: $FRONTEND_DIR"
echo "  • Python Executable:  $PYTHON_BIN"
echo "  • Django API Server:  http://127.0.0.1:8000/"
echo "  • Vite Frontend App:  http://127.0.0.1:3000/"
echo "=========================================================="
echo "  Press Ctrl+C to stop both servers gracefully."
echo "=========================================================="
echo ""

# Prefer npm run dev with concurrently if npm is available
if command -v npm >/dev/null 2>&1 && [ -f "$FRONTEND_DIR/package.json" ]; then
  exec npm --prefix "$FRONTEND_DIR" run dev
fi

# Fallback: native bash process management
trap 'kill 0' EXIT INT TERM

# Start Django backend
(
  cd "$BACKEND_DIR"
  exec "$PYTHON_BIN" -u manage.py runserver 127.0.0.1:8000
) &
DJANGO_PID=$!

# Start Vite frontend
(
  cd "$FRONTEND_DIR"
  exec npm run dev:frontend
) &
FRONTEND_PID=$!

wait
