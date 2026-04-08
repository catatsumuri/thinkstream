---
name: playwright-cli
description: "Use when the task requires automating a real browser from the terminal with playwright-cli for navigation, snapshots, form filling, screenshots, console inspection, request mocking, or UI-flow debugging. Do not use this skill for writing Playwright test files unless the user explicitly asks for tests."
license: MIT
metadata:
  author: microsoft-openai-adapted
---

# Playwright CLI Skill

Drive a real browser from the terminal using `playwright-cli`.

This repository already has `playwright-cli` installed, so prefer the bundled wrapper script to keep invocation consistent and to fall back to `npx` when needed.

## When to Apply

Activate this skill when:

- The user asks to inspect or automate a web page in a real browser
- A UI flow needs debugging through snapshots, clicks, fills, console logs, or network requests
- You need screenshots, PDFs, traces, or video from an actual browser session
- The task is exploratory browser automation, not Playwright test authoring

Do not pivot to `@playwright/test` unless the user explicitly asks for test files.

## Prerequisite Check

Before using the wrapper, confirm the required commands are available:

```bash
command -v playwright-cli >/dev/null 2>&1 || command -v npx >/dev/null 2>&1
```

If neither command exists, stop and ask the user to install Node.js/npm or `@playwright/cli`.

## Skill Path

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"
```

## Quick Start

Use the wrapper script:

```bash
"$PWCLI" open https://playwright.dev --headed
"$PWCLI" snapshot
"$PWCLI" click e15
"$PWCLI" type "locator"
"$PWCLI" press Enter
"$PWCLI" screenshot --filename=output/playwright/playwright-home.png
```

## Core Workflow

1. Open the page.
2. Snapshot to obtain stable refs like `e15`.
3. Interact using the latest refs.
4. Snapshot again after navigation or major DOM changes.
5. Capture artifacts when useful.

Minimal loop:

```bash
"$PWCLI" open https://example.com
"$PWCLI" snapshot
"$PWCLI" click e3
"$PWCLI" snapshot
```

## Guardrails

- Always take a fresh snapshot before referencing element ids.
- Re-snapshot after navigation, modal changes, or tab switches.
- Prefer explicit commands over `eval` and `run-code`.
- Use `--headed` when a visual check matters.
- Store captured artifacts under `output/playwright/`.

## References

Open only what you need:

- `references/cli.md` for the command surface
- `references/workflows.md` for repeatable task flows
