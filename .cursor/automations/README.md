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
        │ label `ui` / UI   │     │ label `ui` / UI paths    │
        └─────────┬─────────┘     └────────────┬─────────────┘
                  └────────────┬───────────────┘
                               ▼
                     Human reviews look / product
```

## Layers

| Layer | Where | Job |
| --- | --- | --- |
| **1. Path label** | `.github/workflows/label-ui-prs.yml` + `labeler.yml` | Stamp `ui` when user-facing files change |
| **2. Quality CI** | `.github/workflows/quality.yml` | Required check: `npm run quality` (types, unit acceptance, build, Playwright mobile) |
| **3. Code review bot** | Cursor Bugbot (dashboard) | Logic / security / regressions in the diff |
| **4a. UI contract review** | [`ui-pr-review.md`](./ui-pr-review.md) | Mobile map **acceptance** checklist + screenshots |
| **4b. Maps power-user review** | [`maps-power-user-review.md`](./maps-power-user-review.md) | Critical Google/HERE user — must feel **better than both** for Zürich |
| **5. Policy** | `AGENTS.md` | Agents must not present a preview as ready until quality (and UI bots when applicable) are addressed |

Layers **4a** and **4b** are complementary: 4a = “does the city contract hold?”; 4b = “would a Google/HERE power-user switch?”

## Activate (one-time)

1. Ensure GitHub label **`ui`** exists (create once in the repo if missing).
2. Merge this PR so workflows land on the integration branch.
3. In repo **Settings → Branches**, require status check **`Quality`** on the product branch (once the workflow has run once).
4. Enable **Bugbot** on the repo in Cursor.
5. Create **two** Cursor Automations (dashboard → Automations → New; no public create API):
   - Paste [`ui-pr-review.md`](./ui-pr-review.md) — contract / acceptance
   - Paste [`maps-power-user-review.md`](./maps-power-user-review.md) — competitive UX  
   Both: comment + computer use **on**; create PRs **off**; prefer Team Owned.  
   Prefer trigger on label **`ui`** (opened/pushed as backup).

## Local / agent fallback

```bash
npm run quality
```

Never tell a human a preview is ready until that passes. For UI PRs, prefer waiting for **both** UI automation comments (or run the same checklists yourself).
