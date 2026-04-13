# Inspecting Element Attributes

When the snapshot does not show an element's `id`, `class`, `data-*` attributes, or other DOM properties, use `eval` to inspect them.

## Examples

```bash
PWCLI=".agents/skills/playwright-cli/scripts/playwright_cli.sh"

"$PWCLI" snapshot
# snapshot shows a button as e7 but does not reveal its id or data attributes

"$PWCLI" eval "el => el.id" e7
"$PWCLI" eval "el => el.className" e7
"$PWCLI" eval "el => el.getAttribute('data-testid')" e7
"$PWCLI" eval "el => el.getAttribute('aria-label')" e7
"$PWCLI" eval "el => getComputedStyle(el).display" e7
```
