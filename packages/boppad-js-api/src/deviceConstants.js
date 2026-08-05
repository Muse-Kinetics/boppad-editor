// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//
// deviceConstants.js
//
// BopPad-specific MIDI/SysEx identifiers and the firmware-transfer timing
// defaults. These are the values baked into the hardware-validated C8051
// bootloader flow (see 00_Firmware/BopPad/mk_firmware_tester —
// sendsysex/inc/chunkedSysExTransfer.h and docs/kmi_fw_update_process.md),
// mirrored here so the editor's chunked send speaks the identical protocol
// the firmware team validates against rather than a second, drifting one.
//

// KMI SysEx manufacturer id (00 01 5F 7A) followed by the BopPad product id
// (0x75 = 117). Every BopPad firmware packet starts F0 00 01 5F 7A 75 ...
export const MANUFACTURER_ID = [0x00, 0x01, 0x5f, 0x7a]
export const PRODUCT_ID = 0x75

// Universal Non-Realtime Device Inquiry (F0 7E 7F 06 01 F7). The BopPad
// bootloader answers this while it is waiting for firmware traffic, so it
// doubles as the between-chunk "are you still there / ready for the next
// chunk" probe. This is byte-identical to the firmware tester's idRequest
// and to the editor manifest's `firmware.requestID`.
export const IDENTITY_REQUEST = [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7]

// SysEx framing bytes.
export const SYSEX_START = 0xf0
export const SYSEX_END = 0xf7

// Firmware-transfer timing defaults. These mirror the reliability fixes the
// firmware tester bakes in (post-chunk settle delay, periodic identity-request
// resend within the per-chunk wait budget) — see chunkedSysExTransfer.h.
export const FIRMWARE_TRANSFER_DEFAULTS = Object.freeze({
  // Pace between chunks when running WITHOUT the identity handshake
  // (paced-only fallback). The handshake path is self-pacing.
  chunkDelayMs: 10,
  // Let the device finish receiving/committing a chunk before demanding a
  // reply — firing the identity request into the tail of a chunk risks it
  // being missed. The firmware tester waits 50 ms here.
  postChunkDelayMs: 50,
  // Total time to wait for an identity reply after a chunk before treating
  // the transfer as failed.
  chunkAckTimeoutMs: 2000,
  // Re-send the identity request this often within the wait budget so a
  // single dropped request/reply (either direction) doesn't abort an
  // otherwise-healthy transfer. The tester resends every 300 ms.
  ackResendIntervalMs: 300
})
