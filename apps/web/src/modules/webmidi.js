// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.


export default function webmidi(access, logAccess = false){
  let midi = access, allDevices = [];

  function getPort(type, device, report = true){
    let devices = Array.from(midi[type].values()).filter(port => {
      if(logAccess && !allDevices.includes(port.name + ':' + port.type)) {
        allDevices.push(port.name + ':' + port.type)
        console.log(`>> webmidi device: ${port.name} --> ${port.type}`)
      }
      /*
      // check device.id length if device not found as UWP id's are very long
      if(port.name === device){
        console.log('device name matched', port.name)
        // return true
      } else if(port.name.includes(device) || port.name.includes('Bootloader')) {
        console.log('device name UWP', port.name)
        // UWP names; BopPad [1], BopPad Bootloader [1]
        // return true
      }
      */
      return port.name === device

    })

    if(report && devices.length === 0) console.log(`! >> webmidi: ${device} ${type.replace('puts', 'put')} not found`)

    return devices[0]
  }

  return {
    getInput: (device, report) => getPort('inputs', device, report),
    getOutput: (device, report) => getPort('outputs', device, report)
  }
}
