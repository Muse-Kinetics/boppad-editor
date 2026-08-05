// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

/*
	TODO:
		make tooltip selectors delegated for creation of modlines
*/

// vendor
import isElectron from 'is-electron';
import tippy, {followCursor} from 'tippy.js';

// modules
import { staticTooltips, presetTooltips } from './tooltipSetup'
import { toggleButtons } from './globalSettings'

tippy.setDefaultProps({
	allowHTML: true,
	animation: 'fade',
	delay: [250, 0],
	arrow: false,
	plugins: [followCursor],
});

let first = true;

// web editor
if(!isElectron()) {
	let tooltipFlag = localStorage.getItem('_boppadtooltips_'),
			tooltipButton = document.querySelector('#tooltips')

	if(tooltipFlag !== null){
		if(tooltipFlag == 'true'){
			// console.log('on')
			toggleTooltips(true)
			tooltipButton.classList.add('active')
			tooltipButton.value = 1
			tooltipButton.innerText = 'Enabled'
		} else {
			// console.log('off')
			toggleTooltips(false)
			tooltipButton.classList.remove('active')
			tooltipButton.value = -1
			tooltipButton.innerText = 'Disabled'
		}
	} else {
		// no tooltip cookie, set
		localStorage.setItem('_boppadtooltips_', true)
		toggleTooltips(true)
	}
}

function toggleTooltips(state = true){
	if(state === true){
		// console.log('tooltips on\n')
		if(!first){
			destroy(staticTooltips.collection)
				.then(() => setup(staticTooltips, 'not first, static'))

			destroy(presetTooltips.collection)
				.then(() => setup(presetTooltips, 'not first, preset'))
		}

		$(document).on('editorready', () => {
			setup(staticTooltips, 'first, editorready, static')
		});

		$(document).on('presetloaded', () => {
			if(!first) destroy(presetTooltips.collection).then(() => setup(presetTooltips, 'not first, presetloaded, preset'))
		})
	} else {
		// console.log('tooltips off\n')
		$(document).off('editorready')
		$(document).off('presetloaded')
		destroy(staticTooltips.collection)
		destroy(presetTooltips.collection)
	}

	first = false;
}

function setup(settings, title = ''){
	// console.log('\ncall setup:', title, settings)
	Object.keys(settings.setup).forEach(name => {
		let selector = settings.setup[name][0],
				els = document.querySelectorAll(selector),
				message = settings.messages[name] || false

		els.forEach(el => {
			settings.collection.push(tippy(el, {
				content: message
			}))
		})
	})
}

function destroy(collection){
	return new Promise((resolve, reject) => {
		if(collection.length) {
				collection.forEach(item => {
			// disable tippy 
				item.disable()
			})
			resolve(true)
		} else {
			resolve(false)
		}
	})
}

globalThis.toggleTooltips = toggleTooltips
