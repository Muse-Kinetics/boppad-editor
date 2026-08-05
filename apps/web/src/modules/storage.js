// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import { set as setPreset } from './presetHandler'

function loadAll(query, obj = false){
	// console.log('query', query)
	return new Promise((resolve, reject) => {
		let i, results = [], resultsObj = {}, item;

		for (i in localStorage) {
		  if (localStorage.hasOwnProperty(i)) {
		    if (i.match(query) || (!query && typeof i === 'string')) {
		      item = localStorage.getObject(i);
		      results.push(item);
		      resultsObj[item.name] = item;
		    }
		  }
		}

		if(results.length){
			results = (obj) ? resultsObj : results;

			resolve(results)

		} else {
			(obj) ? resolve({}) : resolve([])
		}

	});
}

function save(item, update = false, prefix = '_boppad_', itemName = ''){
	let unique

	itemName = prefix + ((item.name) ? item.name : itemName).replace(/\s+/g, '_')

	if(update) {
		localStorage.setObject(itemName, item);
	} else if(prefix.includes('tables')) {
		localStorage.setObject(itemName, item);
	} else {
		return getNames().then(names => {
			if(names.includes(item.name)){
				unique = false
			} else {
				localStorage.setObject(itemName, item);
				unique = true
			}

			return unique
		})
	}
}

function remove(name, prefix = '_boppad_'){
	let itemName = prefix + name.replace(/\s+/g, '_');

	if(!localStorage.getItem(itemName)) return;

	localStorage.removeItem(itemName);
}

function getNames(prefix = '_boppad_'){
	return loadAll(prefix)
		.then(presets => presets
			.reduce((names, preset) => {
				names.push(preset.name)
				return names
			}, [])
		)
}

// electron
function exportLocalStorage(prefix = '_boppad_') { // prefix [_boppad_, _boppadusertables_]
	loadAll('^' + prefix, true)
	 	.then( presets => {
			let a = document.createElement('a'), type = (prefix === '_boppad_') ? 'presets' : 'tables';
			a.setAttribute('href', 'data:text/json;charset=utf8,' + JSON.stringify(presets, null, 2));
			a.setAttribute('download', 'boppad_user_' + type + '.json');
			a.click()
	})
}

/*
	for preset and usertables downloading
	function exportUserPresets(){
		// exports user presets
		exportLocalStorage()
		// exports user tables
		setTimeout(() => {
			exportLocalStorage('_boppadusertables_')
		}, 500)
	}
*/

function importLocalStorage(presetsObject, type = 'presets') { // type [presets, tables]
	// separate name check for usertables, as all usertables will have the same name
	getNames().then(names => {
		Object.keys(presetsObject).forEach(name => {
			if(!names.includes(name)){
				console.log('>> importing', type , name)
				let preset = presetsObject[name], prefix = (type === 'presets') ? '_boppad_' : '_boppadusertables_'
				save(preset, prefix)
				if(type === 'presets'){
					setPreset('user', preset)
				} else {
					// handle user tables
					
				}
			} else {
				console.warn('Preset with the name, ' + name + ' already exists')
			}
		})
		// trigger
		$(document).trigger('presetsimported')
	})
}

// might be a better way to do this
globalThis.exportLocalStorage = exportLocalStorage
globalThis.importLocalStorage = importLocalStorage

export { loadAll, save, remove }
