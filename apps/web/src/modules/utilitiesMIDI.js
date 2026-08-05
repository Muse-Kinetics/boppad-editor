// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import {isWindows, isLinux} from './utilities'

// ignore non BopPad ports, Expander port
export function isValidPort(name, bootloader = true) {
    const device = 'BopPad';
    if (name.includes(device) && name.includes('Expander')) {
		return true
	} else if (name.includes('BopPad Bootloader')) {
		return bootloader ? true : false
	} else if (isWindows()) {
		return (name.includes(device) && !name.includes('MIDI'))
	} else if (isLinux()) {
		return name.includes(device) && name.includes('MIDI 1')
	} else {
		return name.includes(device)
	}
}

export function getMidiPorts(access, callback) {
  const ports = [{ value: 'none', label: 'None', disabled: false }]
  access.outputs.forEach(port => {
    if (!isValidPort(port.name)) { // ignore BopPad
      if(window._debug === 'midithru') console.log('>> get ports:', port.name, port.type)
      ports.push({
        value: port.name,
        label: port.name,
        port: port
      })
      // explicitly open port to send without implicit open
      port.open()
    }
  })
  // update port list in preferences
  callback()

  // return array for window.midithruports
  return ports
}
