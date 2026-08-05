// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//
// firmwareUpdater.js
//
// Local-first, chunked BopPad firmware update.
//
// LOCAL-FIRST: the firmware payload and manifest are the copies bundled with
// the editor (webpack copies /firmware -> build/firmware). Nothing here needs a
// web connection to function; update *checks* against GitHub Releases are a
// separate, non-blocking concern. Loads go through XHR (not fetch) because the
// desktop app runs from file://, which the Fetch API cannot read.
//
// CHUNKED: the firmware .syx is split into its individual SysEx packets and
// sent one at a time with a between-chunk identity handshake, mirroring the
// hardware-validated firmware-tester protocol (see packages/boppad-js-api and
// 00_Firmware/BopPad/mk_firmware_tester). This replaces the previous single
// monolithic output.send() of the whole image.
//

import promiseEvent from './promiseEvent'
import { isConnected } from './midi'
import webmidi from './webmidi'
import {
  sendChunkedFirmware,
  splitSysexMessages,
  validateFirmwarePackets,
  IDENTITY_REQUEST
} from 'boppad-js-api'

let firmwareState = {updating: false}, MIDI;

const FIRMWARE_MANIFEST = 'firmware/currentVersion.json'

// XHR loader that succeeds for both http(s) (status 200) and file:// (status
// 0), so the bundled firmware loads with no web connection in the desktop app.
function loadLocal(url, { json = false } = {}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		// Cache-bust so a stale bundled file can't be served from disk cache;
		// a query string is harmless (ignored) on file://.
		const bust = (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now()
		xhr.open('GET', url + bust, true)
		// 'arraybuffer' for .syx; plain text + manual JSON.parse for the manifest
		// (responseType 'json' can come back null over file:// on some builds).
		xhr.responseType = json ? 'text' : 'arraybuffer'
		xhr.onload = () => {
			const ok = xhr.status === 200 || xhr.status === 0 // file:// reports 0
			if(!ok) return reject(new Error(`Failed to load ${url} (HTTP ${xhr.status})`))
			if(json) {
				try {
					return resolve(JSON.parse(xhr.responseText))
				} catch(e) {
					return reject(new Error(`Invalid JSON in ${url}: ${e.message}`))
				}
			}
			return xhr.response
				? resolve(new Uint8Array(xhr.response))
				: reject(new Error(`Empty firmware file: ${url}`))
		}
		xhr.onerror = () => reject(new Error(`Network error loading ${url}`))
		xhr.send()
	})
}

