# Contributing to the BopPad Editor

Thanks for your interest in improving the BopPad Editor! This document covers how
to build the project, the conventions we follow, and how to submit changes.

## License of contributions

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. By
submitting a contribution, you agree that your contribution is licensed under the
MPL-2.0. New source files should carry the standard header (see
[Source file headers](#source-file-headers)).

Note that the MPL-2.0 covers the **source code only**. It does not grant any rights
to KMI Music, Inc. trademarks or brand assets — see [Trademarks](#trademarks).

## Prerequisites

- **Node.js 24** (the repo pins this in `.nvmrc`)
- **npm 10+** (ships with Node 24)
- macOS or Windows for desktop builds; any modern OS for the web app

If you use [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm use        # reads .nvmrc → Node 24
```

## Getting started

```bash
git clone <your-fork-url> boppad-editor
cd boppad-editor
nvm use
npm install
```

## Repository layout

| Path | What it is |
|------|------------|
| `apps/web` | Browser editor (jQuery + webpack) |
| `apps/desktop` | Electron desktop editor |
| `packages/boppad-js-api` | Shared Web MIDI / SysEx transport and chunked firmware-update logic |
| `firmware/` | Canonical checked-in firmware payloads |

`apps/desktop` builds and consumes the `apps/web` output at build time (via
`scripts/sync-renderer.js`) rather than shipping a hand-copied bundle — there is
one editor implementation, not two.

## Build & run

Run from the repository root:

```bash
# Web editor
npm run start:web     # dev server (HTTPS on :9000 — Web MIDI needs a secure context)
npm run build:web     # production build → apps/web/build

# Desktop editor
npm run start:desktop # sync-renderer, then launch Electron
npm run build:desktop # production build (builds the web app, syncs into apps/desktop/renderer)
```

## Tests

The shared device/firmware layer has unit tests against a real firmware image:

```bash
cd packages/boppad-js-api
npm test          # node --test
```

## Source file headers

Authored source files (`.js`, `.scss`) carry a short MPL notice. Add it to any
new file:

```js
// SPDX-License-Identifier: MPL-2.0
// Copyright (c) <year> KMI Music, Inc.
```

For SCSS use the block-comment form:

```scss
// SPDX-License-Identifier: MPL-2.0
// Copyright (c) <year> KMI Music, Inc.
```

## Coding conventions

- Match the style of the surrounding code.
- Keep firmware/device transport logic in `packages/boppad-js-api` rather than
  duplicating it in an app — the chunked-transfer state machine (packet split,
  between-chunk identity handshake, retry/timeout) is shared by design.
- Line endings are normalized to **LF** via `.gitattributes`.

## Submitting changes

1. Fork and create a topic branch.
2. Make your change with a clear, focused commit history.
3. Ensure the affected app still builds (`npm run build:web` and/or
   `npm run build:desktop`), and that `packages/boppad-js-api`'s tests still pass.
4. Open a pull request describing the change and how you verified it.

## Trademarks

"BopPad", "KMI", "KMI Music", and "Muse Kinetics", along with associated logos,
are trademarks of KMI Music, Inc. The open-source license applies to the code and
does **not** grant permission to use these names, logos, or brand assets, whether
for a fork's branding, a derived product, or promotion. Please rename/rebrand
redistributed builds accordingly.
