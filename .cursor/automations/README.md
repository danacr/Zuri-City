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
        ┌───────────────────┐     ┌──────────────────────────┐
        │ Cursor Automation │     │ Cursor Automation        │
        │ UI contract review│     │ Maps power-user review   │
        │ (acceptance bar)  │     │ (beat Google / HERE)     │
        │ <!-- zuri-review: │     │ <!-- zuri-review:        │
        │      contract --> │     │      maps-power-user --> │
        └─────────┬─────────┘     └────────────┬─────────────┘
                  └────────────┬───────────────┘
                               ▼
                  ┌────────────────────────────┐
                  │ Cursor Automation          │
                  │ Act on review comments     │
                  │ fix blocking → push → reply│
                  │ <!-- zuri-review:          │
                  │      remediation -->       │
                  └────────────┬───────────────┘
                               ▼
                     Human reviews look / product
```

## Layers

| Layer | Where | Job |
| --- | --- | --- |
| **1. Path label** | `.github/workflows/label-ui-prs.yml` + `labeler.yml` | Stamp `ui` when user-facing files change |
| **2. Quality CI** | `.github/workflows/quality.yml` | Required check: `npm run quality` |
| **3. Code review bot** | Cursor Bugbot (dashboard) | Logic / security / regressions in the diff |
| **4a. UI contract review** | [`ui-pr-review.md`](./ui-pr-review.md) | Mobile map **acceptance** checklist + screenshots |
| **4b. Maps power-user review** | [`maps-power-user-review.md`](./maps-power-user-review.md) | Critical Google/HERE user — must beat both for Zürich |
| **5. Remediate comments** | [`act-on-review-comments.md`](./act-on-review-comments.md) | When 3/4a/4b comment: fix blocking issues on the PR branch, push, reply |
| **6. Policy** | `AGENTS.md` | Agents must not present a preview as ready until quality + review loops settle |

Markers `<!-- zuri-review:contract -->`, `<!-- zuri-review:maps-power-user -->`, and `<!-- zuri-review:remediation -->` let layer 5 detect bot comments and avoid reply loops.

## Activate (one-time)

1. Ensure GitHub label **`ui`** exists.
2. Merge this PR so workflows land on the integration branch.
3. Require status check **`Quality`** on the product branch (after one successful run).
4. Enable **Bugbot** on the repo in Cursor.
5. Create **three** Cursor Automations (dashboard → Automations → New; no public create API):

| Automation | Prompt file | Triggers | Tools |
| --- | --- | --- | --- |
| UI contract | `ui-pr-review.md` | Label `ui` (+ opened/pushed) | Comment + computer use; **no** create PR |
| Maps power-user | `maps-power-user-review.md` | Label `ui` (+ opened/pushed) | Comment + computer use; **no** create PR |
| Act on reviews | `act-on-review-comments.md` | PR comment / review comment / review submitted | Comment + computer use; push to **existing** branch; **no** new PRs |

Prefer **Team Owned** for all three.

## Local / agent fallback

```bash
npm run quality
```

Never tell a human a preview is ready until that passes. For UI PRs, prefer waiting until contract + power-user comments (and any remediation push) have settled.
