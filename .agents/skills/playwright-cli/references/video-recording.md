# Video Recording

Capture browser automation sessions as video for debugging, demos, or proof of work.

## Basic Recording

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" open
"$PWCLI" video-start output/playwright/demo.webm
"$PWCLI" goto https://example.com
"$PWCLI" snapshot
"$PWCLI" click e1
"$PWCLI" video-stop
```

## Chapter Markers

```bash
"$PWCLI" video-chapter "Getting Started" --description="Opening the homepage" --duration=2000
```

## Best Practices

- Prefer `run-code` for polished recordings with deliberate pacing.
- Store recordings under `output/playwright/`.
- Use video for demos and traces for debugging.