export default function updater(midi) {
	MIDI = webmidi(midi)

	return function(deviceName){
		let input = MIDI.getInput(deviceName),
				output = MIDI.getOutput(deviceName),
				device = {
					name: deviceName.toLowerCase(),
					data: {},
					id: [],
					sysex: { 'bootloader': [], 'firmware': [] },
					firmwarePackets: []
				},
				bootloaderState = false,
				bootloaderMode = false

		const alreadyInBootloader = () => document.body.dataset.connected === 'bootloader'

		firmwareState.updating = true
		$(document).trigger('resetpresetcounter')

		// check if device is connected
		if(!isConnected()) {
			console.log(`BopPad is ${alreadyInBootloader() ? 'in bootloader mode' : 'not connected'}`)

			if(!alreadyInBootloader()){
				// if not connected and not in bootloader mode, return
				firmwareState.updating = false
				return
			}
			bootloaderMode = true
		}

		// LOCAL-FIRST: always load the bundled manifest + firmware.
		loadLocal(FIRMWARE_MANIFEST, { json: true })
			.then( data => device.data = data )
			// read the running firmware version (skip if already in bootloader)
			.then( () => {
				if(!alreadyInBootloader()){
					console.log('>> -> send: requestID')
					output.send(device.data.firmware.requestID)
					return promiseEvent(input, 'midimessage')
				}
				return null
			})
			.then( message => {
				if(!alreadyInBootloader() && message && message.data){
					device.id = message.data
					formatVersion(device.id, device.data.firmware.versionBytes)
				}
				return true
			})
			// load the bundled bootloader-enter command + firmware image
			.then( () => {
				console.log('>> <- load bundled firmware (bootloader + image)')
				return Promise.all([
					loadLocal(device.data.firmware.bootloader.enterBootloaderCommandUrl),
					loadLocal(device.data.firmware.url)
				])
			})
			.then( sysex => {
				device.sysex.bootloader = sysex[0]
				device.sysex.firmware = sysex[1]

				// Pre-flight: split + validate the image BEFORE touching the device,
				// so a corrupt/wrong .syx fails loudly instead of mid-flash.
				const { packets } = splitSysexMessages(device.sysex.firmware)
				validateFirmwarePackets(packets)
				device.firmwarePackets = packets
				console.log(`>> * firmware: ${packets.length} chunk(s) parsed from bundled image`)
				return device.sysex
			})
			// enter the bootloader (skip if already there)
			.then( sysex => {
				if(!alreadyInBootloader()){
					console.log('>> -> send: enter bootloader')
					output.send(sysex.bootloader)
					return pollPort(deviceName + ' Bootloader', 'output', true)
				}
				return true
			})
			// send the firmware image, chunked, to the bootloader
			.then( () => {
				bootloaderState = true
				updateStatus(bootloaderState)

				const bootOutput = MIDI.getOutput(deviceName + ' Bootloader')
				const bootInput = MIDI.getInput(deviceName + ' Bootloader', false)

				// Between-chunk identity handshake — the reliability strategy the
				// KMI bootloader supports (see boppad-js-api). BopPad uses a SEPARATE
				// bootloader port (unlike K-Board, which stays on one port), so the
				// freshly-enumerated bootloader input must be explicitly opened and
				// listened on with a persistent onmidimessage — a just-appeared Web
				// MIDI input often won't deliver until opened. Degrade to paced-only
				// chunking if there's no bootloader input port at all.
				let identityHandshake = null
				if(bootInput && bootOutput) {
					// Explicitly open both freshly-appeared bootloader ports.
					try { if(bootOutput.open) bootOutput.open() } catch(e) { console.warn('>> firmware: bootOutput.open failed', e) }
					try { if(bootInput.open) bootInput.open() } catch(e) { console.warn('>> firmware: bootInput.open failed', e) }

					let pendingResolve = null
					// Persistent property-style handler (no per-wait attach/detach race).
					bootInput.onmidimessage = e => {
						const d = e.data
						console.log('>> firmware: bootloader input msg', d ? d.length : 0, (d && d.length) ? '0x' + d[0].toString(16) : '')
						if(d && d[0] === 0xF0 && pendingResolve) {
							const resolve = pendingResolve; pendingResolve = null; resolve(true)
						}
					}

					identityHandshake = {
						sendRequest: () => {
							console.log('>> firmware: -> identity request to bootloader')
							bootOutput.send(IDENTITY_REQUEST)
						},
						waitForReply: (ms) => new Promise(resolve => {
							pendingResolve = resolve
							window.setTimeout(() => {
								if(pendingResolve === resolve) { pendingResolve = null; resolve(false) }
							}, ms)
						})
					}
				} else {
					console.warn('>> firmware: no bootloader input port — sending with paced chunking (no between-chunk ack)')
				}

				console.log('>> -> send: firmware (chunked)', identityHandshake ? 'with handshake' : 'paced-only')
				return sendChunkedFirmware({
					packets: device.firmwarePackets,
					send: packet => bootOutput.send(packet),
					identityHandshake,
					onProgress: updateProgress,
					validate: false, // already validated pre-flight
					options: { chunkAckTimeoutMs: 5000 } // match K-Board's proven timeout
				}).then(() => Promise.all([
					// Wait for BOTH ports — input and output re-enumerate independently
					// after the reboot, and on some platforms output lags input by a
					// beat. Verifying on input alone raced getOutput() into undefined.
					pollPort(deviceName, 'input', true),
					pollPort(deviceName, 'output', true)
				]))
			})
			// verify the device rebooted out of the bootloader
			.then( () => {
				console.log('>> * device: requestID (verify)')
				MIDI.getOutput(deviceName).send(device.data.firmware.requestID)
				return promiseEvent(MIDI.getInput(deviceName), 'midimessage')
			})
			.then( message => {
				const modeByte = device.data.firmware.bootloader.modeByte
				bootloaderState = !!message.data[modeByte]

				if(!bootloaderState){
					updateStatus(bootloaderState)
					firmwareState.updating = false
					firmwareDialogComplete()

					console.log('>> !! update complete !!')

					$(document).trigger('firmwareupdatecomplete', [globalThis.BOPPAD_EDITOR_VERSION, globalThis.BOPPAD_EDITOR_VERSION, true])
					if(bootloaderMode) $(document).trigger('postbootloadermodesetup')
					if(globalThis.BOPPAD_UPGRADING) {
						globalThis.BOPPAD_UPGRADING = false;
						// reload editor
						window.location.reload();
					}
				} else {
					console.warn('firmware update did not complete — device still in bootloader')
				}
			})
			.catch( err => {
				firmwareState.updating = false
				console.error('>> firmware update failed:', err)
				let status = $('.updating-status')
				status.text('firmware update failed')
				window.setTimeout(() => status.text(''), 5000)
				firmwareDialogError(err && err.message)
				$(document).trigger('firmwareupdatefailed', [err && err.message])
			})
	}
}

function updateStatus(bootloader = false){
	console.log('>> * device: bootloader mode:', bootloader)
	let c = document.querySelector('.container'),
			status = $('.updating-status')
	if(bootloader){
		c.classList.add('bootloader')
		$('.status-bar').addClass('firmware')
		status.text('updating firmware...')
		showFirmwareDialog()
	} else {
		c.classList.remove('bootloader')
		$('.status-bar').removeClass('firmware')
		status.text('firmware updated!')
		var fw = document.querySelector('.firmware button').disabled = false
		window.setTimeout(() => status.text(''), 3000)
	}
}

