import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectFiles } from './files.js';

const group = process.argv[2];
if (group && !['unit', 'ui', 'usecases'].includes(group)) {
  throw new Error('検証対象は unit / ui / usecases から指定してください。');
}
// ブラウザーテストは別コマンドで実行し、Node.jsだけの検証と分ける。
const files = (
  await Promise.all(
    (group ? [group] : ['unit', 'ui', 'usecases']).map((name) =>
      collectFiles(new URL(`../test/${name}/`, import.meta.url), (file) =>
        file.endsWith('.test.js'),
      ),
    ),
  )
).flat();
if (!files.length) throw new Error('実行対象のテストがありません。');
const result = spawnSync(
  process.execPath,
  ['--test', ...files.map(fileURLToPath)],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status || (result.signal ? 1 : 0);
