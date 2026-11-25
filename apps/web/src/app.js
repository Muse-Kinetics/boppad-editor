// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

// styles
import './styles/screen.scss';

// load svgs
import boppadsvg from './svg/boppad.svg';
import keyboardsvg from './svg/keyboard.svg';

// vendor
import { pull, debounce } from 'lodash';
import VanillaModal from 'vanilla-modal';
import isElectron from 'is-electron';

import './modules/userCurves'
import './modules/dragImporter'
import './modules/tooltips'
import './modules/icon'
import "./modules/preferences"
import "./modules/userCurves"

// modules
import * as utilities from './modules/utilities'
import * as keyboard from './modules/keyboard'
import * as quadrant from './modules/quadrant'
import * as modline from './modules/modline'
import * as globalSettings from './modules/globalSettings'
import * as storage from './modules/storage'
import * as presetHandler from './modules/presetHandler'

import * as midi from './modules/midi'

import namePrompt from './modules/prompt'
import convert from "./modules/convertStoredPresets"

import { updateVersionDisplay } from "./modules/firmwareUpdater"
import activateQuadrant from './modules/activateQuadrant'

globalThis.BOPPAD_EDITOR_VERSION = '1.2.0'
globalThis.BOPPAD_FIRMWARE_VERSION = '3.0.4'
globalThis.BOPPAD_BETA = false

// index.html hardcodes placeholder version text (editor 1.1.1, firmware
// 0.0.0) that otherwise only gets overwritten once a device is connected and
// replies (see checkFirmware.js/firmwareeditorchecked). Paint the real
// build-time defaults immediately so a fresh page load is never wrong before
// any device shows up; a later real device reply still corrects the
// firmware line to what that specific unit actually reports.
updateVersionDisplay()

let boppadSVG = $('#boppad'),
		keyboardSVG = $('#keyboard'),
		sendPresetSysexBtn = document.querySelector('#sendpreset'),
		pasteBtn = document.querySelector('button.paste')

