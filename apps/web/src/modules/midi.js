// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

// vendor
import { omit } from 'lodash'
import isElectron from 'is-electron'

// modules
import { getCurrent, resetDevicePresetArray } from './presetHandler'
import getCurrentVersion from './checkFirmware'
import { getSysex, presetUpdate, soloModline } from './jsonSysex'
import makePreset from "./presetFromSysex";
import { getMidiPorts } from "./utilitiesMIDI";
import messages from './messages'
import { messageTypes } from './modline'
import updater, { firmwareState } from './firmwareUpdater'
import webmidi from './webmidi'
import { buildLoadCheck, importRebuild } from './presetHandler'
import { activateQuadrant } from './quadrant'
import { clearSetUpdate } from './keyboard'
import { setUserTable } from './userCurves'
import reporter from './reporter'

let midi, deviceName = 'BopPad',
		devicePresets, FWU, MIDI

let soloSet = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], activeSolo = ''

let firstConnection = true, bootloaderMode = false, inputConnection, outputConnection,
		delayTime = (isElectron() && navigator.platform == 'Win32') ? 1000 : 0

// Web MIDI Access
if('requestMIDIAccess' in navigator){
	/*
		query this before sysex send
		navigator.permissions.query({name:'midi'}).then(permission => console.log('permission', permission.state))
	*/
	try {
		navigator.requestMIDIAccess({sysex: true}).then(success, failure);
	} catch(err) {
		throw 'Something went wrong while connecting to BopPad, please refresh ' + err;
	}
} else {
	console.warn("Your browser doesn't support the Web MIDI API");
	alert("This browser doesn't currently support WebMIDI, please use Chrome, Opera, or Brave")
	document.querySelector('.status-bar').classList.add('no-webmidi')
}

function success(midiAccess){
	midi = midiAccess;

	// setup web midi
	MIDI = webmidi(midi, globalThis.BOPPAD_BETA)
	window.midi = midi
	// setup statechange handler
	midi.addEventListener('statechange', deviceSetup)

	// setup firmware updater
	FWU = updater(midi)

	// set to global for usage in Electron
	globalThis.FWU = FWU

	setTimeout(() => {
		checkConnection().then(status => {
			if(status.every(item => !!item)){
				document.body.dataset.connected = true

				$(document).trigger('webmidiready')
				console.log(`>> webmidi: ready, ports: ${status.join(',')}`);
				if(firstConnection) setPortHandlers(deviceName)
			} else {
				checkConnection('BopPad Bootloader').then(status => {
					if(status.every(item => !!item)){
						document.body.dataset.connected = 'bootloader'
						console.warn('BopPad is in Bootloader Mode, please update firmware')
						document.querySelector('.status-bar').classList.add('bootloader')
						bootloaderMode = true
						firstConnection = false
					} else {
						document.body.dataset.connected = false
						console.warn('please connect a BopPad')
						firstConnection = false

						$(document).trigger('webmidiready')
						console.log(`>> webmidi: ready, ports: ${status.join(',')}`);
						if(firstConnection) setPortHandlers(deviceName)
					}
				})

			}

		})
	}, delayTime)

	// setup listeners for MIDI and device events
	console.log('>> setup listeners')
	setupListeners()
}

function deviceSetup(e){
	if(e.port.name !== deviceName) return
	setPortHandlers(e)
	// get all available device ports
	globalThis.midithruports = getMidiPorts(midi, () => console.log('getMIDIPorts callback'));
}

function setupListeners(){
	// this checks firmware version & sets globalThis.BOPPAD_FIRMWARE_VERSION, depracate in favor of FWU
	$(document).on('requestid', requestID)
	$(document).on('requestdevicepresets', requestDevicePresets)
	$(document).on('presetsimported', importRebuild)
	$(document).on('requestusertables', requestUserTables)
	$(document).one('editorready', () => firstConnection = false);
	$(document).one('postbootloadermodesetup', postBootloaderModeSetup);
}

