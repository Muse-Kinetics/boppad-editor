// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

// vendor
import { isPlainObject, isEmpty } from 'lodash'
import semver from 'semver'
// modules
import {
  convertRange,
  optionIndex,
  isButton,
  entityToChar,
  buildPresetName,
} from "./utilities";
import { create, removeMod, isModType, isCC, isModGain, getModGain, setModGain, getModlineCount } from './modline'
import presetModel from './presetModel3'
import upgradePreset from './upgradePreset'
import { getQuadSens, setSensitivity } from './quadrant'
import activateQuadrant from './activateQuadrant'
import { clearSetUpdate } from './keyboard'
import { toggleButtons } from './globalSettings'
import { isConnected, resetSolo, sendSysex } from './midi'

let saveBtn = $('button.save'),
		revertBtn = $('button.revert'),
		deleteBtn = $('button.delete')

let boppadPresets = {
	'user': [],
	'device': [],
	'factory': [],
	'usertables': []
},
quadrants = ['A', 'B', 'C', 'D'], presetSel = document.querySelector('#preset_sel'), selectedPresetIndex,
currentPreset = {}, currentComparePreset = {}, changedValues = {}
// debugging
globalThis.BOPPAD_PRESETS = boppadPresets
// $(document).on('presetloaded', () => {
// 	window.setTimeout(() => {
// 		document.querySelector('.status-bar').classList.remove('loading-preset')
// 	}, 250)
// })

// load presets from object to Editor UI
function load(preset){
	let unisonStatus = 'off', unisonVal = -1,
			presetIndex = optionIndex(presetSel),
			presetOption = presetSel.options[presetSel.selectedIndex],
			presetType = presetOption.dataset.presetType,
			deviceFirmwareVersion = globalThis.BOPPAD_FIRMWARE_VERSION

	// dev only
	let exists = [], not_exists = [];

	// set select-wide index. used in fn build
	selectedPresetIndex = presetSel.selectedIndex || 0

	// document.querySelector('.status-bar').classList.add('loading-preset')

	// get preset
	preset = preset || get(presetType, presetIndex)

	let presetFirmwareVersion = [
		preset["firmware_v_major"],
		preset["firmware_v_minor"],
		preset["firmware_v_patch"]].join('.')

	// upgrade preset if preset version is less than (major/minor) device/editor firmware version
	if(semver.lt(presetFirmwareVersion, deviceFirmwareVersion) && semver.diff(presetFirmwareVersion, deviceFirmwareVersion) != 'patch'){
		console.log(`${entityToChar('&xrArr;')} upgrading preset: preset version ${presetFirmwareVersion}, device version ${deviceFirmwareVersion}, diff ${semver.diff(presetFirmwareVersion, deviceFirmwareVersion)}`)

		// preset = upgradePreset(preset, deviceFirmwareVersion)
		preset = (semver.diff(presetFirmwareVersion, deviceFirmwareVersion) === 'patch') ? preset : upgradePreset(preset, deviceFirmwareVersion)

		// this is needed to save the presets new firmware and unchanged values
		currentPreset = Object.assign({}, preset) // maybe this shouldn't be it's own new object
		currentComparePreset = Object.assign({}, preset)
	}

	// clear current modlines
	removeMod(true);

	/*
		if quadrant
		if modline
		if global
		if toggle/button
	*/

	for(let p in preset){
		let el = document.getElementById(p);
		// console.log('<>', p, preset[p])

		if(!isModline(p) && el){
			// handle not modlines
			if(p.includes('channel')){
				el.value = preset[p] + 1;
			} else {
				if(isUIButton(p)){
					if(preset[p] == -1) {
						el.classList.remove('active')
						el.textContent = 'Disabled';
					} else {
						el.classList.add('active')
						el.textContent = 'Enabled';
					}
					// set unison :: move into its own fn
					if(p.includes('unison')){
						unisonVal = (preset[p] != -1) ? preset[p] : -1;
						// TODO: combine data-unison & data-unison-quadrant into one state
						$(document).trigger('unisonmode', [unisonVal])
					}
				}
				// these are non-button cases
				el.value = preset[p];

				if(p.includes('gain')){
					el.value = (preset[p] / 100).toFixed(2)
				}
			}
			// these require events triggered to display correctly
			// if(['note', 'program', 'bank', 'bend', 'sensitivity'].includes(p))
			if(p.includes('note') || p.includes('program') || p.includes('bank')){
				$(el).trigger('change'); // use custom event for preset change?
			}

			// dev only
			exists.push(p);

		} else if(p.includes('off_amp')) { // handle quadrant sensitivity :: not modline and not exists.
				let quadrantAmp = /quadrant_([a-d])_off_amp/.exec(p),
						quadrant = quadrantAmp[1]

				// process and set UI
				let quadSens = document.querySelector('#quadrant_' + quadrant + '_sensitivity')
				quadSens.value = 14 - preset[p]
		} else if(isModline(p)) { // handle modlines
			loadModlines(p, preset)
		} else {
			// dev only
			not_exists.push(p);
		}
	}

	// dev only
	// console.log('exists:', exists, '\nnot_exists:', not_exists);
	// console.log('>> preset "', preset.name, '" loaded', 'current preset -> ', currentPreset.name)
	$(document).trigger('presetloaded')
	console.log(`>> preset "${preset.name}" loaded`)
}

