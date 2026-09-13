# Pre-human merge-request review

Merge this PR as **automation-only** infrastructure. No product/UI code changes.
Activate the Cursor Automations in the dashboard once (there is no create-automation API).
**Re-paste prompts** from these files whenever they change — the dashboard does not sync from git.

Review bots **skip merged/closed PRs** (no comment). Remediation may still triage a review left on a merged PR by fixing the **open product head** when the finding still applies.

```text
                    PR opened / pushed  (open PRs only — no label required)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌──────────────────┐
│ Optional:     │   │ Quality CI    │   │ Bugbot (Cursor)  │
│ stamp `ui`    │   │ adaptive gate │   │ code defects     │
│ from paths    │   │               │   │                  │
└───────┬───────┘   └───────┬───────┘   └────────┬─────────┘
        │                   │                    │
        └─────────┬─────────┴────────────────────┘
                  ▼
     Automations inspect the PR diff themselves
     If no UI-facing paths → short skip comment → stop
                  ▼
        ┌───────────────────┐     ┌──────────────────────────┐
        │ UI contract review│     │ Maps power-user review   │
        │ (acceptance bar)  │     │ (beat Google / HERE)     │
        └─────────┬─────────┘     └────────────┬─────────────┘
                  └────────────┬───────────────┘
                               ▼
                  ┌────────────────────────────┐
                  │ Act on review comments     │
                  │ fix blocking → push → reply│
                  └────────────┬───────────────┘
                               ▼
                     Human reviews look / product
```

## What this PR adds

| Path | Purpose |
| --- | --- |
| [`ui-pr-review.md`](./ui-pr-review.md) | Cursor Automation — mobile map contract |
| [`maps-power-user-review.md`](./maps-power-user-review.md) | Cursor Automation — beat Google/HERE |
| [`act-on-review-comments.md`](./act-on-review-comments.md) | Cursor Automation — remediate bot findings |
| `.github/workflows/quality.yml` | CI gate (uses `npm run quality` if present, else check+unit+build+playwright) |
| `.github/workflows/label-ui-prs.yml` + `labeler.yml` | Optional `ui` label (convenience only — **not required**) |
| `.github/PULL_REQUEST_TEMPLATE.md` | Pre-human checklist |
| `AGENTS.md` (section) | Policy for coding agents |

## Activate (one-time, after merge)

1. Optional: create GitHub label **`ui`** (labeler is cosmetic; bots detect paths from the diff).
2. Merge this PR into your integration/`main` branch.
3. After Quality has run once, require status check **`Quality`** on the protected branch.
4. Enable **Bugbot** on the repo.
5. Create **three** Cursor Automations (`cursor.com/automations/new`) — paste each prompt file:

| Automation | Prompt | Triggers | Tools |
| --- | --- | --- | --- |
| UI contract | `ui-pr-review.md` | PR **opened** + **pushed** | Comment + computer use; create PR **off** |
| Maps power-user | `maps-power-user-review.md` | PR **opened** + **pushed** | Comment + computer use; create PR **off** |
| Act on reviews | `act-on-review-comments.md` | PR **comment** / **review comment** / **review submitted** | Comment + computer use; push to **existing** branch only |

Prefer **Team Owned**. Do **not** require a label trigger — each review bot gates on changed paths inside the prompt.

## Path detection (no tag)

UI-facing globs used by bots and the optional labeler:

- `src/**/*.svelte`, `src/**/*.css`, `src/app.html`, `src/app.css`, `src/routes/**`
- `src/lib/shell/**`, `src/lib/city/**`, `src/lib/map/**`, `src/lib/intel/**`, `src/lib/places/**`, `src/lib/parking/**`
- `static/**`, favicons, manifests, SEO/shell that affects first paint
- `tests/**`, `playwright.config.*`
- `.cursor/automations/**` (only when changing review behaviour)

Markers: `<!-- zuri-review:contract -->`, `<!-- zuri-review:maps-power-user -->`, `<!-- zuri-review:remediation -->`.
