import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { packageExtension, releaseReadme } from '../packageExtension.mjs';
import { tagRelease } from '../tagRelease.mjs';
import { versionFromTag } from '../release/Version.mjs';

async function temporary(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'garoon-release-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('タグはChromeで扱える3区切りの数値だけを受け付ける', () => {
  assert.equal(versionFromTag('v1.2.3'), '1.2.3');
  assert.equal(versionFromTag('v2025.11.4'), '2025.11.4');
  for (const tag of [
    'v0.0.0',
    'v01.2.3',
    'v1.2.3-beta',
    'v65536.0.1',
    '1.2.3',
    'v1.2',
    'v1.2.3.4',
    undefined,
  ]) {
    assert.throws(() => versionFromTag(tag));
  }
});

test('配布READMEは画像と見出しのローカル参照を維持し、他文書を同じ版へ向ける', () => {
  const result = releaseReadme(
    '[設定](google-calendar-setup.md#前提) [更新](#更新する) ![図](../マッピング.drawio.png) [外部](https://example.com)',
    'owner/repo',
    'v1.2.3',
  );
  assert.match(
    result,
    /https:\/\/github.com\/owner\/repo\/blob\/v1.2.3\/docs\/procedures\/google-calendar-setup.md#前提/,
  );
  assert.ok(result.includes('[更新](#更新する)'));
  assert.ok(
    result.includes(`![図](${encodeURIComponent('マッピング.drawio.png')})`),
  );
  assert.ok(result.includes('[外部](https://example.com)'));
});

test('配布ZIPに必要なファイルとタグの版を入れ、ソースと既存成果物の不要項目を保持しない', async (t) => {
  const output = await temporary(t);
  const source = new URL(
    '../../chrome-extension/manifest.json',
    import.meta.url,
  );
  const before = await readFile(source, 'utf8');
  const archive = await packageExtension({
    tag: 'v1.2.3',
    repository: 'owner/repo',
    output,
  });
  const readEntry = (name) =>
    execFileSync('unzip', ['-p', archive, name], {
      maxBuffer: 8 * 1024 * 1024,
    });
  const release = JSON.parse(readEntry('release.json'));
  assert.equal(
    JSON.parse(readEntry('extension/manifest.json')).version,
    '1.2.3',
  );
  assert.equal(release.tag, 'v1.2.3');
  assert.equal(release.repository, 'owner/repo');
  for (const [name, digest] of Object.entries(release.files)) {
    assert.equal(
      createHash('sha256').update(readEntry(name)).digest('hex'),
      digest,
      name,
    );
    assert.doesNotMatch(
      name,
      /(?:^|\/)(?:test|script|node_modules|gas|tmp)(?:\/|$)/,
    );
  }
  for (const name of [
    'README.md',
    'マッピング.drawio.png',
    'update.bat',
    'update.ps1',
    'extension/manifest.json',
  ]) {
    assert.ok(release.files[name], name);
  }
  assert.match(readEntry('README.md').toString(), /\/blob\/v1.2.3\//);
  const digest = createHash('sha256')
    .update(await readFile(archive))
    .digest('hex');
  assert.equal(
    await readFile(`${archive}.sha256`, 'utf8'),
    `${digest}  garoon-calendar-sync.zip\n`,
  );
  await writeFile(path.join(output, 'unwanted.txt'), 'old');
  execFileSync('zip', ['-q', archive, 'unwanted.txt'], { cwd: output });
  await packageExtension({ tag: 'v1.2.4', repository: 'owner/repo', output });
  assert.doesNotMatch(
    execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }),
    /unwanted/,
  );
  assert.equal(await readFile(source, 'utf8'), before);
});

test('タグ作成は未コミット変更と重複を拒否し、対象タグだけを送信する', async (t) => {
  const directory = await temporary(t);
  const repository = path.join(directory, 'work');
  const remote = path.join(directory, 'remote.git');
  await mkdir(repository);
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: repository,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init', '-q');
  git('config', 'user.email', 'release-test@example.invalid');
  git('config', 'user.name', 'Release test');
  git('config', 'tag.gpgSign', 'false');
  git('init', '--bare', '-q', remote);
  git('remote', 'add', 'origin', remote);
  await writeFile(path.join(repository, 'file.txt'), 'initial');
  git('add', 'file.txt');
  git('commit', '-qm', 'initial');
  git('tag', 'unrelated');
  tagRelease('1.2.3', repository);
  assert.match(git('ls-remote', '--tags', 'origin'), /refs\/tags\/v1.2.3/);
  assert.doesNotMatch(git('ls-remote', '--tags', 'origin'), /unrelated/);
  assert.throws(() => tagRelease('v1.2.3', repository), /ローカルに存在/);
  git('update-ref', '-d', 'refs/tags/v1.2.3');
  assert.throws(() => tagRelease('v1.2.3', repository), /originに存在/);
  await writeFile(path.join(repository, 'file.txt'), 'changed');
  assert.throws(() => tagRelease('1.2.4', repository), /未コミット/);
  assert.equal(git('tag', '--list', 'v1.2.4'), '');
});
