# Agent notes — Züri City

## Pre-human MR review (automation-only)

Do **not** ask a human to review look until automated layers have run.
Source of truth: [`.cursor/automations/README.md`](.cursor/automations/README.md).

| Layer | Mechanism |
| --- | --- |
| Path signal (optional) | `.github/workflows/label-ui-prs.yml` may stamp `ui` — **not required** |
| Quality CI | `.github/workflows/quality.yml` → `npm run quality` |
| Code bot | Cursor Bugbot |
| UI contract | `.cursor/automations/ui-pr-review.md` — triggers on PR open/push; **detects UI from the diff** |
| Maps power-user | `.cursor/automations/maps-power-user-review.md` — same; beat Google/HERE |
| Remediate | `.cursor/automations/act-on-review-comments.md` — on bot comments, fix blocking → push → reply |

Activate the three Cursor Automations once after merge (dashboard; no create API). Prefer Team Owned. Triggers for review bots: **PR opened + pushed** — no label/tag.

Before presenting a preview as ready:

```bash
npm run quality
```
