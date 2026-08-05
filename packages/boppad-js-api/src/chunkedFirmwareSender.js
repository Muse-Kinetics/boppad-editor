// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//
// chunkedFirmwareSender.js
//
// Sends a chunked BopPad firmware .syx to an already-in-bootloader device as a
// sequence of complete SysEx packets, with an optional between-chunk identity
// handshake so a partial/corrupted transfer aborts loudly instead of silently
// flashing a broken image.
//
// This mirrors the hardware-validated C++ reference the firmware team ships
// (00_Firmware/BopPad/mk_firmware_tester — chunkedSysExTransfer.h
// sendChunkedFileToPort): send each chunk in order, and after every chunk
// except the last, let the device settle briefly then require an identity
// reply before continuing, re-sending the identity request periodically within
// the wait budget. See sendsysex/docs/kmi_fw_update_process.md, "Chunked
// Update Notes".
//
// It is deliberately headless — it takes plain `send`/`delay`/`onProgress`
// callbacks and an optional `identityHandshake` adapter rather than touching
// Web MIDI, the DOM, or jQuery — so it can be unit-tested without hardware and
// reused from any transport.
//

import { splitSysexMessages, validateFirmwarePackets } from './sysexChunking.js'
import { FIRMWARE_TRANSFER_DEFAULTS } from './deviceConstants.js'

const defaultDelay = timeoutMs => new Promise(resolve => setTimeout(resolve, timeoutMs))

// Request an identity reply and wait up to timeoutMs for one, re-sending the
// request every resendIntervalMs so a single dropped request/reply doesn't
// abort an otherwise-healthy transfer. `handshake.waitForReply(sliceMs)` must
// resolve true if a reply arrives within sliceMs, false on that slice's
// timeout. Returns true as soon as any reply is seen, false if the whole
// budget elapses with none.
async function awaitIdentityReply(handshake, timeoutMs, resendIntervalMs) {
  let waited = 0

  while(waited < timeoutMs) {
    const sliceMs = Math.min(resendIntervalMs, timeoutMs - waited)

    handshake.sendRequest()
    const replied = await handshake.waitForReply(sliceMs)
    if(replied) {
      return true
    }

    waited += sliceMs
  }

  return false
}

//
// sendChunkedFirmware(options) -> Promise<{ sentChunks, totalChunks, sentBytes, handshakeUsed }>
//
// Required:
//   firmwareBytes  Uint8Array|number[] — the raw chunked .syx buffer, OR
//   packets        pre-split packet array (skips splitting)
//   send           (packet) => void — writes one SysEx packet to the device
//
// Optional:
//   identityHandshake  { sendRequest(), waitForReply(ms) } — enables the
//                      between-chunk ack. When omitted/null, the transfer falls
//                      back to time-paced chunking (no ack), which still honors
//                      USB flow control far better than one monolithic send.
//   onProgress   (progress) => void — per-chunk progress for UI
//   delay        (ms) => Promise — injectable clock (defaults to setTimeout)
//   validate     boolean (default true) — KMI-header sanity check up front
//   signal       AbortSignal — cancels the transfer between chunks
//   options      timing overrides (see FIRMWARE_TRANSFER_DEFAULTS)
//
export async function sendChunkedFirmware({
  firmwareBytes,
  packets: prebuiltPackets,
  send,
  identityHandshake = null,
  onProgress = () => {},
  delay = defaultDelay,
  validate = true,
  signal = null,
  options = {}
} = {}) {
  if(typeof send !== 'function') {
    throw new Error('sendChunkedFirmware requires a send(packet) function')
  }

  const {
    chunkDelayMs = FIRMWARE_TRANSFER_DEFAULTS.chunkDelayMs,
    postChunkDelayMs = FIRMWARE_TRANSFER_DEFAULTS.postChunkDelayMs,
    chunkAckTimeoutMs = FIRMWARE_TRANSFER_DEFAULTS.chunkAckTimeoutMs,
    ackResendIntervalMs = FIRMWARE_TRANSFER_DEFAULTS.ackResendIntervalMs
  } = options

  const packets = Array.isArray(prebuiltPackets)
    ? prebuiltPackets
    : splitSysexMessages(firmwareBytes).packets

  if(validate) {
    validateFirmwarePackets(packets)
  }

  const totalChunks = packets.length
  const totalBytes = packets.reduce((sum, packet) => sum + packet.length, 0)
  const handshakeUsed = !!identityHandshake

  const throwIfAborted = () => {
    if(signal && signal.aborted) {
      throw new Error('Firmware transfer cancelled')
    }
  }

  let sentBytes = 0

  for(let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    throwIfAborted()

    const chunk = packets[chunkIndex]
    send(chunk)
    sentBytes += chunk.length

    const isLastChunk = chunkIndex + 1 === totalChunks

    onProgress({
      sentChunks: chunkIndex + 1,
      totalChunks,
      sentBytes,
      totalBytes,
      chunkSize: chunk.length,
      percent: totalChunks === 0 ? 0 : Math.round(((chunkIndex + 1) / totalChunks) * 100),
      complete: isLastChunk,
      handshakeUsed
    })

    if(isLastChunk) {
      break
    }

    if(identityHandshake) {
      // Give the device a moment to finish receiving/committing this chunk
      // before demanding a reply, then require an identity reply before the
      // next chunk goes out. No reply within budget => abort loudly.
      if(postChunkDelayMs > 0) {
        await delay(postChunkDelayMs)
      }
      throwIfAborted()

      const replied = await awaitIdentityReply(identityHandshake, chunkAckTimeoutMs, ackResendIntervalMs)
      if(!replied) {
        throw new Error(
          `No identity reply after chunk ${chunkIndex + 1}/${totalChunks} ` +
          `within ${chunkAckTimeoutMs}ms — aborting firmware transfer.`
        )
      }
    } else if(chunkDelayMs > 0) {
      // Paced-only fallback: no ack channel, so throttle between chunks to
      // respect USB flow control instead of bursting.
      await delay(chunkDelayMs)
    }
  }

  return { sentChunks: totalChunks, totalChunks, sentBytes, handshakeUsed }
}
