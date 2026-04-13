# Request Mocking

Intercept, mock, modify, and block network requests.

## CLI Route Commands

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" route "**/*.jpg" --status=404
"$PWCLI" route "**/api/users" --body='[{"id":1,"name":"Alice"}]' --content-type=application/json
"$PWCLI" route "**/api/data" --body='{"ok":true}' --header="X-Custom: value"
"$PWCLI" route "**/*" --remove-header=cookie,authorization
"$PWCLI" route-list
"$PWCLI" unroute "**/*.jpg"
"$PWCLI" unroute
```

## URL Patterns

```text
**/api/users
**/api/*/details
**/*.{png,jpg,jpeg}
**/search?q=*
```

## Advanced Mocking With `run-code`

### Conditional Response Based On Request

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" run-code "async page => {
  await page.route('**/api/login', route => {
    const body = route.request().postDataJSON();
    if (body.username === 'admin') {
      route.fulfill({ body: JSON.stringify({ token: 'mock-token' }) });
    } else {
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'Invalid' }) });
    }
  });
}"
```

### Modify A Real Response

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" run-code "async page => {
  await page.route('**/api/user', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.isPremium = true;
    await route.fulfill({ response, json });
  });
}"
```

### Simulate Network Failures

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" run-code "async page => {
  await page.route('**/api/offline', route => route.abort('internetdisconnected'));
}"
```
