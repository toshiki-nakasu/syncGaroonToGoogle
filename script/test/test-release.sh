#!/bin/bash
set -euo pipefail

test_root=$(cd "$(dirname "$0")/../.." && pwd)
source "$test_root/script/release/build-extension.sh"
temporary=$(mktemp -d "${TMPDIR:-/tmp}/garoon-release-test-XXXXXX")
trap 'rm -rf -- "$temporary"' EXIT

fail() {
    echo "失敗: $*" >&2
    exit 1
}

expect_failure() {
    local expected=$1
    shift
    if "$@" > "$temporary/error.log" 2>&1; then
        fail "失敗するはずの処理が成功しました: $*"
    fi
    grep -q -- "$expected" "$temporary/error.log" || {
        cat "$temporary/error.log" >&2
        fail "想定したエラーがありません: $expected"
    }
}

[[ $(version_from_tag v1.2.3) == 1.2.3 ]] || fail '版の抽出'
[[ $(version_from_tag v2025.11.4) == 2025.11.4 ]] || fail '日付形式の版'
[[ $(version_from_tag v65535.0.1) == 65535.0.1 ]] || fail '版の上限'
for tag in v0.0.0 v01.2.3 v1.2.3-beta v65536.0.1 1.2.3 v1.2 v1.2.3.4 '' v999999999999999999999.1.2; do
    expect_failure 'タグは' version_from_tag "$tag"
done
expect_failure 'owner/repository' validate_repository 'owner/repo/extra'
echo '成功: Chrome用の版とリポジトリの検証'

body='[設定](../docs/procedures/google-calendar-setup.md#前提) [操作](../docs/procedures/chrome-extension-usage.md) [更新](#更新する) ![図](../docs/マッピング.drawio.png) [外部](https://example.com)'
result=$(release_readme owner/repo v1.2.3 <<< "$body")
[[ $result == *'[設定](google-calendar-setup.md#前提)'* ]] || fail '設定リンク'
[[ $result == *'[操作](chrome-extension-usage.md)'* ]] || fail '操作リンク'
[[ $result == *'[更新](#更新する)'* ]] || fail '同一文書の見出し'
[[ $result == *"![図]($(encode_path "$image_name"))"* ]] || fail '画像リンク'
[[ $result == *'[外部](https://example.com)'* ]] || fail '外部リンク'
body='[接続](chrome-extension-usage.md#初回接続) [設定](../../chrome-extension/manifest.json) [仕様](../requirements/chrome-extension-requirements.md#利用条件) [図](../%E3%83%9E%E3%83%83%E3%83%94%E3%83%B3%E3%82%B0.drawio.png)'
result=$(release_readme owner/repo commit-sha docs/procedures/google-calendar-setup.md <<< "$body")
[[ $result == *'[接続](chrome-extension-usage.md#初回接続)'* ]] || fail '手順間の参照'
[[ $result == *'[設定](extension/manifest.json)'* ]] || fail 'manifestの参照'
[[ $result == *'https://github.com/owner/repo/blob/commit-sha/docs/requirements/chrome-extension-requirements.md#利用条件'* ]] || fail '同梱しない文書の参照'
[[ $result == *"[図]($(encode_path "$image_name"))"* ]] || fail '符号化された画像の参照'
echo '成功: 配布文書の参照変換'

# 空白を含む出力先も実際にZIPを作って確認する。
output="$temporary/package output"
before=$(sha256sum "$test_root/chrome-extension/manifest.json")
archive=$(bash "$test_root/script/release/build-extension.sh" v1.2.3 owner/repo "$output")
mkdir "$temporary/extracted"
unzip -q "$archive" -d "$temporary/extracted"
extracted="$temporary/extracted"
jq -e '.version == "1.2.3"' "$extracted/extension/manifest.json" >/dev/null || fail 'manifestの版'
jq -e '.tag == "v1.2.3" and .repository == "owner/repo" and .asset == "garoon-calendar-sync.zip"' "$extracted/release.json" >/dev/null || fail 'リリース情報'
while IFS= read -r entry; do
    name=$(jq -r '.key' <<< "$entry")
    expected=$(jq -r '.value' <<< "$entry")
    actual=$(sha256sum -- "$extracted/$name")
    [[ ${actual%% *} == "$expected" ]] || fail "ハッシュ: $name"
    [[ ! /$name/ =~ /(test|script|node_modules|gas|tmp)/ ]] || fail "配布対象外: $name"
