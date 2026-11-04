import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { collectFiles } from './files.js';

for (const folder of ['src', 'ui', 'test', 'script']) {
  for (const path of await collectFiles(
    new URL(`../${folder}/`, import.meta.url),
    (name) => name.endsWith('.js'),
  )) {
    const result = spawnSync(
      process.execPath,
      ['--check', fileURLToPath(path)],
      { stdio: 'inherit' },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status || 1;
  }
}
