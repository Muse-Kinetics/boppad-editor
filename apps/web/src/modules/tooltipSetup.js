// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

let staticTooltips = {
	messages: {
    presetselect: 'Select a user, on-device,<br>or factory preset',
    destinations: 'Select which preset slot<br>you want to send a preset to',
    send: 'Send the current preset to the<br>selected destination on BopPad',

    usersave: 'Saves changes to the current preset',
    usersaveas: 'Makes a copy of the preset<br>with a new name',
    userrevert: 'Reverts a preset to its<br>unedited state',
    userdelete: 'Deletes the selected user preset<br>from the editor.<br>This cannot be undone',

    icon: 'Click on a quadrant to select the<br>quadrant. you can also use<br>the shortcut keys shift+z,x,c,v',

    quadrantselection: 'Select a quadrant to edit',
    quadrantcopy: 'Copies the <strong>notes</strong> of<br>the selected quadrant',
    quadrantpaste: 'Pastes the <strong>notes</strong> of<br>the copied quadrant into<br>the selected quadrant',
    quadrantclear: 'Clears the <strong>notes</strong> of<br>the selected quadrant',
    quadrantclearall: 'Clears the <strong>notes</strong> of<br>all quadrants',
    quadrantnote: 'Type in the MIDI note you<br>want the quadrant to output,<br>type in the MIDI note number.<br>Range: 0 - 127, off(-1)',

		quadrantmidichannel: 'Select the MIDI channel that<br>the quadrant sends notes out on.<br>Range: 1 - 16',
		quadrantbankselect: 'Sends this value out whenever<br>the preset is loaded.<br>Range: 0 - 127, off(-1)',
		quadrantprogramchange: 'Sends this value out whenever<br>the preset is loaded.<br>Range: 0 - 127, off(-1)',
		quadrantstrikedensity: 'Optimize the response for<br>different playing styles.<br>Fast and light stick playing<br>will benefit from higher settings.<br>More expressive playing will<br>benefit from lower settings',
		quadrantsensitivity: 'Sensitivity controls how hard<br>you have to hit the BopPad<br>surface to trigger the modlines.<br>Range: 1 - 10',
		quadrantgain: 'Gain controls the output values of<br>the velocity and pressure sources.<br>Range: 0.25 - 1.75',
		quadrantfullvolumechange: 'Sends a 127 velocity when you<br>change presets to prevent software<br>or hardware instruments getting<br>stuck at a lower volume when<br>changing presets',
		quadrantvelocityoverride: 'Velocity Override will force<br>every note to output 127 velocity<br>regardless of how hard you hit<br>the BopPad surface',

    keyboardtoggle: 'Toggle (show/hide) the keyboard<br>for more familiar note entry',
    keyboard: 'Click on the notes you want BopPad<br>to output in the selected quadrant',

    modlineadd: 'Add a modline to the current<br>quadrant. Add up to 5',
    modlineremove: 'Remove a modline from<br>the current quadrant',

    unisonmode: 'Activate Unison Mode,<br>all 4 quadrants use the settings<br>of the selected quadrant',
    allmode: 'Activate All Mode,<br>set values for all 4 quadrants<br>using only one quadrant',

    preferences: 'Open the preferences window<br>to change global settings,<br>update firmware, and<br>export user presets',

    globalsensitivityinc: 'Increase Global Sensitivity',
    globalsensitivitydec: 'Decrease Global Sensitivity',
    globalsensitivityreset: 'Reset Global Sensitivity,<br>to the default value of 16',

    versions: 'The current versions of the<br>editor and BopPad firmware.<br>Displays progress messages<br>during firmware updating',

    multitouch: 'Multitouch Mode, respond to<br>additional hits without<br>releasing any currently active quadrants',
    crosstalk: 'Reduces the chances of unintended<br>hits being triggered on nearby<br>sensors/quadrants',
    expandermode: 'MIDI Expander communication',
    firmware: 'Update/reload the BopPad firmware',
    exportpresets: 'Export all user presets to<br>your computer as a .json file',
    tooltips: 'tooltips',
    uniquemessages: 'Filter MIDI message output<br>by preventing duplicate<br>message data',

    usertables: 'Open the User Tables window<br>to customize how<br>BopPad sensors respond',
    usertableselect: 'Select one of the 4<br>custom user tables on your<br>BopPad to edit them',
    usertablesave: 'Sends the visible user<br>table to the selected<br>slot on BopPad',
    usertablereset: 'Resets the visible user<br>table to a linear curve.<br>Click Save to send it to BopPad',
	},
	setup: {
		presetselect: ['#preset_sel'],
		destinations: ['.destinations'],
		send: ['#sendpreset'],

		usersave: ['.save'],
		usersaveas: ['.save-as'],
		userrevert: ['.revert'],
		userdelete: ['.delete'],

		icon: ['#svg_boppad'],

		quadrantselection: ['.quadrant-notes h3'],
		quadrantcopy: ['.copy'],
		quadrantpaste: ['.paste'],
		quadrantclear: ['.clear'],
		quadrantclearall: ['.clear_all'],
		quadrantnote: ['.note-selection'],

		quadrantmidichannel: ['.voice-channel'],
		quadrantbankselect: ['.voice-bank-select'],
		quadrantprogramchange: ['.voice-program-change'],
		quadrantstrikedensity: ['.voice-density'],
		quadrantsensitivity: ['.voice-sensitivity'],
		quadrantgain: ['.voice-gain'],
		quadrantfullvolumechange: ['.full-vol-change'],
		quadrantvelocityoverride: ['.vel-override'],

		keyboardtoggle: ['.keyboard-toggle'],

    modlineadd: ['.create'],
    modlineremove: ['.remove'],

    unisonmode: ['#unison'],
    allmode: ['#allmode'],

    preferences: ['#preferences_btn'],

    globalsensitivityinc: ['.increase'],
    globalsensitivitydec: ['.decrease'],
    globalsensitivityreset: ['.reset-global-sensitvity'],

    versions: ['.versions'],

    multitouch: ['div.multitouch'],
    crosstalk: ['div.crosstalk'],
    expandermode: ['.expandermode'],
    firmware: ['.firmware'],
    exportpresets: ['div.export'],
    tooltips: ['button.tooltips'],
    uniquemessages: ['button.change-filter'],

    usertables: ['#usertables_btn'],
    usertableselect: ['#curveSelect'],
    usertablesave: ['.save-curve'],
    usertablereset: ['.reset-curve']
	},
	collection: []
}

