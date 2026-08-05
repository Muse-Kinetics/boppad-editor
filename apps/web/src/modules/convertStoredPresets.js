// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import { loadAll, save } from './storage'

/**
 * changes values from regex search string
 * @function
 * @param Object {object}
 * @param Regex {regex filter}
 */
function changeDefaults(obj, filter, value) {
  let key
  for (key in obj) {
    if (obj.hasOwnProperty(key) && filter.test(key)) {
      obj[key] = value
    }
  }
}

/**
 * converts old preset to new preset structure by updating keys and values
 * @function
 */
function convertStoredPresets(){
	let userPresets = loadAll('^_boppad_')
			.then( presets => {

				presets.forEach( p => {
					let preset = Object.assign({}, p),
							deleteRB = ['reservedBytes[0]', 'reservedBytes[1]'],
							changeRB = ['reservedBytes[2]', 'reservedBytes[3]'],
							regexRB = [/reservedVoiceBytes/, /reservedModBytes/],
							addItems = ['unison', 'crosstalk']


				// delete reservedBytes[0], reservedBytes[1]
					deleteRB.forEach( item => delete preset[item])
				// set default to -1
					changeRB.forEach( item => preset[item] = -1)
				// change value to -1 on array of regex: reservedVoiceBytes, reservedModBytes
					regexRB.forEach( filter => changeDefaults(preset, filter, -1))
				// unison, crosstalk
					addItems.forEach( item => preset[item] = -1)

				// save to localStorage
					// preset.name = preset.name + '_converted'
					save(preset)
					console.log('preset converted', preset.name);
				})
			})
}

export default convertStoredPresets
