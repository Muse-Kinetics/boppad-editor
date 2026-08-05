// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//************************************************************
//***  BopPad Preset Sysex Generator Script
//************************************************************
//************************************************************
//** copyright 2012 Keith McMillen Instruments
//** dan mcanulty <dan@keithmcmillen.com>
//** brent allen <brent@bebopsensors.com>
//** andrej hronco <andrej@keithmcmillen.com>
//************************************************************

import presetModel from "./presetModel3";

// variables
let SX_ENCODE_LEN = 7;
let sysex_start = 0xF0; // 240
let sysex_end   = 0xF7; // 247
let SX_PACKET_START = 0x01; // 1
let PRESET_START = 0xA1; //161

let high_bits = 0;
let high_count = 0;

let indentity = {
 	manufacturer_id1: 0x00, // 0
	manufacturer_id2: 0x01, // 1
	manufacturer_id3: 0x5F, // 95
	manufacturer_id4: 0x7A, // 122
	product: 		  		117,
	format: 		  		0x00
};

let presetModelKeys = Object.keys(presetModel);

function getSysex(currentPreset) {
	// merge currentPreset with presetModel
	let mergedPreset = Object.assign({}, presetModel, currentPreset);
	let presetKeys = Object.keys(mergedPreset);

	let PRESET_LENGTH = presetKeys.length; // 2.x = 432, 3.x = 448
	let PRESET_LENGTH_MSB = (PRESET_LENGTH >> 8);
	let PRESET_LENGTH_LSB = (PRESET_LENGTH & 0xFF);

	let data;

	let sumByte = 0;
	chunk_init();

	// set up Writer
	let fullPresetSysex = new Uint8Array(531); // 1.x = 411, 2.x = 515 (506+9), 3.x = 531 (522+9)
	let fullWriter = Writer(fullPresetSysex);

	// sysex header
	groupWriter(fullWriter, sysex_start, indentity);

	// preset packet start
	groupWriter(fullWriter, SX_PACKET_START, 0x22, 0x20);

	// preset body start
	[PRESET_START, PRESET_LENGTH_MSB, PRESET_LENGTH_LSB].forEach(item => encodedWrite(fullWriter, item));

	// preset body
	presetKeys.forEach(function(key){
		// encode name
		if(key.includes('presetName')) {
			if (typeof mergedPreset[key] === 'string') {
				data = mergedPreset[key].charCodeAt() || 0;
			} else {
				data = mergedPreset[key];
			}
		} else {
			data = mergedPreset[key];
		}

		encodedWrite(fullWriter, data);

		sumByte += data;
		sumByte &= 0xFF;
	})

	encodedWrite(fullWriter, sumByte);

	midi_sx_flush(fullWriter);

	pushSysex(fullWriter, sysex_end);

	return fullWriter.get();
}

// single preset property -> sysex
function presetUpdate(itemValue) {
	// set up Writer
	let partPresetSysex = new Uint8Array(19);
	let partWriter = Writer(partPresetSysex);

	let item = itemValue[0], value = itemValue[1]

	let offset = presetModelKeys.indexOf(item)

	// if item doesn't exist
	if(offset == -1) return

	chunk_init();

	// sysex header
	groupWriter(partWriter, sysex_start, indentity);

	// preset packet start
	groupWriter(partWriter, SX_PACKET_START, 0x22, 0x21);

	encodedWrite(partWriter, PRESET_START);		// Preset data start
	encodedWrite(partWriter, 0x01);				// Number of bytes (always 1)

	encodedWrite(partWriter, offset >> 8);		// Byte index MSB
	encodedWrite(partWriter, offset & 0x00FF);	// Byte index LSB

	encodedWrite(partWriter, value);				// Byte of data

	midi_sx_flush(partWriter);

	pushSysex(partWriter, sysex_end);

	return partWriter.get()
}

function soloModline(soloSet){
	// set up Writer
	let soloSysex = new Uint8Array(43);
	let soloWriter = Writer(soloSysex);
	let nonZero = (soloSet.includes(1)) ? true : false

	chunk_init();

	// sysex header
	groupWriter(soloWriter, sysex_start, indentity);
	// solo packet start
	groupWriter(soloWriter, SX_PACKET_START, 0x43, 0x00);
	// data start
	encodedWrite(soloWriter, PRESET_START);
	// encode soloSet
	soloSet.forEach(solo => {
		if(nonZero){
			encodedWrite(soloWriter, solo)
		} else {
			encodedWrite(soloWriter, 1)
		}
	})
	// flush
	midi_sx_flush(soloWriter);
	// sysex end
	pushSysex(soloWriter, sysex_end);

	return soloWriter.get()
}

// takes table array and packages it for sending to device
function userTable(tableIndex, table){ // index, array
  let userTable = new Array(128),
      tableWriter = Writer(userTable), // maybe this is wrong
      sumByte = 0

  let PRESET_LENGTH = userTable.length;
  let PRESET_LENGTH_MSB = (PRESET_LENGTH >> 8);
  let PRESET_LENGTH_LSB = (PRESET_LENGTH & 0xFF);

  chunk_init();

  // sysex header
	groupWriter(tableWriter, sysex_start, indentity);
  // solo packet start
	groupWriter(tableWriter, SX_PACKET_START, 0x55, 0x00);
  // preset body start
  [PRESET_START, PRESET_LENGTH_MSB, PRESET_LENGTH_LSB].forEach(item => encodedWrite(tableWriter, item));
  // table number
  encodedWrite(tableWriter, tableIndex);
// do we need to reset sumByte to 0?
  table.forEach(value => {
    encodedWrite(tableWriter, value);
    sumByte += value;
    sumByte &= 0xFF;
  })

  encodedWrite(tableWriter, sumByte);

  midi_sx_flush(tableWriter);

  pushSysex(tableWriter, sysex_end);

  return tableWriter.get();

}

let Writer = function Writer(uint8Array){
	let array = uint8Array, index = 0
	return {
		add: function(char){
			array[index] = char
			index++
		},
		get: function(){
			return array
		}
	}
}

function pushSysex(writer, item) {
	if(writer){
		writer.add(item)
	} else {
		console.error('no writer');
	}

}

function groupWriter(writer, ...items){
	items.map(function(item){
  	if(!isObject(item)) writer.add(item)

		for(let i in item){
			writer.add(item[i])
    }
  })
}

function isObject(x) {
	return typeof x === 'object' && x !== null;
}

function chunk_init() {
	high_bits = high_count = 0;
}

function encodedWrite(writer, val) {
	high_bits |= (val & 0x80);
	high_bits >>= 1;
	pushSysex(writer, val & 0x7f);
	if (++high_count == SX_ENCODE_LEN) {
		high_count = 0;
		//High Bit Decode Byte
		pushSysex(writer, high_bits);
	}
}

function midi_sx_flush(writer) {
	while(high_count){
		encodedWrite(writer, 0);
	}
}

export { getSysex, presetUpdate, soloModline, userTable }