done < <(jq -c '.files | to_entries[]' "$extracted/release.json")
for name in README.md google-calendar-setup.md chrome-extension-usage.md "$image_name" update.bat update.ps1 extension/manifest.json; do
    jq -e --arg name "$name" '.files[$name]' "$extracted/release.json" >/dev/null || fail "必須ファイル: $name"
done
grep -q '^# Garoon Calendar Sync' "$extracted/README.md" || fail 'READMEの入口'
grep -q '](google-calendar-setup.md)' "$extracted/README.md" || fail 'READMEの設定案内'
grep -q '](chrome-extension-usage.md#' "$extracted/README.md" || fail 'READMEの操作案内'
for name in README.md google-calendar-setup.md chrome-extension-usage.md; do
    if grep -Eq 'use-cases\.md|development-setup\.md|/blob/' "$extracted/$name"; then
        fail "利用者向け文書の参照: $name"
    fi
    while IFS= read -r reference; do
        [[ $reference =~ ^[a-zA-Z][a-zA-Z0-9+.-]*: || $reference == \#* ]] && continue
        target=$(decode_uri "${reference%%#*}")
        jq -e --arg target "$target" '.files[$target]' "$extracted/release.json" >/dev/null || fail "$name: $reference"
    done < <(document_links "$extracted/$name")
done
(cd "$output" && sha256sum -c "$asset_name.sha256")
echo old > "$output/unwanted.txt"
(cd "$output" && zip -q "$archive" unwanted.txt)
bash "$test_root/script/release/build-extension.sh" v1.2.4 owner/repo "$output" >/dev/null
if unzip -Z1 "$archive" | grep -q unwanted; then fail '古いZIPの不要項目が残存'; fi
[[ $(sha256sum "$test_root/chrome-extension/manifest.json") == "$before" ]] || fail 'ソースmanifestの変更'
echo '成功: ZIPの内容、ハッシュ、再生成とソースの保持'

repository="$temporary/work"
remote="$temporary/remote.git"
mkdir "$repository"
git -C "$repository" init -q
git -C "$repository" config user.email release-test@example.invalid
git -C "$repository" config user.name 'Release test'
git -C "$repository" config tag.gpgSign false
git -C "$repository" config commit.gpgSign false
git -C "$repository" config core.hooksPath /dev/null
git init --bare -q "$remote"
git -C "$repository" remote add origin "$remote"
echo initial > "$repository/file.txt"
git -C "$repository" add file.txt
git -C "$repository" commit -qm initial
git -C "$repository" tag unrelated
run_tag() {
    bash -c 'source "$1/script/release/tag-and-push.sh"; tag_release "$2" "$3"' _ "$test_root" "$1" "$repository"
}
run_tag 1.2.3
[[ $(git -C "$repository" cat-file -t v1.2.3) == tag ]] || fail '注釈付きタグ'
remote_tags=$(git -C "$repository" ls-remote --tags origin)
[[ $remote_tags == *refs/tags/v1.2.3* && $remote_tags != *unrelated* ]] || fail '対象タグだけの送信'
[[ -z $(git -C "$repository" ls-remote --heads origin) ]] || fail 'ブランチの送信'
expect_failure 'ローカルに存在' run_tag v1.2.3
git -C "$repository" update-ref -d refs/tags/v1.2.3
expect_failure 'originに存在' run_tag v1.2.3
echo changed > "$repository/file.txt"
expect_failure '未コミット' run_tag 1.2.4
[[ -z $(git -C "$repository" tag --list v1.2.4) ]] || fail '未コミット時のタグ作成'
git -C "$repository" restore file.txt
git -C "$repository" remote set-url origin "$temporary/missing.git"
expect_failure 'リポジトリ\|repository' run_tag 1.2.4
[[ -z $(git -C "$repository" tag --list v1.2.4) ]] || fail '送信先を確認できない時のタグ作成'
git -C "$repository" remote set-url origin "$remote"
printf '#!/bin/bash\nexit 1\n' > "$remote/hooks/pre-receive"
chmod +x "$remote/hooks/pre-receive"
expect_failure 'ローカルに残っています' run_tag 1.2.4
[[ -n $(git -C "$repository" tag --list v1.2.4) ]] || fail '送信失敗時のローカルタグ保持'
echo '成功: タグ作成、重複拒否、送信範囲と失敗時の保持'
