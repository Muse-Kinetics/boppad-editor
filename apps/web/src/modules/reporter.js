// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

export default function reporter(dict, data){
	let channel = data[0] & 0xf,
			type = data[0] & 0xF0,
			key = data[1],
			value = data[2]

	// if channel is not active quadrant --> ignore
	if(dict.channel != channel) return

	if(type == 144) {
		if(dict['note']) {
			dict['note'].val(value)
		}
	} else if(type == 176){
		if(dict[type + ':' + key]) dict[type + ':' + key].val(value)
	} else if(type == 208){ // channel pressure only has two bytes
		if(dict[type]) dict[type].val(key)
	} else {
		if(dict[type]) dict[type].val(value)
	}
}
