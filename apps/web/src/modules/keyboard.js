// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import noteMap from './noteMap'
import { findNote, setNote } from './quadrant';

let activeKeys = [],
		activeKeysAll = {'a': [], 'b': [], 'c': [], 'd': []},
		limit = 6;

function activateKey(key, quadrant = 'A'){
	if(!key) return;

	let quad = quadrant.toLowerCase(), keyNote = key.data('key');

	// if key is not already active
	if(!key.hasClass('active')){
		if(activeKeys.length < 6){ // activeKeys[quad].length < limit
			key.addClass('active');
			activeKeys.push(keyNote); // activeKeys[quad].push(keyNote)

			let availableNote = findNote();

			availableNote.val(keyNote);
			availableNote.trigger('change');
		}
	} else { // if key is active remove it
		let noteElement = findNote(keyNote);

		key.removeClass('active');
		activeKeys.splice(activeKeys.indexOf(keyNote),1);
		//activeKeys[quad].splice(activeKeys[quad].indexOf(keyNote),1);

		noteElement.val(-1).next().html('off').parent().addClass('off');
		noteElement.trigger('change');
	}

	// console.log('activeKeys', activeKeys);
}

function clearKeys(quadrant = 'A'){
	let quad = quadrant.toLowerCase()

	globalThis.keyboardKeys.each(function(i, key){
		key.classList.remove('active');
	});

	activeKeys.length = 0;
	//activeKeys[quad].length = 0;
}

function clearKey(key, quadrant = 'A'){
	let quad = quadrant.toLowerCase()

	if(key == undefined || activeKeys.indexOf(+key) != -1 ) return;
	// if(key == undefined || activeKeys[quad].indexOf(+key) != -1 ) return;

	if(key == '-1') key = 0;

	$(globalThis.keyboardKeys[key]).removeClass('active').data('currentinput');

	// console.log('keyboard.clearKey:', key);
}

function setKey(key, id){
	if(key > 127) key = 127;

	$(globalThis.keyboardKeys[key]).addClass('active').data('currentinput', id);
}

function updateActiveKeys(quadrant = 'A'){
	let currentGroup = $('.quadrant-notes[data-quadrant=' + quadrant + ']').find('.quad-note-group'), quad = quadrant.toLowerCase();

	activeKeys.length = 0;
	// activeKeys[quad].length = 0;
	currentGroup.find('input[type=number]').each(function(i, key){
		let keyNote = +key.value;

		if(keyNote !== -1) {
			activeKeys.push(keyNote);
			// activeKeys[quad].push(keyNote);
		}
	});

	// console.log('update activeKeys', activeKeys);
}

function setKeys(quadrant = 'A'){
	let currentGroup = $('.quadrant-notes[data-quadrant=' + quadrant + ']').find('.quad-note-group');

	currentGroup.find('input[type=number]').each(function(){
		let keyNote = +$(this).val(), keyID = $(this).attr('id');

		setNote($(this));

		if(keyNote !== -1) {
			setKey(keyNote, keyID);
		}
	});
}

function findInputFromKey(key, quadrant = 'A'){
	let keyValue = +key.data('key');

	return $('.quadrant-notes[data-quadrant=' + quadrant + ']')
		.find('input')
			.filter(function(){
				return this.value == keyValue
	});
}

function clearSetUpdate(quadrant = 'A'){
	clearKeys();
	setKeys(quadrant);
	updateActiveKeys(quadrant);
}

// receive quadrantactivated event
//$(document).on('quadrantactivated', (e, data) => console.log('quadrantactivated from ./keyboard', data))

// events
$('#keyboard').on('click', '.keyboard-toggle', function() {
	let keyboard = $(this).parent()
	keyboard.toggleClass('open');

	if(keyboard.hasClass('open')){
		$(this).find('span').html('(hide)')
	} else {
		$(this).find('span').html('(show)')
		// clear note display
		keyboard.find('.keyboard-note').html('')
	}
});

// note display on hover
$(document).on('keyboardready', () => {
	let keyboardNote = $('.keyboard-note')

	$('#keyboard').on('mouseover', 'rect', hoverNote)

	function hoverNote(event){
		let key = event.target.dataset.key
		keyboardNote.html('MIDI:' + key + '&nbsp;&nbsp;&nbsp;&nbsp;Note: ' + noteMap[key])
	}
})



export {
	activeKeys,
	activeKeysAll,
	activateKey,
	clearKey,
	clearKeys,
	setKey,
	setKeys,
	updateActiveKeys,
	findInputFromKey,
	clearSetUpdate
}
