#!/bin/bash
set -euo pipefail

# PreToolUse hook: block dangerous terminal commands
input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name // empty')

# Only inspect run_in_terminal
if [[ "$tool_name" != "run_in_terminal" ]]; then
    exit 0
fi

command_str=$(echo "$input" | jq -r '.tool_input.command // empty')

if [[ -z "$command_str" ]]; then
    exit 0
fi

deny() {
    local reason="$1"
    jq -n --arg reason "$reason" \
        '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$reason}}'
    exit 0
}

# Blocked patterns: "regex|reason" (add new rules here)
blocked_patterns=(
    'git\s+push\s+.*(-f\b|--force\b|--force-with-lease\b)|git push --force は禁止されています'
    'rm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(/\s|/\b|\.git\b|~/|\$HOME)|ルートディレクトリ, .git, ホームディレクトリの rm -rf は禁止されています'
    '(sed\s+(-[a-zA-Z]*i\b|--in-place)|perl\s+-[a-zA-Z]*[ip][a-zA-Z]*\s+-e|awk\s+-i\s+inplace)|対話中のターミナルでのファイル編集 (sed -i, perl -i 等) は禁止されています。エディタツールを使用してください'
)

for entry in "${blocked_patterns[@]}"; do
    pattern="${entry%|*}"
    reason="${entry##*|}"
    if printf '%s\n' "$command_str" | grep -qE "$pattern"; then
        deny "$reason"
    fi
done

exit 0