let presetTooltips = {
	messages: {
		modlinenote: 'This modline is for<br>configuring how note<br>data is output',
		modlinemessagetype: 'The message type defines<br>what type of data will be<br>sent from the modline.<br>The other possible<br>MIDI data includes:<br>Pitch Bend<br>Channel Pressure<br>Polyphonic Aftertouch<br>Continuous Controller (CC)',
		modlinecc: 'The CC value when choosing<br>the CC message type.<br>Range: 0 - 127',
		modlinenotesource: 'Defines what data from the BopPad will be used to trigger this modline. Choices include:<br>Velocity - velocity (based on how hard you hit the surface)<br>Pressure - how hard you press on the surface after striking<br>Initial Radius - where you initially strike the surface<br>Radius - the position of where you are pressing onto the surface<br>Relative Radius - the difference between where you are curently pressing the surface and where you initially struck the surface',
		modlinenoteinvertsource: 'Inverts the data from<br>the source',
		modlinenotegain: 'Applies a gain coeffcient to<br>scale the data from the source<br>up or down.<br>Range: 0.1 - 1.75',
		modlinenoteoffset: 'Offset the data by<br>a fixed amount.<br>Range: 0 - 127',
		modlinenotecurve: 'Sets the curve to apply to<br>incoming values. Choice include:<br>Linear - no shaping of the data<br>Logarithmic<br>Exponential<br>Light - soft hits are unchanged, and it makes it harder to reach higher velocities<br>Medium - makes softer hits softer, and then evens out as velocity goes higher<br>Hard - makes really soft hits 0 velocity, makes soft hits much softer and makes it easier to reach higher velocites<br>Dynamic - soft hits are normalized and medium and hard hits have a logarithmic curve applied<br>User Table (1-4) - use a user defined curve to shape the data',
		modlinenotemin: 'Set a minimum value for the data<br>Range: 1 - 127',
		modlinenotemax: 'Set a maximum value for the data<br>Range: 1 - 127',
		modlinesolo: 'Only sends the data from the<br>corresponding modline. Useful for<br>MIDI mapping in DAWs and other<br>music software',
		modlinelivevalue: 'The realtime value of the source'
	},
	setup: {
		'modlinenote': ['.note'],
		'modlinemessagetype': ['.message-type'],
		'modlinecc': ['.cc-number'],
		'modlinenotesource': ['.mod-voice'],
		'modlinenoteinvertsource': ['.invert-source'],
		'modlinenotegain': ['.gain'],
		'modlinenoteoffset': ['.offset'],
		'modlinenotecurve': ['.curve'],
		'modlinenotemin': ['.min'],
		'modlinenotemax': ['.max'],
		'modlinesolo': ['.solo'],
		'modlinelivevalue': ['.reporter']
	},
	collection: []
}

export { staticTooltips, presetTooltips }