function setPortHandlers(e){
	if(typeof e === 'string'){
		// firstConnection
		MIDI.getInput(deviceName).addEventListener('midimessage', onMIDIMessage)
		MIDI.getInput(deviceName).addEventListener('statechange', portStatus)
		MIDI.getOutput(deviceName).addEventListener('statechange', portStatus)

		$(document).trigger('requestdevicepresets')
	} else { // reconnections
		if(firstConnection || firmwareState.updating) return;
		// console.log('\n',(e.port.state === 'connected') ? 'reconnection' : 'disconnection', e.port.name, e.port.type, e.port.state)
		if(e.port.state === 'connected'){
			switch (e.port.type) {
				case 'input':
					if(e.port.connection === 'closed') {
						// console.log('<<>> input closed')
						MIDI.getInput(deviceName).addEventListener('midimessage', onMIDIMessage)
					} else if(e.port.connection === 'open'){
						// this gets called on reconnection after successfull inital connection
						// console.log('<<>> input open')
					} else if(e.port.connection === 'pending'){
						// console.log('<<>> input pending')
					}
					break;
				case 'output':
				if(e.port.connection === 'closed') {
					// console.log('<<>> output closed')
					MIDI.getOutput(deviceName).addEventListener('statechange', portStatus)

					checkConnection().then(status => {
						if(status.every(item => !!item)){
							document.body.dataset.connected = true
							$(document).trigger('requestdevicepresets');
							$(document).one('devicepresetsready', () => $(document).trigger('requestid'));
						} else {
							document.body.dataset.connected = false
						}
					})
				} else if(e.port.connection === 'open'){
					// this gets called on reconnection after successfull inital connection
					// console.log('<<>> output open')
					if(outputConnection === 'pending') {
						$(document).trigger('requestdevicepresets');
						$(document).one('devicepresetsready', () => $(document).trigger('requestid'));
					}
				} else if(e.port.connection === 'pending'){
					// console.log('<<>> output pending')
				}
				// break; // fall through
				default:

			}
		} else if(e.port.state === 'disconnected'){
			// console.log('<<-- disconnect', e.port.type, e.port.state, e.port.connection)
			if(e.port.type === 'input') inputConnection = e.port.connection
			if(e.port.type === 'output') outputConnection = e.port.connection
		}
	}
}

function portStatus(e){ // this gets called on disconnect and reconnect
	let p = e.port, s = p.state, type = p.type, connection = p.connection;
	// console.log('type', type, 'connection', connection)
	if(s == 'connected'){
		deviceConnected(type);
	} else {
		deviceDisconnected(type);
	}
	// called on reconnection || firstConnection
	checkConnection().then(status => {
		const connectionStatus = status.every( item => !!item)
		document.body.dataset.connected = connectionStatus
		
		// enable / disable UI based off device connection
		$('.prefs button[data-action="firmware"').attr('disabled', !connectionStatus)
		$('.prefs select[name="midithru"]').attr('disabled', !connectionStatus)
		$('#sendpreset').attr('disabled', !connectionStatus)
	})
}

function deviceConnected(type){
	// $(document).trigger('connected', [type]);
	$('#boppad').addClass('connected');
	$('.status-bar').addClass('connected');
}

function deviceDisconnected(type){
	// $(document).trigger('disconnected', [type]);
	$('#boppad').removeClass('connected');
	$('.status-bar').removeClass('connected');
}

function onMIDIMessage(event){
	let data = event.data

	switch (data.length) {
		case 522: // fw 3.x 531 - 9
			makePreset(data);
			break;

		case 506: // fw 2.x; 515 - 9
			makePreset(data);
			break;

		case 154:
			setUserTable(data);
			break;

		case 19:
			getCurrentVersion(data);
			break;

		default:
			reporter(messageTypes, data);
			window._debug && console.log(
				String.fromCharCode("9836"),
				"data",
				data,
				"channel",
				data[0] & 0xf
			);
  	}
	
	  // midi thru
	try {
		if (globalThis.boppadthru && globalThis.boppadthru !== 'none') {
			globalThis.boppadthru.send(data)
		}
	} catch(e) {
		console.error('>> BopPad Editor: unable to connect to Thru port', e)
	}
}