function init(callback){
	// insert svgs
	utilities.insertSVG([boppadSVG, keyboardSVG], [boppadsvg, keyboardsvg], els => {
		els.forEach( el => {
			el.find('svg').css('opacity', 1).stop(true).hide().fadeIn(2000);
			if(el[0].id == 'keyboard') {
				el[0].insertAdjacentHTML('afterbegin', '<p class="keyboard-toggle">Keyboard <span>(show)</span></p><div class="keyboard-note"></div>');
				$(document).trigger('keyboardready')
			}
		})
	});

	// Presets
	// :: selection
	$('#presets').on('change', 'select', function(e){
    let preset = e.target.options[e.target.selectedIndex],
      type = preset.dataset.presetType;

    // load
    presetHandler.load(presetHandler.get(type, +preset.value));
    // en|disable save/delete buttons
    presetHandler.checkType();
    // reset object
    presetHandler.resetChangedvalues();
    // set active quadrant and keys
    activateQuadrant();
    // reset solo button state
    midi.resetSolo();
    // send preset to edit buffer
    midi.sendSysex({ type: "preset", preset_num: 0 });

    e.stopPropagation();
  });

	$(document).on('presetsimported', () => {
		/*
			import
			upgrade
			load
			send last imported preset? or based off of index of menu?

		*/
		// console.log('boppadPresets', presetHandler.boppadPresets)
		// console.log('selected item', document.querySelector('#preset_sel').options[document.querySelector('#preset_sel').selectedIndex])
		// console.log('preset imported')
		// midi.sendSysex({'type':'preset'});
	})

	// :: button actions
	$('#presets').on('click', 'button', function(e){
		let action = e.target.dataset.action,
				preset_num = 1

		if(action === 'sendpreset'){
			$(document).one('devicepresetsready', () => {
				presetHandler.buildLoadCheck(true);
			})
      // set device memory location
      preset_num = $("button.preset-num").filter(".active").val() || 1;
      // send preset
      midi.sendSysex({ type: "preset", preset_num: preset_num });
      // get presets from device
      midi.requestDevicePresets(true);
      // reset compare values
      presetHandler.resetChangedvalues();
      // reset solo button state
      midi.resetSolo();
      // reset buttons
      presetHandler.resetButtons();
      // activate quadrant
      activateQuadrant();
    } else {
			switch(action){
				case 'save':
					// reset buttons
					presetHandler.resetButtons();
					// get current preset
					let updatedPreset = Object.assign({}, presetHandler.getCurrent());
					// save current preset to localStorage
					storage.save(updatedPreset, true)
					// update boppadPresets
					presetHandler.set('user', updatedPreset, true);
					break;

				case 'save_as':
					presetHandler.resetButtons();
					// save preset to localStorage, with new name
					namePrompt().then(presetName => {
						let newPreset = Object.assign({}, presetHandler.getCurrent());
						// set new preset name
						newPreset.name = presetName;
						// set name bytes in preset
						for (let index = 0; index < 16; index++) {
							newPreset[`presetName[${index}]`] = presetName.charCodeAt(index) || 0x00;
						}

						// save to storage if unique
						storage.save(newPreset)
							.then(unique => {
								if(unique) {
									// update boppadPresets
									presetHandler.set('user', newPreset);
									// build menu, load, check
									presetHandler.buildLoadCheck();
									// activate quadrant
									activateQuadrant()
								} else {
									alert('Preset already exists with the name, ' + presetName + '. Please choose another name');
								}
						});
					}).catch((err) => {
						console.log('>>', err)
					})

					break;

				case 'revert':
					presetHandler.resetButtons();
					// load current preset
					presetHandler.load(presetHandler.currentComparePreset);
					// activate quadrant
					activateQuadrant()
					// resend preset
					midi.sendSysex({'type':'preset', 'compare': true})
					// reset solo button state
					midi.resetSolo()
					// reset paste button
					pasteBtn.disabled = true
					break;

				case 'delete':
					confirm("Are you sure you want to delete this preset? This cannot be undone");
					presetHandler.resetButtons();

					presetHandler.remove();
					storage.remove(presetHandler.currentPreset.name); // order matters here
					//build menu, load, check
					presetHandler.buildLoadCheck();
					// load current preset :: redunadnt?
					presetHandler.load(presetHandler.currentPreset);
					// activate quadrant
					activateQuadrant()
					// resend preset
					midi.sendSysex({'type':'preset'})
					// reset solo button state
					midi.resetSolo()
					// console.log('currentPreset', presetHandler.currentPreset, '\ncurrentComparePreset', presetHandler.currentComparePreset);

					break;

				case 'convert':
					convert()
			}
		}

		e.stopPropagation();
	});

	// preset num buttons
	$('#presets').on('click', '.toggle', function() {
		$(this).addClass('active').siblings('.preset-num').removeClass('active')
		presetHandler.currentPreset['preset_num'] = $(this).val()
	});

	// modline solo / invert buttons
	$('#editor').on('click', '.toggle', function(e) {
		let button = $(this),
				buttonID = button.attr('id'),
				action = e.target.dataset.action,
				allMode = document.body.dataset.allmode

		switch(action){
			case 'full-vol-change':
				globalSettings.toggleButtons(button)
				presetHandler.updatePreset(buttonID, button.val())
				presetHandler.checkValues(buttonID)

				if(allMode === 'on') presetHandler.setAll(buttonID, button.val())
				break;

			case 'vel-override':
				globalSettings.toggleButtons(button)
				presetHandler.updatePreset(buttonID, button.val())
				presetHandler.checkValues(buttonID)

				if(allMode === 'on') presetHandler.setAll(buttonID, button.val())
				break;

			default:
				// $(this).toggleClass('active')
		}
		// console.log('toggle button', buttonID)
	});

	// :: preset save/revert button states
	$('#editor').on('input', 'input[type=number], select', debounce( e => {
		let id = e.target.id,
				value = e.target.value,
				allMode = document.body.dataset.allmode

		if(e.target.type === 'number') value = utilities.restrictNumber(e.target)
		// set all quadrants
		if(allMode === 'on') presetHandler.setAll(id, value)

		if(value == 'cc') {
			// handle below
			// so damn hacky
			return
		}

		presetHandler.checkValues(id);

		presetHandler.updatePreset(id, value);

		e.stopPropagation();
	}, 350));

	// format display of float values; n.00
	$('#editor').on('blur', 'input[type=number]', (e) => {
		let value = e.target.value
		if(e.target.step && e.target.step < 1){
			e.target.value = parseFloat(value).toFixed(2);
		}
	})

	// select values when clicking into a input field
	$('#editor').on('focus', 'input[type=number]', (e) => {
		e.target.select()
	})

	// Quadrants
	// :: activate quadrant from frame
	$('.quad-note-group').on('click', function() {
		let activeQuadrant = $(this).parents('.quadrant-notes').data('quadrant')

		activateQuadrant(activeQuadrant)
	});

	// :: add 'active' class to quadrant and set keyboard keys
	$('.quad-note-group').on('click', 'input, span', function(e){
		let input = $(this), inputValue = input.val(),
				activeQuadrant = input.parents('.quadrant-notes').data('quadrant')

		utilities.inputFocus(input);

		activateQuadrant(activeQuadrant)

		// keep track of key state
		input.data('current-note', inputValue);
		// if current key in activeKeys, remove from activeKeys
		if(inputValue != -1) pull(keyboard.activeKeys, +inputValue);

		e.stopPropagation();
	});

	// :: update active keys
	$('.quad-note-group').on('blur', 'input', function(e) { // should this update on change?
		let input = $(this), activeQuadrant = quadrant.getCurrentQuadrant();

		keyboard.updateActiveKeys(activeQuadrant);

		e.preventDefault();
	});

	// :: set noteName and keyboard key
	$('.quadrant-selection').on('change', 'input', function(e){
		let input = $(this), keyNote = +input.val(), keyInputID = input.attr('id');

		quadrant.setNote(input);
		// TODO: clear prev key, ignore other key overlap
		keyboard.clearKey(input.data('current-note'));

		if(keyNote !== -1) {
			keyboard.setKey(keyNote, keyInputID); // redundant?
		} else {
			// console.log('offNote')
		}

		input.data('current-note', keyNote);

		e.stopPropagation();
	});
	// :: set note on input. possibly combine with above
	$('.quadrant-selection').on('input', 'input', function(e){
		let input = $(this)

		quadrant.setNote(input);
	})

	$('.quadrant-notes').on('click', 'h3', function(e) {
		if(document.body.dataset.unison === 'on') return

		let activeQuadrant = e.delegateTarget.dataset.quadrant;

		activateQuadrant(activeQuadrant)

		e.preventDefault();
	});

	// :: button actions
	$('.quadrant-actions').on('click', 'button', function(e) {
		let action = e.target.dataset.action

		switch(action){
			case 'copy':
				quadrant.copy();
				pasteBtn.disabled = false;
				break;

			case 'paste':
				keyboard.clearKeys();
				keyboard.updateActiveKeys()
				quadrant.paste();
				break;

			case 'clear':
				quadrant.clear();
				keyboard.clearKeys();
				break;

			case 'clear_all':
				quadrant.clearAll();
				keyboard.clearKeys();
				break;
		}

		e.stopPropagation();
	});

	// :: toggle 'off'
	$('.quadrant-voices').on('change', 'input', function(e){
		let input = $(this);

		quadrant.setValue(input);

		e.stopPropagation();
	});
	// set focus :: refactor :: for all .number-inputs
	$('.quadrant-voices').on('click', 'input, span', function(e){
		let input = $(this);

		utilities.inputFocus(input);

		e.stopPropagation();
	});

	// Keyboard
	keyboardSVG.on('click', 'rect', function(e){
		let key = $(e.target), isActive = key.hasClass('active'),
				// allMode = document.body.dataset.allmode
				allMode = 'off'

		// allmode version and single quadrant version needed
		if(!isActive && keyboard.activeKeys.length == 6) return

		// work on later
		if(allMode === 'on') {
			['A', 'B', 'C', 'D'].forEach(quadrant => {
				if(!isActive && keyboard.activeKeysAll[quadrant].length == 6) return
				keyboard.activateKey(key, quadrant)

				let inputKey = keyboard.findInputFromKey(key, quadrant), // this may not be needed anymore, using data attr
						inputKeyID = key.data('currentinput'),
						inputKeyValue = (isActive) ? -1 : inputKey.val(); // if key is active when clicked, value is -1
				// console.log('inputKey', inputKey, 'inputKeyValue', inputKeyValue)
				presetHandler.updatePreset(inputKeyID, inputKeyValue);
				presetHandler.checkValues(inputKeyID);
			})
		} else {
			keyboard.activateKey(key, document.body.dataset.active);
			let inputKey = keyboard.findInputFromKey(key, document.body.dataset.active), // this may not be needed anymore, using data attr
					inputKeyID = key.data('currentinput'),
					inputKeyValue = (isActive) ? -1 : inputKey.val(); // if key is active when clicked, value is -1

			presetHandler.updatePreset(inputKeyID, inputKeyValue);
			presetHandler.checkValues(inputKeyID);
		}
	});

	// Modline
	// :: message type
	$('.modline-sets').on('change', '.message-type', function(e) {
		let action = e.target.value, ccNumber

		if(action == 'cc'){
			$(this).parent().addClass('cc');
			ccNumber = $(this).next()
			presetHandler.updatePreset(ccNumber.attr('id'), ccNumber.val());
			presetHandler.checkValues(ccNumber.attr('id'));
		} else {
			$(this).parent().removeClass('cc');
		}
		// build modline reporter
		modline.buildMessageTypes();

		e.stopPropagation();
	});

	// :: create/remove
	$('.create-remove').on('click', 'button', function(e) {
		let action = e.target.dataset.action,
				quadrant = document.body.dataset.active,
				allMode = document.body.dataset.allmode

		switch(action){
			case 'create':
				modline.create();
				if(allMode === 'on') modline.createAllModlines(quadrant)
				break;

			case 'remove':
				modline.removeMod();
				if(allMode === 'on') modline.removeAllModlines(quadrant)
				break;
		}

		$('.modline-sets.active').trigger('modchange');

		e.stopPropagation();
	});

	// check to see if modline is in currentComparePreset to update revert/saveAs buttons
	$('#editor').on('modchange', '.modline-sets.active', function(e){
		let currentPresetType = $('#preset_sel').find('option:selected').data('preset-type'),
				quadrant = $(this).data('quadrant').toLowerCase(),
				presetModlinesCount = modline.getModlineCount(presetHandler.currentComparePreset)[quadrant]

		if(modline.modlineCount[quadrant] === presetModlinesCount){
			// check values of params
			if(modline.checkModlineValues(presetHandler.currentComparePreset, quadrant, modline.modlineCount[quadrant])){
				presetHandler.disableButtons();
			} else {
				presetHandler.enableButtons(currentPresetType);
			}
		} else {
			presetHandler.enableButtons(currentPresetType);
		}
	});

	// modline solo button
	$('.modline-sets').on('click', 'button',  function(e) {
		let button = $(this),
				buttonID = button.attr('id'),
				quadrant = button.parents('.modline-sets').data('quadrant'),
				modCount = button.parents().data('modcount'),
				allMode = document.body.dataset.allmode

		if(buttonID.includes('solo')){
			//console.log('modline solo button', quadrant, modCount)
			midi.setSolo(quadrant, modCount)
			$(this).toggleClass('active')
		} else if(buttonID.includes('invert')){
			$(this).toggleClass('active') // could move this into invertSource
			modline.invertSource(button)
			if(allMode === 'on') modline.setAllInvert(button)
		}

		e.preventDefault();
	});

	// :: buttons
	$('#global_settings').on('click', 'button', function(e) {
		let action = e.target.dataset.action,
				button = $(this),
				buttonID = button.attr('id'),
				quadrants = ['A', 'B', 'C', 'D'],
				activeQuadrant = quadrant.getCurrentQuadrant()

		switch(action){
			case 'unison-toggle':
				if(!button.hasClass('active')){ // this could be redundant
					button.val(quadrants.indexOf(activeQuadrant))
					presetHandler.updatePreset(buttonID, button.val());
					$(document).trigger('unisonmode', [button.val()])
				} else {
					presetHandler.updatePreset(buttonID, -1);
					$(document).trigger('unisonmode', [-1])
				}
				// presetHandler.updatePreset(buttonID, -1);
				globalSettings.toggleButtons(button);
				presetHandler.checkValues(buttonID);

				break;

			case 'all-mode-toggle':
				globalSettings.toggleButtons(button);
				if(document.body.dataset.allmode == 'off') {
					document.body.dataset.allmode = 'on'
					$('.quadrants-header h2').html('All Quadrants')
				} else {
					document.body.dataset.allmode = 'off'
					$('.quadrants-header h2').html('Quadrants')
				}

				break;

			default:

		}

		e.stopPropagation();
	});

	$('#preferences').on('click', 'button', (e) => {
		let button = $(e.target), buttonID = button.attr('id'), action = e.target.dataset.action, modal

		switch(action){
			case 'usertables':
				$(document).trigger('beforecurvetableopen')

				modal = new VanillaModal({
					clickOutside: false,
					onOpen: () => $(document).trigger('modalcurvetableopen', [e.target.id])
				})

				// remove all classes on modal
				Array.from(modal.dom.modal.classList).forEach((c,i,a) => modal.dom.modal.classList.remove(c))
				modal.dom.modal.classList.add('modal')
				modal.dom.modal.classList.add('usertables')
				modal.open('#usercurves')
				break;

			case 'prefs':
				modal = new VanillaModal({
					clickOutside: false,
					onOpen: () => {
						$('#sensitivity_global').trigger('change')
						// built midi-thru ports select
						
						// clear options if device connected
						if(midi.isConnected()) {
							$('#midithru').empty()
						}
						// build dropdown from available ports
						$.each(globalThis.midithruports, (i, item) => {
							$('#midithru').append($('<option>', { 
								value: item.value,
								label : item.label 
							}));

							if(globalThis.boppadthru?.name === 'none') return
							// set currently selected port as selected
							if(item.value === globalThis.boppadthru?.name) {
								$('#midithru').find(`option[value='${globalThis.boppadthru?.name}']`).attr('selected','selected')
							}
						});
					}
				})
				Array.from(modal.dom.modal.classList).forEach((c) => modal.dom.modal.classList.remove(c))
				modal.dom.modal.classList.add('modal')
				modal.dom.modal.classList.add('preferences')
				modal.open('#prefs')
		}
	})

	$('.prefs').on('change', 'input[type=range]', debounce( e => {
		let id = e.target.id, value = e.target.value, slider = $('#' + id)

		presetHandler.checkValues(id);

		presetHandler.updatePreset(id, value);

		globalSettings.sliderValue(slider)

		e.stopPropagation();
	}, 250));

	$('.prefs').on('click', 'button', (e) => {
		let button = $(e.target), buttonID = e.target.id, action = e.target.dataset.action

		switch(action){
			case 'reset-global-sensitivity':
				$('#sensitivity_global').val(16);
				presetHandler.checkValues('sensitivity_global');
				presetHandler.updatePreset('sensitivity_global', 16);
				globalSettings.sliderValue($('#sensitivity_global'))
				break;

			case 'multitouch-toggle':
				globalSettings.toggleButtons(button);
				presetHandler.checkValues(buttonID);
				presetHandler.updatePreset(buttonID, button.val());
				break;

			case 'crosstalk-toggle':
				globalSettings.toggleButtons(button);
				presetHandler.checkValues(buttonID);
				presetHandler.updatePreset(buttonID, button.val());
				break;

			case 'expandermode':
				globalSettings.toggleButtons(button)
				presetHandler.checkValues(buttonID);
				presetHandler.updatePreset(buttonID, button.val());
				break;

			case 'change-filter':
				globalSettings.toggleButtons(button);
				presetHandler.checkValues(buttonID);
				presetHandler.updatePreset(buttonID, button.val());
				break;

			case 'firmware':
				midi.updateFirmware()
				button.prop("disabled",true)
				break;

			case 'exportpresets':
				globalThis.exportLocalStorage()
				break;

			case 'tooltips':
				globalSettings.toggleButtons(button)

				if(button.val() == -1){
					// console.log('turn off')
					localStorage.setItem('_boppadtooltips_', false)
					globalThis.toggleTooltips(false)
				} else {
					// console.log('turn on')
					localStorage.setItem('_boppadtooltips_', true)
					globalThis.toggleTooltips(true)
				}

				break;

			default:

		}
	})
	$('.prefs').on('change', 'select', (e) => {
		const midiSelect = e.target
		const selectedPort = midiSelect.options[midiSelect.selectedIndex].label;
	
		if(selectedPort === 'None') {
			window.boppadthru = 'none'
		} else {
			console.log(selectedPort);
			// set thru port on window
			window.boppadthru = globalThis.midithruports.find(p => p.value === selectedPort).port
		}
	})
	// set event handler for unisonmode
	$(document).on('unisonmode', globalSettings.setUnison)

	// set beta flag
	if(globalThis.BOPPAD_BETA) document.body.classList.add('beta')
	// complete callback. might not be necessary
	callback();
}

