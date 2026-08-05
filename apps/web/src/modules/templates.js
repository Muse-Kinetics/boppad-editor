// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import { template } from 'lodash'

let Modline = [
'<div class="clearfix modline modline-<%= count %>">',
	'<div class="input-group">',
		'<select class="message-type" name="" id="modline_<%= count %>_destination">',
			'<option value="off" selected>Off</option>',
			'<option value="bend">Bend</option>',
			'<option value="cc">CC</option>',
			'<option value="channel_pressure">Channel Pressure</option>',
			'<option value="poly_aftertouch">Poly Aftertouch</option>',
		'</select>',
		'<input id="modline_<%= count %>_cc_number" class="cc-number" type="number" min="0" max="127" step="1" value="0">',
	'</div>',
	'<select class="voice-a" name="" id="modline_<%= count %>_source_a">',
		'<option value="off" selected>Off</option>',
		'<option value="velocity">Velocity</option>',
		'<option value="velocity_inverted">Velocity (inverted)</option>',
		'<option value="pressure">Pressure</option>',
		'<option value="pressure_inverted">Pressure (inverted)</option>',
		'<option value="radius">Radius</option>',
		'<option value="radius_inverted">Radius (inverted)</option>',
	'</select>',
	'<select class="voice-b" name="" id="modline_<%= count %>_source_b">',
		'<option value="off" selected>Off</option>',
		'<option value="velocity">Velocity</option>',
		'<option value="velocity_inverted">Velocity (inverted)</option>',
		'<option value="pressure">Pressure</option>',
		'<option value="pressure_inverted">Pressure (inverted)</option>',
		'<option value="radius">Radius</option>',
		'<option value="radius_inverted">Radius (inverted)</option>',
	'</select>',
	'<input id="modline_<%= count %>_gain" class="gain" type="number" min="0" max="1.00" step="0.01" value="1.00">',
	'<input id="modline_<%= count %>_offset" class="offset" type="number" min="0" max="" step="1" value="0">',
	'<select class="curve" name="" id="modline_<%= count %>_table">',
		'<option value="linear" selected>Linear</option>',
		'<option value="sine">Sine</option>',
		'<option value="cosine">Cosine</option>',
		'<option value="exponential">Exponential</option>',
		'<option value="logarithmic">Logarithmic</option>',
		'<option value="deadzone">DeadZone</option>',
	'</select>',
	'<input id="modline_<%= count %>_min" class="min" type="number" min="0" max="127" step="1" value="0">',
	'<input id="modline_<%= count %>_max" class="max" type="number" min="0" max="127" step="1" value="127">',
	'</div>'
].join('');

module.exports = {

	modline: function modline(){
		let compiled = template(Modline);
		$('#modline').find('.modline-sets.active').append(mt({count: count}));
		// $('#devices').append(compiled({deviceName: deviceName}));
	}

}