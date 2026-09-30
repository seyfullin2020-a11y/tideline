import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import pg from 'pg';
// Windows PostgreSQL binaries cannot re-execute from a Cyrillic installation path.
// Development binaries and data therefore use a deterministic ASCII temporary directory.
if (process.platform !== 'win32')
  throw new Error('This convenience helper is for Windows. Use Docker Compose on Linux/macOS.');
const envFile = resolve('.env');
if (!existsSync(envFile))
  writeFileSync(
    envFile,
    `DATABASE_URL="postgresql://tideline:tideline_local_only@localhost:54329/tideline?schema=public"\nSESSION_SECRET="${randomBytes(48).toString('hex')}"\nAPP_URL="http://localhost:3000"\n`,
  );
if (!readFileSync(envFile, 'utf8').includes('localhost:54329'))
  throw new Error(
    'Refusing to change your configured database. Use the localhost:54329 development URL.',
  );
const root = join(
    tmpdir(),
    'tideline-pg-' + createHash('sha256').update(process.cwd()).digest('hex').slice(0, 10),
  ),
  native = join(root, 'native'),
  data = join(root, 'data');
mkdirSync(root, { recursive: true });
if (!existsSync(join(native, 'bin', 'postgres.exe')))
  await cp(resolve('node_modules/@embedded-postgres/windows-x64/native'), native, {
    recursive: true,
  });
async function run(name, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(join(native, 'bin', name + '.exe'), args, { windowsHide: true });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
  });
}
if (!existsSync(join(data, 'PG_VERSION'))) {
  const pw = join(root, 'init-password');
  writeFileSync(pw, 'tideline_local_only\n');
  await run('initdb', [
    '-D',
    data,
    '-U',
    'tideline',
    '--auth=scram-sha-256',
    '--pwfile=' + pw,
    '--encoding=UTF8',
    '--locale=C',
  ]);
}
await run('pg_ctl', [
  '-D',
  data,
  '-l',
  join(root, 'postgres.log'),
  '-o',
  '-p 54329 -h 127.0.0.1',
  '-w',
  'start',
]);
const client = new pg.Client({
  host: '127.0.0.1',
  port: 54329,
  user: 'tideline',
  password: 'tideline_local_only',
  database: 'postgres',
});
await client.connect();
const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = 'tideline'");
if (!existing.rowCount) await client.query('CREATE DATABASE tideline');
await client.end();
console.log('Local PostgreSQL ready at localhost:54329. Keep this terminal running.');
const stop = async () => {
  await run('pg_ctl', ['-D', data, '-m', 'fast', 'stop']);
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 60000);