function isUIButton(item){
	return ([
		'multitouch_enable',
		'quadrant_a_full_vol_change',
		'quadrant_b_full_vol_change',
		'quadrant_c_full_vol_change',
		'quadrant_d_full_vol_change',
		'quadrant_a_velocity_override',
		'quadrant_b_velocity_override',
		'quadrant_c_velocity_override',
		'quadrant_d_velocity_override',
		'unison',
		'crosstalk',
		'volume_override',
		'expander',
		'change_filter'].includes(item))
}

function isModline(item){
	return item.includes('modline')
}

function loadModlines(p, preset){
	let el = document.getElementById(p),
			messageTypeMatch = /quadrant_([a-d])_modline_([1-6])_message_type/.exec(p),
		  messageTypeVal, ccTypeID, ccNumberID

	if(messageTypeMatch){
		messageTypeVal = preset[messageTypeMatch[0]]
		ccTypeID = "#" + messageTypeMatch[0]
		ccNumberID = "#" + messageTypeMatch[0].replace('message_type', 'cc_number')

		if(messageTypeMatch[2] == 1){
			el.value = 'Note'
		} else {
			if(messageTypeVal == -1) return;
			// console.log('messageTypeMatch', messageTypeMatch, '\nmessageTypeVal', messageTypeVal)
			// create extra modlines
			if(messageTypeMatch[2] > 1) create(messageTypeMatch[1])

			let $ccTypeEl = $(ccTypeID), $ccEl = $(ccNumberID)
			if(messageTypeVal > -1){ // is cc
				$ccTypeEl.val('cc')
				$ccEl.parents('.input-group').addClass('cc')
				$ccEl.val(messageTypeVal)
			} else { // set non-cc message types
				$ccTypeEl.val(messageTypeVal)
			}
		}
	} else {
		// set other modline values
		if(el){
			el.value = preset[p]
			if(p.includes('source')) {
				if(!(preset[p] % 2 === 0)){
					$('#' + p.replace('source', 'invert_source')).addClass('active')
					el.value = +preset[p] - 1
				}
			}
		} else {
			// set gain here
			let gainMatch = /quadrant_([a-d])_modline_([1-6])_gain/.exec(p)
			if(gainMatch){
				let quadrant = gainMatch[1], modlineNumber = gainMatch[2],
						lsb = preset['quadrant_' + quadrant + '_modline_' + modlineNumber + '_gain_lsb'],
						msb = preset['quadrant_' + quadrant + '_modline_' + modlineNumber + '_gain_msb']
				// console.log('>> quadrant', quadrant, 'modlineNumber', modlineNumber, '[lsb, msb]', [lsb, msb])
				setModGain(quadrant, modlineNumber, [lsb, msb])
			}
		}
	}
	// console.log('item', p, preset[p])
}

function getCurrent(compare = false){
	// console.log('getCurrent', currentPreset)
	return (compare) ? currentComparePreset : currentPreset;
}

function set(presetType, presetObject, update = false){
	let isArr = Array.isArray(presetObject);
	let isObj = isPlainObject(presetObject);

	if(isArr){
		boppadPresets[presetType] = presetObject;
	} else if(isObj){
		if(presetType == 'device'){
			let preset, presetNum = presetObject.preset_num, presetName = ''
			// ignore edit buffer
			if(presetNum == 0) return
			// backwards compat
			if (Object.keys(presetObject).includes('presetName[1]')) {
				presetName = buildPresetName(presetObject);
			} else {
				presetName = "on device " + presetNum;
			}

			preset = Object.assign({}, presetObject, {
        name: presetName,
      });

			boppadPresets[presetType].push(preset);
			// when we have all four presets, send message to build menu
			if(boppadPresets[presetType].length == 4) {
				$(document).trigger("devicepresetsready");
			}			
		} else if(update) {
			let presetName = presetObject.name,
					presetIndex = boppadPresets[presetType].findIndex(preset => preset.name === presetName);
			// replace preset at the same index
			boppadPresets[presetType][presetIndex] = presetObject
		} else if(presetType == 'usertables') {
			boppadPresets[presetType].push(presetObject);
			// when we have all four tables, send message to build menu
			let user = boppadPresets[presetType].filter(table => table.name.toLowerCase().includes('user'))
			if(user.length == 4) $(document).trigger('usertablesready')
		} else {
			boppadPresets[presetType].unshift(presetObject);
		}
	} else {
		console.warn('presets need to be all:array or single:object');
		return;
	}
}

