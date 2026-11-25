<!-- buddy:visibility=public -->
# Corrections

What we believed, what turned out to be true, how it was caught, and what it cost.

There is a file for what we decided (decisions.md) and one for what is blocked
(blockers.md). This is the file for what we got wrong and had to retract.

A fresh agent reading this project is competent but inexperienced. Without a
record, it re-makes the claims that were already retracted — because nothing
tells it they were.

Each entry should record:

- **Believed:** the claim as it was acted on.
- **Actually:** what is true.
- **How it was caught:** who or what surfaced it. This field earns its place —
  if the answer is usually "someone else checked," that is a fact about how this
  project finds its errors.
- **Consequence:** what it cost, or would have cost.

## 1.2.0 testing missed Mac clicks, the Mac updater, and a renderer crash (caught 2026-11-24)

- **Believed:** 1.2.0 was validated on macOS and Windows.
- **Actually:** testing covered firmware flashing, builds and signing. On Mac, plain-text controls didn't respond to clicks and Check for Updates failed (no `app-update.yml`). On every platform the renderer could segfault in NexusUI's audio clock, a bug that predates the migration.
- **How it was caught:** user reports, including GitHub #1 and #2, about 3 months after release. The owner reproduced the crash.
- **Consequence:** the editor could become unusable, and 1.2.0 Mac users can't auto-update to the fix. Next time, click through every control on each OS and run Check for Updates from the installed app before release.

## Stopping NexusUI's clock did not fix the blank-screen crash (caught 2026-11-25)

- **Believed:** stopping NexusUI's audio clock and closing its AudioContext right after import fixed the crash. An automated repro of the field-click trigger went from crashing every run to 3/3 clean.
- **Actually:** the node was still created at import and could still fire during a reload, and a second trigger (sending to a still-opening MIDI output) hit the same Chromium fault on connect. The repro only exercised one trigger.
- **How it was caught:** the owner plugged in a BopPad and the editor went blank; a reload test then segfaulted in `ScriptProcessorNode::DispatchEvent` and later in `MIDIOutput::DidOpen`.
- **Consequence:** about half a day of a fix reported as working when it wasn't. Lesson: for a crash in Chromium internals, test every way in (reload, hot-plug, startup with a device attached), not just the reported steps.
