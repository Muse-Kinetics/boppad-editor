// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import { template } from 'lodash'
import { convert16to8, convert8to16, isOn } from './utilities'
import { getCurrent, checkValues, updatePreset } from './presetHandler'

let modlineCount = {'a': 1, 'b': 1, 'c': 1, 'd': 1},
		limit = 6,
		messageTypes = {},
		modline_template = [
'<div class="clearfix modline" data-modCount="${ modlineCount[quad] + 1 }">',
	'<div class="input-group">',
		'<select class="message-type" name="" id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_message_type">',
			'<option value="-1" data-message-type="off" selected>Off</option>',
			'<option value="-4" data-message-type="224">Pitch Bend</option>',
			'<option value="-2" data-message-type="208">Channel Pressure</option>',
			'<option value="-3" data-message-type="160">Poly Aftertouch</option>',
			'<option value="cc" data-message-type="176">CC</option>',
		'</select>',
		'<input id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_cc_number" class="cc-number" type="number" min="0" max="127" step="1" value="0">',
	'</div>',
	'<select class="mod-voice" name="" id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_source">',
		'<option value="-1" selected>Off</option>',
		'<option value="0">Velocity</option>',
		'<option value="2">Pressure</option>',
		'<option value="4">Initial Radius</option>',
		'<option value="6">Radius</option>',
		'<option value="8">Radius (rel)</option>',
	'</select>',
	'<button id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_invert_source" class="btn toggle invert-source" value="-1">Invert</button>',
	'<input id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_gain" class="gain" type="number" min="0.1" max="1.75" step="0.01" value="1.00">',
	'<input id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_offset" class="offset" type="number" min="0" max="127" step="1" value="0">',
	'<select class="curve" name="" id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_table">',
		'<option value="0" selected>Linear</option>',
		'<option value="1">Logarithmic</option>',
		'<option value="2">Exponential</option>',
		'<option value="3">Light</option>',
		'<option value="4">Medium</option>',
		'<option value="5">Hard</option>',
		'<option value="6">Dynamic</option>',
		'<option value="7">User Table 1</option>',
		'<option value="8">User Table 2</option>',
		'<option value="9">User Table 3</option>',
		'<option value="10">User Table 4</option>',
	'</select>',
	'<input id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_min" class="min" type="number" min="1" max="127" step="1" value="0">',
	'<input id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_max" class="max" type="number" min="1" max="127" step="1" value="127">',
	'<button id="quadrant_${ quad }_modline_${ modlineCount[quad] + 1 }_solo" class="btn toggle solo">Solo</button>',
	'<input class="reporter" type="text">',
'</div>'
].join('');

let compiled = template(modline_template);

function createModline(quadrant){
	$('.modline-sets').filter('[data-quadrant="' + quadrant.toUpperCase() + '"]').append(compiled({quad: quadrant, modlineCount: modlineCount}));
};

function create(quadrant = document.body.dataset.active){
	if(modlineCount[quadrant.toLowerCase()] == limit) return;
	// console.log('create', quadrant)
	createModline(quadrant.toLowerCase());

	modlineCount[quadrant.toLowerCase()]+=1;

	// build modline reporter
	buildMessageTypes();
	// console.log('::add::modline modlineCount', modlineCount)
	// do we want to trigger this at all?
	$(document).trigger('modlineadded', [quadrant.toUpperCase(), modlineCount])
}

function createAllModlines(quadrant = document.body.dataset.active){
	let quads = ['a', 'b', 'c', 'd']

		quads.filter(q => q != quadrant.toLowerCase())
		.forEach(quad => {
			create(quad)
		})
}

function removeAllModlines(quadrant = document.body.dataset.active){
	[...document.querySelectorAll('.modline-sets')]
		.filter( set => {
			return set.dataset.quadrant != quadrant
		})
		.forEach( modline => {
			let lastModline = $(modline).find('.modline:last')
			lastModline.remove()
		})
}

