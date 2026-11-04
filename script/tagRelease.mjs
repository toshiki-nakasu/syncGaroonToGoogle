import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { versionFromTag } from './release/Version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
/** 作業ツリーを確認して注釈付きタグを作り、そのタグだけをoriginへ送る。 */
export function tagRelease(value, cwd = root) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const tag = value.startsWith('v') ? value : `v${value}`;
  versionFromTag(tag);
  if (git('status', '--porcelain'))
    throw new Error(
      '未コミットの変更があります。リリース対象をコミットしてから実行してください。',
    );
  git('rev-parse', '--verify', 'HEAD');
  if (git('tag', '--list', tag))
    throw new Error(`タグ ${tag} はローカルに存在します。`);
  if (
    git(
      'ls-remote',
      '--tags',
      'origin',
      `refs/tags/${tag}`,
      `refs/tags/${tag}^{}`,
    )
  ) {
    throw new Error(`タグ ${tag} はoriginに存在します。`);
  }
  git('tag', '-a', tag, '-m', `Chrome拡張機能 ${tag}`);
  try {
    // このタグだけを送信する。ブランチや他のタグはpushしない。
    execFileSync(
      'git',
      ['push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`],
      { cwd, stdio: 'inherit' },
    );
  } catch {
    throw new Error(
      `pushに失敗しました。タグ ${tag} はローカルに残っています。通信とoriginを確認し、git push origin refs/tags/${tag}:refs/tags/${tag} で再試行してください。`,
    );
  }
  console.log(
    `${tag} をpushしました。GitHub Actionsのリリース結果を確認してください。`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    tagRelease(process.argv[2] || '');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
