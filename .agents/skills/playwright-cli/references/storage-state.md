# Storage Management

Manage cookies, localStorage, sessionStorage, and full browser storage state.

## Save And Restore Storage State

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" state-save
"$PWCLI" state-save my-auth-state.json
"$PWCLI" state-load my-auth-state.json
```

## Cookies

```bash
"$PWCLI" cookie-list
"$PWCLI" cookie-list --domain=example.com
"$PWCLI" cookie-get session_id
"$PWCLI" cookie-set session abc123
"$PWCLI" cookie-set session abc123 --domain=example.com --path=/ --httpOnly --secure --sameSite=Lax
"$PWCLI" cookie-delete session_id
"$PWCLI" cookie-clear
```

## Local Storage

```bash
"$PWCLI" localstorage-list
"$PWCLI" localstorage-get token
"$PWCLI" localstorage-set theme dark
"$PWCLI" localstorage-delete token
"$PWCLI" localstorage-clear
```

## Session Storage

```bash
"$PWCLI" sessionstorage-list
"$PWCLI" sessionstorage-get step
"$PWCLI" sessionstorage-set step 3
"$PWCLI" sessionstorage-delete step
"$PWCLI" sessionstorage-clear
```
