<!-- buddy:visibility=public -->
# Guidelines

> **COMMITS AND PUSHES REQUIRE THE OWNER'S EXPLICIT PRIOR APPROVAL — EVERY TIME.**
> Do not run `git commit`, `git push`, `git init`-then-publish, `git reset`/`rebase`,
> or any other history-changing / publishing git operation until the repository
> owner has approved that specific action. Preparing, editing, and
> staging changes is fine; turning them into commits or publishing them is not, absent
> a clear go-ahead. A broad "do the work" instruction is NOT commit approval. The repo
> **is now live**: `main` is a single reconciled commit (`e5ab1d6` as of 2026-08-05),
> pushed to `Muse-Kinetics/boppad-editor`, tagged `v1.2.0`, with a public GitHub
> Release. Approval is still required for every future commit/push/force-push/tag
> move, not just the initial squash. When in doubt, stop and ask.
>
> **In practice, in Claude Code: even with explicit owner approval given in-session,
> the auto-mode safety classifier blocks `git commit`, branch-ref moves (`git branch
> -f`), and pushes outright** — there is no way for the agent to talk its way past
> it. When a git-history-mutating step is actually approved, stage everything and
> hand the exact command(s) to the owner to run themselves via `!<command>` in the
> chat. This happened for the entire 2026-08-05 re-squash + force-push + tag move —
> expect to do the same next time.

- Keep canonical project state in `.buddy-project/`.
- Treat `README.md` plus `.buddy-project/` as authoritative over chat history.
- Update `.buddy-project/current-task.md`, `.buddy-project/decisions.md`, and `.buddy-project/blockers.md` when project truth changes, before stopping.
- Document blockers and unresolved decisions before attempting broad remediation work.
- Keep commands honest. If a workflow is unverified on the current machine (or, for firmware, unverified on hardware), say so explicitly.
- **Firmware is device-critical.** The v1.2.0 chunked flash path IS hardware-validated on a physical BopPad (macOS + Windows). For any *new* firmware-path change: don't describe it as "shipped/working" until it's actually been run on a physical device — describe it as "code-complete, pending hardware test" until then. Mirror the hardware-validated `mk_firmware_tester` protocol rather than inventing device behavior.
- **Web deploys are also production-affecting and need the same "confirm before touching" treatment as git pushes**, even though they aren't gated by the auto-mode classifier the way git operations are — a `deploy:web` overwrites the live site immediately with no undo. Dry-run first, real deploy only on explicit go-ahead.
- Never let the Apple `.env` secret enter the public squash.
- Treat `CLAUDE.md` and `.github/copilot-instructions.md` as adapters only — neither is a source of truth.
- Do not commit or push without explicit prior approval from the owner, every time (see the rule at the top of this file).
