// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import { convertRange } from './utilities'
import noteMap from './noteMap'
import { checkValues, updatePreset } from './presetHandler'

let copiedKeys = [];

function getCurrentQuadrant(){
	return document.querySelector('body').dataset.active
}

function activateQuadrant(quadrant = 'A'){
	$('.quadrant-notes').removeClass('active');
	$('.quadrant-notes[data-quadrant=' + quadrant + ']').addClass('active')
	document.querySelector('body').setAttribute('data-active', quadrant)
	document.querySelector('body').setAttribute('data-unison-quadrant', quadrant)
}

function activateVoice(quadrant = 'A'){
	let $vw = $('.feature-wrap');

	$vw.removeClass('active').hide();

	$vw.filter('[data-quadrant="'+ quadrant +'"]').addClass('active').show();
}

function activateVelocityOverride(quadrant = 'A'){
	let $vow = $('.volume-override-wrap');

	$vow.removeClass('active').hide();

	$vow.filter('[data-quadrant="'+ quadrant +'"]').addClass('active').show();
}

function activateSensitivity(quadrant = 'A'){
	let $sw = $('.sensitivity-wrap');

	$sw.removeClass('active').hide();

	$sw.filter('[data-quadrant="'+ quadrant +'"]').addClass('active').show();
}

function findNote(val = '-1'){
	let emptyElement = $('.quadrant-notes.active')
			.find('input')
			.filter(function(){
				return this.value == val;
			});

	return $('#' + emptyElement[0].id);
}

function setNote(input){
	input = $(input);
	let v = +input.val();

	if(v > 127) v = 127;

	if(v != -1) {
		input.next().html(noteMap[+v]).parent().removeClass('off');
	} else {
		input.next().html('off').parent().addClass('off');
	}
}

function setValue(input){
	let v = +input.val(),
			max = input.attr('max');

	if(v > max) v = max;

	if(v != -1) {
		input.next().html('').parent().removeClass('off');
	} else {
		input.next().html('off').parent().addClass('off');
	}

}

function copy(){
	copiedKeys.length = 0;
	$('.quadrant-notes.active').find('input').each(function(i, el) {
		copiedKeys.push($(this).val());
	});
}

function paste(){
	$('.quadrant-notes.active').find('input').each(function(i, el) {
		$(this).val(copiedKeys[i]);
		checkValues(el.id);
		updatePreset(el.id, copiedKeys[i]);
		// sets keyboard keys
		$(el).trigger('change')
	});
}

function clear(){
	$('.quadrant-notes.active').find('input').each(function(i, el) {
		let id = $(this).attr('id')
		$(this).val(-1).next().html('off').parent().addClass('off');
		checkValues(id);
		updatePreset(id, -1);
	});
}

function clearAll(){
	$('.quadrant-notes').find('input').each(function(i, el) {
		let id = $(this).attr('id')
		$(this).val(-1).next().html('off').parent().addClass('off');
		checkValues(id);
		updatePreset(id, -1);
	});
}

function setSensitivity(id, preset, send = true){
	let itemValue = $('#' + id).val(),
			match = /quadrant_([a-d])_sensitivity/.exec(id),
			value = getQuadSens(itemValue)

	if(!match && !match.length) return

	let ON_AMP = 'quadrant_' + match[1] + '_on_amp'
	let OFF_AMP = 'quadrant_' + match[1] + '_off_amp'
	let DELTA_AMP = 'quadrant_' + match[1] + '_delta_amp'

	// set preset props
	if(send){
		preset[ON_AMP] = value[0]
		preset[OFF_AMP] = value[1]
		preset[DELTA_AMP] = value[1] * 2
		// preset[DELTA_AMP] = value[0] + 2
	}

	return {
		on: [ON_AMP, value[0]],
		off: [OFF_AMP, value[1]],
		delta: [DELTA_AMP, value[1] * 2]
	}
}

function getQuadSens(value){
  let offAmp = 14 - value, onAmp = 26 - (value * 2)
  return [onAmp, offAmp]
}

// receive quadrantactivated event
// $(document).on('quadrantactivated', (e, data) => console.log('quadrantactivated from ./quadrant', data))

export {
	getCurrentQuadrant,
	activateQuadrant,
	activateVoice,
	activateSensitivity,
	activateVelocityOverride,
	getQuadSens,
	setSensitivity,
	findNote,
	setNote,
	setValue,
	copy,
	paste,
	clear,
	clearAll
}
