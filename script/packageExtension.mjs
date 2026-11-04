import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateRepository, versionFromTag } from './release/Version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const assetName = 'garoon-calendar-sync.zip';
const sourceDocument = 'docs/procedures/chrome-extension-usage.md';
const imageName = 'マッピング.drawio.png';

/** 配布用READMEの文書参照を、同じタグのGitHub URLへ変換する。 */
export function releaseReadme(body, repository, tag) {
  return body.replace(
    /(!?\[[^\]\n]*\]\()([^\s)]+)(\))/g,
    (all, start, reference, end) => {
      if (/^(?:[a-z][\w+.-]*:|#|\/\/)/i.test(reference)) return all;
      const [file, anchor] = reference.split('#');
      const target = path.posix.normalize(
        path.posix.join(
          path.posix.dirname(sourceDocument),
          decodeURIComponent(file),
        ),
      );
      if (target === `docs/${imageName}`)
        return `${start}${encodeURIComponent(imageName)}${end}`;
      const encodedPath = target.split('/').map(encodeURIComponent).join('/');
      return `${start}https://github.com/${repository}/blob/${encodeURIComponent(tag)}/${encodedPath}${anchor ? `#${anchor}` : ''}${end}`;
    },
  );
}

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory())
      files.push(
        ...(await listFiles(path.join(directory, entry.name), `${name}/`)),
      );
    else if (entry.isFile()) files.push(name);
    else throw new Error(`配布対象に通常ファイル以外が含まれています: ${name}`);
  }
  return files.sort();
}

/** タグを版の正本として配布物を作る。ソースのmanifestは変更しない。 */
export async function packageExtension({
  tag,
  repository,
  output = path.join(root, 'dist'),
  documentationRef = tag,
}) {
  const version = versionFromTag(tag);
  validateRepository(repository);
  output = path.resolve(output);
  const staging = await mkdtemp(path.join(tmpdir(), 'garoon-package-'));
  try {
    await mkdir(path.join(staging, 'extension'));
    for (const name of ['src', 'ui']) {
      await cp(
        path.join(root, 'chrome-extension', name),
        path.join(staging, 'extension', name),
        { recursive: true, dereference: false },
      );
    }
    const manifest = JSON.parse(
      await readFile(path.join(root, 'chrome-extension/manifest.json'), 'utf8'),
    );
    manifest.version = version;
    await writeFile(
      path.join(staging, 'extension/manifest.json'),
      `${JSON.stringify(manifest, null, 4)}\n`,
    );
    for (const name of ['update.bat', 'update.ps1']) {
      await cp(
        path.join(root, 'script/release', name),
        path.join(staging, name),
      );
    }
    await cp(path.join(root, 'docs', imageName), path.join(staging, imageName));
    await writeFile(
      path.join(staging, 'README.md'),
      releaseReadme(
        await readFile(path.join(root, sourceDocument), 'utf8'),
        repository,
        documentationRef,
      ),
    );
    const files = {};
    for (const name of await listFiles(staging)) {
      files[name] = createHash('sha256')
        .update(await readFile(path.join(staging, name)))
        .digest('hex');
    }
    await writeFile(
      path.join(staging, 'release.json'),
      `${JSON.stringify({ repository, tag, version, asset: assetName, image: imageName, files }, null, 2)}\n`,
    );
    await mkdir(output, { recursive: true });
    const archive = path.join(output, assetName);
    // zipは既存アーカイブの不要項目を残すため、毎回新しく作る。
    await rm(archive, { force: true });
    execFileSync('zip', ['-q', '-r', '-UN=UTF8', archive, '.'], {
      cwd: staging,
    });
    const digest = createHash('sha256')
      .update(await readFile(archive))
      .digest('hex');
    await writeFile(`${archive}.sha256`, `${digest}  ${assetName}\n`);
    return archive;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const [tag, repository, output, documentationRef] = process.argv.slice(2);
  try {
    console.log(
      await packageExtension({ tag, repository, output, documentationRef }),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