function removeMod(all = false){ // all=true is called on preset load and removes all modlines before creating them from the preset
	let modLines = $('.modline-sets'), userMods = modLines.find('.modline:not(.default)'),
			userModsActive = modLines.filter('.active').find('.modline:not(.default)'),
			activeQuadrant = document.body.dataset.active;

	if(all) {
		userMods.remove();
		resetModlines()
		modlineCount = {'a': 1, 'b': 1, 'c': 1, 'd': 1};

	} else {
		// ignore if last modline
		if(modlineCount[activeQuadrant.toLowerCase()] < 2) return;
		// reset modline before remove
		resetModline()

		userModsActive.last().remove();
		modlineCount[activeQuadrant.toLowerCase()]-=1;
	}

	// build modline reporter
	buildMessageTypes();

	// send preset update
	// checkValues(sourceID);
	// updatePreset(sourceID, preset[sourceID]);
	// console.log('::remove::modline', activeQuadrant, 'modlineCount',  modlineCount[activeQuadrant.toLowerCase()], modlineCount)
	// console.log('mod modlineCount', modlineCount)
	$(document).trigger('modlineremoved', [activeQuadrant.toUpperCase(), modlineCount])
}

function activate(quadrant = 'A'){
	let $ms = $('.modline-sets');
	$ms.removeClass('active').hide();
	$ms.filter('[data-quadrant="'+ quadrant +'"]').addClass('active').show();
}

function isModGain(item){
	return item.includes('modline') && item.includes('gain')
}

// sets preset gain
function getModGain(item, preset, send = true){
	let itemValue = $('#' + item).val(),
			match = /quadrant_([a-d])_modline_([1-6])_gain/.exec(item),
			value = convert16to8(itemValue, 100)

	if(match.length == 0) return

	let LSB = 'quadrant_' + match[1] + '_modline_' + match[2] + '_gain_lsb'
	let MSB = 'quadrant_' + match[1] + '_modline_' + match[2] + '_gain_msb'

	// set preset props
	if(send){
		preset[LSB] = value[0]
		preset[MSB] = value[1]
	}

	return {
		lsb: [LSB, value[0]],
		msb: [MSB, value[1]]
	}
}

// sets editor gain
function setModGain(quadrant, modlineNumber, valueArr){
	let gainEl = document.querySelector('#quadrant_'+ quadrant +'_modline_' + modlineNumber+ '_gain')
	if(gainEl) gainEl.value = convert8to16(valueArr, 100)
}

function isModType(item){
	return item.includes('message_type')
}

function isCC(item){
	return item.includes('cc_number')
}

function buildMessageTypes() {
	let activeQuadrant = document.querySelector('body').dataset.active

	messageTypes = {}
	// set quadrant midi channel
	messageTypes['channel'] = getChannel(activeQuadrant)
	// set note reporter
	messageTypes['note'] = $('.modline-sets.active').find('.master').find('.reporter')
	messageTypes['notes'] = getNotes(activeQuadrant)

	$('.modline-sets.active').find('.message-type').each(function(index, el) {
		let messageType = $(this).find(':selected').data('messageType'),
				voice = $(this).parent().siblings('.mod-voice').find(':selected'),
				ccValue,
				messageTypeKey,
				reporterEl

		if(messageType == 176) {
			ccValue = $(this).next('.cc-number').val()
			messageTypeKey = messageType + ':' + ccValue
		} else {
			messageTypeKey = '' + messageType
		}

		reporterEl = $(this).parents('.modline').find('.reporter')

		// check if DUPE or OFF
		if(messageTypes[messageTypeKey]) {
			reporterEl.val('DUPE').prop("disabled", true);
		} else if(messageTypeKey == 'off') {
			reporterEl.val('OFF').prop("disabled", true);
		} else if(voice.val() == -1){
			reporterEl.val('OFF').prop("disabled", true);
		} else {
			reporterEl.val('').prop("disabled", false);
			messageTypes[messageTypeKey] = reporterEl
		}
	});

	// console.log('messageTypes', messageTypes)
}

function getChannel(quadrant = 'A'){
	return document.querySelector('#quadrant_'+ quadrant.toLowerCase() +'_channel').value - 1
}

function getChannels(){
	return ['a', 'b', 'c', 'd'].map(getChannel)
}

function getNotes(quadrant = 'A'){
	return $.map($('.quadrant-notes[data-quadrant=' + quadrant + ']').find('input'), input => isOn(input.value) )
}
// gets preset modline modlineCount
function getModlineCount(preset = {}){
	return Object.keys(preset).filter(item => {
		return item.includes('message_type') && preset[item] != -1
	}).reduce( (prev, curr) => {
		let match = /quadrant_([a-d])_modline_([1-6])_message_type/.exec(curr);
		(match.length) ? prev[match[1]] = +match[2] : null;
		return prev
	}, {})
}

