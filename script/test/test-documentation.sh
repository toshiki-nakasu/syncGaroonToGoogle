#!/bin/bash
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
temporary=$(mktemp -d "${TMPDIR:-/tmp}/garoon-doc-test-XXXXXX")
trap 'rm -rf -- "$temporary"' EXIT
mkdir -p "$temporary/docs" "$temporary/.agents/skills" "$temporary/node_modules"
cat > "$temporary/docs/見出し test.md" <<'MARKDOWN'
---
description: '[対象外](missing-front-matter.md)'
---
# 日本語の見出し (確認)
## `Code` と **強調**
## ÉCOLE
## 重複
## 重複
## 重複-1
## 重複
```markdown
[対象外](missing-code.md)
## 存在しない
```
~~~markdown
[対象外](missing-tilde.md)
~~~
MARKDOWN
cat > "$temporary/README.md" <<'MARKDOWN'
# 文書検査
[日本語](docs/%E8%A6%8B%E5%87%BA%E3%81%97%20test.md#日本語の見出し-確認)
[装飾](<docs/見出し test.md#code-と-強調> "リンクのタイトル")
[Unicode](docs/%E8%A6%8B%E5%87%BA%E3%81%97%20test.md#école)
[重複](docs/%E8%A6%8B%E5%87%BA%E3%81%97%20test.md#重複-2)
[接尾辞の衝突](docs/%E8%A6%8B%E5%87%BA%E3%81%97%20test.md#重複-1-1)
[自身](#文書検査)
[外部](https://example.invalid)
MARKDOWN
echo '[対象外](missing.md)' > "$temporary/.agents/skills/example.md"
echo '[対象外](missing.md)' > "$temporary/node_modules/example.md"
bash "$root/script/documentation/check-links.sh" "$temporary"
printf '\n[欠落](missing.md)\n[見出し](docs/見出し%%20test.md#存在しない)\n[不正](bad%%zz.md)\n' >> "$temporary/README.md"
if bash "$root/script/documentation/check-links.sh" "$temporary" > "$temporary/result.log" 2>&1; then
    echo '失敗: 不正な文書参照を拒否しませんでした。' >&2
    exit 1
fi
for message in '参照先が存在しません' '見出しが存在しません' '不正な参照'; do
    grep -q "$message" "$temporary/result.log"
done

# 除外対象と同名のルートも検査し、存在しないルートは拒否する。
mkdir "$temporary/work"
echo '[欠落](missing.md)' > "$temporary/work/README.md"
if bash "$root/script/documentation/check-links.sh" "$temporary/work" > "$temporary/result.log" 2>&1; then
    echo '失敗: 検査対象のルートを除外しました。' >&2
    exit 1
fi
grep -q '参照先が存在しません' "$temporary/result.log"
if bash "$root/script/documentation/check-links.sh" "$temporary/missing" > "$temporary/result.log" 2>&1; then
    echo '失敗: 存在しないルートの検査が成功しました。' >&2
    exit 1
fi
grep -q 'ディレクトリが存在しません' "$temporary/result.log"
echo '成功: 文書リンク、見出しの重複、コードフェンスと除外対象の検査'
