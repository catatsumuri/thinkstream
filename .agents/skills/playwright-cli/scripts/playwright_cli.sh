#!/usr/bin/env bash
set -euo pipefail

if command -v playwright-cli >/dev/null 2>&1; then
    exec playwright-cli "$@"
fi

if ! command -v npx >/dev/null 2>&1; then
    echo "Error: playwright-cli and npx are not available on PATH." >&2
    exit 1
fi

has_session_flag="false"

for arg in "$@"; do
    case "$arg" in
        --session|--session=*)
            has_session_flag="true"
            break
            ;;
    esac
done

cmd=(npx --yes --package @playwright/cli playwright-cli)

if [[ "${has_session_flag}" != "true" && -n "${PLAYWRIGHT_CLI_SESSION:-}" ]]; then
    cmd+=(--session "${PLAYWRIGHT_CLI_SESSION}")
fi

cmd+=("$@")

exec "${cmd[@]}"
