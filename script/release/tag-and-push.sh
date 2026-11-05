#!/bin/bash
set -euo pipefail

script_root=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_root/lib/metadata.sh"

# 作業ツリーを確認し、注釈付きタグだけをoriginへ送る。
tag_release() (
    local tag=${1:-}
    [[ $tag == v* ]] || tag="v$tag"
    version_from_tag "$tag" >/dev/null
    cd "${2:-$script_root/../..}"
    if [[ -n $(git status --porcelain) ]]; then
        echo '未コミットの変更があります。リリース対象をコミットしてから実行してください。' >&2
        return 1
    fi
    git rev-parse --verify HEAD >/dev/null
    if [[ -n $(git tag --list "$tag") ]]; then
        echo "タグ $tag はローカルに存在します。" >&2
        return 1
    fi
    local remote_tags
    remote_tags=$(git ls-remote --tags origin "refs/tags/$tag" "refs/tags/$tag^{}")
    if [[ -n $remote_tags ]]; then
        echo "タグ $tag はoriginに存在します。" >&2
        return 1
    fi
    git tag -a "$tag" -m "Chrome拡張機能 $tag"
    if ! git push origin "refs/tags/$tag:refs/tags/$tag"; then
        echo "pushに失敗しました。タグ $tag はローカルに残っています。通信とoriginを確認し、git push origin refs/tags/$tag:refs/tags/$tag で再試行してください。" >&2
        return 1
    fi
    echo "$tag をpushしました。GitHub Actionsのリリース結果を確認してください。"
)

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
    tag_release "${1:-}"
fi
