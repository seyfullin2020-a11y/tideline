import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const portIndex = process.argv.indexOf('--port'),
  port = portIndex >= 0 ? process.argv[portIndex + 1] : (process.env.PORT ?? '3000');
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
  throw new Error('Invalid PORT.');
const child = spawn(process.execPath, [resolve('.next/standalone/server.js')], {
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, PORT: port, HOSTNAME: process.env.HOSTNAME ?? '0.0.0.0' },
});
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', () => process.exit(1));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
