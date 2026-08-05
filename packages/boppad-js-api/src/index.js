// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//
// boppad-js-api — headless device layer for the KMI Music BopPad.
//
// Today this package owns the firmware-transfer half of the device layer: the
// SysEx chunking codec and the chunked, hardware-protocol-faithful firmware
// sender. The BopPad editor's MIDI I/O still lives in the app for now; the
// intent is to lift more of it in here over time so it can be exercised
// without a browser or a device.
//

export {
  MANUFACTURER_ID,
  PRODUCT_ID,
  IDENTITY_REQUEST,
  SYSEX_START,
  SYSEX_END,
  FIRMWARE_TRANSFER_DEFAULTS
} from './deviceConstants.js'

export { splitSysexMessages, validateFirmwarePackets } from './sysexChunking.js'

export { sendChunkedFirmware } from './chunkedFirmwareSender.js'
