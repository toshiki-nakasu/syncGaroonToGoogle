#!/bin/bash

# URIの%HHだけを復号し、入力のバックスラッシュを解釈しない。
decode_uri() {
    local rest=$1 decoded='' byte
    while [[ $rest == *%* ]]; do
        decoded+=${rest%%\%*}
        rest=${rest#*%}
        if [[ ! $rest =~ ^[[:xdigit:]]{2} || ${rest:0:2} == 00 ]]; then
            echo "不正なURIです: $1" >&2
            return 1
        fi
        printf -v byte '%b' "\\x${rest:0:2}"
        decoded+=$byte
        rest=${rest:2}
    done
    printf '%s' "$decoded$rest"
}

encode_path() {
    jq -rn --arg path "$1" '$path | split("/") | map(@uri) | join("/")'
}

# front matterとコードフェンスの中を参照検査から除外する。
document_body() {
    awk '
        { sub(/\r$/, "") }
        NR == 1 && $0 == "---" { front = 1; next }
        front { if ($0 == "---") front = 0; next }
        {
            line = $0
            sub(/^[\t ]*/, "", line)
            if (fence != "") {
                if (substr(line, 1, 1) == fence) {
                    count = 0
                    while (substr(line, count + 1, 1) == fence) count++
                    tail = substr(line, count + 1)
                    if (count >= width && tail ~ /^[\t ]*$/) fence = ""
                }
                next
            }
            if (line ~ /^```/ || line ~ /^~~~/) {
                fence = substr(line, 1, 1)
                width = 0
                while (substr(line, width + 1, 1) == fence) width++
                next
            }
            print
        }
    ' "$1"
}

document_links() {
    document_body "$1" | jq -Rrs '
        match("!?\\[[^\\]\\n]*\\]\\(([^)\\n]+)\\)"; "g")
        | .captures[0].string
        | split(" \"")[0] | sub("^<"; "") | sub(">$"; "")
    '
}

document_headings() {
    # Bashの小文字化で日本語以外のUnicode見出しも扱う。
    document_body "$1" | while IFS= read -r line; do
        printf '%s\n' "${line,,}"
    done | jq -Rrs '
        def unique_anchor($used; $base; $index):
            (if $index == 0 then $base else "\($base)-\($index)" end) as $anchor
            | if $used[$anchor] then unique_anchor($used; $base; $index + 1) else $anchor end;
        [split("\n")[] | match("^#{1,6}[\\t ]+(.+?)(?:[\\t ]+#+)?$") | .captures[0].string
            | gsub("<[^>]+>"; "") | gsub("[`*~]"; "")
            | gsub("[^\\p{L}\\p{N}\\p{M}_\\-\\s]"; "") | gsub("\\s"; "-")]
        | reduce .[] as $base ({used: {}, anchors: []};
            unique_anchor(.used; $base; 0) as $anchor
            | .used[$anchor] = true | .anchors += [$anchor])
        | .anchors[]
    '
}
