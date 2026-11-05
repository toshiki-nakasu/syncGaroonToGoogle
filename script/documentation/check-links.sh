#!/bin/bash
set -euo pipefail

script_root=$(cd "$(dirname "$0")" && pwd)
source "$script_root/../lib/markdown.sh"
root=$(realpath "${1:-$script_root/../..}")
if [[ ! -d $root ]]; then
    echo "検査対象のディレクトリが存在しません: $root" >&2
    exit 1
fi
errors=0
count=0
declare -A headings=()

# 探索の失敗を終了コードへ反映し、対象ルート自身は除外しない。
documents=$(mktemp "${TMPDIR:-/tmp}/garoon-documents-XXXXXX")
trap 'rm -f -- "$documents"' EXIT
find "$root" -mindepth 1 \( -type d \( -name .git -o -name node_modules -o -name .codex -o -name work -o -name dist -o -name tmp -o -path "$root/.agents/skills" \) -prune \) -o \( -type f -name '*.md' -print0 \) > "$documents"

while IFS= read -r -d '' source; do
    count=$((count + 1))
    links=$(document_links "$source")
    while IFS= read -r reference; do
        [[ -n $reference ]] || continue
        [[ $reference =~ ^[a-zA-Z][a-zA-Z0-9+.-]*: || $reference == //* ]] && continue
        relative=${reference%%#*}
        anchor=''
        if [[ $reference == *#* ]]; then
            anchor=${reference#*#}
        fi
        if ! relative=$(decode_uri "$relative") || ! anchor=$(decode_uri "$anchor"); then
            echo "${source#"$root/"}: 不正な参照です: $reference" >&2
            errors=$((errors + 1))
            continue
        fi
        if [[ -z $relative ]]; then
            target=$source
        elif [[ $relative == /* ]]; then
            target=$(realpath -ms -- "$relative")
        else
            target=$(realpath -ms -- "$(dirname "$source")/$relative")
        fi
        if [[ ! -e $target ]]; then
            echo "${source#"$root/"}: 参照先が存在しません: $reference" >&2
            errors=$((errors + 1))
        elif [[ -n $anchor && $target == *.md && -f $target ]]; then
            # 収集対象だけを検査し、外部由来のSkillと作業領域は読み込まない。
            case "/${target#"$root/"}/" in
                */.git/*|*/node_modules/*|*/.codex/*|*/work/*|*/dist/*|*/tmp/*|/.agents/skills/*) continue ;;
            esac
            [[ $target == "$root/"* ]] || continue
            if [[ ! -v headings["$target"] ]]; then
                headings["$target"]=$(document_headings "$target")
            fi
            if ! printf '%s\n' "${headings[$target]}" | grep -Fxq -- "$anchor"; then
                echo "${source#"$root/"}: 見出しが存在しません: $reference" >&2
                errors=$((errors + 1))
            fi
        fi
    done <<< "$links"
done < "$documents"

(( errors == 0 )) || exit 1
echo "${count}文書の相対リンクと見出しを確認しました。"
