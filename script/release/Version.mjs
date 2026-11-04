/** Chromeで利用できる3区切りのバージョンをタグから取得する。 */
export function versionFromTag(tag) {
  const match = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(tag);
  if (
    !match ||
    match[1].split('.').some((part) => Number(part) > 65535) ||
    match[1] === '0.0.0'
  ) {
    throw new Error(
      'タグは v1.2.3 形式で指定してください。各数値は0〜65535、全桁0は不可です。',
    );
  }
  return match[1];
}

/** GitHubのowner/repository形式を検証する。 */
export function validateRepository(repository) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    throw new Error('リポジトリは owner/repository 形式で指定してください。');
  }
  return repository;
}
