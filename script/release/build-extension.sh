#!/bin/bash
set -euo pipefail

script_root=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
root=$(cd "$script_root/../.." && pwd)
source "$script_root/lib/metadata.sh"
source "$script_root/../lib/markdown.sh"
asset_name=garoon-calendar-sync.zip
image_name=マッピング.drawio.png
declare -A release_documents=(
    [chrome-extension/README.md]=README.md
    [docs/procedures/google-calendar-setup.md]=google-calendar-setup.md
    [docs/procedures/chrome-extension-usage.md]=chrome-extension-usage.md
    [docs/マッピング.drawio.png]=$image_name
    [chrome-extension/manifest.json]=extension/manifest.json
)

# 同梱先へのリンクを残し、その他は指定版のGitHubへ向ける。
release_readme() {
    local repository=$1 ref=$2 source_document=${3:-chrome-extension/README.md}
    local line prefix reference target replacement anchor
    local pattern='(!?\[[^]]*\]\()([^[:space:])]+)(\))'
    while IFS= read -r line || [[ -n $line ]]; do
        prefix=''
        while [[ $line =~ $pattern ]]; do
            local matched=${BASH_REMATCH[0]} opening=${BASH_REMATCH[1]}
            reference=${BASH_REMATCH[2]}
            prefix+=${line%%"$matched"*}
            line=${line#*"$matched"}
            replacement=$reference
            if [[ ! $reference =~ ^[a-zA-Z][a-zA-Z0-9+.-]*: && $reference != \#* && $reference != //* ]]; then
                anchor=''
                [[ $reference != *#* ]] || anchor="#${reference#*#}"
                target=$(decode_uri "${reference%%#*}")
                target=$(realpath -ms -- "$root/$(dirname "$source_document")/$target")
                target=${target#"$root/"}
                if [[ -v release_documents["$target"] ]]; then
                    replacement=$(encode_path "${release_documents[$target]}")
                else
                    replacement="https://github.com/$repository/blob/$(encode_path "$ref")/$(encode_path "$target")"
                fi
                replacement+=$anchor
            fi
            prefix+="$opening$replacement)"
        done
        printf '%s\n' "$prefix$line"
    done
}

package_extension() (
    local tag=${1:-} repository=${2:-} output=${3:-$root/dist} ref=${4:-${1:-}}
    local version staging name source destination digest archive
    version=$(version_from_tag "$tag")
    validate_repository "$repository"
    output=$(realpath -m -- "$output")
    staging=$(mktemp -d "${TMPDIR:-/tmp}/garoon-package-XXXXXX")
    trap 'rm -rf -- "$staging"; rm -f -- "$staging.files"' EXIT
    mkdir "$staging/extension"
    cp -R -- "$root/chrome-extension/src" "$root/chrome-extension/ui" "$staging/extension/"
    jq --indent 4 --arg version "$version" '.version = $version' \
        "$root/chrome-extension/manifest.json" > "$staging/extension/manifest.json"
    cp -- "$script_root/updater/update.bat" "$script_root/updater/update.ps1" "$staging/"
    cp -- "$root/docs/$image_name" "$staging/"
    for source in "${!release_documents[@]}"; do
        [[ $source == *.md ]] || continue
        destination=${release_documents[$source]}
        release_readme "$repository" "$ref" "$source" < "$root/$source" > "$staging/$destination"
    done
    # ハッシュの対象とZIPの対象が一致するよう、リンクなどを拒否する。
    if [[ -n $(find "$staging" ! -type d ! -type f -print -quit) ]]; then
        echo '配布対象に通常ファイル以外が含まれています。' >&2
        return 1
    fi
    cd "$staging"
    while IFS= read -r -d '' name; do
        digest=$(sha256sum -- "$name")
        digest=${digest%% *}
        jq -n --arg name "${name#./}" --arg digest "$digest" '{key: $name, value: $digest}'
    done < <(find . -type f -print0 | sort -z) > "$staging.files"
    # 一覧自体を配布物へ混入させない。
    jq -s --arg repository "$repository" --arg tag "$tag" --arg version "$version" \
        --arg asset "$asset_name" --arg image "$image_name" \
        '{repository: $repository, tag: $tag, version: $version, asset: $asset, image: $image, files: from_entries}' \
        "$staging.files" > release.json
    mkdir -p -- "$output"
    archive="$output/$asset_name"
    # 既存ZIPの不要項目を残さず、毎回新しく作る。
    rm -f -- "$archive"
    zip -q -r -UN=UTF8 "$archive" .
    cd "$output"
    sha256sum "$asset_name" > "$asset_name.sha256"
    printf '%s\n' "$archive"
)

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
    package_extension "$@"
fi
