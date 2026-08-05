// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//
// sysexChunking.js
//
// Splits a Hex_to_SysEx-chunked (or legacy single-message) .syx byte buffer
// into complete, individually-framed SysEx packets (F0 ... F7). This is the
// pure, hardware-independent half of the chunked firmware transfer and is
// unit-tested against the real BopPad firmware payload — the packets it emits
// are exactly what gets sent on the wire, so a framing bug here would corrupt
// a firmware image.
//
// Ported from the K-Board editor's proven implementation
// (k-board-js-api splitSysexMessages) so both editors frame chunks identically.
//

import { SYSEX_START, SYSEX_END, MANUFACTURER_ID, PRODUCT_ID } from './deviceConstants.js'

// Walk the buffer and slice out every complete F0..F7 packet in order.
// Throws on any malformation (nested start, unterminated tail, no packets)
// rather than silently sending a partial/broken image.
export function splitSysexMessages(message) {
  const packets = []
  let packetStart = -1
  let ignoredBytes = 0

  for(let index = 0; index < message.length; index++) {
    const value = message[index]

    if(packetStart === -1) {
      if(value === SYSEX_START) {
        packetStart = index
      } else {
        ignoredBytes++
      }
      continue
    }

    if(value === SYSEX_START) {
      throw new Error(`Malformed firmware file: nested SysEx start at byte ${index}`)
    }

    if(value === SYSEX_END) {
      packets.push(message.slice(packetStart, index + 1))
      packetStart = -1
    }
  }

  if(packetStart !== -1) {
    throw new Error('Malformed firmware file: unterminated SysEx packet')
  }

  if(!packets.length) {
    throw new Error('Malformed firmware file: no complete SysEx packets found')
  }

  return { packets, ignoredBytes }
}

// Sanity-check a set of parsed packets before shipping them to the bootloader.
// Confirms each packet is F0-framed, F7-terminated, and (when strict) carries
// the KMI manufacturer id + BopPad product id header. Returns { packets, stats }
// so callers can log/verify; throws with a specific reason on the first bad
// packet so a wrong or corrupted file fails loudly up front instead of
// mid-flash.
export function validateFirmwarePackets(packets, options = {}) {
  const {
    manufacturerId = MANUFACTURER_ID,
    productId = PRODUCT_ID,
    requireKmiHeader = true
  } = options

  if(!Array.isArray(packets) || packets.length === 0) {
    throw new Error('No firmware packets to validate')
  }

  let minLength = Infinity
  let maxLength = 0
  let totalBytes = 0

  for(let index = 0; index < packets.length; index++) {
    const packet = packets[index]
    const length = packet.length

    if(length < 2 || packet[0] !== SYSEX_START || packet[length - 1] !== SYSEX_END) {
      throw new Error(`Firmware packet ${index + 1}/${packets.length} is not a complete F0..F7 SysEx message`)
    }

    if(requireKmiHeader) {
      const headerOk =
        packet[1] === manufacturerId[0] &&
        packet[2] === manufacturerId[1] &&
        packet[3] === manufacturerId[2] &&
        packet[4] === manufacturerId[3] &&
        packet[5] === productId

      if(!headerOk) {
        throw new Error(
          `Firmware packet ${index + 1}/${packets.length} has an unexpected header ` +
          `(not a KMI/BopPad SysEx message) — wrong or corrupted firmware file`
        )
      }
    }

    minLength = Math.min(minLength, length)
    maxLength = Math.max(maxLength, length)
    totalBytes += length
  }

  return {
    packets,
    stats: {
      count: packets.length,
      minLength,
      maxLength,
      totalBytes
    }
  }
}
