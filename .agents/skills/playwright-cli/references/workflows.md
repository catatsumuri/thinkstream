# Playwright CLI Workflows

## Basic Page Inspection

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" open https://example.com --headed
"$PWCLI" snapshot
"$PWCLI" console
"$PWCLI" network
```

## Form Submission

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" open https://example.com/login
"$PWCLI" snapshot
"$PWCLI" fill e1 "user@example.com"
"$PWCLI" fill e2 "password123"
"$PWCLI" click e3
"$PWCLI" snapshot
```

## Capture A Screenshot

```bash
mkdir -p output/playwright

PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" open https://example.com --headed
"$PWCLI" snapshot
"$PWCLI" screenshot --filename=output/playwright/example-home.png
```

## Trace A UI Flow

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" open https://example.com --headed
"$PWCLI" tracing-start
"$PWCLI" snapshot
"$PWCLI" click e4
"$PWCLI" fill e7 "debug input"
"$PWCLI" tracing-stop
```

## Multi-Tab Debugging

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" open https://example.com
"$PWCLI" tab-new https://example.com/docs
"$PWCLI" tab-list
"$PWCLI" tab-select 0
"$PWCLI" snapshot
```
