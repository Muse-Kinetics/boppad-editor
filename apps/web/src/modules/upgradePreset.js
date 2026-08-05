// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

/* TODO: handle presets that are more than one version back
      check for changed item in current preset?
      ex. if change_filter; preset doesn't need to be update from 2.1.0
*/

import presetModel from './presetModel3'
import upgradeDictionary from './upgradeDictionary'
import { entityToChar } from './utilities'
import { save } from './storage'
import { set } from './presetHandler'

// firmware version keys
const versionKeys = ['firmware_v_major', 'firmware_v_minor' ,'firmware_v_patch']

export default function upgradePreset(preset, firmwareVersion){
  let upgradedPreset = Object.assign({}, presetModel, preset),
      [ presetMajor, presetMinor, presetPatch ] = [ preset[versionKeys[0]], preset[versionKeys[1]], preset[versionKeys[2]] ],
      [ major, minor, patch ] = firmwareVersion.split('.'),
      versionBytes = {
        [versionKeys[0]]: major,
        [versionKeys[1]]: minor,
        [versionKeys[2]]: patch
      },
      majorMinorVersion = [major, minor, "0"].join('.'),
      changes = upgradeDictionary[majorMinorVersion]

  console.log(`${entityToChar('&xrArr;')} preset upgrade task: ${ upgradeDictionary[majorMinorVersion].info }`)

  if(changes.action === 'replace'){
      Object.keys(changes.dictionary).forEach(item => delete upgradedPreset[item])
  } else if(changes.action === 'append'){
    // add preset name to new keys
    // set name bytes in preset
    for (let index = 0; index < 16; index++) {
      upgradedPreset[`presetName[${index}]`] =
        preset.name.charCodeAt(index) || 0x00;
    }
  }

  // update version
  upgradedPreset = Object.assign({}, upgradedPreset, versionBytes)

  // update storage
  convertStoredPresets(upgradedPreset)

  // update firmware version in preset
  return upgradedPreset
}

function convertStoredPresets(updatedPreset = {}){
  console.log(`${entityToChar('&xrArr;')} preset ${ updatedPreset.name } upgraded`)
  // save to localStorage
  save(updatedPreset, true)
  // upgrade boppadPresets
  set('user', updatedPreset, true);
}
