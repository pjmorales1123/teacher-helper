// Starts the core server (watch mode) and the Vite dev server together. Works on Windows too.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [
  spawn(npm, ['run', 'dev', '-w', '@guro/core'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn(npm, ['run', 'dev', '-w', '@guro/web'], { stdio: 'inherit', shell: process.platform === 'win32' }),
];
const stop = () => { procs.forEach((p) => p.kill()); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', (code) => { if (code) stop(); }));
