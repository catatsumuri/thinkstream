# Running Playwright Tests

Use this reference only when the user explicitly asks for Playwright tests or for debugging an existing Playwright test.

## Run Tests

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test
PLAYWRIGHT_HTML_OPEN=never npm run special-test-command
```

## Debug A Failing Test

Run the test with CLI debugging enabled and keep it running while you attach a browser session.

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test --debug=cli
```

When the output prints debugging instructions with a session name such as `tw-abcdef`, attach it:

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" attach tw-abcdef
```

Use the generated Playwright code from the CLI output to refine locators or expectations. After fixing the test, stop the debug run and rerun the test normally.
