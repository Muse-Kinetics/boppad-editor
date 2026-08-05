// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//
// Hardware-independent verification of the chunked firmware layer.
//
// The end-to-end flash can only be validated on a physical BopPad, but the
// most dangerous failure class — mis-framing or corrupting the firmware image
// before it ever reaches the wire — is fully testable here against the real
// shipping .syx. Run with: npm test  (node --test)
//

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  splitSysexMessages,
  validateFirmwarePackets,
  sendChunkedFirmware,
  IDENTITY_REQUEST
} from '../src/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const firmwareDir = join(here, '..', '..', '..', 'firmware')
const firmwareFile = join(firmwareDir, 'BopPad Firmware v3.0.4_cs128.syx')

const firmwareBytes = new Uint8Array(readFileSync(firmwareFile))

test('splits the real firmware into byte-preserving F0..F7 packets', () => {
  const { packets, ignoredBytes } = splitSysexMessages(firmwareBytes)

  assert.equal(ignoredBytes, 0, 'no bytes should fall outside a SysEx packet')
  assert.ok(packets.length > 100, 'expected many chunks in the chunked payload')

  // Every packet is a complete, individually-framed SysEx message.
  for(const packet of packets) {
    assert.equal(packet[0], 0xf0)
    assert.equal(packet[packet.length - 1], 0xf7)
  }

  // Concatenating the packets reproduces the original file exactly (there are
  // zero inter-packet gap bytes in this payload), proving nothing is dropped,
  // duplicated, or reordered.
  const rejoined = []
  for(const packet of packets) {
    rejoined.push(...packet)
  }
  assert.deepEqual(new Uint8Array(rejoined), firmwareBytes)
})

test('validates the real firmware as KMI/BopPad packets', () => {
  const { packets } = splitSysexMessages(firmwareBytes)
  const { stats } = validateFirmwarePackets(packets)

  assert.equal(stats.count, packets.length)
  assert.equal(stats.totalBytes, firmwareBytes.length)
  assert.ok(stats.minLength >= 2)
})

test('splitSysexMessages rejects malformed input', () => {
  assert.throws(() => splitSysexMessages(new Uint8Array([0xf0, 0x01, 0x02])), /unterminated/)
  assert.throws(() => splitSysexMessages(new Uint8Array([0xf0, 0xf0, 0xf7])), /nested/)
  assert.throws(() => splitSysexMessages(new Uint8Array([0x01, 0x02])), /no complete/)
})

test('validateFirmwarePackets rejects a non-KMI payload', () => {
  // A well-framed but wrong-manufacturer packet must be caught before flashing.
  const bogus = [new Uint8Array([0xf0, 0x7d, 0x00, 0xf7])]
  assert.throws(() => validateFirmwarePackets(bogus), /unexpected header|KMI/)
})

test('sender sends every chunk in order with the identity handshake', async () => {
  const { packets } = splitSysexMessages(firmwareBytes)
  const sent = []
  let identityRequests = 0

  const identityHandshake = {
    sendRequest: () => { identityRequests++ },
    // Device always answers immediately in this fake.
    waitForReply: async () => true
  }

  const result = await sendChunkedFirmware({
    packets,
    send: packet => sent.push(packet),
    identityHandshake,
    delay: async () => {}, // no real waiting in tests
    options: { postChunkDelayMs: 0 }
  })

  assert.equal(sent.length, packets.length)
  assert.deepEqual(sent[0], packets[0])
  assert.deepEqual(sent[sent.length - 1], packets[packets.length - 1])
  // One identity handshake after every chunk except the last.
  assert.equal(identityRequests, packets.length - 1)
  assert.equal(result.sentChunks, packets.length)
  assert.equal(result.handshakeUsed, true)
})

test('sender aborts loudly when the device stops replying mid-transfer', async () => {
  const { packets } = splitSysexMessages(firmwareBytes)
  const sent = []
  let chunk = 0

  const identityHandshake = {
    sendRequest: () => {},
    // Answer the first two handshakes, then go silent (device wedged/unplugged).
    waitForReply: async () => (chunk++ < 2)
  }

  await assert.rejects(
    sendChunkedFirmware({
      packets,
      send: packet => sent.push(packet),
      identityHandshake,
      delay: async () => {},
      options: { postChunkDelayMs: 0, chunkAckTimeoutMs: 100, ackResendIntervalMs: 100 }
    }),
    /No identity reply after chunk 3/
  )

  // It stopped after the chunk whose handshake failed — did not blast the rest.
  assert.equal(sent.length, 3)
})

test('paced-only fallback sends everything when no handshake is available', async () => {
  const { packets } = splitSysexMessages(firmwareBytes)
  const sent = []

  const result = await sendChunkedFirmware({
    packets,
    send: packet => sent.push(packet),
    identityHandshake: null,
    delay: async () => {}
  })

  assert.equal(sent.length, packets.length)
  assert.equal(result.handshakeUsed, false)
})

test('sender can be cancelled via an AbortSignal', async () => {
  const { packets } = splitSysexMessages(firmwareBytes)
  const sent = []
  const controller = new AbortController()

  const identityHandshake = {
    sendRequest: () => {},
    waitForReply: async () => {
      if(sent.length >= 3) controller.abort()
      return true
    }
  }

  await assert.rejects(
    sendChunkedFirmware({
      packets,
      send: packet => sent.push(packet),
      identityHandshake,
      delay: async () => {},
      signal: controller.signal,
      options: { postChunkDelayMs: 0 }
    }),
    /cancelled/
  )
})

test('IDENTITY_REQUEST matches the Universal Device Inquiry', () => {
  assert.deepEqual(IDENTITY_REQUEST, [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7])
})
