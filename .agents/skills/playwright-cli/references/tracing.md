# Tracing

Capture execution traces for debugging. Traces include DOM snapshots, screenshots, network activity, and console logs.

## Basic Usage

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" tracing-start
"$PWCLI" open https://example.com
"$PWCLI" click e1
"$PWCLI" fill e2 "test"
"$PWCLI" tracing-stop
```

## Best Practices

- Start tracing before the failing action.
- Use traces for debugging, not for long demo recordings.
- Clean up old trace files if they accumulate.