// check all values in last modline compared to preset
function checkModlineValues(preset = {}, quadrant = 'a', modline = 1){
	let modlineSet = $('.modline-sets.active[data-quadrant='+ quadrant.toUpperCase() + ']'),
			modChildren = modlineSet.find('.modline:last').children(), editorVal, presetVal,
			presetMessageTypeValue = preset['quadrant_' + quadrant + '_modline_' + modline + '_message_type']

	let equality = Array.from(modChildren).reduce((collection, item) => {
		let messageTypeVal = $(item).children('.message-type').val(), ccVal = $(item).children('.cc-number').val()

		if(item.classList.contains('invert-source')
			|| item.classList.contains('reporter')
			|| item.classList.contains('solo')) collection.push(true)

		if(!item.id){
			if(messageTypeVal == 'cc'){
				if(ccVal == presetMessageTypeValue) {
					collection.push(true)
				} else {
					collection.push(false)
				}
			} else {
				if(messageTypeVal == presetMessageTypeValue) {
					collection.push(true)
				} else {
					collection.push(false)
				}
			}
		} else {
			if(item.id.includes('gain')){
				let modGain = getModGain(item.id, preset, false)

				if(modGain.lsb[1] == preset[modGain.lsb[0]] && modGain.msb[1] == preset[modGain.msb[0]]) {
					collection.push(true)
				}
			} else {
				if($(item).val() == preset[item.id]) collection.push(true)
			}
		}

		return collection
	}, [])
}

function invertSource(button){
	let preset = getCurrent(),
			id = button.attr('id'),
			isActive = button.hasClass('active'),
	// get the quadrant and modline
			quadMod = /quadrant_([a-d])_modline_([1-6])_invert_source/.exec(id),
			quad = quadMod[1],
			mod = quadMod[2],
	// get the value of quadrant_x_modline_n_source
			source = $('#quadrant_' + quad + '_modline_' + mod + '_source'),
			sourceID = source.attr('id')

	if(!isActive){
		preset[sourceID] = +preset[sourceID] - 1
		$('#'+id).data('sourceValue', null)
	} else {
		preset[sourceID] = +preset[sourceID] + 1
		$('#'+id).data('sourceValue', +preset[sourceID])

	}

	// send preset update
	checkValues(sourceID);
	updatePreset(sourceID, preset[sourceID]);
}

function setAllInvert(button){
	let quadrants = ['a', 'b', 'c', 'd'],
			id = button.attr('id'),
			quadMod = /quadrant_([a-d])_modline_([1-6])_invert_source/.exec(id),
			quad = quadMod[1],
			mod = quadMod[2]

	quadrants
		.filter(q => q != quad)
		.forEach(quadrant => {
			let button = $(`#quadrant_${quadrant}_modline_${mod}_invert_source`)

			button.toggleClass('active')
			invertSource(button)
		})
}

function resetModlines(modline = 1){
	let $modlines = $('.modline[data-modCount='+ modline +']'),
			classes = {
				'message-type': -1,
				'cc-number': 0,
				'mod-voice': -1,
				'curve': 0,
				'gain': '1.00',
				'offset': 0,
				'min': 0,
				'max': 127
			}

	$modlines.map( (i, modline) => {
		let $M = $(modline)
		$M.find('.input-group').removeClass('cc')
		Object.keys(classes).map( item => {
			$M.find('.' + item).val(classes[item])
		})
	})
}

function resetModline(){
	let classes = {
		'message-type': -1,
		'mod-voice': -1,
		'curve': 0,
		'gain': '1.00',
		'offset': 0,
		'min': 0,
		'max': 127
	},
	lastModline = $('.modline-sets.active').find('.modline:last')
	// reset itemsValues
	lastModline.find('.input-group').removeClass('cc')

	Object.keys(classes).map( item => {
		let id = lastModline.find('.' + item).attr('id')
		// prevent resetting of message_type
		if(id.includes('cc')) return

		$('#' + item).trigger('input').trigger('change').val(classes[item])

		updatePreset(id, classes[item])
		checkValues(id)
	})
}

// receive quadrantactivated event
// $(document).on('quadrantactivated', (e, data) => console.log('quadrantactivated from ./modline', data))

export {
	modlineCount,
	create,
	createAllModlines,
	removeAllModlines,
	removeMod,
	activate,
	isModType,
	isCC,
	isModGain,
	getModGain,
	setModGain,
	buildMessageTypes,
	messageTypes,
	getModlineCount,
	checkModlineValues,
	invertSource,
	setAllInvert
}
