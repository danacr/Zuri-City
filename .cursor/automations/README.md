# Pre-human merge-request review

Well-architected gates so a human only reviews **implementation look and product judgment** — not rediscover broken parking, flat buildings, or failing checks.

```text
                    PR opened / pushed
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌──────────────────┐
│ Label UI PRs  │   │ Quality CI    │   │ Bugbot (Cursor)  │
│ path → `ui`   │   │ npm run       │   │ code defects     │
│               │   │ quality       │   │                  │
└───────┬───────┘   └───────┬───────┘   └────────┬─────────┘
        │                   │                    │
        └─────────┬─────────┴────────────────────┘
                  ▼
        ┌───────────────────┐
        │ Cursor Automation │
        │ UI visual review  │  ← only if UI paths / label `ui`
        │ (computer use +   │
        │  structured note) │
        └─────────┬─────────┘
                  ▼
        Human reviews look / product
```

## Layers

| Layer | Where | Job |
| --- | --- | --- |
| **1. Path label** | `.github/workflows/label-ui-prs.yml` + `labeler.yml` | Stamp `ui` when user-facing files change |
| **2. Quality CI** | `.github/workflows/quality.yml` | Required check: `npm run quality` (types, unit acceptance, build, Playwright mobile) |
| **3. Code review bot** | Cursor Bugbot (dashboard) | Logic / security / regressions in the diff |
| **4. Visual review bot** | `.cursor/automations/ui-pr-review.md` | Mobile map UX checklist + screenshots before humans look |
| **5. Policy** | `AGENTS.md` | Agents must not present a preview as ready until quality (and UI bot when applicable) is green |

## Activate (one-time)

1. Ensure GitHub label **`ui`** exists (Actions labeler creates comments only; create the label once in the repo if missing).
2. Merge this PR so workflows land on the integration branch.
3. In repo **Settings → Branches**, require status check **`Quality`** on the product branch (once the workflow has run once).
4. Enable **Bugbot** on the repo in Cursor.
5. Create the Cursor Automation from [`ui-pr-review.md`](./ui-pr-review.md) (dashboard → Automations → New). Cursor has no public create-automation API.

## Local / agent fallback

```bash
npm run quality
```

Never tell a human a preview is ready until that passes. For UI PRs, prefer waiting for the automation comment (or run the same checklist yourself).
