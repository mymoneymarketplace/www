# Development notes

## Content-audit pre-publish guardrail

Every HTML page on this site is covered by a content audit that catches quality
regressions (wrong-industry H1s, placeholder text, missing canonicals, broken
internal links, unreplaced template tokens, etc.). The audit logic lives in
`scripts/audit-module.js` and is enforced at two points in the workflow.

### Layer 1: Page generators

`scripts/generate-industry-page.js` and `scripts/generate-state-industry-page.js`
run the audit against the freshly-rendered HTML **before writing the file**.

- **New CRITICAL or HIGH finding →** file is NOT written, exit code `1`, the
  finding is printed to stderr with a short fix hint.
- **New MEDIUM or LOW finding →** file IS written, finding is printed as a
  warning.
- **Pre-existing finding →** grandfathered via `data/audit-baseline.json`; the
  generator stays silent.

The generator layer runs only the subset of checks that are meaningful against
a single in-memory page:

```
cross-page-leakage  state-leakage  structural  content-quality  cta-correctness
```

(`internal-link-validity` and `data-traceability` rely on site-wide context and
are enforced by Layer 2 instead.)

### Layer 2: Pre-commit git hook

`scripts/pre-commit-audit.js` runs on every `git commit`, reads the **staged**
contents of any `.html` files via `git show :<path>`, and runs the full audit
(all 7 per-page checks). Same baseline-grandfathering and block/warn rules
apply. This is the backstop for pages edited by hand, not through a generator.

Install the hook once per clone:

```
sh scripts/install-hooks.sh
```

The installer writes a thin shim to `.git/hooks/pre-commit`. Re-running it is
safe — it overwrites the existing hook with the current shim.

### Severity semantics

| Severity | Guardrail behavior | Typical issue |
| --- | --- | --- |
| CRITICAL | Block | Lorem Ipsum, unreplaced `{template_tokens}` |
| HIGH     | Block | Wrong-industry H1, missing canonical, dead internal link, missing required JSON-LD |
| MEDIUM   | Warn  | Missing non-origination disclosure, low word count, meta-description length |
| LOW      | Warn  | Minor structural hints |

`BLOCKING_SEVERITIES = ['CRITICAL', 'HIGH']` is the single source of truth
(`scripts/audit-module.js`). Both layers import from there.

### Bypass

Intentional bypass is available for dev work or rescue commits:

```
SKIP_AUDIT=1 node scripts/generate-industry-page.js 722511
SKIP_AUDIT=1 git commit -m "..."
git commit --no-verify -m "..."        # skips the hook only
```

Production deploys run the full audit on CI (see `scripts/content-audit.js`)
and should never carry `SKIP_AUDIT` through.

### Updating the baseline

The baseline snapshot lives at `data/audit-baseline.json` and lists signatures
of findings that existed when the guardrail was first wired up. To refresh it
after a site-wide cleanup:

```
node scripts/content-audit.js --write-baseline
```

Only do this when you've intentionally reduced the finding set — otherwise
you're simply hiding regressions.

### Preview mode

Both generators accept `--preview` to render + audit **without writing the
file**. Useful for CI or quick local checks:

```
node scripts/generate-industry-page.js 722511 --preview
```
