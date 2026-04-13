# Test Generation

Every action you perform with `playwright-cli` generates corresponding Playwright TypeScript code. Use that output as a starting point when the user asks for a Playwright test.

## Example Workflow

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" open https://example.com/login
"$PWCLI" snapshot
"$PWCLI" fill e1 "user@example.com"
"$PWCLI" fill e2 "password123"
"$PWCLI" click e3
```

## Building A Test

```typescript
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/.*dashboard/);
});
```

Add assertions manually. The generated code captures actions, not intent.
