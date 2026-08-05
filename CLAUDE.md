# CLAUDE.md

This file is a wrapper, not a source of truth. `.buddy-project/` is the authoritative operational memory for this repository — read it before substantial work, in order:

1. `README.md`
2. `.buddy-project/mission.md`
3. `.buddy-project/guidelines.md`
4. `.buddy-project/decisions.md`
5. `.buddy-project/current-task.md`
6. `.buddy-project/blockers.md`
7. `.buddy-project/commands.md`

## Working in this repository

- Treat `.buddy-project/` and `README.md` as authoritative over chat history — repository state wins if they conflict with what a prior conversation assumed.
- When project truth changes (a decision, a blocker resolved or discovered, the current task shifting), update `.buddy-project/current-task.md`, `.buddy-project/blockers.md`, and `.buddy-project/decisions.md` before stopping. Keep entries concise — durable facts and rationale, not session transcripts.
- **Do not commit, `git init`, or push without explicit approval from the owner** (Eric Bateman, eric@musekinetics.com). This repo is not yet under git; the eventual squash into private `Muse-Kinetics/boppad-editor` is itself an approval-gated action.
- This is a **migration in progress** (Phases 1–5 code-complete). The chunked firmware flash is unit-tested but **not yet hardware-validated** — never describe it as shipping. See `.buddy-project/blockers.md`.
- Use **Node 24** (the machine default is v13 and will fail) and keep `electron-builder` on `^23.0.3`. See `.buddy-project/commands.md`.
- `.github/copilot-instructions.md` is the equivalent adapter for Copilot (create it from this same wrapper if/when Copilot is used here). Neither adapter should duplicate content that belongs in `.buddy-project/` — update the source there first.
