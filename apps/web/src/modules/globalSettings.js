// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

function toggleButtons(button){
	let messages = ['Disabled', 'Enabled'],
			onValues = (button.data('onValues')) ? button.data('onValues').split(',') : [1]

	if(button.hasClass('active')){ // if on, turn off
		button
			.removeClass('active')
			.text(messages[0].trim())
			.val(-1)

	} else { // if off, turn on
		button.addClass('active');

		if(button.attr('id') == 'unison'){
			button
				.text(messages[1].trim())
				// .val(onValues[0]);
		} else {
			button
				.text(messages[1].trim())
				.val(onValues[0]);
		}
	}

	//console.log('button val', button.attr('id'), 'val', button.val(), 'active', button.hasClass('active'));
}

/**
 * Sets unison mode. adds 'unison' class to items[] and sets 'ALL' on unison quadrant
 * @function
 * @param {Event} ignored
 * @param {Number} index of quadrant
 */
function setUnison(e = {}, data = -1){
	let quadrants = ['A', 'B', 'C', 'D'];

	// add/remove .unison on items
	$('.quadrant-notes').each(function() {
		$(this).removeClass('unison').find('h3').text($(this).data('quadrant'));
		(data != -1) ? $(this).not('[data-quadrant=' + quadrants[data] + ']').addClass('unison') : $(this).removeClass('unison')
	})
	// add / remove 'UNISON' from unison quadrant
	if(data != -1){
		document.body.dataset.unison = 'on';
		document.body.dataset.unisonQuadrant = quadrants[data];
		$('.quadrant-notes[data-quadrant=' + quadrants[data] + ']').find('h3').text('UNISON')
	} else {
		document.body.dataset.unison = 'off';
		document.body.dataset.unisonQuadrant = '-1';
	}
}

function sliderValue(slider){
	slider.parent('div').prev('.label').find('span').html(' ( ' + slider.val() + ' )')
}

// events
$('.slider-buttons').on('click', 'button', function(e) {
	let slider = $(this).siblings('input'),
			action = $(this).data('action'),
			oldVal = slider.get(0).valueAsNumber,
			newVal

	if(+slider.get(0).value < +slider.get(0).min || +slider.get(0).value > +slider.get(0).max) return

	newVal = (action === 'decrease') ? oldVal - 1 : oldVal + 1

	sliderValue(slider)
	slider.val(newVal)
	slider.trigger('change')
});

export { toggleButtons, sliderValue, setUnison }
