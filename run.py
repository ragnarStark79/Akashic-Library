#!/usr/bin/env python3
"""
Akashic Library — Unified Dev Server Launcher (Django + Vite)
Runs both Django backend and Vite frontend concurrently with clean signal forwarding.
"""

import os
import sys
import subprocess
import signal

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(CURRENT_DIR, 'frontend')
VENV_PYTHON = os.path.join(CURRENT_DIR, 'venv', 'bin', 'python')

python_bin = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

print("\n" + "=" * 60)
print("   ✨ AKASHIC LIBRARY — UNIFIED DEV ENVIRONMENT ✨")
print("=" * 60)
print(f"  • Backend Directory:  {CURRENT_DIR}")
print(f"  • Frontend Directory: {FRONTEND_DIR}")
print(f"  • Python Binary:      {python_bin}")
print("  • Django API:         http://127.0.0.1:8000/")
print("  • Vite Frontend:      http://127.0.0.1:3000/")
print("=" * 60)
print("  Press Ctrl+C to shut down both servers.\n")

processes = []

def cleanup(signum=None, frame=None):
    print("\n[Unified Runner] Shutting down servers...")
    for p in processes:
        if p.poll() is None:
            try:
                p.terminate()
            except Exception:
                pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

try:
    # Check if npm with concurrently is available for best colored output
    has_concurrently = os.path.exists(os.path.join(FRONTEND_DIR, 'node_modules', 'concurrently'))
    if has_concurrently:
        p = subprocess.Popen(['npm', 'run', 'dev'], cwd=FRONTEND_DIR)
        processes.append(p)
        p.wait()
    else:
        # Launch Django backend
        django_proc = subprocess.Popen(
            [python_bin, '-u', 'manage.py', 'runserver', '127.0.0.1:8000'],
            cwd=CURRENT_DIR,
            env={**os.environ, 'PYTHONUNBUFFERED': '1'}
        )
        processes.append(django_proc)

        # Launch Vite frontend
        vite_proc = subprocess.Popen(
            ['npm', 'run', 'dev:frontend'],
            cwd=FRONTEND_DIR
        )
        processes.append(vite_proc)

        django_proc.wait()
except KeyboardInterrupt:
    cleanup()
except Exception as e:
    print(f"[Unified Runner] Error: {e}")
    cleanup()
