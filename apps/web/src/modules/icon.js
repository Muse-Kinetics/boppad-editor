// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

/* TODO:
		favicon: change icon when quadrant changes: http://lab.ejci.net/favico.js/
    http://paulrhayes.com/experiments/cube-3d/js/experiment.js?1441015163
*/

// vendor
import { debounce } from 'lodash'

// modules
import activateQuadrant from './activateQuadrant'

let Snap = require('snapsvg-cjs'),
    boppadSVG = $('#boppad'),
    quadrants = ['A', 'B', 'C', 'D'],
    currentLocation = 0,
    cur_pos = 0, cur_quad = 0, delta_quad = 0;

function rotate(new_quad) {
	// Thanks to David Aue
  cur_quad = (cur_pos / 90) % 4;
  delta_quad = (new_quad - cur_quad) % 4;

  if (Math.abs(delta_quad) == 3) {
  	delta_quad = -1 * Math.sign(delta_quad);
  }

  cur_pos = cur_pos + delta_quad * 90;

  return cur_pos;
}

function activateIconQuadrant(quadrant = 'A'){
	let icon = Snap.select('#svg_boppad'),
      active_quadrant = icon.select('#active_quadrant'),
			bbox = icon.getBBox(),
			paths = active_quadrant.selectAll('path'),
      q = quadrants.indexOf(quadrant);

	if(icon.hasClass('active')) return;

	currentLocation = rotate(q);

	paths.forEach(function(path, i, a){
		path.animate({ transform:'r' + currentLocation + ',' + bbox.cx + ',' + bbox.cy }, 600 - ((i + 1) * 100), mina.linear, function(){
			if(i == 0){
        document.body.dataset.activating = false
        icon.removeClass('active');
      }
		});
	})
}

function activateIcon(event){
  let quadrantKeyMap = {
    90:'A', // shift + z
    88:'B', // shift + x
    67:'C', // shift + c
    86:'D'  // shift + v
  }, quadrantKey = event.which

  if(quadrantKey in quadrantKeyMap && event.shiftKey){
    activateQuadrant(quadrantKeyMap[quadrantKey])
    $('#svg_boppad').addClass('active')
    document.body.dataset.activating = true
  }
}

// events
$(document).on('keypress', debounce(e => {
  // ignore if save as prompt open or select element is in focus
  if(document.body.dataset.prompt == 'open' || document.activeElement.type == 'select-one') return

    activateIcon(e)
  }, 500,
    {
      'leading': true,
      'trailing': false,
      'maxWait': 500
    }
  )
)

// Icon
boppadSVG.on('click', 'g:not("#active_quadrant")', function(e){
  let activeQuadrant = $(this).data('quadrant')

  // activate quadrant
  activateQuadrant(activeQuadrant)
  // order is important here
  $(this).parent('svg').addClass('active')
  document.body.dataset.activating = true

  e.stopPropagation();
});

// receive quadrantactivated event
// $(document).on('quadrantactivated', (e, data) => console.log('quadrantactivated from ./icon', data))

export { activateIconQuadrant }