// --- Firmware-update dialog: greyed-out overlay + progress popup, mirroring
// the K-Board editor's device-sync firmware UI. ---
let fwDialogEl = null

function firmwareProgressLabel(progress){
	if(!progress) return 'Preparing firmware transfer…'
	if(progress.error) return progress.error
	if(progress.totalChunks > 0){
		return progress.percent >= 100
			? 'Waiting for device restart…'
			: `Sending chunk ${progress.sentChunks} of ${progress.totalChunks}`
	}
	return 'Preparing firmware transfer…'
}

function showFirmwareDialog(){
	if(fwDialogEl) return
	fwDialogEl = document.createElement('div')
	fwDialogEl.className = 'firmware-update-overlay'
	fwDialogEl.innerHTML =
		'<div class="firmware-update-message">' +
			'<div class="firmware-update-title">Firmware Updating…</div>' +
			'<div class="firmware-update-progress-label">Preparing firmware transfer…</div>' +
			'<div class="firmware-update-progress"><div class="firmware-update-progress-bar"></div></div>' +
			'<div class="firmware-update-progress-meta">0 / 0 bytes</div>' +
		'</div>'
	document.body.appendChild(fwDialogEl)
}

// Reflect chunked-send progress in the overlay dialog.
function updateProgress(progress){
	showFirmwareDialog()
	const percent = (progress && typeof progress.percent === 'number') ? progress.percent : 0
	fwDialogEl.querySelector('.firmware-update-progress-label').textContent = firmwareProgressLabel(progress)
	fwDialogEl.querySelector('.firmware-update-progress-bar').style.width = percent + '%'
	fwDialogEl.querySelector('.firmware-update-progress-meta').textContent =
		(progress && progress.totalBytes > 0) ? `${progress.sentBytes} / ${progress.totalBytes} bytes` : '0 / 0 bytes'
}

function addFirmwareDoneButton(){
	if(!fwDialogEl || fwDialogEl.querySelector('.firmware-update-done')) return
	const btn = document.createElement('button')
	btn.className = 'firmware-update-done'
	btn.textContent = 'Done'
	btn.addEventListener('click', hideFirmwareDialog)
	fwDialogEl.querySelector('.firmware-update-message').appendChild(btn)
}

function firmwareDialogComplete(){
	showFirmwareDialog()
	fwDialogEl.classList.remove('is-error')
	fwDialogEl.classList.add('is-complete')
	fwDialogEl.querySelector('.firmware-update-title').textContent = 'Firmware Updated'
	fwDialogEl.querySelector('.firmware-update-progress-label').textContent = 'Your BopPad is up to date.'
	fwDialogEl.querySelector('.firmware-update-progress-bar').style.width = '100%'
	fwDialogEl.querySelector('.firmware-update-progress-meta').textContent = ''
	addFirmwareDoneButton()
	window.setTimeout(hideFirmwareDialog, 6000) // auto-dismiss fallback
}

function firmwareDialogError(message){
	showFirmwareDialog()
	fwDialogEl.classList.remove('is-complete')
	fwDialogEl.classList.add('is-error')
	fwDialogEl.querySelector('.firmware-update-title').textContent = 'Firmware Update Failed'
	fwDialogEl.querySelector('.firmware-update-progress-label').textContent = message || 'The update did not complete.'
	fwDialogEl.querySelector('.firmware-update-progress-meta').textContent = ''
	addFirmwareDoneButton()
}

function hideFirmwareDialog(){
	if(fwDialogEl && fwDialogEl.parentNode) fwDialogEl.parentNode.removeChild(fwDialogEl)
	fwDialogEl = null
}

function formatVersion(id, versionBytes = []){
	let availableVersion = id.slice(versionBytes[0], versionBytes[2] + 1).join('.')
	console.log('>> * firmware available', availableVersion)
	return availableVersion
}

function updateVersionDisplay(log = false){
	let firmwareVersion = globalThis.BOPPAD_FIRMWARE_VERSION,
			editorVersion = globalThis.BOPPAD_EDITOR_VERSION

	document.querySelector('.firmware-version .version').textContent = firmwareVersion
	document.querySelector('.editor-version .version').textContent = editorVersion
	document.title = 'BopPad Editor | v.' + editorVersion + ', Firmware: v.' + firmwareVersion

	if(log) console.log(`>> versions updated: firmwareVersion ${firmwareVersion}, editorVersion: ${editorVersion}`)
}

function pollPort(device, type, doesExist = true){
	console.log('>> searching for', device, type, 'stopping when', (doesExist) ? 'connected': 'disconnected')
	return new Promise((accept, reject) => {
		let exists = false, poll = window.setInterval(() => {
			exists = (type === 'input') ? !!MIDI.getInput(device, false) : !!MIDI.getOutput(device, false)

			if(doesExist === exists) {
				clearInterval(poll);
				accept(true)
			}
		}, 250)
	})
}

export { firmwareState, updateVersionDisplay }
