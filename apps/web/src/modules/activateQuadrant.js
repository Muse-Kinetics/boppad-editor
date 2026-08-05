// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

// modules
import { setQuadrant } from './utilities'
import { activateIconQuadrant } from './icon'
import { activateQuadrant as activateQuadrantQuadrant, activateVoice, activateVelocityOverride, activateSensitivity } from './quadrant'
import { clearSetUpdate } from './keyboard'
import { activate as activateModline, buildMessageTypes } from './modline'


export default function activateQuadrant(activeQuadrant = 'A'){
	let unisonMode = document.body.dataset.unison
// document.body.dataset.activating = true
	activeQuadrant = (unisonMode == 'on') ? document.body.dataset.unisonQuadrant : activeQuadrant
	// update icon
	activateIconQuadrant(activeQuadrant);
	$('#svg_boppad').addClass('active')

	// update quadrants
	activateQuadrantQuadrant(activeQuadrant);
	activateVoice(activeQuadrant);
	activateVelocityOverride(activeQuadrant);
	activateSensitivity(activeQuadrant);
	// update keyboard
	clearSetUpdate(activeQuadrant);
	// activate quadrant modlines
	activateModline(activeQuadrant);
	// build modline reporter
	buildMessageTypes();
	// set activeQuadrant
	setQuadrant(activeQuadrant)
	// send quadrantactivated event. not sure of the use case
	// $(document).trigger('quadrantactivated', [activeQuadrant])

}
