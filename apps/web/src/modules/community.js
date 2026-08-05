// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

/*
	onload: fetch presets to localStorage 
					build menu
	
	onselect: load preset description

	onclick [load]: load preset
									add to main presets menu under 'Community'
										this means that community presets would need to be added to boppadPresets
											boppadPresets.community = []


	todo:
		preset name conflicts
*/

function load(url, cb){
	$.getJSON( url )
		.done(function( data ) {

			if(cb) cb(data);

			return data;
		})
		.fail(function( jqxhr, textStatus, error ) {
			var err = textStatus + ', ' + error;
			console.log( 'Failed: Presets Not Loaded' + err );
	});
}

function save(preset) {
	$.ajax({
		url: 'https://files.keithmcmillen.com/presets/community/json.php',
		data: {
			name: preset.name,
			json: JSON.stringify(preset)
		},
		dataType: 'json',
		type: 'POST'
	})
	.done(function( msg ) {
  	console.log( 'Data Saved: ' + msg );
	})
	.fail(function( jqXHR, textStatus ) {
	  console.log( 'Request failed: ' + textStatus );
	});
}

export { load, save }