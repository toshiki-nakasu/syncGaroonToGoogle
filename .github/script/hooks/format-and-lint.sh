#!/bin/bash
set -euo pipefail

# PostToolUse hook: format and basic validation after file edit tools
input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name // empty')

# Only process supported edit tools
case "$tool_name" in
    apply_patch|create_file) ;;
    *) exit 0 ;;
esac

# Collect file paths
file_paths=()

if [[ "$tool_name" == "apply_patch" ]]; then
    # Delete File パターン ("*** Delete File: ...") は整形不要のため
    # Add / Update のみを抽出する
    while IFS= read -r p; do
        file_paths+=("$p")
    done < <(
        echo "$input" | jq -r '.tool_input.input // empty' |
            awk '/^\*\*\* (Add|Update) File: / {
                sub(/^\*\*\* (Add|Update) File: /, "")
                sub(/ -> .*/, "")
                print
            }' |
            sort -u
    )
elif [[ -n "${TOOL_INPUT_FILE_PATH:-}" ]]; then
    file_paths+=("$TOOL_INPUT_FILE_PATH")
else
    fp=$(echo "$input" | jq -r '.tool_input.filePath // empty')
    if [[ -n "$fp" ]]; then
        file_paths+=("$fp")
    fi
fi

# Process each file
lint_errors=""

for file_path in "${file_paths[@]}"; do
    # Skip if file does not exist
    [[ -f "$file_path" ]] || continue

    # Remove trailing whitespace
    sed -i 's/[[:space:]]*$//' "$file_path" || true

    # Get file extension
    ext="${file_path##*.}"

    # Formatter by extension (add new languages here)
    case ".$ext" in
        .py)
            # Prefer Ruff when available and fall back to autopep8
            if command -v ruff &>/dev/null; then
                ruff format "$file_path" >/dev/null 2>&1 || true
                ruff check --fix "$file_path" >/dev/null 2>&1 || true
            elif command -v autopep8 &>/dev/null; then
                autopep8 --max-line-length 120 --in-place "$file_path" >/dev/null 2>&1 || true
            fi
            # Syntax check
            compile_output=$(python3 -m py_compile "$file_path" 2>&1) || {
                lint_errors="${lint_errors}${file_path}: ${compile_output}"$'\n'
            }
            ;;
        .js|.md|.json|.yaml|.yml)
            if command -v npx &>/dev/null; then
                npx prettier --write "$file_path" >/dev/null 2>&1 || true
            fi
            ;;
    esac
done

# Output lint errors as additional context if any
if [[ -n "$lint_errors" ]]; then
    jq -n --arg errors "$lint_errors" \
        '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":$errors}}'
fi

exit 0
