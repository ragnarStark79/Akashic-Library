#!/usr/bin/env node

/**
 * Robust cross-platform launcher for Django backend.
 * Automatically locates the project's virtualenv Python and starts manage.py runserver.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the Django project
const djangoRoot = path.resolve(__dirname, '../../');
const managePyPath = path.join(djangoRoot, 'manage.py');

if (!fs.existsSync(managePyPath)) {
  console.error(`[backend-runner] Error: Could not locate manage.py at: ${managePyPath}`);
  process.exit(1);
}

// Candidate Python executable locations
const candidates = [
  // Active virtualenv
  process.env.VIRTUAL_ENV ? path.join(process.env.VIRTUAL_ENV, 'bin', 'python') : null,
  process.env.VIRTUAL_ENV ? path.join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe') : null,

  // Akashic_Library/venv
  path.join(djangoRoot, 'venv', 'bin', 'python'),
  path.join(djangoRoot, 'venv', 'Scripts', 'python.exe'),

  // Akashic_Library/.venv
  path.join(djangoRoot, '.venv', 'bin', 'python'),
  path.join(djangoRoot, '.venv', 'Scripts', 'python.exe'),

  // Workspace root venv
  path.resolve(djangoRoot, '../venv/bin/python'),
  path.resolve(djangoRoot, '../.venv/bin/python'),

  // System fallback
  'python3',
  'python',
].filter(Boolean);

let pythonBin = 'python3';
for (const cand of candidates) {
  if (cand.includes(path.sep)) {
    if (fs.existsSync(cand)) {
      pythonBin = cand;
      break;
    }
  } else {
    pythonBin = cand;
    break;
  }
}

console.log(`[backend-runner] Using Python: ${pythonBin}`);
console.log(`[backend-runner] Starting Django server at http://127.0.0.1:8000/`);

const port = process.env.DJANGO_PORT || '8000';
const host = process.env.DJANGO_HOST || '127.0.0.1';

const child = spawn(pythonBin, ['-u', 'manage.py', 'runserver', `${host}:${port}`], {
  cwd: djangoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1',
  },
});

child.on('error', (err) => {
  console.error('[backend-runner] Failed to start Django:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0);
  }
  process.exit(code ?? 0);
});

// Forward termination signals
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    if (!child.killed) {
      child.kill(sig);
    }
  });
});
