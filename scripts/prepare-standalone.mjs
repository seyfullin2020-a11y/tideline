import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve('.next/standalone');
await mkdir(resolve(output, '.next'), { recursive: true });
await cp(resolve('.next/static'), resolve(output, '.next/static'), { recursive: true });
await cp(resolve('public'), resolve(output, 'public'), { recursive: true });
console.log('Standalone server and public assets prepared.');
