import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set([
  '.git',
  'node_modules',
  '.codex',
  'work',
  'dist',
  'tmp',
]);
const documents = new Map();
const errors = [];

/** 外部由来のSkillと作業記録を除いて、リポジトリの文書を収集する。 */
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (
      entry.isDirectory() &&
      !ignored.has(entry.name) &&
      path.relative(root, target) !== path.join('.agents', 'skills')
    )
      await collect(target);
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      const body = (await readFile(target, 'utf8'))
        .replace(/^---\n[\s\S]*?\n---\n/, '')
        .replace(/^[\t ]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[\t ]*\1[^\n]*$/gm, '');
      documents.set(target, body);
    }
  }
}

/** GitHubの見出しアンカーに合わせて、重複時の接尾辞も生成する。 */
function headings(body) {
  const used = new Set();
  for (const match of body.matchAll(/^#{1,6}\s+(.+?)(?:\s+#+)?$/gm)) {
    const base = match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/[`*~]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '')
      .replace(/\s/g, '-');
    let anchor = base;
    for (let index = 1; used.has(anchor); index++) anchor = `${base}-${index}`;
    used.add(anchor);
  }
  return used;
}

await collect(root);
for (const [source, body] of documents) {
  for (const match of body.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const reference = match[1].replace(/^<|>$/g, '').split(/\s+"/)[0];
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference) || reference.startsWith('//'))
      continue;
    let target;
    let anchor;
    try {
      const [relative, hash] = reference.split('#');
      target = path.resolve(
        path.dirname(source),
        decodeURIComponent(relative || path.basename(source)),
      );
      anchor = hash ? decodeURIComponent(hash) : '';
      await stat(target);
    } catch {
      errors.push(
        `${path.relative(root, source)}: 参照先が存在しません: ${reference}`,
      );
      continue;
    }
    if (
      anchor &&
      documents.has(target) &&
      !headings(documents.get(target)).has(anchor)
    ) {
      errors.push(
        `${path.relative(root, source)}: 見出しが存在しません: ${reference}`,
      );
    }
  }
}
if (errors.length) {
  for (const error of errors) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${documents.size}文書の相対リンクと見出しを確認しました。\n`,
  );
}