function get(presetType, presetIndex){
	// on preset load; sets the (current|compare)Preset
	currentComparePreset = Object.assign({}, boppadPresets[presetType][presetIndex]);
	return currentPreset = Object.assign({}, boppadPresets[presetType][presetIndex]);
}

function resetDevicePresetArray(){
	boppadPresets['device'].length = 0
}

function remove(){
	let p = $('#preset_sel').find('option:selected'),
			pIndex = p.val();
	// only remove user presets
	boppadPresets['user'].splice(pIndex, 1);
}

function build(selectedState = false){
	let presets = boppadPresets,
			presetType = {},
			presetMenu = $('#preset_sel'),
			presetOptions = [], useGroups = true

	for(presetType in presets){
		// ignore usertables || no presets in group
		if(presetType === 'usertables' || !presets[presetType].length) continue

		let optGroupStart = '<optgroup label="' + presetType.capitalize() + '">', optGroupEnd = '</optgroup>';

		if(useGroups) presetOptions.push(optGroupStart);

		presets[presetType].map(function(preset, i){
			let presetOption = '<option data-preset-type="' + presetType + '" value="' + i + '">' + preset.name.capitalize() + '</option>';
			presetOptions.push(presetOption);
		});

		if(useGroups) presetOptions.push(optGroupEnd);
	}

	// attach to select
	presetMenu.empty().append(presetOptions.join(''));

	// select current menu item
	if(selectedPresetIndex != undefined && selectedState) presetMenu.find('option').eq(selectedPresetIndex).prop('selected', true);

	// disble send button when no user presets exists
	// if([...presetMenu.find('option')].filter(o => o.dataset.presetType == 'user').length === 0) {
	// 	document.querySelector('#sendpreset').disabled = true
	// } else {
	// 	document.querySelector('#sendpreset').disabled = false
	// }
}

function updatePreset(id, value){
	let ID, VALUE, multi

	if(id.includes('cc_number')){
		ID = id.replace('cc_number', 'message_type')
		VALUE = value
	} else if(isModGain(id)){
		multi = setModlineGain(id)
	} else if(id.includes('channel')){
		ID = id
		VALUE = value - 1
	} else if(id.includes('quadrant') && id.includes('sensitivity')){
		multi = setSensitivity(id, currentPreset);
	} else if(id.includes('quadrant') && id.includes('gain')) {
		ID = id
		VALUE = ~~(value * 100)
	} else {
		ID = id
		VALUE = value
	}
	// handles selecting CC without value
	// this seems to cause issues sometimes
	VALUE = (VALUE == 'cc') ? 0 : VALUE

	if(multi){
		Object.keys(multi).forEach(item => {
			$(document).trigger('presetChange', [multi[item][0], multi[item][1]])
			// update currentPreset
			currentPreset[multi[item][0]] = multi[item][1]
		})
	} else {
		$(document).trigger('presetChange', [ID, VALUE])
	}
	// update currentPreset
	// since modline gain gets set as msb / lsb the key/id isn't in the preset
	// this prevents any undfined keys from being set on the preset
	if(ID === undefined || VALUE === undefined) return 
	
	currentPreset[ID] = VALUE
	// console.log('update current preset', id, value, ID, VALUE)
	// console.log('currentPreset', currentPreset)
}

function setModlineGain(id){
	if(id && isModGain(id)){
		return getModGain(id, currentPreset)
	}
}

function checkType(){
	let presetType = $('#preset_sel').find('option:selected').data('preset-type');
	// en|disable buttons
	if(presetType == 'user'){
		deleteBtn.attr('disabled', false)
	} else {
		deleteBtn.attr('disabled', true);
	}

	resetButtons()
}

