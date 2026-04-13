# Running Custom Playwright Code

Use `run-code` only when the built-in CLI commands are not enough.

## Syntax

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" run-code "async page => {
  // custom Playwright code
}"
```

## Geolocation

```bash
"$PWCLI" run-code "async page => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
}"
```

## Media Emulation

```bash
"$PWCLI" run-code "async page => {
  await page.emulateMedia({ colorScheme: 'dark' });
}"
```

## Wait Strategies

```bash
"$PWCLI" run-code "async page => {
  await page.waitForLoadState('networkidle');
}"
```

## Frames

```bash
"$PWCLI" run-code "async page => {
  const frame = page.locator('iframe#my-iframe').contentFrame();
  await frame.locator('button').click();
}"
```

## Clipboard

```bash
"$PWCLI" run-code "async page => {
  await page.context().grantPermissions(['clipboard-read']);
  return await page.evaluate(() => navigator.clipboard.readText());
}"
```

## Error Handling

```bash
"$PWCLI" run-code "async page => {
  try {
    await page.getByRole('button', { name: 'Submit' }).click({ timeout: 1000 });
    return 'clicked';
  } catch (e) {
    return 'element not found';
  }
}"
```
