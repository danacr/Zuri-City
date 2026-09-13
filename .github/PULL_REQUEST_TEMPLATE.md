## Summary

<!-- What changed and why. Link product checklist items if UI. -->

## Pre-human gates

- [ ] **Quality** CI green (`npm run quality` — types, unit acceptance, build, Playwright mobile)
- [ ] If this PR touches UI (`ui` label):
  - [ ] Cursor **UI contract review** comment (acceptance bar)
  - [ ] Cursor **maps power-user** comment (must beat Google Maps / HERE for Zürich)
  - [ ] **Remediation** automation addressed blocking findings (or none filed)
- [ ] Bugbot (or equivalent) code review addressed for blocking findings

Humans should only need to judge **look / implementation** after the above.

## Preview

<!-- Vercel / local preview URL — only after Quality is green -->

## Test plan

- [ ] Mobile ~390×844: solid buildings, parking pills, Orbit ≠ Walk, sprites, traffic on centerlines
- [ ] Desktop smoke: title + map ready
- [ ] <!-- extra cases -->
