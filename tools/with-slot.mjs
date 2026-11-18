#!/usr/bin/env node
/* Run any heavy command under the two-heavy-jobs rule (see slot.mjs): waits for a free slot, runs the
   command, and passes its exit code through. Use it for builds and test runs that are not one of the
   tools here, for example:  node tools/with-slot.mjs dotnet test server */
import { spawn } from 'node:child_process';
import { takeSlot } from './slot.mjs';

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) { console.error('usage: node tools/with-slot.mjs <command> [args...]'); process.exit(2); }
await takeSlot(cmd);
const child = spawn(cmd, args, { stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
child.on('error', e => { console.error(String(e)); process.exit(127); });