// depracate in favor of FWU?
// firmware
$(document).on('firmwareeditorchecked', function(e, firmwareVersion, editorVersion){
	if(firmwareVersion.current == firmwareVersion.latest) {
		console.log('>>', String.fromCharCode('8730') ,'firmware current:', firmwareVersion.current, 'latest:', firmwareVersion.latest);
	} 
	else if (firmwareVersion.current < '3.0.0') {
		const upgradeNotice = document.querySelector("#upgradeNotice");
		// set event handlers
		upgradeNotice.addEventListener("cancel", (event) => {
      event.preventDefault();
    });
		upgradeNotice
      .querySelector("#updateDialogBtn")
      .addEventListener("click", () => {
        upgradeNotice.close();
        midi.updateFirmware()
        globalThis.BOPPAD_UPGRADING = true;
				// rebuild preset menu
				$(document).one("devicepresetsready", () => {
					console.log('3.0.0 - build load check')
					presetHandler.buildLoadCheck(true);
				});
      });
		upgradeNotice
      .querySelector("#closeDialogBtn")
      .addEventListener("click", () => {
				upgradeNotice.close()
				window.location.replace("https://www.keithmcmillen.com/downloads/#boppad");
			});
    // open dialog
		if (globalThis.BOPPAD_UPGRADING !== true) upgradeNotice.showModal();
  } else {
    console.log(
      ">>",
      String.fromCharCode("9888"),
      "firmware not current: current:",
      firmwareVersion.current,
      " latest:",
      firmwareVersion.latest
    );
    // prompt user to update firmware
    $("#logo").find(".status-bar").addClass("firmware-update-available");
    window.setTimeout(
      () =>
        $("#logo").find(".status-bar").removeClass("firmware-update-available"),
      10000
    );
    // if agree, download [bootloader,firmware]; send bootloader, confirm bootloader mode, send firmware, re-check
  }
	// editor
	if(editorVersion.current == editorVersion.latest) {
		console.log('>>', String.fromCharCode('8730') ,'editor current:', editorVersion.current, 'latest:', editorVersion.latest);
	} else {
		console.log('>>', String.fromCharCode('8730') ,'editor not current:', editorVersion.current, 'latest:', editorVersion.latest);
		// prompt user to update firmware
		$('#logo').find('.status-bar').addClass('editor-update-available')
		window.setTimeout(() => $('#logo').find('.status-bar').removeClass('editor-update-available'), 10000)
		// if agree, download [bootloader,firmware]; send bootloader, confirm bootloader mode, send firmware, re-check
	}

	updateVersionDisplay()
})

