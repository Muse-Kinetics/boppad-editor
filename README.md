# BopPad Editor

The consolidated home for the KMI Music BopPad editor stack: the browser editor
and the Electron desktop editor, plus a shared headless device (Web MIDI/SysEx)
package. Reference architecture: the K-Board editor.

## Layout

- `apps/web` — browser editor (jQuery)
- `apps/desktop` — Electron desktop editor
- `packages/boppad-js-api` — shared Web MIDI / SysEx transport and chunked
  firmware-update logic
- `firmware/` — canonical checked-in firmware payloads (chunked `.syx`)

`apps/desktop` builds and consumes the `apps/web` output at build time — there
is one editor implementation, not a hand-copied bundle duplicated between the
two apps.

## Node target

Use `nvm use` in this directory to select Node 24.

## Firmware updates

Firmware is bundled with the editor (`firmware/`) and updates are **local-first**
— no web connection is required to flash a device. The transfer is chunked, with
a between-chunk identity handshake gating each packet, mirroring the protocol
validated by KMI's hardware firmware-update tooling. Hardware-validated
end-to-end (bootloader entry → chunked flash → reboot → verify) on a physical
BopPad.

## Verified baseline

- Desktop builds and runs on Windows and macOS (Electron 28, Node 24).
- Chunked firmware update flashes a physical device successfully on Windows.
- Windows installer builds as a signed NSIS installer
  (`npm run package-win` from `apps/desktop`).
- macOS builds as a signed, notarized universal binary (Intel + Apple Silicon).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build-from-clone instructions, coding
conventions, and the source-file header requirement.

## License

- Copyright: `(c) 2026 KMI Music, Inc.`
- Author: `Andrej Hronco`
- License: `MPL-2.0` (see `LICENSE` and `NOTICE`)

## Trademarks

"BopPad", "KMI", "KMI Music", and "Muse Kinetics", along with associated logos
and brand assets, are trademarks of KMI Music, Inc. The MPL-2.0 license applies
to the source code only and grants no rights to use these names, logos, or brand
assets. Redistributed or derived builds must be rebranded accordingly.
