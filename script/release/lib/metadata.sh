#!/bin/bash

# Chromeが受け付ける3区切りの版をタグから取得する。
version_from_tag() {
    local tag=${1:-} part
    local pattern='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
    if [[ $tag =~ $pattern && $tag != v0.0.0 ]]; then
        for part in "${BASH_REMATCH[@]:1}"; do
            # 桁数を先に確認し、巨大な入力の算術オーバーフローも避ける。
            if (( ${#part} > 5 )) || (( 10#$part > 65535 )); then
                break
            fi
        done
        if (( ${#part} <= 5 )) && (( 10#$part <= 65535 )); then
            printf '%s\n' "${tag#v}"
            return
        fi
    fi
    echo 'タグは v1.2.3 形式で指定してください。各数値は0〜65535、全桁0は不可です。' >&2
    return 1
}

validate_repository() {
    if [[ ! ${1:-} =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]]; then
        echo 'リポジトリは owner/repository 形式で指定してください。' >&2
        return 1
    fi
}