function checkValues(item){
	let currentPresetType = $('#preset_sel').find('option:selected').data('preset-type'),
			itemValue = $('#' + item).val(), itemsValues = {}

	itemsValues[item] = itemValue

	// :: handle modGain and other calculated values
	if(isModGain(item)){
		delete itemsValues[item];
		delete changedValues[item];

		let gainValues = getModGain(item, currentComparePreset, false)
		itemsValues[gainValues['lsb'][0]] = gainValues['lsb'][1]
		itemsValues[gainValues['msb'][0]] = gainValues['msb'][1]

		changedValues[gainValues['lsb'][0]] = gainValues['lsb'][1]
		changedValues[gainValues['msb'][0]] = gainValues['msb'][1]

	} else if(item.includes('channel')) {
		itemsValues[item] -= 1;
	} else if(isModType(item)) {
		//if this is modtype and its value is cc, change its value to cc_number
		if(itemsValues[item] == 'cc') {
			itemsValues[item] = $('#' + item).next().val()
		}
	} else if(isCC(item)){
		// if is cc_number, delete item, change to message_type and set cc_number value
		delete itemsValues[item];
		itemsValues[item.replace('cc_number', 'message_type')] = $('#' + item).val()
	} else if(item.includes('source')){
		let invertSourceValue = $('#'+item.replace('source', 'invert_source')).data('sourceValue')
		itemsValues[item] = invertSourceValue ? +invertSourceValue : +$('#' + item).val()
	} else if(item.includes('quadrant') && item.includes('sensitivity')){
		let amp = getQuadSens(itemValue), quadrant = /quadrant_([a-d])_sensitivity/.exec(item)

		delete itemsValues[item];

		if(quadrant){
			itemsValues['quadrant_' + quadrant[1] + '_on_amp'] = amp[0]
			itemsValues['quadrant_' + quadrant[1] + '_off_amp'] = amp[1]
		}
	} else if(item.includes('quadrant') && item.includes('gain')){
		itemsValues[item] *= 100
	}

	// compare values
	Object.keys(itemsValues).map( item => {
		if(itemsValues[item] == currentComparePreset[item]){
			delete changedValues[item];
		} else {
			changedValues[item] = +itemsValues[item];
		}
	})

	if(isEmpty(changedValues)){
		disableButtons();
	} else {
		enableButtons(currentPresetType);
	}
	// handle toggle values [quadrant_[a,b,c,d]_sensitivity, full_vol_change]
	// -> if value != -1 -> enable
	// console.log('change values item', item, 'value', itemValue)
	// console.log('>> changedValues:', changedValues, '\nitemsValues:', itemsValues);
}

function resetChangedvalues(){
	changedValues = {}
}

function enableButtons(type){
	if(type == 'user') saveBtn.prop('disabled', false).addClass('savable');
	revertBtn.prop('disabled', false).addClass('savable');
}

function disableButtons(){
	saveBtn.prop('disabled', true).removeClass('savable');
	revertBtn.prop('disabled', true).removeClass('savable');
}

function resetButtons(){
	saveBtn.prop('disabled', true).removeClass('savable');
	revertBtn.prop('disabled', true).removeClass('savable');
	resetChangedvalues()
}

function buildLoadCheck(selectedState = false){
	build(selectedState);
	load();
	checkType();
}

function setAll(id, value){
	// create / delete modlines
	let quads = ['a', 'b', 'c', 'd'], quadrantMatch = /quadrant_([a-d])_/.exec(id)
	if(quadrantMatch) {
		quads.filter(q => q != quadrantMatch[1])
		.forEach(quad => {
			let otherQuadItem = id.replace('quadrant_' + quadrantMatch[1], 'quadrant_' + quad)

			// set value
			$('#' + otherQuadItem).val(value)
			// trigger change?
			$('#' + otherQuadItem).trigger('change')

			// toggle buttons
			// console.log('isButton', isButton(id))
			if(isButton(id)) toggleButtons($('#' + otherQuadItem))
			// update preset
			checkValues(otherQuadItem);
			// handles item being updated twice when value is cc
			if(value != 'cc') updatePreset(otherQuadItem, value);

		})
	}
}

function importRebuild() {
	console.log('>> rebuilding presets after import')

	build();
	resetChangedvalues();
	resetSolo();
	clearSetUpdate();
	activateQuadrant();
	load()
	sendSysex({'type':'preset'});
}

export {
	boppadPresets,
	load,
	remove,
	get,
	set,
	getCurrent,
	enableButtons,
	disableButtons,
	resetButtons,
	updatePreset,
	checkType,
	checkValues,
	build,
	buildLoadCheck,
	importRebuild,
	currentPreset,
	currentComparePreset,
	setModlineGain,
	resetChangedvalues,
	resetDevicePresetArray,
	setAll
}