$(document).on('firmwareupdatecomplete', (_, log) => {
	updateVersionDisplay(log)
	$(document).trigger('requestdevicepresets')
})
/*
$(document).on('modlineadded', function(e, quadrant, count){
	console.log('>> modlineadded', quadrant, count);
})

$(document).on('modlineremoved', function(e, quadrant, count){
	console.log('>> modlineremoved', quadrant, count);
	// presetHandler.updatePreset(buttonID, button.val());
})
*/
$(document).on('presetChange', function(e, item, value){
	console.log('>> preset updated', item, ':',  +value);

	//	if(item.includes('table') && isNaN(NaN)) return

	midi.sendSysex({'type': 'partial', 'item': [item, value]})

	// build modline reporter
	modline.buildMessageTypes();
})

init(function(){
	// set global reference to the keyboard svg
	globalThis.keyboardKeys = jQuery('#keyboard').find('rect');

	let BETA = (globalThis.BOPPAD_BETA) ? 'Beta' : ''

	// fetch userPresets : always loads
	let userPresets = storage.loadAll('^_boppad_').then( response => response)

	// fetch factory presets
	let factoryPresets

	if(navigator.onLine){
		factoryPresets = fetch(`https://files.keithmcmillen.com/products/boppad/editor/factoryPresets${BETA}.json?${Math.random()* 2**32}`, {cache: "no-store"}).then( response => response.json())
	} else {
		console.log('no internet connection. will use localStorage factoryPresets') // or just us a file
		factoryPresets = storage.loadAll('^_boppadfactory_').then( response => response)
	}

	// fetch userTables
	// if userTables.length > 0 ; send user tables to device
	// let userTables = storage.loadAll('^_boppadusertables_').then( response => response)
	// console.log('userTables', userTables)
	// online status event should trigger a factory preset check and firmware check

	// holds promises based off of connection status
	let presetsArray

	utilities.promiseEvent('webmidiready').then(() => {
		if(midi.isConnected()){
			if(navigator.onLine){
				// console.log('\\\|/ (.) device connected, online')
				// user, factory-check-remote, device
				presetsArray = [userPresets, factoryPresets, utilities.promiseEvent('devicepresetsready')]
			} else {
				// console.log('(.) device connected, offline')
				// user, factoryLocal, device
				presetsArray = [userPresets, factoryPresets, utilities.promiseEvent('devicepresetsready')]
			}
			// send user tables to device
			// userTables.then(tables => console.log('user tabels', tables, sendUserTables(tables)))
			// userTables.then(tables => console.log('user tabels', tables))
		} else {
			if(navigator.onLine){
				// console.log('\|/ device disconnected, online')
				// user, factory-check-remote, device
				presetsArray = [userPresets, factoryPresets]
			} else {
				// console.log(':( device disconnected, offline')
				// user, factory-check-remote, device
				presetsArray = [userPresets, factoryPresets]
			}
		}
	})
	.then(() => {
		// load all presets and build menu
		Promise.all(presetsArray)
			.then( presets => {
				// load userPresets
				if(presets[0].length) presetHandler.set('user', presets[0])
				// load factoryPresets
				if(presets[1].length) presetHandler.set('factory', presets[1])
				// initial requestid to set global firmware version
				if(midi.isConnected()) $(document).trigger('requestid');
				// wait for firmware version before loading and building
				utilities.promiseEvent('firmwareeditorchecked').then(() => {
					console.log('>> build menu : initial')
					// build menu
					presetHandler.buildLoadCheck();
					// activate quadrant
					quadrant.activateQuadrant();
					// update keyboard
					keyboard.clearSetUpdate();
					// send default preset.
					midi.sendSysex({'type':'preset'});
				})

				if(!midi.isConnected()){
					console.log('>>  startup: no device connection')
					presetHandler.buildLoadCheck();
					// activate quadrant
					quadrant.activateQuadrant();
					// update keyboard
					keyboard.clearSetUpdate();
				}
				// send ready event
				$(document).trigger('editorready');
		}).catch( err => {
			console.error('Could not retrieve the requested file ', err);
		});
	})

// electron class and windows warning
	if(isElectron()){
		document.body.classList.add('electron')
	} else if(navigator.platform === 'Win32' && navigator.appVersion.match(/.*Chrome\/([0-9\.]+)/)[1] < "61"){
		document.body.classList.add('windows-chrome-flag-warning')
		$('.windows-warning').find('a').on('click', function(e) {
			document.body.classList.remove('windows-chrome-flag-warning')
			e.preventDefault()
		})
	}

	document.querySelector('#logo h1').textContent = (globalThis.BOPPAD_BETA) ? 'BetaPad' : 'BopPad';

});
