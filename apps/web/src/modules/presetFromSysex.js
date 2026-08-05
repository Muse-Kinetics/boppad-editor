// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import presetModel from "./presetModel3";
import { set as setPreset } from './presetHandler';
const presetModelKeys = Object.keys(presetModel);

let eightByteBuffer = new Array(8)
let byteCount = 0
let packetLength = 0
let tempPreset = {}
let ignoreEditBuffer = true, presetCount = 0

// reset counter each time we send to ignore the edit buffer
$(document).on('resetpresetcounter', () => presetCount = 0)

function makePreset(sysex){
	console.log('>> build device preset', sysex[3], (presetCount == 0) ? 'edit buffer' : '')

	sysex.map(message => {
		decodeBuild(message, preset => {
			if(presetCount == 0) return
			setPreset('device', preset)
		})
	})

	presetCount++
}

function decodeBuild(messageByte, sendPreset) { // sendPreset is a callback
	if(messageByte == 0xF0) {
		byteCount = 0
		packetLength = 0
		tempPreset = {}
	} else if(messageByte == 0xF7) {
		byteCount = 0
		packetLength = 0
		// send preset to preset collection
		sendPreset(tempPreset)
	} else {
		if(byteDecode(messageByte)) {
			for(let i = 0; i < 7; i++) {
				packetLength++
				if(packetLength < 3) {
					 // do nothing
				} else if(packetLength <= presetModelKeys.length+2){ //Within list of names
					// adding the +2 solves the incorrect presetName byte issue, but it feels wrong
					let offset = packetLength - 3

					buildPreset(offset, eightByteBuffer[i]);
				}
				else { //Beyond list of names
					if(packetLength == presetModelKeys.length + 1) {
						// console.log("beyond names", packetLength);
					}
				}
				eightByteBuffer[i] = 0
			}
		}
	}
}

function buildPreset(offset, value) {
	let key = presetModelKeys[offset]

	// sign correction for gain
	if(key.includes('gain') && value < 0) value += 256
	tempPreset[presetModelKeys[offset]] = value
	// console.log("key", key, "offset", offset, "value", value);
}

// De-encode 8 7-bit bytes to 7 8-bit bytes
function byteDecode(inByte) {
	eightByteBuffer[byteCount++] = inByte;
	if(byteCount == 8) {
		for(let i = 0; i < 7; i++) {
			if((eightByteBuffer[7] & (1 << i)) > 0) {
				eightByteBuffer[i] += 0x80;
				if(eightByteBuffer[i] > 127) {
					eightByteBuffer[i] -= 256;
				}
			}
		}

		byteCount = 0
		return 1
	}
	return 0
}

export function decodeTable(data) {
	let userTable = new Array(128), packetSize = 0, tableObject = {}

	eightByteBuffer = [0,0,0,0,0,0,0,0]

	tableObject['name'] = 'User Table ' + data[3]

	for(let packetIndex = 0; packetIndex < data.length; packetIndex++) {
		if(data[packetIndex] == 0xF0) {
			byteCount = 0
			packetLength = 0
			packetSize = 0;
		}
		else if(data[packetIndex] == 0xF7) {
			byteCount = 0
			packetLength = 0
			packetIndex = data.length;
		}
		else {
			if(byteDecode(data[packetIndex])) {
				for(let i=0;i<7;i++){
					packetLength++
					if(packetLength < 3){
						if(eightByteBuffer[i] == -128){
							//Sign-correction
							eightByteBuffer[i] = 128;
						}
						packetSize = (packetSize << 8) + eightByteBuffer[i]
					}
					else if(packetLength <= userTable.length + 3)	{ //Within table
						const offset = packetLength - 4
						userTable[offset] = eightByteBuffer[i]
					}
					else { //Beyond table
						if(packetLength == userTable.length + 4) {
							//SumByte
							if(packetSize == userTable.length) {
								// table decoded
								tableObject['table'] = userTable

								return tableObject
							}
						}
					}
					eightByteBuffer[i] = 0
				}
			}
		}
	}
}

// Manage signed/unsigned conversions
function signCorrect(){
    for(let offset = 0; offset < BP.length; offset++) {
        // All 'unsigned' cases
        const label = presetPackJSON[offset]
        if(label.search("gain") != -1) {
            //Convert negative values to >127 values
            if(BP[offset] < 0) {
                BP[offset] += 256
            }
        }
        else{
        // Otherwise, value is signed
				 //Convert >127 values to negative values
            if(BP[offset] > 127) {
                BP[offset] -= 256
            }
        }
    }
}

export default makePreset
