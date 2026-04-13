# Browser Session Management

Run multiple isolated browser sessions concurrently with state persistence.

## Named Sessions

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" -s=auth open https://app.example.com/login
"$PWCLI" -s=public open https://example.com
"$PWCLI" -s=auth fill e1 "user@example.com"
"$PWCLI" -s=public snapshot
```

## Isolation

Each session has independent cookies, storage, cache, browsing history, and tabs.

## Session Commands

```bash
"$PWCLI" list
"$PWCLI" close
"$PWCLI" -s=mysession close
"$PWCLI" close-all
"$PWCLI" kill-all
"$PWCLI" delete-data
"$PWCLI" -s=mysession delete-data
```

## Persistent Profiles

```bash
"$PWCLI" open https://example.com --persistent
"$PWCLI" open https://example.com --profile=/path/to/profile
```
