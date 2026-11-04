import { readdir } from 'node:fs/promises';

/** 指定したフォルダーから、条件に一致するファイルを再帰的に収集する。 */
export async function collectFiles(directory, accept) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = new URL(
        `${entry.name}${entry.isDirectory() ? '/' : ''}`,
        directory,
      );
      return entry.isDirectory()
        ? collectFiles(path, accept)
        : accept(entry.name)
          ? [path]
          : [];
    }),
  );
  return files
    .flat()
    .sort((left, right) => left.href.localeCompare(right.href));
}