function sendSysex(options) { // type: [preset, partial, table]
	let defaults = {'type': 'preset', 'item': [], 'preset_num': 0, 'compare': false, 'time': 0},
			preset, message

	options = Object.assign({}, defaults, options)

	if(options.type == 'preset'.toLowerCase()){
		preset = Object.assign({}, getCurrent(options.compare), {'preset_num': +options.preset_num})
		message = getSysex(omit(preset, 'name'));
		// console.log('>> -> message (full)', 'length', message.length, ...message);
		if(globalThis._debug === 'message') console.log('>> -> message (full)', 'length', message.length);
	} else if(options.type == 'partial'.toLowerCase() && options.item.length == 2){
		message = presetUpdate(options.item);
		if(globalThis._debug === 'message') console.log('>> -> message (update)', ...message);
	} else if(options.type == 'table'.toLowerCase()){
			message = options.item
			// console.log('>> -> message (table)', ...message);
	} else {
		console.warn('preset could not be sent')
	}

	if(isConnected() && message){
		MIDI.getOutput(deviceName).send(message);
		if(globalThis._debug === 'message') console.log('>> preset message sent:', (message.length > 19) ? 'full/table': 'update')
	} else {
		console.warn('preset could not be sent')
	}
}

function setSolo(quadrant, modline){
	let index = getIndex(quadrant, modline),
			message

	soloSet[index] = (soloSet[index] == 0) ? 1 : 0;

	activeSolo = `${quadrant}:${modline}:${index}`

	message = soloModline(soloSet)

	if(isConnected() && message) {
		MIDI.getOutput(deviceName).send(message, window.performance.now());
		console.log('>> solo message sent: quadrant ' + quadrant + ' modline ' + modline)
	} else {
		console.warn('solo could not be set')
	}
}

function resetSolo(){
	if(!!activeSolo) {
		let [quadrant, modline] = activeSolo.split(':')

		setSolo(quadrant, modline)

		activeSolo = ''
	}

	$('button.solo').each(function(index, el) {
		$(el).removeClass('active')
	});
}

function getIndex(quadrant, modline){
	let quads = ['a', 'b', 'c', 'd'],
			quadIndex = quads.indexOf(quadrant.toLowerCase()),
			quadMultiplier = 6

	return quadIndex * 6 + modline - 1
}

function requestID(){
	if(isConnected()) {
		console.log('>> send -> request ID');
		MIDI.getOutput(deviceName).send(messages.request_id);
	}
}

function requestDevicePresets(selectedState = false){
	if(isConnected()) {
		console.log('>> send -> request device presets');
		resetDevicePresetArray();
		$(document).trigger('resetpresetcounter')
		MIDI.getOutput(deviceName).send(messages.preset_download_all);
	}

	if(!firstConnection) $(document).one('devicepresetsready', () => {
		// if previous device connection
		if(inputConnection && outputConnection){
			rebuildPresets(selectedState)
			// send default preset on device reconnection
			sendSysex({type:'preset'});
		}
	});
}

function rebuildPresets(selectedState = false){
	console.log('>> rebuilding presets')
	// build menu
	buildLoadCheck(selectedState)
	// activate quadrant
	activateQuadrant();
	// update keyboard
	clearSetUpdate();
}

function requestUserTables(){
	if(isConnected()) {
		console.log('>> send -> request user tables');
		MIDI.getOutput(deviceName).send(messages['user_table_all'], window.performance.now())
	} else {
		// get from local storage

	}
}

function checkConnection(device = deviceName){
	return Promise.all([
		inputConnected(device),
		outputConnected(device)
	]).catch(reason => console.log('>> connection', reason))
}

function isConnected(){
	return (document.body.dataset.connected === 'true') ? true : false
}

function inputConnected(device = deviceName){
	return new Promise((resolve, reject) => {
		(MIDI.getInput(device) && MIDI.getInput(device).state === 'connected') ? resolve(true) : resolve(false);
	})

}
function outputConnected(device = deviceName){
	return new Promise((resolve, reject) => {
		(MIDI.getOutput(device) && MIDI.getOutput(device).state === 'connected') ? resolve(true) : resolve(false);
	})
}

function postBootloaderModeSetup(){
	checkConnection().then(status => {
		if(status.every(item => !!item)){
			document.body.dataset.connected = true
			document.querySelector('.status-bar').classList.remove('bootloader')
			bootloaderMode = true

			$(document).trigger('webmidiready')
			console.log(`>> webmidi: ready, ports: ${status.join(',')}`);
			// set handlers
			setPortHandlers(deviceName)
			// update icon
			deviceConnected()
		}
	})

}

function failure(err){
	console.warn('MIDI Access failed ', err);
}

function updateFirmware(){
	console.log('update firmware')
	FWU(deviceName)
}

export { sendSysex, setSolo, resetSolo, requestDevicePresets, rebuildPresets, devicePresets, checkConnection, isConnected, updateFirmware }
