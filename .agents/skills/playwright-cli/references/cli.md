# Playwright CLI Reference

Derived from the `microsoft/playwright-cli` skill and the locally installed CLI help output.

## Core

```bash
playwright-cli open [url]
playwright-cli goto <url>
playwright-cli snapshot [element]
playwright-cli click <target>
playwright-cli dblclick <target>
playwright-cli type <text>
playwright-cli fill <target> <text>
playwright-cli hover <target>
playwright-cli select <target> <value>
playwright-cli upload <file>
playwright-cli check <target>
playwright-cli uncheck <target>
playwright-cli eval <func> [element]
playwright-cli resize <width> <height>
playwright-cli close
```

## Navigation

```bash
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

## Keyboard And Mouse

```bash
playwright-cli press Enter
playwright-cli keydown Shift
playwright-cli keyup Shift
playwright-cli mousemove 150 300
playwright-cli mousedown
playwright-cli mouseup
playwright-cli mousewheel 0 100
```

## Artifacts

```bash
playwright-cli screenshot [target]
playwright-cli pdf
playwright-cli tracing-start
playwright-cli tracing-stop
playwright-cli video-start [filename]
playwright-cli video-stop
```

## Tabs

```bash
playwright-cli tab-list
playwright-cli tab-new [url]
playwright-cli tab-select <index>
playwright-cli tab-close [index]
```

## Storage

```bash
playwright-cli state-save [filename]
playwright-cli state-load <filename>
playwright-cli cookie-list
playwright-cli cookie-get <name>
playwright-cli cookie-set <name> <value>
playwright-cli cookie-delete <name>
playwright-cli cookie-clear
playwright-cli localstorage-list
playwright-cli localstorage-get <key>
playwright-cli localstorage-set <key> <value>
playwright-cli localstorage-delete <key>
playwright-cli localstorage-clear
playwright-cli sessionstorage-list
playwright-cli sessionstorage-get <key>
playwright-cli sessionstorage-set <key> <value>
playwright-cli sessionstorage-delete <key>
playwright-cli sessionstorage-clear
```

## Debugging

```bash
playwright-cli console
playwright-cli network
playwright-cli route <pattern>
playwright-cli route-list
playwright-cli unroute [pattern]
playwright-cli run-code [code]
```
